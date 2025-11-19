# Plan Upgrade Fix - "User already has an active subscription" Error

## Problem
When users tried to upgrade their subscription plan, they received the error:
```
User already has an active subscription
```

This was because the `subscription-create` API was checking for existing active subscriptions and blocking the creation of a new subscription, even during upgrades.

## Root Cause
The subscription creation flow was:
1. User selects new plan
2. SubscriptionForm calls `/api/mercadopago/subscription-create`
3. API checks: "Does user have active subscription?" → YES → ❌ ERROR
4. Never gets to step of canceling old subscription

## Solution
Added an `isUpgrade` flag to bypass the active subscription check when upgrading.

### Updated Flow
```
User selects higher-tier plan
         ↓
Modal opens with SubscriptionForm (isUpgrade: true)
         ↓
User enters card details
         ↓
MercadoPago creates card_token_id
         ↓
POST /api/mercadopago/subscription-create
  - planId, userId, cardTokenId, payerEmail
  - isUpgrade: true ← SKIP active subscription check
         ↓
New subscription created in MercadoPago (status: pending)
New subscription saved in Firebase (status: pending)
         ↓
Returns new subscriptionId
         ↓
POST /api/mercadopago/change-plan
  - oldSubscriptionId
  - newSubscriptionId
         ↓
Cancels old subscription in MercadoPago
Updates old subscription in Firebase (status: cancelled)
Updates new subscription in Firebase (status: active)
         ↓
✅ Success! User upgraded
```

## Files Modified

### 1. `/src/app/api/mercadopago/subscription-create/route.ts`
**Added `isUpgrade` parameter:**
```typescript
const { planId, userId, cardTokenId, payerEmail, isUpgrade = false } = body ?? {};
```

**Modified active subscription check:**
```typescript
// Before: Always blocked if user had subscription
if (existingSubscription) {
  return error('User already has an active subscription');
}

// After: Skip check if upgrading
if (existingSubscription && !isUpgrade) {
  return error('User already has an active subscription');
}

if (isUpgrade && existingSubscription) {
  console.log('Upgrade mode: Will cancel old subscription after creating new one');
}
```

### 2. `/src/components/forms/SubscriptionForm.tsx`
**Added `isUpgrade` prop:**
```typescript
interface SubscriptionFormProps {
  plan: Plan;
  userId: string;
  isUpgrade?: boolean; // NEW
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: string) => void;
}
```

**Pass flag to API:**
```typescript
body: JSON.stringify({
  planId: plan.id,
  userId: userId,
  cardTokenId: token,
  payerEmail: payerEmail,
  isUpgrade: isUpgrade, // Pass to API
})
```

### 3. `/src/app/suscribirse/planes/page.tsx`
**Pass `isUpgrade` to SubscriptionForm:**
```typescript
<SubscriptionForm
  plan={selectedPlan}
  userId={user.id}
  isUpgrade={!!currentPlan} // true if user has a plan, false if new user
  onSuccess={handleUpgradeSuccess}
  onError={handleUpgradeError}
/>
```

**Enhanced upgrade handler:**
```typescript
const handleUpgradeSuccess = async (newSubscriptionId: string) => {
  if (!currentSubscription) {
    // New subscription - no upgrade needed
    console.log('New subscription created');
    return;
  }

  // Upgrade - cancel old and activate new
  await fetch('/api/mercadopago/change-plan', {
    method: 'POST',
    body: JSON.stringify({
      userId: user?.id,
      oldSubscriptionId: currentSubscription.id,
      newSubscriptionId: newSubscriptionId,
    }),
  });
};
```

## Benefits

### 1. ✅ Allows Upgrades
Users can now upgrade their plans without errors.

### 2. ✅ Prevents Duplicate Subscriptions
Still prevents accidental duplicate subscriptions for new users (when `isUpgrade: false`).

### 3. ✅ Maintains Audit Trail
Both subscriptions remain in database with links to each other:
- Old subscription: `metadata.newSubscriptionId`
- New subscription: `metadata.previousSubscriptionId`

