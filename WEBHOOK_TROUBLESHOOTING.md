# 🔔 MercadoPago Webhook Troubleshooting Guide

## Problem: Subscriptions Stay in "Pending" Status

### **Symptoms:**
- ✅ Payment processed successfully in MercadoPago
- ❌ Subscription status remains "pending" in Firebase
- ❌ Publisher role not assigned to user
- ❌ User cannot create posts

### **Root Cause:**
MercadoPago webhooks are not being received or processed correctly.

---

## 🔍 Diagnostic Steps

### **1. Check Current Subscription Status**

Use the manual status checker:

```bash
# Navigate to the diagnostic page
https://your-domain.com/check-subscription

# Or call the API directly
GET /api/mercadopago/check-subscription-status?userId=USER_ID
```

This will:
- Query MercadoPago API for actual subscription status
- Compare with Firebase status
- Update Firebase if status mismatch found
- Trigger role assignment if needed

### **2. Verify Webhook Configuration in MercadoPago**

1. **Login to MercadoPago Developer Portal**
   - Go to: https://www.mercadopago.com.ar/developers
   - Navigate to your application
   - Go to "Webhooks" or "IPN" section

2. **Check Webhook URL**
   - Should be: `https://your-domain.com/api/mercadopago/subscription-webhook`
   - Must be HTTPS (not HTTP)
   - Must be publicly accessible
   - Cannot be `localhost` or `127.0.0.1`

3. **Verify Webhook Topics**
   - ✅ Enable: `subscription_preapproval` (for subscriptions)
   - ✅ Enable: `payment` (for payment notifications)
   - ✅ Enable: `subscription_authorized_payment` (optional)

4. **Test Webhook**
   - MercadoPago provides a "Send test notification" button
   - Click it to verify your endpoint receives notifications

---

## 🔧 Common Issues & Solutions

### **Issue 1: Webhook URL Not Configured**

**Problem:** No webhook URL set in MercadoPago

**Solution:**
```bash
# Option A: Use MCP Tool (if available)
mcp_mercadopago-mcp-server-prod_save_webhook

# Option B: Manual configuration
1. Go to https://www.mercadopago.com.ar/developers/panel/app/YOUR_APP_ID/webhooks
2. Set Production URL: https://asia-forworn-willena.ngrok-free.dev/api/mercadopago/subscription-webhook
3. Select topics: subscription_preapproval, payment
4. Save configuration
```

### **Issue 2: Webhook URL is localhost**

**Problem:** Webhook configured with `http://localhost:3000`

**Why it fails:**
- MercadoPago servers cannot reach localhost
- Webhooks are sent from MercadoPago's servers to your server

**Solution:**
Use one of these options:

**A. Use ngrok for development:**
```bash
# Start ngrok
ngrok http 3000

# Use the ngrok URL (e.g., https://abc123.ngrok.io)
# Configure in MercadoPago:
https://asia-forworn-willena.ngrok-free.dev/api/mercadopago/subscription-webhook
```

**B. Use production/staging URL:**
```bash
# Production
https://marketplace-turismo-al2n.vercel.app/api/mercadopago/subscription-webhook

# Development (ngrok)
https://asia-forworn-willena.ngrok-free.dev/api/mercadopago/subscription-webhook
```

### **Issue 3: Wrong Webhook Topic**

**Problem:** Webhook configured but wrong topics selected

**Expected Topics:**
- ✅ `subscription_preapproval` - For subscription status changes
- ✅ `payment` - For payment notifications
- ✅ `subscription_authorized_payment` - For recurring payments

**Verification:**
Check server logs for incoming webhooks:
```
🔔 [MercadoPago Subscription Webhook] Received notification: { type: '...', data: {...} }
```

If you see:
- `type: 'payment'` → Payment webhook is working
- `type: 'preapproval'` → Subscription webhook is working

### **Issue 4: Webhook Endpoint Returns Error**

**Problem:** Webhook endpoint crashes or returns error

**Check logs for:**
```
❌ [MercadoPago Subscription Webhook] Error: ...
```

**Common causes:**
- Missing environment variables
- Database connection issues
- Invalid data format
- Timeout issues

**Solution:**
1. Check all environment variables are set
2. Verify Firebase connection
3. Test endpoint manually with curl

### **Issue 5: Status Changed but Role Not Assigned**

**Problem:** Subscription status updated but Publisher role missing

**Verification:**
```bash
# Check user roles in Firebase
# User document should have:
{
  roles: [
    { roleName: 'client', isActive: true },
    { roleName: 'publisher', isActive: true }  // This should be added
  ]
}
```

**Solution:**
The auth middleware should trigger automatically, but you can:

1. **Use the manual checker:**
   - Go to `/check-subscription`
   - Click "Check Subscription Status"
   - This will trigger role update

2. **Call the middleware API:**
```bash
POST /api/auth/middleware/check-user
{
  "userId": "USER_ID"
}
```

---

## 🧪 Testing Webhook Locally

### **Option 1: Use ngrok**

```bash
# 1. Start your development server
npm run dev

# 2. Start ngrok in another terminal
ngrok http 3000

# 3. Copy the ngrok URL (e.g., https://abc123.ngrok-free.app)

# 4. Configure webhook in MercadoPago:
https://abc123.ngrok-free.app/api/mercadopago/subscription-webhook

# 5. Create a test subscription

# 6. Check your terminal for webhook logs:
🔔 [MercadoPago Subscription Webhook] Received notification: ...
```

