# MercadoPago OAuth Setup Guide

This guide explains how to configure MercadoPago OAuth authentication for the platform's main account connection.

## Overview

The platform uses MercadoPago OAuth to connect the main platform account, which will be used to manage subscription plans for all users. This is different from individual publisher credentials.

## Architecture

### Two Types of MercadoPago Integrations:

1. **OAuth Account (Main Platform Account)**
   - Used for subscription plans management
   - Connected via OAuth flow
   - Stored in `systemSettings/mercadoPagoAccount`
   - Only one account per platform
   - Managed by Superadmin users

2. **Individual Publisher Credentials**
   - Used for individual post payments/bookings
   - Entered manually by publishers
   - Stored in `systemSettings/mercadoPagoCredentials`
   - Each publisher can have their own credentials

## Setup Instructions

### Step 1: Create a MercadoPago Application

1. Go to the [MercadoPago Developers Panel](https://www.mercadopago.com/developers/panel/app)
2. Log in with your MercadoPago account
3. Click "Create Application"
4. Fill in the application details:
   - **Name**: Your platform name
   - **Description**: Brief description of your platform
   - **Redirect URI**: `{YOUR_DOMAIN}/api/mercadopago/oauth/callback`
     - For local development: `http://localhost:3000/api/mercadopago/oauth/callback`
     - For production: `https://yourdomain.com/api/mercadopago/oauth/callback`

### Step 2: Get Your Application Credentials

After creating the application, you'll receive:
- **App ID** (Client ID)
- **Client Secret**

Keep these credentials secure!

### Step 3: Configure Environment Variables

Add the following variables to your `.env.local` file:

```env
# MercadoPago OAuth Configuration
MERCADOPAGO_APP_ID=your_app_id_here
MERCADOPAGO_CLIENT_SECRET=your_client_secret_here

# Base URL (required for OAuth redirect)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

For production, update `NEXT_PUBLIC_BASE_URL` to your production domain.

### Step 4: Configure OAuth Redirect URI in MercadoPago

1. Go back to your application in the [MercadoPago Developers Panel](https://www.mercadopago.com/developers/panel/app)
2. Navigate to the "OAuth" or "Authentication" section
3. Add the redirect URI: `{NEXT_PUBLIC_BASE_URL}/api/mercadopago/oauth/callback`
4. Save the changes

**Important**: The redirect URI in your MercadoPago app settings MUST match exactly with the one used in your application.

## How to Connect the Account

### For Superadmin Users:

1. Log in as a Superadmin user
2. Navigate to **Settings** (`/dashboard/settings`)
3. Click on **"Conectar con la cuenta principal de Mercado Pago"**
4. In the modal, click **"Conectar con MercadoPago OAuth"**
5. You'll be redirected to MercadoPago's authorization page
6. Log in with the main platform MercadoPago account
7. Authorize the application
8. You'll be redirected back to the settings page with a success message

## OAuth Flow Details

The OAuth implementation consists of three main components:

### 1. Authorization Endpoint
**Path**: `/api/mercadopago/oauth/authorize`

- Generates the OAuth authorization URL
- Includes client_id, redirect_uri, and state parameters
- Returns the URL to the frontend

### 2. Callback Endpoint
**Path**: `/api/mercadopago/oauth/callback`

- Receives the authorization code from MercadoPago
- Exchanges the code for an access token
- Saves the credentials to Firebase
- Redirects back to settings with success/error message

### 3. Frontend Component
**Component**: `MercadoPagoConnectForm`

- Displays the OAuth connection button
- Handles the OAuth flow initiation
- Shows connection status and manual configuration option

## Security Considerations

1. **Client Secret**: Never expose your Client Secret in the frontend. It's only used in server-side API routes.
2. **State Parameter**: The authorization flow includes a state parameter for CSRF protection.
3. **HTTPS**: Always use HTTPS in production to secure the OAuth flow.
4. **Access Tokens**: Access tokens are stored securely in Firebase and never exposed to the frontend.

## Troubleshooting

### "OAuth configuration missing" Error
- Ensure `MERCADOPAGO_APP_ID` and `MERCADOPAGO_CLIENT_SECRET` are set in your environment variables
- Restart your development server after adding environment variables

### "Authorization denied by user" Error
- The user clicked "Cancel" on the MercadoPago authorization page
- Try the connection process again

### "Failed to exchange authorization code" Error
- Check that your Client Secret is correct
- Verify that the redirect URI in MercadoPago matches your configured URL exactly
- Check the server logs for more details

### Redirect URI Mismatch
- Ensure the redirect URI configured in MercadoPago matches exactly: `{YOUR_DOMAIN}/api/mercadopago/oauth/callback`
- Remember to update it when moving from development to production

## Testing

### Development Environment
1. Use `http://localhost:3000` as your base URL
2. Configure the redirect URI as: `http://localhost:3000/api/mercadopago/oauth/callback`
3. Test the OAuth flow with a test MercadoPago account

### Production Environment
1. Update `NEXT_PUBLIC_BASE_URL` to your production domain
2. Update the redirect URI in MercadoPago to: `https://yourdomain.com/api/mercadopago/oauth/callback`
3. Use production MercadoPago credentials

## API Endpoints

### GET `/api/mercadopago/oauth/authorize`
Generates the MercadoPago OAuth authorization URL.

**Response**:
```json
{
  "authUrl": "https://auth.mercadopago.com/authorization?client_id=...&...",
  "state": "random_state_string"
}
```

### GET `/api/mercadopago/oauth/callback`
Handles the OAuth callback and exchanges the authorization code for an access token.

**Query Parameters**:
- `code`: Authorization code from MercadoPago
- `state`: State parameter for CSRF protection
- `error`: Error message if authorization was denied

**Redirects to**:
- Success: `/dashboard/settings?oauth=success&message=...`
- Error: `/dashboard/settings?oauth=error&message=...`

## Database Structure

The OAuth credentials are stored in Firebase under:
```
systemSettings/mercadoPagoAccount
```

**Structure**:
```typescript
{
  id: string;
  accessToken: string;
  publicKey: string;
  userId: string; // MercadoPago user ID
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string; // Platform user ID
}
```

## Additional Resources

- [MercadoPago OAuth Documentation](https://www.mercadopago.com/developers/en/docs/security/oauth/introduction)
- [MercadoPago Developer Portal](https://www.mercadopago.com/developers/)
- [MercadoPago API Reference](https://www.mercadopago.com/developers/en/reference)

