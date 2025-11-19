# Payment Method Reuse for Plan Upgrades

## Overview
Implemented a seamless upgrade experience where users with active subscriptions don't need to re-enter their card details. The system reuses the payment method from their existing MercadoPago subscription.

## Problem Solved
Previously, users had to fill out the entire payment form again when upgrading, even though they already had an active subscription with a saved payment method. This created unnecessary friction in the upgrade process.

## Solution
The system now:
1. **Detects existing subscriptions** - Checks if user has an active subscription
2. **Shows confirmation modal** - Simple confirmation UI without payment form
3. **Reuses payment method** - Fetches `card_id` from existing MercadoPago subscription
4. **Creates new subscription** - Uses the existing card to create new subscription
5. **Switches plans** - Cancels old subscription and activates new one

## User Experience

### For Users WITH Existing Subscription (Upgrade)
```
User clicks "Mejorar Plan"
         ↓
Confirmation modal appears
  - Shows current plan vs new plan
  - Shows price comparison
  - Shows feature differences
  - NO payment form needed
         ↓
User clicks "Confirmar Mejora"
         ↓
System reuses existing payment method
         ↓
New subscription created
Old subscription cancelled
         ↓
✅ Done! User upgraded
```

### For Users WITHOUT Subscription (New)
```
User clicks "Seleccionar Plan"
         ↓
Payment form modal appears
  - Enter card details
  - MercadoPago creates card_token_id
         ↓
User submits form
         ↓
New subscription created
         ↓
✅ Done! User subscribed
```

## Technical Implementation

### Files Created/Modified

#### 1. **New API Endpoint: Get Payment Method**
**Path**: `/src/app/api/mercadopago/subscription-payment-method/route.ts`

Fetches payment method information from an existing MercadoPago subscription.

```typescript
GET /api/mercadopago/subscription-payment-method?subscriptionId=xxx

Response:
{
  "success": true,
  "paymentMethod": {
    "cardId": "xxx",
    "paymentMethodId": "xxx",
    "lastFourDigits": "1234",
    "firstSixDigits": "503175",
    "payerEmail": "user@example.com"
  }
}
```

#### 2. **Modified: Subscription Create API**
**Path**: `/src/app/api/mercadopago/subscription-create/route.ts`

Added support for reusing payment methods from existing subscriptions.

**New Parameters:**
- `existingSubscriptionId` (optional) - ID of subscription to reuse payment method from

**Logic Changes:**
```typescript
// Before: Required card_token_id
if (!cardTokenId) {
  return error('Card token ID is required');
}

// After: Accept either card_token_id OR existingSubscriptionId
if (!cardTokenId && !existingSubscriptionId) {
  return error('Card token ID or existing subscription ID is required');
}

// If existingSubscriptionId provided:
if (existingSubscriptionId) {
  // 1. Get existing subscription from Firebase
  const existingSub = await firebaseDB.subscriptions.getById(existingSubscriptionId);
  
  // 2. Get payment method from MercadoPago
  const mpSubscription = await preapproval.get({ 
    id: existingSub.mercadoPagoSubscriptionId 
  });
  
  // 3. Extract card_id
  cardId = mpSubscription.card_id;
  finalPayerEmail = mpSubscription.payer_email;
}

// Create PreApproval with either card_id or card_token_id
const preapprovalBody = {
  ...otherParams,
  // Use card_id if reusing, card_token_id if new card
  ...(cardId ? { card_id: cardId } : { card_token_id: cardTokenId })
};
```

#### 3. **New Component: Upgrade Confirmation Modal**
**Path**: `/src/components/ui/plan-upgrade-confirmation-modal.tsx`

Beautiful confirmation modal without payment form.

**Features:**
- Side-by-side plan comparison
- Price differences highlighted
- Feature comparison
- Clear call-to-action buttons
- Loading states
- Error handling

**Props:**
```typescript
interface PlanUpgradeConfirmationModalProps {
  isOpen: boolean;
  currentPlan: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}
```

#### 4. **Modified: Plans Page**
**Path**: `/src/app/suscribirse/planes/page.tsx`

Updated to show different modals based on user's subscription status.

