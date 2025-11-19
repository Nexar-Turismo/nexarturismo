# 🔧 Subscription Status Fix - Complete Solution

## Problem Summary

**Issue:** Publisher role not being assigned after successful subscription payment

**Symptoms:**
- ✅ Payment processed successfully in MercadoPago
- ❌ Subscription status remains "pending" in Firebase
- ❌ Publisher role not assigned to user
- ❌ User cannot create posts

**Root Cause:** MercadoPago webhooks not configured or not being received

---

## ✅ Solution Implemented

### **1. Manual Subscription Status Checker**

Created diagnostic tools to manually check and update subscription status:

#### **A. Diagnostic API Endpoint**
```
GET /api/mercadopago/check-subscription-status?userId={userId}
```

**Features:**
- Queries MercadoPago API for actual subscription status
- Compares with Firebase status
- Updates Firebase if mismatch found
- Triggers auth middleware to assign Publisher role
- Returns detailed status report

**Response Example:**
```json
{
  "success": true,
  "checked": 1,
  "results": [
    {
      "subscriptionId": "firebase-doc-id",
      "mercadoPagoId": "mp-subscription-id",
      "firebaseStatus": "pending",
      "mercadoPagoStatus": "authorized",
      "needsUpdate": true,
      "updated": true,
      "mercadoPagoDetails": {
        "id": "mp-subscription-id",
        "status": "authorized",
        "reason": "Suscripción: Básico",
        "auto_recurring": {...}
      }
    }
  ]
}
```

#### **B. User-Friendly Dashboard Page**
```
/check-subscription
```

**Features:**
- One-click subscription status check
- Visual status indicators
- Detailed results display
- Troubleshooting tips
- Automatic user data refresh after update

---

## 🚀 How to Use

### **For Users (Simple Fix):**

1. **Navigate to the diagnostic page:**
   ```
   https://your-domain.com/check-subscription
   ```

2. **Click "Check Subscription Status" button**
   - Tool will check MercadoPago
   - Update Firebase if needed
   - Assign Publisher role
   - Show results

3. **Verify results:**
   - Status should change from "pending" to "authorized"
   - "Updated" badge should appear
   - Page will refresh user data automatically

4. **Test Publisher access:**
   - Try creating a post
   - Publisher role should now be active

### **For Developers (API):**

```bash
# Check specific user
curl "https://your-domain.com/api/mercadopago/check-subscription-status?userId=USER_ID"

# Check specific subscription
curl "https://your-domain.com/api/mercadopago/check-subscription-status?subscriptionId=SUBSCRIPTION_ID"
```

---

## 🔍 Understanding the Issue

### **Normal Flow (When Webhooks Work):**

```
1. User subscribes
2. Payment processed in MercadoPago
3. MercadoPago sends webhook
4. Our server receives webhook
5. Subscription status updated in Firebase
6. Auth middleware triggered
7. Publisher role assigned
8. User can create posts ✅
```

### **Broken Flow (When Webhooks Don't Work):**

```
1. User subscribes
2. Payment processed in MercadoPago
3. MercadoPago sends webhook ❌ (Not received)
4. Our server never knows payment completed
5. Subscription stays "pending" in Firebase
6. Auth middleware never triggered
7. Publisher role NOT assigned
8. User CANNOT create posts ❌
```

### **Our Fix (Manual Check):**

```
1. User/Admin triggers manual check
2. Our server queries MercadoPago API directly
3. Gets actual subscription status
4. Updates Firebase with correct status
5. Triggers auth middleware
6. Publisher role assigned
7. User can create posts ✅
```

---

## 🔧 Webhook Configuration

To prevent this issue in the future, configure webhooks in MercadoPago:

### **Step 1: Access MercadoPago Developer Portal**
```
https://www.mercadopago.com.ar/developers/panel/app/YOUR_APP_ID/webhooks
```

### **Step 2: Configure Webhook URL**

**Production:**
```
https://marketplace-turismo-al2n.vercel.app/api/mercadopago/subscription-webhook
```

**Development (ngrok):**
```
https://asia-forworn-willena.ngrok-free.dev/api/mercadopago/subscription-webhook
```

**Important:**
- ✅ Use HTTPS (not HTTP)
- ✅ Must be publicly accessible
- ❌ Cannot use localhost
- ❌ Cannot use 127.0.0.1

### **Step 3: Select Topics**

Enable these webhook topics:
- ✅ `subscription_preapproval` - Subscription status changes
- ✅ `payment` - Payment notifications
- ✅ `subscription_authorized_payment` - Recurring payments

### **Step 4: Test Webhook**

MercadoPago provides a "Send test notification" button:
1. Click the test button
2. Check server logs for:
   ```
   🔔 [MercadoPago Subscription Webhook] Received notification: ...
   ```
