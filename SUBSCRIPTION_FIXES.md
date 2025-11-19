# 🔧 Subscription System Fixes

## Issues Fixed

### **1. Firebase Database Reference Error**
**Error:**
```
TypeError: Cannot read properties of undefined (reading 'collection')
at getActiveUserSubscription (src/app/api/mercadopago/subscription-create/route.ts:185:43)
```

**Root Cause:**
- API routes were trying to use `firebaseDB.db.collection()` but `firebaseDB` doesn't expose a `db` property
- Needed to use Firebase Admin SDK directly in API routes (server-side)

**Fix:**
- Updated `/api/mercadopago/subscription-create/route.ts` to use Firebase Admin SDK:
  ```typescript
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();
  ```

### **2. Invalid MercadoPago Status Error**
**Error:**
```
Invalid value for status, valid ones are [active, inactive, cancelled]
```

**Root Cause:**
- PreApprovalPlan was being created with `status: 'pending'`
- MercadoPago only accepts: `active`, `inactive`, or `cancelled`

**Fix:**
- Changed status to `'active'` in PreApprovalPlan creation
- The plan status is `active` but the user's subscription will be `pending` until they complete payment
- Updated the subscription data structure:
  ```typescript
  const subscriptionData = {
    reason: `Suscripción ${plan.name}`,
    auto_recurring: {
      frequency: frequency,
      frequency_type: frequencyType,
      transaction_amount: plan.price,
      currency_id: plan.currency || 'ARS',
    },
    payer_email: user.email,
    back_url: `${validBaseUrl}/payment/complete`,
    status: 'active', // Must be 'active' for PreApprovalPlan
    external_reference: `subscription_${planId}_${userId}`,
  };
  ```

### **3. Subscription Service Firebase Client SDK Compatibility**
**Issue:**
- `subscriptionService.ts` was using old Firebase Admin SDK syntax (`.collection()`, `.where()`)
- Needed to use Firebase Client SDK modular functions

**Fix:**
- Updated to use Firebase v9+ modular SDK:
  ```typescript
  import { collection, query, where, getDocs, doc, updateDoc, limit as firestoreLimit } from 'firebase/firestore';
  
  // Old syntax:
  const subscriptionsRef = this.db.collection('userSubscriptions');
  const snapshot = await subscriptionsRef.where('userId', '==', userId).get();
  
  // New syntax:
  const subscriptionsRef = collection(this.db, 'userSubscriptions');
  const q = query(subscriptionsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  ```

## Files Modified

### **1. `/src/app/api/mercadopago/subscription-create/route.ts`**
- Updated `getActiveUserSubscription()` to use Firebase Admin SDK
- Updated `createUserSubscription()` to use Firebase Admin SDK
- Changed PreApprovalPlan status from `pending` to `active`
- Removed `start_date` and `end_date` from auto_recurring (not needed for basic plans)
- Updated `back_url` to use `/payment/complete` instead of `/subscription/complete`

### **2. `/src/services/subscriptionService.ts`**
- Added Firebase v9+ modular SDK imports
- Updated all Firestore methods to use modular SDK:
  - `getUserActiveSubscription()`
  - `calculateRemainingPosts()`
  - `calculateRemainingBookings()`
  - `getUserSubscriptionHistory()`
  - `cancelUserSubscription()`

## Testing Checklist

- ✅ Fixed Firebase DB reference errors
- ✅ Fixed MercadoPago status validation
- ✅ Updated subscription service to use correct Firebase SDK
- ✅ No linter errors
- 🔄 Ready for end-to-end testing

## Next Steps

1. **Test subscription creation flow:**
   - Go to `/suscribirse` page
   - Select a plan
   - Click "Suscribirse con MercadoPago"
   - Complete payment on MercadoPago checkout
   - Verify webhook updates subscription status

2. **Verify database records:**
   - Check `userSubscriptions` collection for new subscription
   - Verify `status` field is correct
   - Check `mercadoPagoSubscriptionId` is populated

3. **Test publisher validation:**
   - Try creating a post as a subscribed user
   - Verify subscription validation passes
   - Check post limits are enforced

---

**Status:** ✅ All fixes applied and ready for testing!
