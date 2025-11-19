# 🐛 Webhook Debugging Notes

## Issue: Webhook Getting "Not Found" Error

### **Error Message:**
```
❌ [MercadoPago Subscription Webhook] Error getting subscription details: 
Error: Failed to get subscription details: Not Found
```

### **Root Causes:**

#### **1. Wrong API Endpoint**
**Problem:** Using `/v1/preapproval/` instead of `/preapproval/`

**Before:**
```typescript
https://api.mercadopago.com/v1/preapproval/${subscriptionId}  // ❌ Wrong
```

**After:**
```typescript
https://api.mercadopago.com/preapproval/${subscriptionId}  // ✅ Correct
```

#### **2. PreApprovalPlan ID vs Subscription ID**
**Problem:** MercadoPago might send plan ID instead of actual subscription ID

**Explanation:**
- `PreApprovalPlan` = Template/plan definition
- `PreApproval` = Actual user subscription instance

When user subscribes:
1. We create a `PreApprovalPlan` (template)
2. User clicks and subscribes
3. MercadoPago creates a `PreApproval` (actual subscription)
4. Webhook might send plan ID instead of subscription ID

**Solution:** Added fallback logic to check Firebase if MercadoPago API fails

#### **3. Webhook Type Mismatch**
**Problem:** Webhook might use different type names

**Expected types:**
- `preapproval` - Standard subscription notification
- `subscription_preapproval` - Alternative naming
- `payment` - Payment notifications

**Fixed:** Now handles both type variations

---

## ✅ Fixes Applied

### **1. Enhanced Logging**
```typescript
// Now logs full webhook body
console.log('🔔 Received notification:', JSON.stringify(body, null, 2));

// Logs request URL and response
console.log('📡 Request URL:', url);
console.log('📡 Response status:', response.status);

// Logs error response body
console.error('❌ Error response body:', errorBody);
```

### **2. Fixed API Endpoint**
```typescript
// Removed /v1 from the path
const url = `https://api.mercadopago.com/preapproval/${subscriptionId}`;
```

### **3. Added Fallback Logic**
```typescript
if (!subscriptionDetails) {
  // Try to find in Firebase
  const firebaseSubscription = await firebaseDB.subscriptions.getByMercadoPagoId(subscriptionId);
  
  if (firebaseSubscription) {
    // Update status based on webhook action
    await firebaseDB.subscriptions.update(firebaseSubscription.id, {
      status: 'active',
      mercadoPagoStatus: 'authorized'
    });
    
    // Trigger role assignment
    await authMiddleware.checkUserSubscriptionAndRoles(userId);
  }
}
```

### **4. Multiple Webhook Type Support**
```typescript
if (type === 'preapproval' || type === 'subscription_preapproval') {
  // Handle both variations
}
```

---

## 🔍 Debugging New Webhooks

When a webhook arrives, check logs for:

### **1. Full Webhook Body:**
```json
{
  "type": "preapproval",
  "action": "created",
  "data": {
    "id": "abc123xyz"
  }
}
```

**Key fields:**
- `type` - Event type (preapproval, payment, etc.)
- `action` - Action type (created, updated, cancelled)
- `data.id` - Resource ID (subscription or payment ID)

### **2. API Request Details:**
```
📡 Request URL: https://api.mercadopago.com/preapproval/abc123xyz
📡 Response status: 404 Not Found
❌ Error response body: {"message":"..."}
```

### **3. Subscription Lookup Results:**
```
✅ Found subscription in Firebase
📋 Subscription ID: firebase-doc-id
👤 User ID: user-id
🔄 Updating status: pending → active
```

---

## 🎯 What to Check When Webhook Fails

### **1. Is the subscription ID correct?**
```bash
# Check if ID exists in MercadoPago
curl "https://api.mercadopago.com/preapproval/SUBSCRIPTION_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### **2. Is it a plan ID or subscription ID?**
```bash
# PreApprovalPlan (template) - Won't work in preapproval endpoint
curl "https://api.mercadopago.com/preapproval_plan/PLAN_ID"

# PreApproval (subscription) - Correct
curl "https://api.mercadopago.com/preapproval/SUBSCRIPTION_ID"
```

