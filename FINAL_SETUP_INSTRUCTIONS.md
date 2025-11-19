# 🚀 Final Setup Instructions - MercadoPago Integration

## Overview

The MercadoPago integration is now complete and uses **environment variables** for credentials. No more database forms or UI configuration needed!

## ✅ What Was Implemented

### 1. Environment Variable Configuration
- ✅ Removed database credential storage
- ✅ Removed Settings UI forms
- ✅ All credentials now in `.env.local`
- ✅ Cleaner, more secure, standard approach

### 2. Two Separate Credential Sets

#### **Subscriptions** (Currently Active)
Used for subscription plan management:
- `NEXAR_SUSCRIPTIONS_PUBLIC_KEY`
- `NEXAR_SUSCRIPTIONS_SECRET_KEY`

#### **Marketplace** (For Future Use)
Used for marketplace operations:
- `NEXAR_MARKETPLACE_PUBLIC_KEY`
- `NEXAR_MARKETPLACE_SECRET_KEY`
- `NEXAR_MARKETPLACE_APP_ID`
- `NEXAR_MARKETPLACE_CLIENT_SECRET`

## 📋 Quick Setup (5 Minutes)

### Step 1: Create `.env.local` File

In your project root (same folder as `package.json`):

```bash
touch .env.local
```

### Step 2: Add These Variables

Copy and paste into `.env.local`:

```env
# ===========================================
# Firebase Configuration (Already Working)
# ===========================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDrKGzm1ow1Ubq4Cy1JGUt9FhMkFsIxxIw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=marketplace-turismo.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=marketplace-turismo
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=marketplace-turismo.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=2810288247
NEXT_PUBLIC_FIREBASE_APP_ID=1:2810288247:web:82aa82158154691b080e72

# ===========================================
# Application URL (IMPORTANT!)
# Must be a publicly accessible URL
# ===========================================
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# For local testing with ngrok:
# NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io

# ===========================================
# MercadoPago - Subscriptions
# Get from: https://www.mercadopago.com/developers/panel/credentials
# ===========================================
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=APP_USR-your-public-key-here
NEXAR_SUSCRIPTIONS_ACCESS_TOKEN=APP_USR-your-access-token-here

# ===========================================
# MercadoPago - Marketplace (Optional for now)
# ===========================================
NEXAR_MARKETPLACE_PUBLIC_KEY=APP_USR-your-public-key-here
NEXAR_MARKETPLACE_ACCESS_TOKEN=APP_USR-your-access-token-here
NEXAR_MARKETPLACE_APP_ID=your-app-id
NEXAR_MARKETPLACE_CLIENT_SECRET=your-client-secret
```

### Step 3: Get Your MercadoPago Credentials

1. Visit: https://www.mercadopago.com/developers/panel/credentials
2. Log in with your MercadoPago account
3. Copy your **Test** credentials:
   - Public Key (starts with `TEST-`)
   - Access Token (starts with `TEST-`)

### Step 4: Update `.env.local`

Replace the placeholder values with your real credentials:

```env
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=TEST-1234567890abcdef...
NEXAR_SUSCRIPTIONS_SECRET_KEY=TEST-9876543210fedcba...
```

### Step 5: Restart Server

**This is crucial!** Environment variables only load on server start:

```bash
# Stop your server (Ctrl+C)
npm run dev
```

### Step 6: Test It!

1. Navigate to Plans page
2. Click "Create Plan"
3. Fill in details
4. Submit
5. Check console for:
   ```
   ✅ [MercadoPago Sync Plan] Plan created successfully
   ✅ Plan synced with MercadoPago: plan_xxx
   ```

## 🎯 What Changed From Previous Setup

### Before (Database Credentials)
```
Settings → MercadoPago Suscripción Form
  → Enter Public Key
  → Enter Access Token
  → Save to Firebase
```

### After (Environment Variables)
```
.env.local file
  → NEXAR_SUSCRIPTIONS_PUBLIC_KEY=xxx
  → NEXAR_SUSCRIPTIONS_SECRET_KEY=xxx
  → Restart server
```

## 🔐 Security Benefits

### Why Environment Variables Are Better

1. ✅ **Never Committed** - `.env.local` is in `.gitignore`
2. ✅ **Server-Side Only** - Never exposed to browser (no `NEXT_PUBLIC_` prefix)
3. ✅ **Standard Practice** - Industry best practice
4. ✅ **Easy Deployment** - Built into all hosting platforms
5. ✅ **No Database Calls** - Faster, more reliable
6. ✅ **Credential Rotation** - Easy to update

## 📊 Current Status

### ✅ Removed

- ❌ `MercadoPagoForm` component (deleted from Settings)
- ❌ `MercadoPagoConnectForm` component (deleted from Settings)
- ❌ Database credential storage (no longer used)
- ❌ Settings UI forms for credentials

### ✅ Using Now

- ✅ Environment variables only
- ✅ Official MercadoPago SDK
- ✅ Automatic plan synchronization
- ✅ Visual sync status indicators

## 🚨 Important Notes

### About `NEXT_PUBLIC_BASE_URL`