### 4. ✅ Proper State Management
- Old subscription: status = 'cancelled', endDate = now
- New subscription: status = 'active', startDate = now

## Testing

### Test Case 1: New Subscription (No Existing Plan)
```
User with no subscription → Selects plan → Enters card
Expected: ✅ Creates subscription (isUpgrade: false)
Result: ✅ Works correctly
```

### Test Case 2: Upgrade Plan (Has Existing Plan)
```
User with Basic plan → Selects Premium plan → Enters card
Expected: ✅ Creates new subscription (isUpgrade: true), cancels old
Result: ✅ Works correctly
```

### Test Case 3: Try to Create Duplicate (No Upgrade)
```
User with active plan → Tries /subscribe/planId directly
Expected: ❌ Blocked with error message
Result: ✅ Works correctly (isUpgrade: false by default)
```

## API Validation Logic

```typescript
// subscription-create API
const existingSubscription = await getActiveUserSubscription(userId);

if (existingSubscription && !isUpgrade) {
  // Regular subscription creation - block duplicates
  return error('User already has an active subscription');
}

if (isUpgrade && existingSubscription) {
  // Upgrade mode - allow it (will be handled by change-plan API)
  console.log('Upgrade mode: Existing subscription will be cancelled');
  // Continue with creation...
}

// Create new subscription in MercadoPago
const sub = await preapproval.create({...});

// Save to Firebase with status: 'pending'
await createUserSubscription({...});
```

## MercadoPago Integration

### Why Cancel Then Create?
MercadoPago doesn't have a native "plan change" feature for PreApproval subscriptions. The only way is to:
1. Cancel old subscription (`status: 'cancelled'`)
2. Create new subscription with new plan

### Card Token Requirement
Each new subscription requires a fresh `card_token_id`, which is why we need the payment form even for upgrades.

### Billing
- Old subscription is cancelled immediately (no refund)
- New subscription starts fresh billing cycle
- User is charged for new plan immediately

## Future Enhancements

### 1. Prorated Billing
```typescript
// Calculate days remaining on old plan
const daysRemaining = calculateDaysRemaining(oldSub.endDate);
const credit = (oldSub.amount / 30) * daysRemaining;

// Apply credit to new subscription
const adjustedAmount = newPlan.price - credit;
```

### 2. Grace Period for Downgrades
```typescript
if (newPlan.price < oldPlan.price) {
  // Allow downgrade but delay until end of current billing period
  oldSub.nextPlanId = newPlan.id;
  oldSub.planChangeDate = oldSub.endDate;
}
```

### 3. Saved Payment Methods
```typescript
// Save card_token_id securely for future use
// (Requires additional MercadoPago customer management)
```

## Troubleshooting

### Error: "User already has an active subscription"
**Cause**: `isUpgrade` flag not being passed or is `false`  
**Solution**: Check that SubscriptionForm receives `isUpgrade={!!currentPlan}`

### Error: "Old subscription not found"
**Cause**: `change-plan` API called without proper subscription IDs  
**Solution**: Ensure `currentSubscription` is loaded before upgrade

### Old Subscription Not Cancelled
**Cause**: `change-plan` API failed after new subscription created  
**Solution**: Check API logs, manually cancel via MercadoPago dashboard

## Rollback Plan

If issues occur, you can rollback by:

1. Remove `isUpgrade` parameter from API
2. This will restore original behavior (block all upgrades)
3. Users would need to cancel then re-subscribe manually

## Monitoring

### Key Metrics to Track
- Successful upgrades per day
- Failed upgrade attempts
- Subscriptions in inconsistent state (both active)
- Average time between cancel and new activation

### Log Messages to Monitor
```
🔄 [MP Subscription] Upgrade mode: User has existing subscription
✅ [Plan Upgrade] Success
❌ [Plan Upgrade] Error
```

## Conclusion

The fix allows users to upgrade their subscription plans by:
1. Adding `isUpgrade` flag to bypass duplicate subscription check
2. Creating new subscription while old one exists
3. Canceling old and activating new via `change-plan` API

This maintains data integrity while providing a smooth upgrade experience.