### **Option 2: Manual Webhook Simulation**

```bash
# Simulate a subscription webhook
curl -X POST http://localhost:3000/api/mercadopago/subscription-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "preapproval",
    "data": {
      "id": "MERCADOPAGO_SUBSCRIPTION_ID"
    }
  }'
```

---

## 📊 Webhook Flow Diagram

```
User Subscribes
     ↓
MercadoPago Creates PreApprovalPlan
     ↓
Subscription Saved to Firebase (status: "pending")
     ↓
User Completes Payment
     ↓
MercadoPago Sends Webhook → /api/mercadopago/subscription-webhook
     ↓
Webhook Fetches Subscription from MercadoPago API
     ↓
Webhook Updates Firebase Subscription (status: "authorized")
     ↓
Auth Middleware Triggered
     ↓
Publisher Role Assigned
     ↓
User Can Create Posts ✅
```

**If webhook fails, the flow stops at step 6!**

---

## 🛠️ Manual Fix Procedure

If webhooks are not working and you need to fix subscriptions immediately:

### **Step 1: Identify Affected Subscriptions**
```bash
# Check Firebase for pending subscriptions
- Go to Firebase Console
- Navigate to "userSubscriptions" collection
- Filter: status == "pending"
- Note the subscription IDs and mercadoPagoSubscriptionId values
```

### **Step 2: Check MercadoPago Status**
```bash
# For each subscription, check MercadoPago status
GET https://api.mercadopago.com/preapproval/{mercadoPagoSubscriptionId}
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### **Step 3: Use Manual Status Checker**
```bash
# Use the diagnostic tool for each user
1. Go to https://your-domain.com/check-subscription
2. Log in as the user (or use their userId)
3. Click "Check Subscription Status"
4. Tool will automatically:
   - Fetch status from MercadoPago
   - Update Firebase
   - Assign Publisher role
```

### **Step 4: Verify Role Assignment**
```bash
# Check user document in Firebase
- roles array should include:
  { roleName: 'publisher', isActive: true, assignedAt: [Date] }
```

---

## 🔍 Debugging Checklist

Use this checklist to diagnose webhook issues:

- [ ] **Webhook URL configured in MercadoPago**
  - [ ] URL is HTTPS
  - [ ] URL is publicly accessible
  - [ ] URL format: `https://domain.com/api/mercadopago/subscription-webhook`

- [ ] **Webhook topics enabled**
  - [ ] `subscription_preapproval` enabled
  - [ ] `payment` enabled

- [ ] **Environment variables set**
  - [ ] `NEXAR_SUSCRIPTIONS_ACCESS_TOKEN` set
  - [ ] `NEXAR_SUSCRIPTIONS_PUBLIC_KEY` set
  - [ ] `NEXT_PUBLIC_BASE_URL` set

- [ ] **Webhook endpoint working**
  - [ ] Returns 200 OK for test requests
  - [ ] No errors in server logs
  - [ ] Can fetch data from MercadoPago API

- [ ] **Firebase connection working**
  - [ ] Can read subscriptions
  - [ ] Can update subscriptions
  - [ ] No timeout errors

- [ ] **Auth middleware working**
  - [ ] Can assign roles
  - [ ] No permission errors
  - [ ] Roles persist after assignment

---

## 📞 Quick Fix Commands

### **Fix Single User Subscription:**
```bash
# Call the diagnostic API
curl "https://your-domain.com/api/mercadopago/check-subscription-status?userId=USER_ID"
```

### **Fix All Pending Subscriptions:**
```javascript
// Run this in Firebase console or admin script
const pendingSubscriptions = await db.collection('userSubscriptions')
  .where('status', '==', 'pending')
  .get();

for (const doc of pendingSubscriptions.docs) {
  const userId = doc.data().userId;
  // Call diagnostic API for each user
  await fetch(`https://your-domain.com/api/mercadopago/check-subscription-status?userId=${userId}`);
}
```

### **Manually Assign Publisher Role:**
```javascript
// In case of emergency, manually assign role
await firebaseDB.users.assignRole(userId, 'publisher', 'manual-fix');
```

---

## ✅ Verification After Fix

After implementing fixes, verify:

1. **Create test subscription**
2. **Check webhook logs** - should see notification received
3. **Verify Firebase** - subscription status should update
4. **Check user roles** - Publisher role should be assigned
5. **Test post creation** - User should be able to create posts

---

## 🚀 Recommended Setup

For production, we recommend:

1. **Primary Webhook:** Production URL
   ```
   https://marketplace-turismo-al2n.vercel.app/api/mercadopago/subscription-webhook
   ```

2. **Backup Webhook:** Alternative URL (if available)
   ```
   https://backup-domain.com/api/mercadopago/subscription-webhook
   ```

3. **Manual Status Checker:** Always available
   ```
   https://your-domain.com/check-subscription
   ```

4. **Monitoring:** Set up alerts for:
   - Webhook failures
   - Subscription status mismatches
   - Role assignment errors

---

## 📝 Summary

**The Problem:** Webhook not received = Status stays pending = Role not assigned = User can't publish

**The Solution:** 
1. Configure webhook correctly in MercadoPago
2. Use manual status checker as backup
3. Monitor webhook logs regularly

**Quick Fix:** Use `/check-subscription` page to manually sync status
