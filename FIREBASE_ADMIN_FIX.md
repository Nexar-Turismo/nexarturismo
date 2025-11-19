# 🔧 Firebase Admin SDK Fix

## Issue

**Error:**
```
Error: Cannot find module 'firebase-admin/firestore'
at createUserSubscription (src/app/api/mercadopago/subscription-create/route.ts:129:33)
```

**Root Cause:**
- The code was trying to use `firebase-admin` package which is **not installed**
- Only the Firebase **client SDK** (`firebase`) is available in the project
- API routes were attempting to use Admin SDK syntax which doesn't work with client SDK

## Solution

Instead of installing Firebase Admin SDK (which would require service account credentials and additional configuration), I leveraged the existing `firebaseDB` service pattern that's already working throughout the project.

### **Changes Made:**

#### **1. Added Subscriptions Service to firebaseDB**

Added a new `subscriptions` service to `/src/services/firebaseService.ts`:

```typescript
// User Subscriptions operations
subscriptions: {
  async create(subscriptionData: any): Promise<string> {
    // Creates subscription document in Firestore
  },

  async getById(subscriptionId: string): Promise<UserSubscription | null> {
    // Gets subscription by ID
  },

  async update(subscriptionId: string, updates: Partial<UserSubscription>): Promise<void> {
    // Updates subscription document
  },

  async getByUserId(userId: string): Promise<UserSubscription[]> {
    // Gets all subscriptions for a user
  },
}
```

#### **2. Updated API Route Functions**

Modified `/src/app/api/mercadopago/subscription-create/route.ts`:

**Before (using non-existent Admin SDK):**
```typescript
async function createUserSubscription(subscriptionData: any) {
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();
  const subscriptionsRef = db.collection('userSubscriptions');
  // ...
}
```

**After (using existing firebaseDB service):**
```typescript
async function createUserSubscription(subscriptionData: any) {
  const docId = await firebaseDB.subscriptions.create({
    ...subscriptionData,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  });
  return docId;
}
```

**For getting subscriptions:**
```typescript
async function getActiveUserSubscription(userId: string) {
  const { subscriptionService } = await import('@/services/subscriptionService');
  return await subscriptionService.getUserActiveSubscription(userId);
}
```

## Benefits

✅ **No new dependencies required** - Uses existing Firebase client SDK
✅ **Consistent with existing code** - Follows the same pattern as other API routes
✅ **Simpler architecture** - No need for Firebase Admin service account setup
✅ **Works in both client and server contexts** - Firebase client SDK works in Next.js API routes

## Testing

The subscription creation flow should now work end-to-end:

1. ✅ User selects plan on `/suscribirse`
2. ✅ MercadoPago PreApprovalPlan is created
3. ✅ Subscription record is saved to Firebase ← **NOW FIXED**
4. ✅ User is redirected to MercadoPago checkout
5. 🔄 Webhook will activate subscription after payment

## Files Modified

- ✅ `/src/services/firebaseService.ts` - Added `subscriptions` service
- ✅ `/src/app/api/mercadopago/subscription-create/route.ts` - Updated to use firebaseDB service

---

**Status:** ✅ Ready to test subscription creation flow!
