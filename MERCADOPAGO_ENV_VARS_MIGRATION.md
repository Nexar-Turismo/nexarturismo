# MercadoPago Environment Variables Migration

## ✅ Changes Made

**Migrated from database credentials to environment variables** for better security and deployment practices.

### Before (Database Credentials)
- ❌ Credentials stored in Firebase
- ❌ UI forms for configuration
- ❌ Firebase dependency for API routes
- ❌ Timeout issues with Firebase client SDK

### After (Environment Variables)
- ✅ Credentials in environment variables
- ✅ No UI forms needed
- ✅ No Firebase dependency for credentials
- ✅ Faster, more reliable
- ✅ Standard deployment practice

## 📦 Environment Variables

### Subscription Management

Used for subscription plans (PreApprovalPlan):

```env
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=APP_USR-xxxxxxxx
NEXAR_SUSCRIPTIONS_ACCESS_TOKEN=APP_USR-xxxxxxxx
```

### Marketplace Operations

Used for marketplace features (future use):

```env
NEXAR_MARKETPLACE_PUBLIC_KEY=APP_USR-xxxxxxxx
NEXAR_MARKETPLACE_ACCESS_TOKEN=APP_USR-xxxxxxxx
NEXAR_MARKETPLACE_APP_ID=your_app_id
NEXAR_MARKETPLACE_CLIENT_SECRET=your_client_secret
```

### Application URL

Used for MercadoPago callbacks:

```env
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## 🔧 Setup Instructions

### 1. Get MercadoPago Credentials

Visit [MercadoPago Credentials](https://www.mercadopago.com/developers/panel/credentials):

1. Log in to your MercadoPago account
2. Navigate to "Credentials" section
3. Copy your credentials:
   - **Public Key**: `TEST-xxx` or `APP-xxx`
   - **Access Token** (Secret Key): `TEST-xxx` or `APP-xxx`

### 2. Create `.env.local` File

In your project root:

```bash
touch .env.local
```

### 3. Add Credentials

Copy this template and fill in your credentials:

```env
# ===========================================
# Firebase Configuration
# ===========================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDrKGzm1ow1Ubq4Cy1JGUt9FhMkFsIxxIw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=marketplace-turismo.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=marketplace-turismo
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=marketplace-turismo.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=2810288247
NEXT_PUBLIC_FIREBASE_APP_ID=1:2810288247:web:82aa82158154691b080e72

# ===========================================
# Application URL
# ===========================================
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# ===========================================
# MercadoPago - Subscriptions
# ===========================================
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=TEST-your-public-key-here
NEXAR_SUSCRIPTIONS_SECRET_KEY=TEST-your-secret-key-here

# ===========================================
# MercadoPago - Marketplace
# ===========================================
NEXAR_MARKETPLACE_PUBLIC_KEY=TEST-your-public-key-here
NEXAR_MARKETPLACE_SECRET_KEY=TEST-your-secret-key-here
NEXAR_MARKETPLACE_APP_ID=your-app-id
NEXAR_MARKETPLACE_CLIENT_SECRET=your-client-secret
```

### 4. Restart Development Server

**Important:** Environment variables only load on server start.

```bash
# Stop the server (Ctrl+C)
npm run dev
```

### 5. Verify Configuration

Check that variables are loaded:

```bash
# Should show your public key
echo $NEXAR_SUSCRIPTIONS_PUBLIC_KEY
```

## 📊 Variable Usage

### Subscription Plans API Routes

These routes use `NEXAR_SUSCRIPTIONS_*` variables:

- `/api/mercadopago/sync-plan` - Sync individual plan
- `/api/mercadopago/sync-plans` - Sync all plans
- `/api/mercadopago/delete-plan` - Delete plan

```typescript
const publicKey = process.env.NEXAR_SUSCRIPTIONS_PUBLIC_KEY;
const accessToken = process.env.NEXAR_SUSCRIPTIONS_SECRET_KEY;
```

### Marketplace API Routes (Future)

These will use `NEXAR_MARKETPLACE_*` variables:

- Marketplace operations
- OAuth flows
- Seller integrations

## 🔐 Security Best Practices

### Development

```env
# Use TEST credentials
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=TEST-xxx
NEXAR_SUSCRIPTIONS_SECRET_KEY=TEST-xxx
```

### Production

```env
# Use APP credentials
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=APP-xxx
NEXAR_SUSCRIPTIONS_SECRET_KEY=APP-xxx
```

### Never Commit

**The `.env.local` file is in `.gitignore`** and should never be committed:

```bash
# ❌ NEVER DO THIS:
git add .env.local
git commit -m "Add credentials"