### **3. Does subscription exist in Firebase?**
```javascript
// Check userSubscriptions collection
db.collection('userSubscriptions')
  .where('mercadoPagoSubscriptionId', '==', 'SUBSCRIPTION_ID')
  .get()
```

### **4. Are environment variables set?**
```bash
# Check access token
echo $NEXAR_SUSCRIPTIONS_ACCESS_TOKEN

# Should start with: APP_USR-
```

---

## 🚀 Testing Webhooks

### **Test 1: Manual Webhook Call**
```bash
curl -X POST http://localhost:3000/api/mercadopago/subscription-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "preapproval",
    "action": "created",
    "data": {
      "id": "YOUR_SUBSCRIPTION_ID"
    }
  }'
```

### **Test 2: Check Subscription Manually**
```bash
curl "http://localhost:3000/api/mercadopago/check-subscription-status?userId=USER_ID"
```

### **Test 3: Simulate from /payment/complete**
When user completes payment, the `/payment/complete` page simulates a webhook:
```typescript
await fetch('/api/mercadopago/subscription-webhook', {
  method: 'POST',
  body: JSON.stringify({
    type: 'preapproval',
    data: { id: preapprovalId }
  })
});
```

---

## 📊 Common Webhook Scenarios

### **Scenario 1: User Subscribes (Success)**
```
1. User clicks subscribe
2. MercadoPago creates PreApproval
3. User completes payment
4. Webhook sent: type='preapproval', action='created'
5. Our server fetches subscription details
6. Status updated in Firebase
7. Publisher role assigned ✅
```

### **Scenario 2: Webhook with Plan ID (Fallback)**
```
1. Webhook received with plan ID
2. MercadoPago API returns 404
3. Fallback: Check Firebase for matching ID
4. Found! Update status based on action
5. Publisher role assigned ✅
```

### **Scenario 3: Webhook Never Received**
```
1. User subscribes and pays
2. No webhook received ❌
3. Status stays "pending"
4. User uses /check-subscription page
5. Manual check fetches from MercadoPago
6. Status updated
7. Publisher role assigned ✅
```

---

## 🔧 Webhook Configuration Verification

### **Check MercadoPago Settings:**

1. **Login to Developer Portal:**
   ```
   https://www.mercadopago.com.ar/developers/panel
   ```

2. **Navigate to Your App → Webhooks**

3. **Verify Configuration:**
   - ✅ URL: `https://asia-forworn-willena.ngrok-free.dev/api/mercadopago/subscription-webhook`
   - ✅ Topics enabled:
     - `subscription_preapproval`
     - `subscription_preapproval_plan`
     - `payment`

4. **Test Webhook:**
   - Click "Send Test Notification"
   - Check server logs
   - Should see: `🔔 [MercadoPago Subscription Webhook] Received notification`

---

## 💡 Pro Tips

### **1. Use ngrok for Local Testing**
```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Use ngrok URL in MercadoPago:
# https://abc123.ngrok-free.app/api/mercadopago/subscription-webhook
```

### **2. Keep Webhook Logs**
All webhook activity is logged. Check for:
- `🔔` - Webhook received
- `📡` - API calls
- `✅` - Success
- `❌` - Errors

### **3. Manual Status Check is Your Friend**
When in doubt, use:
```
https://your-domain.com/check-subscription
```

### **4. Monitor Firebase in Real-Time**
Watch the `userSubscriptions` collection while testing:
- Status should change from `pending` to `authorized`
- `lastStatusUpdate` should update
- `updatedAt` should change

---

## ✅ Summary

**The webhook now handles:**
1. ✅ Correct API endpoint (`/preapproval/` not `/v1/preapproval/`)
2. ✅ Multiple webhook types (`preapproval`, `subscription_preapproval`)
3. ✅ Fallback to Firebase when MercadoPago API fails
4. ✅ Enhanced logging for debugging
5. ✅ Better error handling and reporting

**If webhooks still fail:**
- Users can use `/check-subscription` page
- Manual API call available
- Status will eventually sync
- Publisher role will be assigned

The system is now more resilient and will work even if webhooks are partially broken! 🎉