**Changes:**
```typescript
// New upgrade handler
const handleUpgradeConfirm = async () => {
  // Step 1: Create new subscription with existing payment method
  const createResponse = await fetch('/api/mercadopago/subscription-create', {
    body: JSON.stringify({
      planId: selectedPlan.id,
      userId: user.id,
      isUpgrade: true,
      existingSubscriptionId: currentSubscription.id, // KEY: Reuse payment method
    }),
  });

  // Step 2: Cancel old and activate new
  await fetch('/api/mercadopago/change-plan', {
    body: JSON.stringify({
      oldSubscriptionId: currentSubscription.id,
      newSubscriptionId: newSubscriptionId,
    }),
  });
};

// Modal rendering logic
{showUpgradeModal && selectedPlan && currentPlan && (
  // Show confirmation modal (no payment form)
  <PlanUpgradeConfirmationModal ... />
)}

{showUpgradeModal && selectedPlan && !currentPlan && (
  // Show payment form modal
  <SubscriptionForm ... />
)}
```

## How It Works

### Step-by-Step Upgrade Flow

#### Step 1: User Initiates Upgrade
```javascript
// User clicks "Mejorar Plan" button
handleUpgradeClick(newPlan);
  ↓
setSelectedPlan(newPlan);
setShowUpgradeModal(true);
```

#### Step 2: System Checks Subscription Status
```javascript
// Render logic determines which modal to show
if (currentPlan) {
  // Has subscription → Show confirmation modal
  <PlanUpgradeConfirmationModal ... />
} else {
  // No subscription → Show payment form
  <SubscriptionForm ... />
}
```

#### Step 3: User Confirms Upgrade
```javascript
handleUpgradeConfirm()
  ↓
// Create new subscription with existing payment method
POST /api/mercadopago/subscription-create
{
  planId: "new-plan-id",
  userId: "user-id",
  isUpgrade: true,
  existingSubscriptionId: "old-subscription-id" // Reuse card
}
```

#### Step 4: API Fetches Payment Method
```javascript
// Inside subscription-create API
const existingSub = await firebaseDB.subscriptions.getById(existingSubscriptionId);
  ↓
const mpSubscription = await preapproval.get({ 
  id: existingSub.mercadoPagoSubscriptionId 
});
  ↓
cardId = mpSubscription.card_id;
```

#### Step 5: Create New Subscription
```javascript
// Create PreApproval with existing card_id
const sub = await preapproval.create({
  body: {
    preapproval_plan_id: newPlan.mercadoPagoPlanId,
    card_id: cardId, // ← Reusing existing card!
    payer_email: existingEmail,
    // ... other params
  }
});
```

#### Step 6: Switch Plans
```javascript
// Cancel old subscription and activate new one
POST /api/mercadopago/change-plan
{
  oldSubscriptionId: "old-sub-id",
  newSubscriptionId: "new-sub-id"
}
  ↓
// In change-plan API
await preapproval.update({
  id: oldSubscription.mercadoPagoSubscriptionId,
  body: { status: 'cancelled' }
});
  ↓
await firebaseDB.subscriptions.update(oldSubscriptionId, {
  status: 'cancelled'
});
  ↓
await firebaseDB.subscriptions.update(newSubscriptionId, {
  status: 'active'
});
```

## MercadoPago Payment Method Reuse

### Card Token vs Card ID

**`card_token_id`**:
- Single-use token
- Created by MercadoPago SDK from card form
- Expires quickly
- Used for NEW subscriptions

**`card_id`**:
- Persistent card identifier
- Associated with MercadoPago subscription
- Can be reused for multiple subscriptions
- Used for UPGRADES

### How MercadoPago Stores Cards

When you create a PreApproval with `card_token_id`:
```javascript
await preapproval.create({
  body: {
    card_token_id: "abc123...",
    // ... other params
  }
});
```

MercadoPago:
1. Validates the card
2. Saves the card to the subscription
3. Returns subscription with `card_id` property

Later, you can reuse that card:
```javascript
await preapproval.create({
  body: {
    card_id: subscription.card_id, // Reuse saved card
    // ... other params
  }
});
```

## Security Considerations

### 1. ✅ Authorization Checks
```typescript
if (existingSub.userId !== userId) {
  return error('Unauthorized: Subscription does not belong to user');
}
```

### 2. ✅ No Card Data Exposure
- Card details never pass through our servers
- Only `card_id` (MercadoPago reference) is used
- PCI compliance maintained

### 3. ✅ Payment Method Validation
```typescript
if (!cardId) {
  return error('No payment method found in existing subscription');
}
```

### 4. ✅ MercadoPago API Errors Handled
```typescript
try {
  const mpSubscription = await preapproval.get(...);
  cardId = mpSubscription.card_id;
} catch (error) {
  return error('Failed to retrieve payment method');
}
```