3. If you see this log, webhooks are working!

---

## 📊 Diagnostic Information

### **Check Firebase Subscriptions:**

Look in the `userSubscriptions` collection for:
```javascript
{
  id: "subscription-doc-id",
  userId: "user-id",
  mercadoPagoSubscriptionId: "mp-subscription-id",
  status: "pending", // ❌ Should be "authorized"
  planName: "Básico",
  amount: 5000,
  // ...
}
```

### **Check MercadoPago Status:**

Query MercadoPago API:
```bash
curl "https://api.mercadopago.com/preapproval/MP_SUBSCRIPTION_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response shows actual status:
```json
{
  "id": "mp-subscription-id",
  "status": "authorized", // ✅ Actual status
  "reason": "Suscripción: Básico",
  // ...
}
```

### **Check User Roles:**

Look in the `users` collection for:
```javascript
{
  id: "user-id",
  roles: [
    { roleName: "client", isActive: true },
    // { roleName: "publisher", isActive: true } ❌ Missing!
  ],
  // ...
}
```

---

## 🎯 Quick Reference

### **Problem: Status is "pending"**
**Solution:** Use `/check-subscription` page

### **Problem: Status is "authorized" but no Publisher role**
**Solution:** 
1. Use `/check-subscription` page
2. Or call: `POST /api/auth/middleware/check-user` with userId

### **Problem: Webhooks not working at all**
**Solution:** 
1. Configure webhook URL in MercadoPago
2. Use ngrok for local development
3. Use manual checker as backup

---

## 🧪 Testing Checklist

After implementing the fix:

- [ ] **Test manual status checker:**
  - [ ] Navigate to `/check-subscription`
  - [ ] Click "Check Subscription Status"
  - [ ] Verify status updates
  - [ ] Verify role is assigned

- [ ] **Test with pending subscription:**
  - [ ] Find user with pending subscription
  - [ ] Run manual check
  - [ ] Verify status changes to "authorized"
  - [ ] Verify Publisher role assigned
  - [ ] User can create posts

- [ ] **Test API endpoint:**
  - [ ] Call API with userId
  - [ ] Verify JSON response
  - [ ] Check Firebase for updates
  - [ ] Check user roles

- [ ] **Configure webhooks:**
  - [ ] Set webhook URL in MercadoPago
  - [ ] Enable correct topics
  - [ ] Send test notification
  - [ ] Verify webhook received in logs

---

## 📝 Files Created/Modified

### **New Files:**
1. **`src/app/api/mercadopago/check-subscription-status/route.ts`**
   - API endpoint for manual status checking
   - Queries MercadoPago and updates Firebase
   - Triggers role assignment

2. **`src/app/(dashboard)/check-subscription/page.tsx`**
   - User-friendly diagnostic page
   - Visual status checker
   - Troubleshooting guide

3. **`WEBHOOK_TROUBLESHOOTING.md`**
   - Complete troubleshooting guide
   - Webhook configuration instructions
   - Common issues and solutions

4. **`SUBSCRIPTION_STATUS_FIX.md`** (this file)
   - Summary of the fix
   - Usage instructions
   - Quick reference

### **No Changes to Existing Files**
The fix is implemented as new endpoints and pages, no modifications to existing webhook or auth logic.

---

## ✅ Benefits of This Solution

1. **Non-Breaking** - Doesn't modify existing webhook logic
2. **User-Friendly** - Simple one-click fix for users
3. **Developer-Friendly** - API endpoint for automation
4. **Diagnostic** - Provides detailed status information
5. **Safe** - Only updates when needed
6. **Automatic** - Triggers role assignment automatically
7. **Scalable** - Can be used for bulk fixes

---

## 🚀 Next Steps

1. **Deploy the changes**
2. **Configure webhook in MercadoPago**
3. **Share `/check-subscription` link with affected users**
4. **Monitor for webhook issues**
5. **Set up monitoring/alerts for subscription status mismatches**

---

## 📞 Support

If you encounter issues:

1. **Check server logs** for errors
2. **Use `/check-subscription` diagnostic page**
3. **Review `WEBHOOK_TROUBLESHOOTING.md` guide**
4. **Verify webhook configuration in MercadoPago**
5. **Contact support with subscription ID and user ID**

---

## 🎉 Summary

We've created a complete solution for the subscription status issue:

✅ **Manual status checker** - Fixes pending subscriptions instantly
✅ **Diagnostic tools** - Identifies and resolves status mismatches  
✅ **User-friendly interface** - One-click fix for end users
✅ **Developer API** - Automation and bulk fix capabilities
✅ **Comprehensive documentation** - Troubleshooting and configuration guides

The Publisher role will now be assigned correctly after using the manual checker! 🚀