# ✅ DO THIS INSTEAD:
# Keep .env.local in .gitignore
# Share credentials securely (1Password, etc.)
```

## 🚀 Deployment

### Vercel

1. Go to Project Settings → Environment Variables
2. Add each variable:
   - `NEXAR_SUSCRIPTIONS_PUBLIC_KEY`
   - `NEXAR_SUSCRIPTIONS_SECRET_KEY`
   - `NEXAR_MARKETPLACE_PUBLIC_KEY`
   - `NEXAR_MARKETPLACE_SECRET_KEY`
   - `NEXAR_MARKETPLACE_APP_ID`
   - `NEXAR_MARKETPLACE_CLIENT_SECRET`
   - `NEXT_PUBLIC_BASE_URL`
3. Redeploy

### Other Platforms

Set environment variables according to your hosting platform:

- **Netlify**: Site settings → Environment variables
- **Railway**: Project → Variables
- **AWS**: Parameter Store or Secrets Manager
- **Docker**: Environment variables in docker-compose.yml

## 🔄 Migration Checklist

- [x] Remove MercadoPago credential forms from Settings
- [x] Update API routes to use env vars
- [x] Update sync-plan route
- [x] Update sync-plans route
- [x] Update delete-plan route
- [x] Create `.env.example` file
- [x] Update ENV_SETUP_GUIDE.md
- [ ] Set credentials in `.env.local`
- [ ] Restart development server
- [ ] Test plan creation
- [ ] Verify sync works
- [ ] Deploy with env vars configured

## ✅ Verification

### Check Variables Are Loaded

Create a test API route or check server logs:

```typescript
// In any API route
console.log('Subscription Public Key:', process.env.NEXAR_SUSCRIPTIONS_PUBLIC_KEY?.substring(0, 10) + '...');
```

### Test Plan Sync

1. Create a plan
2. Check console logs:
   ```
   ✅ Should see: "Plan synced with MercadoPago"
   ❌ Should NOT see: "Missing environment variables"
   ```

## 📝 Environment Variable Reference

| Variable | Purpose | Required For | Example |
|----------|---------|-------------|---------|
| `NEXAR_SUSCRIPTIONS_PUBLIC_KEY` | Subscription plans public key | Plans sync | `TEST-xxx` |
| `NEXAR_SUSCRIPTIONS_SECRET_KEY` | Subscription plans access token | Plans sync | `TEST-xxx` |
| `NEXAR_MARKETPLACE_PUBLIC_KEY` | Marketplace public key | Marketplace | `TEST-xxx` |
| `NEXAR_MARKETPLACE_SECRET_KEY` | Marketplace access token | Marketplace | `TEST-xxx` |
| `NEXAR_MARKETPLACE_APP_ID` | Marketplace OAuth app ID | OAuth | `123456` |
| `NEXAR_MARKETPLACE_CLIENT_SECRET` | Marketplace OAuth secret | OAuth | `abc123` |
| `NEXT_PUBLIC_BASE_URL` | Application base URL | Callbacks | `https://domain.com` |

## 🐛 Troubleshooting

### "Missing environment variables" Error

**Problem:** API routes can't find credentials

**Solutions:**
1. Check `.env.local` file exists
2. Verify variable names are **exactly** as shown (case-sensitive)
3. Restart development server
4. Clear `.next` folder: `rm -rf .next && npm run dev`

### Variables Not Loading

**Problem:** Environment variables undefined

**Solutions:**
1. Ensure `.env.local` is in project root (next to `package.json`)
2. Variable names must match exactly
3. No spaces around `=`: `KEY=value` ✅ not `KEY = value` ❌
4. Restart server after any changes

### Sync Still Failing

**Problem:** Plans not syncing after setting env vars

**Checks:**
1. Are credentials correct? (Check MercadoPago dashboard)
2. Is `NEXT_PUBLIC_BASE_URL` valid? (Must be public URL)
3. Are you using TEST or APP credentials correctly?
4. Check server console for detailed error messages

### Credentials Work Locally But Not in Production

**Problem:** Works on localhost but fails when deployed

**Solutions:**
1. Verify env vars are set in deployment platform
2. Use production credentials (`APP-xxx`)
3. Set correct `NEXT_PUBLIC_BASE_URL` for production
4. Check deployment logs for errors

## 💡 Tips

### Use Different Credentials Per Environment

```env
# Development (.env.local)
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=TEST-xxx
NEXAR_SUSCRIPTIONS_SECRET_KEY=TEST-xxx

# Production (Vercel/Hosting)
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=APP-xxx
NEXAR_SUSCRIPTIONS_SECRET_KEY=APP-xxx
```

### Secure Sharing

Use password managers or secret sharing services:
- 1Password
- LastPass
- Bitwarden
- Vercel/Netlify environment variable UI

### Rotation

Rotate credentials periodically:
1. Generate new credentials in MercadoPago
2. Update `.env.local`
3. Update deployment environment
4. Restart services
5. Delete old credentials

## 🎯 Benefits of Environment Variables

1. **Security** - Credentials never committed to git
2. **Flexibility** - Easy to change without code changes
3. **Environment-Specific** - Different credentials per environment
4. **Standard Practice** - Industry standard approach
5. **Deployment-Friendly** - Easy to configure in hosting platforms
6. **No Database Dependency** - Faster, more reliable
7. **Version Control Safe** - `.env.local` in `.gitignore`

## 📚 Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [MercadoPago Credentials](https://www.mercadopago.com/developers/panel/credentials)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [12-Factor App - Config](https://12factor.net/config)

---

**Status:** ✅ **Migration Complete**

**Version:** 2.0

**Last Updated:** Current session

**Breaking Change:** Yes - requires `.env.local` setup

