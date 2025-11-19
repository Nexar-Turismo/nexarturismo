# Environment Variables Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

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
# Application Configuration
# ===========================================
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# For development (won't work with MercadoPago):
# NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ===========================================
# MercadoPago - Subscriptions
# Used for subscription plan management
# ===========================================
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXAR_SUSCRIPTIONS_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxx

# ===========================================
# MercadoPago - Marketplace
# Used for marketplace operations
# ===========================================
NEXAR_MARKETPLACE_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXAR_MARKETPLACE_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxx
NEXAR_MARKETPLACE_APP_ID=your_app_id
NEXAR_MARKETPLACE_CLIENT_SECRET=your_client_secret
```

## Why NEXT_PUBLIC_BASE_URL is Important

This variable is used for:
- ✅ MercadoPago subscription return URLs
- ✅ OAuth callback URLs
- ✅ Payment completion redirects
- ✅ Email links
- ✅ Webhook URLs

### Development

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Production

```env
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Current Error Fix

The error you encountered:
```
Invalid value for back url, must be a valid URL
```

**Was caused by:** Missing or invalid `NEXT_PUBLIC_BASE_URL` environment variable.

**Fixed by:** 
- Added validation for the URL
- Added fallback to `http://localhost:3000`
- Added warning when fallback is used

## How to Set Up

### Option 1: Create .env.local (Recommended)

```bash
# In your project root
touch .env.local

# Add the required variables (see above)
nano .env.local
# or
code .env.local
```

### Option 2: Use System Environment Variables

```bash
export NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Note:** System environment variables are temporary and lost when you close the terminal.

## After Setting Up

1. **Restart your development server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Verify the variable is loaded:**
   ```typescript
   // In any component or API route
   console.log('Base URL:', process.env.NEXT_PUBLIC_BASE_URL);
   ```

3. **Test plan creation:**
   - Create a plan
   - Check console for success message
   - No "Invalid URL" errors should appear

## Fallback Behavior

If `NEXT_PUBLIC_BASE_URL` is not set or invalid:

```
⚠️ Warning: NEXT_PUBLIC_BASE_URL is invalid, using localhost fallback
✅ Uses: http://localhost:3000/subscription/complete
```

This allows the system to work even without proper configuration, but you'll see a warning in the logs.

## For Production Deployment

### Vercel

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - Variable: `NEXT_PUBLIC_BASE_URL`
   - Value: `https://yourdomain.com`
   - Environment: Production

### Other Platforms

Set the environment variable according to your hosting platform's documentation.

## Troubleshooting

### Variable Not Loading

**Problem:** Changes to `.env.local` not taking effect

**Solution:**
```bash
# Stop the server
# Delete .next folder
rm -rf .next
# Restart
npm run dev
```

### Still Getting URL Error

**Check:**
1. Variable name is exactly `NEXT_PUBLIC_BASE_URL` (case-sensitive)
2. Value starts with `http://` or `https://`
3. No trailing slash: `http://localhost:3000` ✅ not `http://localhost:3000/` ❌
4. Server was restarted after adding the variable

### Verify URL Format

Valid formats:
```
✅ http://localhost:3000
✅ https://yourdomain.com
✅ https://subdomain.yourdomain.com
✅ http://192.168.1.100:3000

❌ localhost:3000 (missing protocol)
❌ www.yourdomain.com (missing protocol)
❌ http://localhost:3000/ (has trailing slash - works but not recommended)
```

## Complete .env.local Template

```env
# ===========================================
# Firebase Configuration
# Get these from Firebase Console
# ===========================================
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# ===========================================
# Application URL
# Important for MercadoPago redirects
# ===========================================
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# ===========================================
# MercadoPago OAuth (Optional - if needed)
# Get from MercadoPago Developer Portal
# ===========================================
# MERCADOPAGO_APP_ID=your_app_id
# MERCADOPAGO_CLIENT_SECRET=your_client_secret

# ===========================================
# Other Optional Variables
# ===========================================
# NODE_ENV=development
# PORT=3000
```

## Quick Test

Run this in your browser console after setting up:

```javascript
// Should log your URL
console.log('Base URL:', process.env.NEXT_PUBLIC_BASE_URL);
```

Or check in any page by adding:

```typescript
export default function TestPage() {
  console.log('Base URL:', process.env.NEXT_PUBLIC_BASE_URL);
  return <div>Check console</div>;
}
```

## Security Notes

### ⚠️ Important

- `.env.local` is in `.gitignore` (never commit it!)
- Only `NEXT_PUBLIC_*` variables are exposed to the browser
- Other variables are server-side only
- Never commit sensitive keys to git

### Safe to Share (Public Variables)

- ✅ `NEXT_PUBLIC_BASE_URL`
- ✅ `NEXT_PUBLIC_FIREBASE_API_KEY` (public by design)
- ✅ Other `NEXT_PUBLIC_*` variables

### Never Share (Private Variables)

- ❌ `MERCADOPAGO_CLIENT_SECRET`
- ❌ Firebase Admin SDK credentials
- ❌ Database passwords
- ❌ API keys without `NEXT_PUBLIC_` prefix

## Next Steps

1. ✅ Create `.env.local` file
2. ✅ Add `NEXT_PUBLIC_BASE_URL` variable
3. ✅ Restart development server
4. ✅ Test plan creation
5. ✅ Verify no URL errors

---

**Status:** Required for MercadoPago integration

**Priority:** High

**Estimated Time:** 2 minutes

