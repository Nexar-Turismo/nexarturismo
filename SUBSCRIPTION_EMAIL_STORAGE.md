# Subscription Email Storage Implementation

## Overview
Implemented a `subscriptionEmail` field in the Firestore subscription document to store the MercadoPago payer email. This email is used when upgrading plans to maintain consistency without needing to call MercadoPago's Customer API.

## Problem
- MercadoPago's Customer API returned `401 Unauthorized` error with code 300
- Error message: "Unauthorized use of live credentials"
- This prevented us from fetching the customer email when upgrading
- The PreApproval's `payer_email` field was often empty

## Solution
Store the `subscriptionEmail` as a **top-level field** in the Firestore subscription document when it's first created, then reuse it for upgrades.

## Implementation

### 1. Updated Type Definitions

#### `/src/types/index.ts`
```typescript
export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'suspended';
  mercadoPagoSubscriptionId?: string;
  subscriptionEmail?: string; // ✅ NEW: Email for MercadoPago subscription
  // ... other fields
}
```

#### `/src/services/subscriptionService.ts`
```typescript
export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  mercadoPagoSubscriptionId: string;
  subscriptionEmail?: string; // ✅ NEW: Email for MercadoPago subscription
  // ... other fields
}
```

### 2. Store Email When Creating Subscription

**Path**: `/src/app/api/mercadopago/subscription-create/route.ts`

```typescript
// When creating new subscription
const localSubscriptionId = await createUserSubscription({
  userId,
  planId,
  planName: plan.name,
  mercadoPagoSubscriptionId: sub.id,
  subscriptionEmail: finalPayerEmail, // ✅ Store as top-level field
  amount: plan.price,
  currency: plan.currency || 'ARS',
  status: 'pending',
  billingCycle: plan.billingCycle,
  startDate: new Date(),
  metadata: {
    initPoint: sub.init_point,
    externalReference,
    backUrl,
  },
});
```

### 3. Retrieve Email When Upgrading

**Path**: `/src/app/api/mercadopago/subscription-create/route.ts`

```typescript
if (existingSubscriptionId) {
  // Get existing subscription from Firestore
  const existingSub = await firebaseDB.subscriptions.getById(existingSubscriptionId);
  
  // Read email from top-level field ✅
  const existingSubData = existingSub as any;
  finalPayerEmail = existingSubData.subscriptionEmail;
  
  console.log('📋 Subscription email from Firestore:', {
    email: finalPayerEmail || 'NOT FOUND',
    subscriptionId: existingSub.id,
  });
  
  // Get card_id from MercadoPago
  const mpSubscription = await preapproval.get({ 
    id: existingSub.mercadoPagoSubscriptionId 
  });
  
  cardId = mpSubscription.card_id;
  
  // Fallback: If email not in Firestore, try MercadoPago
  if (!finalPayerEmail) {
    finalPayerEmail = mpSubscription.payer_email;
  }
  
  // Validate both required fields
  if (!cardId || !finalPayerEmail) {
    return error('Missing payment method or email');
  }
}
```

## Data Flow

### New Subscription
```
User fills payment form
  - Enters email: user@example.com
        ↓
POST /api/mercadopago/subscription-create
  - cardTokenId: "token123"
  - payerEmail: "user@example.com"
        ↓
Create MercadoPago PreApproval
  - Uses: user@example.com
        ↓
Save to Firestore:
{
  userId: "abc",
  planId: "basic",
  subscriptionEmail: "user@example.com", ✅
  mercadoPagoSubscriptionId: "mp-sub-123",
  status: "pending"
}
        ↓
✅ Subscription created
```

### Upgrade Subscription
```
User clicks "Mejorar Plan"
        ↓
Read existing subscription from Firestore
  - subscriptionEmail: "user@example.com" ✅
        ↓
Get card_id from MercadoPago
  - card_id: "xxx1234"
        ↓
POST /api/mercadopago/subscription-create
  - existingSubscriptionId: "firebase-sub-id"
  - isUpgrade: true
  - NO cardTokenId
  - NO payerEmail in request
        ↓
API retrieves:
  - subscriptionEmail from Firestore ✅
  - card_id from MercadoPago
        ↓
Create new MercadoPago PreApproval
  - card_id: "xxx1234"
  - payer_email: "user@example.com" ✅
        ↓
Save to Firestore:
{
  subscriptionEmail: "user@example.com", ✅ Same email
  // ... new plan details
}
        ↓
Cancel old subscription
Activate new subscription
        ↓
✅ Upgrade complete
```

## Database Structure

### Firestore: `userSubscriptions` Collection

```typescript
{
  id: "firebase-sub-123",
  userId: "user-abc",
  planId: "plan-basic",
  planName: "Basic Plan",
  mercadoPagoSubscriptionId: "mp-sub-456",
  subscriptionEmail: "user@example.com", // ✅ Stored here
  amount: 9.99,
  currency: "ARS",
  status: "active",
  billingCycle: "monthly",
  startDate: Timestamp,
  endDate: Timestamp,
  metadata: {
    initPoint: "https://...",
    externalReference: "subscription_...",
    backUrl: "https://..."
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: "system"
}
```

