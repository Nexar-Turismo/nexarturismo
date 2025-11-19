# 🚀 Quick Start: MercadoPago OAuth Setup

## ✅ What's Been Done

The MercadoPago OAuth integration is **fully implemented and ready to use**. Here's what was built:

- ✅ OAuth authorization endpoint
- ✅ OAuth callback handler
- ✅ Frontend OAuth button with proper flow
- ✅ Success/error message handling
- ✅ Secure token storage in Firebase
- ✅ Complete error handling

## 📋 What You Need to Do (5 Minutes)

### Step 1: Create MercadoPago App (2 min)

1. Go to: https://www.mercadopago.com/developers/panel/app
2. Click **"Create Application"**
3. Copy your **App ID** and **Client Secret**

### Step 2: Add Environment Variables (1 min)

Create or edit `.env.local` in your project root:

```env
MERCADOPAGO_APP_ID=your_app_id_here
MERCADOPAGO_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Step 3: Configure Redirect URI in MercadoPago (1 min)

In your MercadoPago app settings, add:
```
http://localhost:3000/api/mercadopago/oauth/callback
```

### Step 4: Restart Server (30 sec)

Stop and restart your development server to load the new environment variables.

### Step 5: Test It! (30 sec)

1. Log in as a **Superadmin**
2. Go to **Settings**
3. Click **"Conectar con la cuenta principal de Mercado Pago"**
4. Click **"Conectar con MercadoPago OAuth"**
5. Authorize on MercadoPago
6. Done! ✨

## 🎯 Quick Test

Run this command to verify your environment is set up:

```bash
# On Linux/Mac
grep MERCADOPAGO .env.local

# On Windows
findstr MERCADOPAGO .env.local
```

You should see your App ID and Client Secret.

## 📱 Visual Flow

```
Settings Page
    ↓
[Click "Conectar con MercadoPago"]
    ↓
Modal Opens
    ↓
[Click "Conectar con MercadoPago OAuth"]
    ↓
Redirects to MercadoPago
    ↓
[Authorize on MercadoPago]
    ↓
Returns to Settings
    ↓
✅ Success Message!
```

## 🔍 Verify It Worked

After connecting:

1. Check Firebase Console → `systemSettings/mercadoPagoAccount`
2. You should see:
   - ✅ accessToken
   - ✅ publicKey
   - ✅ isActive: true

## ❌ Common Issues

### "OAuth configuration missing"
**Solution**: Add environment variables and restart server

### "Redirect URI mismatch"
**Solution**: Check that MercadoPago redirect URI matches exactly:
```
http://localhost:3000/api/mercadopago/oauth/callback
```

### Button does nothing
**Solution**: Open browser console (F12) to see error messages

## 📚 Need More Details?

- **Full Setup Guide**: `MERCADOPAGO_OAUTH_SETUP.md`
- **Implementation Details**: `OAUTH_IMPLEMENTATION_SUMMARY.md`

## 🚀 Production Deployment

When deploying to production:

1. Update `.env.local` → `.env.production`:
   ```env
   MERCADOPAGO_APP_ID=your_production_app_id
   MERCADOPAGO_CLIENT_SECRET=your_production_client_secret
   NEXT_PUBLIC_BASE_URL=https://yourdomain.com
   ```

2. Update MercadoPago redirect URI to:
   ```
   https://yourdomain.com/api/mercadopago/oauth/callback
   ```

3. Deploy and test!

## 💡 Pro Tips

- **Use Test Credentials**: Start with MercadoPago test credentials
- **Check Console**: Always check browser console and server logs
- **Test User**: Make sure you have a Superadmin user created
- **Manual Fallback**: You can still enter credentials manually if OAuth fails

## 🎉 You're Ready!

Once you complete the 5-minute setup above, you can:
- ✅ Connect your MercadoPago account via OAuth
- ✅ Manage subscription plans
- ✅ Process payments securely
- ✅ Track all transactions

Happy coding! 🚀