## Error Handling

### Scenario 1: No Payment Method in Existing Subscription
```
Error: "No payment method found in existing subscription"
Solution: User must enter card details (fallback to payment form)
```

### Scenario 2: Existing Subscription Not Found
```
Error: "Existing subscription not found"
Solution: Verify subscription ID and user authorization
```

### Scenario 3: MercadoPago API Error
```
Error: "Failed to retrieve payment method from existing subscription"
Solution: Check MercadoPago credentials and subscription status
```

### Scenario 4: Card Expired
```
Error: MercadoPago will reject with card validation error
Solution: User must update payment method manually
```

## Benefits

### 1. 🎯 Better User Experience
- No need to re-enter card details
- Faster upgrade process
- Less friction in conversion funnel

### 2. 🔒 Secure
- No sensitive card data stored in our database
- PCI compliance maintained
- All card handling done by MercadoPago

### 3. 💰 Higher Conversion Rates
- Reduces abandonment in upgrade flow
- One-click upgrades
- Clear, simple confirmation UI

### 4. 🛠️ Maintainable
- Clean separation of concerns
- Reusable components
- Well-documented API

## Testing

### Test Case 1: Upgrade with Valid Payment Method
```
1. User has active subscription with saved card
2. User clicks "Mejorar Plan"
3. Confirmation modal appears (no payment form)
4. User clicks "Confirmar Mejora"
5. ✅ New subscription created with existing card
6. ✅ Old subscription cancelled
7. ✅ User upgraded successfully
```

### Test Case 2: New Subscription (No Existing Card)
```
1. User has no active subscription
2. User clicks "Seleccionar Plan"
3. Payment form modal appears
4. User enters card details
5. ✅ New subscription created with new card
6. ✅ User subscribed successfully
```

### Test Case 3: Upgrade with Invalid/Expired Card
```
1. User has subscription but card expired
2. User clicks "Mejorar Plan"
3. Confirmation modal appears
4. User clicks "Confirmar Mejora"
5. ❌ MercadoPago rejects expired card
6. Error message displayed
7. User can try again or contact support
```

## Future Enhancements

### 1. Payment Method Management
Allow users to update their saved card:
```typescript
// New page: /mi-plan/payment-method
- View last 4 digits of saved card
- "Update Payment Method" button
- Form to enter new card
- Update all active subscriptions
```

### 2. Multiple Payment Methods
Support for multiple saved cards:
```typescript
- User can save multiple cards
- Choose which card to use for upgrade
- Set default payment method
```

### 3. Automatic Retry on Failure
If upgrade fails due to payment:
```typescript
- Retry with exponential backoff
- Send email notification to user
- Provide easy way to update payment method
```

### 4. Prorated Billing
Calculate and apply credits for unused time:
```typescript
const daysRemaining = calculateDaysRemaining(oldSub.endDate);
const credit = (oldSub.amount / 30) * daysRemaining;
const adjustedAmount = newPlan.price - credit;
```

## Monitoring

### Key Metrics to Track
- Upgrade success rate (with vs without payment form)
- Average time to complete upgrade
- Payment method reuse success rate
- Upgrade abandonment rate

### Log Messages to Monitor
```
✅ [MP Subscription] Using existing card_id
✅ [MP Subscription] Payment method retrieved
✅ [Plan Upgrade] Plan changed successfully
❌ [MP Subscription] Error fetching payment method
❌ [Plan Upgrade] Error
```

## Troubleshooting

### Issue: "No payment method found"
**Cause**: Old subscription doesn't have card_id
**Solution**: User must enter card details via payment form

### Issue: "Failed to retrieve payment method"
**Cause**: MercadoPago API error or invalid subscription ID
**Solution**: Check logs, verify subscription exists in MercadoPago

### Issue: Card declined during upgrade
**Cause**: Card expired, insufficient funds, or other validation error
**Solution**: User must update payment method

## Conclusion

The payment method reuse system significantly improves the upgrade experience by:
- ✅ Eliminating need to re-enter card details
- ✅ Reducing friction in upgrade flow
- ✅ Maintaining security and PCI compliance
- ✅ Providing clear, user-friendly UI

Users with active subscriptions can now upgrade with a single click, while new users still get a secure payment form to enter their details. The system intelligently determines which flow to use and handles all the complexity behind the scenes.