## Why This Approach Is Better

### 1. ✅ No External API Dependency
- Don't need to call MercadoPago's Customer API
- Avoids authorization issues
- Faster (no external call)

### 2. ✅ We Control the Data
- Email is in our database
- Can query and update easily
- No reliance on MercadoPago's data structure

### 3. ✅ Backwards Compatible
- Falls back to MercadoPago's `payer_email` if not in Firestore
- Works with old subscriptions

### 4. ✅ Consistent
- Same email used across all subscriptions for a user
- Stored explicitly, not hidden in metadata

### 5. ✅ Simple
- Direct field access
- No complex API calls
- Clear data ownership

## Error Handling

### Scenario 1: Email Not in Firestore
```typescript
if (!finalPayerEmail) {
  // Fallback to MercadoPago
  finalPayerEmail = mpSubscription.payer_email;
}

if (!finalPayerEmail) {
  return error('No subscription email found');
}
```

### Scenario 2: Card Not Found
```typescript
if (!cardId) {
  return error('No payment method found in existing subscription');
}
```

### Scenario 3: Subscription Not Found
```typescript
if (!existingSub) {
  return error('Existing subscription not found');
}
```

## Migration for Existing Subscriptions

For subscriptions created before this change (without `subscriptionEmail` field):

### Option 1: Manual Update
```typescript
// Run migration script
const subscriptions = await firebaseDB.subscriptions.getAll();

for (const sub of subscriptions) {
  if (!sub.subscriptionEmail) {
    // Try to get from MercadoPago
    const mpSub = await preapproval.get({ id: sub.mercadoPagoSubscriptionId });
    
    if (mpSub.payer_email) {
      await firebaseDB.subscriptions.update(sub.id, {
        subscriptionEmail: mpSub.payer_email
      });
    }
  }
}
```

### Option 2: Lazy Migration
Current implementation has fallback:
```typescript
// If not in Firestore, get from MercadoPago
if (!finalPayerEmail) {
  finalPayerEmail = mpSubscription.payer_email;
}
```

This means old subscriptions will still work (as long as MercadoPago has the email).

## Testing

### Test Case 1: New Subscription
```bash
# Create subscription with email
POST /api/mercadopago/subscription-create
{
  "planId": "basic",
  "userId": "user123",
  "cardTokenId": "token-abc",
  "payerEmail": "test@example.com"
}

# Check Firestore
userSubscriptions/{id}
  subscriptionEmail: "test@example.com" ✅
```

### Test Case 2: Upgrade with Stored Email
```bash
# Upgrade plan
POST /api/mercadopago/subscription-create
{
  "planId": "premium",
  "userId": "user123",
  "isUpgrade": true,
  "existingSubscriptionId": "firebase-sub-id"
}

# Should log:
📋 Subscription email from Firestore:
{
  email: 'test@example.com',  // ✅ From Firestore
  subscriptionId: 'firebase-sub-id'
}

✅ Card ID retrieved from MercadoPago:
{
  cardId: '***1234'
}

# New subscription created with same email ✅
```

### Test Case 3: Old Subscription (No Email in Firestore)
```bash
# Upgrade old subscription (no subscriptionEmail field)
POST /api/mercadopago/subscription-create
{
  "existingSubscriptionId": "old-sub-id"
}

# Should log:
📋 Subscription email from Firestore:
{
  email: 'NOT FOUND'
}

⚠️ Email not in Firestore, trying MercadoPago payer_email field...

📋 Payer email from MercadoPago:
{
  payerEmail: 'test@example.com',  // ✅ Fallback works
  payerId: '12345'
}
```

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| Email Source | Customer API (401 error) | ✅ Firestore field |
| API Calls | 2 (PreApproval + Customer) | ✅ 1 (PreApproval only) |
| Speed | Slow | ✅ Fast |
| Reliability | Low (API errors) | ✅ High (our database) |
| Maintenance | Complex | ✅ Simple |

## Conclusion

By storing the `subscriptionEmail` as a top-level field in Firestore:

- ✅ **Avoids Customer API issues** - No more 401 errors
- ✅ **Faster upgrades** - One less API call
- ✅ **More reliable** - We control the data
- ✅ **Simpler code** - Direct field access
- ✅ **Backwards compatible** - Fallback for old subscriptions

The upgrade flow is now robust and doesn't depend on MercadoPago's Customer API which has authorization restrictions.

## Next Steps

### For Testing
1. Create a new subscription (email will be saved to `subscriptionEmail` field)
2. Try to upgrade - should use the stored email ✅
3. Check Firestore to verify email is saved

### For Production
1. Consider running a migration for existing subscriptions
2. Monitor logs to see if any subscriptions are missing emails
3. Add admin tool to manually set email if needed

## Code Reference

**Key Files:**
- `/src/types/index.ts` - Type definition
- `/src/services/subscriptionService.ts` - Service interface
- `/src/app/api/mercadopago/subscription-create/route.ts` - Implementation