**MercadoPago requires a publicly accessible URL!**

```
❌ Won't work:
- http://localhost:3000
- http://192.168.1.100:3000
- http://127.0.0.1:3000

✅ Will work:
- https://yourdomain.com
- https://abc123.ngrok.io (for local testing)
- https://yourapp.vercel.app
```

### For Local Testing

Use **ngrok** to create a public URL:

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Add to .env.local:
NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io

# Restart your Next.js server
```

## 🎨 Visual Sync Status

Plans now show sync status:

```
┌────────────────────────────┐
│ Basic Plan       Active ✓  │
│ $1000/month      ✅ Synced │
│                            │
│ [Edit] [Deactivate] [Del]  │
└────────────────────────────┘

┌────────────────────────────┐
│ Pro Plan         Active ✓  │
│ $2000/month   ⚠️ Not Synced│
│                            │
│ ⚠️ MercadoPago Sync Failed │
│ Try manual sync or check   │
│ your configuration.        │
│                            │
│ [Edit] [Deactivate] [Del]  │
└────────────────────────────┘
```

## 📝 Testing Checklist

After setup, verify:

- [ ] `.env.local` file created in project root
- [ ] All 6 MercadoPago variables set (or at least subscription ones)
- [ ] `NEXT_PUBLIC_BASE_URL` set to public URL
- [ ] Development server restarted
- [ ] Create a test plan → Shows ✅ Synced
- [ ] Plan has `mercadoPagoPlanId` in Firebase
- [ ] Plan appears in MercadoPago dashboard
- [ ] No error messages in console

## 🔄 Migration from Database Credentials

If you previously configured credentials via UI:

1. **Get your credentials from Firebase:**
   ```
   Firebase Console → Firestore
   → systemSettings → mercadoPagoCredentials
   → Copy publicKey and accessToken
   ```

2. **Add to `.env.local`:**
   ```env
   NEXAR_SUSCRIPTIONS_PUBLIC_KEY=<copied-public-key>
   NEXAR_SUSCRIPTIONS_SECRET_KEY=<copied-access-token>
   ```

3. **Restart server**

4. **Test plan creation**

5. **Done!** Database credentials no longer used

## 🎓 Understanding the Setup

### Credential Separation

```
SUBSCRIPTIONS (Plans Management)
├─ NEXAR_SUSCRIPTIONS_PUBLIC_KEY
└─ NEXAR_SUSCRIPTIONS_SECRET_KEY
   Used for: Creating/updating/syncing subscription plans

MARKETPLACE (Marketplace Operations)
├─ NEXAR_MARKETPLACE_PUBLIC_KEY
├─ NEXAR_MARKETPLACE_SECRET_KEY
├─ NEXAR_MARKETPLACE_APP_ID
└─ NEXAR_MARKETPLACE_CLIENT_SECRET
   Used for: Marketplace payments, seller integrations
```

### Variable Naming Convention

```
NEXAR_<FEATURE>_<TYPE>

Examples:
- NEXAR_SUSCRIPTIONS_PUBLIC_KEY
- NEXAR_MARKETPLACE_SECRET_KEY
```

## 💻 Example `.env.local` File

Here's a complete example with dummy values:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDrKGzm1ow1Ubq4Cy1JGUt9FhMkFsIxxIw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=marketplace-turismo.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=marketplace-turismo
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=marketplace-turismo.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=2810288247
NEXT_PUBLIC_FIREBASE_APP_ID=1:2810288247:web:82aa82158154691b080e72

# Application URL (use your ngrok URL for testing)
NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io

# MercadoPago Subscriptions
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=TEST-1234567890abcdef1234567890abcdef
NEXAR_SUSCRIPTIONS_SECRET_KEY=TEST-fedcba0987654321fedcba0987654321

# MercadoPago Marketplace (optional for now)
NEXAR_MARKETPLACE_PUBLIC_KEY=TEST-abcd1234efgh5678ijkl9012mnop3456
NEXAR_MARKETPLACE_SECRET_KEY=TEST-zyxw9876vuts5432rqpo1098nmlk7654
NEXAR_MARKETPLACE_APP_ID=1234567890
NEXAR_MARKETPLACE_CLIENT_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz123456
```

## 🚀 Ready to Go!

Once you complete these steps:

1. ✅ Create `.env.local` with your credentials
2. ✅ Restart server
3. ✅ Create a plan
4. ✅ Watch it sync automatically
5. ✅ See the green ✅ Synced badge

## 📞 Need Help?

**If sync fails:**
1. Check server console for error messages
2. Verify credentials are correct in MercadoPago dashboard
3. Ensure `NEXT_PUBLIC_BASE_URL` is publicly accessible
4. Try manual sync: "Sync with MercadoPago" button

**If variables not loading:**
1. Check `.env.local` is in project root
2. Check variable names match exactly
3. Restart development server
4. Clear `.next` folder if needed

---

**Status:** ✅ **Ready to Configure**

**Time to Setup:** ~5 minutes

**Complexity:** Easy - just copy/paste and restart!

**Next Step:** Create your `.env.local` file and restart the server! 🎉

