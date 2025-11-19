# MercadoPago Credentials Configuration Update

## Summary of Changes

The MercadoPago configuration system has been simplified to use manual credential entry for both subscription and marketplace credentials, removing the OAuth approach.

## What Changed

### 1. Renamed Settings Sections

**Before:**
- "MercadoPago Credentials"
- "Conectar con la cuenta principal de Mercado Pago"

**After:**
- "MercadoPago Suscripción" - For subscription plan management
- "MercadoPago Marketplace" - For marketplace platform credentials

### 2. Simplified Configuration Approach

Both forms now use the same manual credential entry approach with:
- **Public Key** field (required)
- **Access Token** field (required, hidden by default)
- **Active status** toggle

**Removed:** OAuth flow (authorization button and OAuth API endpoints)

### 3. Updated Components

#### `MercadoPagoForm.tsx`
- **Header:** Updated to "MercadoPago Suscripción"
- **Description:** "Configura las credenciales para gestionar planes de suscripción"
- **Fields:** Public Key and Access Token (unchanged)
- **Purpose:** Manages subscription plan credentials

#### `MercadoPagoConnectForm.tsx`
- **Header:** Updated to "MercadoPago Marketplace"
- **Description:** "Configura las credenciales para el marketplace de la plataforma"
- **Fields:** Public Key and Access Token (manual entry)
- **Removed:** OAuth connection button and flow
- **Info Box:** Updated to reflect marketplace purpose

#### `settings/page.tsx`
- **Section Titles:** Updated to reflect new naming
- **Section Descriptions:** Updated to match new purpose
- **Removed:** OAuth callback message handling
- **Removed:** OAuth-related imports (CheckCircle, XCircle, AnimatePresence)

### 4. Deleted Files

The following OAuth-related files were removed as they're no longer needed:
- `/src/app/api/mercadopago/oauth/authorize/route.ts`
- `/src/app/api/mercadopago/oauth/callback/route.ts`

### 5. Environment Variables

The OAuth environment variables are no longer needed:
- ~~`MERCADOPAGO_APP_ID`~~ (not needed)
- ~~`MERCADOPAGO_CLIENT_SECRET`~~ (not needed)

## How to Use

### For Superadmin Users:

#### 1. Configure MercadoPago Suscripción
1. Navigate to **Settings** (`/dashboard/settings`)
2. Click on **"MercadoPago Suscripción"**
3. Enter your MercadoPago credentials:
   - **Public Key**: Your MercadoPago public key for subscriptions
   - **Access Token**: Your MercadoPago access token for subscriptions
   - Check **"Activar credenciales de MercadoPago"** to enable
4. Click **"Guardar Configuración"**

**Purpose:** These credentials will be used to manage subscription plans for the platform.

#### 2. Configure MercadoPago Marketplace
1. Navigate to **Settings** (`/dashboard/settings`)
2. Click on **"MercadoPago Marketplace"**
3. Enter your MercadoPago credentials:
   - **Public Key**: Your MercadoPago public key for marketplace
   - **Access Token**: Your MercadoPago access token for marketplace
   - Check **"Activar credenciales del marketplace"** to enable
4. Click **"Guardar Configuración"**

**Purpose:** These credentials will be used for marketplace operations on the platform.

## Database Structure

Both credential sets are stored separately in Firebase:

### MercadoPago Suscripción
**Path:** `systemSettings/mercadoPagoCredentials`
```typescript
{
  id: string;
  publicKey: string;
  accessToken: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}
```

### MercadoPago Marketplace
**Path:** `systemSettings/mercadoPagoAccount`
```typescript
{
  id: string;
  publicKey: string;
  accessToken: string;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}
```

## Getting MercadoPago Credentials

To get your MercadoPago credentials:

1. Visit [MercadoPago Developers Panel](https://www.mercadopago.com/developers/panel)
2. Log in with your MercadoPago account
3. Select or create an application
4. Navigate to **"Credentials"** section
5. Copy your **Public Key** and **Access Token**

### Test vs Production

- **Test Credentials**: Use for development and testing
  - Prefix: `TEST-`
  - Example: `TEST-1234567890abcdef`

- **Production Credentials**: Use for live environment
  - Prefix: `APP-`
  - Example: `APP-1234567890abcdef`

## Security Considerations

1. **Never commit credentials** to version control
2. **Use test credentials** during development
3. **Keep access tokens secure** - they're stored hidden in the UI
4. **Only Superadmin users** can configure these credentials
5. **Rotate credentials** if compromised

## Field Order

Both forms follow the same field order:
1. **Public Key** (first)
2. **Access Token** (second, with show/hide toggle)
3. **Active Toggle** (checkbox)

This provides a consistent experience across both forms.

## Benefits of the Updated Approach

1. **Simplicity**: No complex OAuth flow to configure
2. **Consistency**: Both forms work the same way
3. **Flexibility**: Can use different accounts for subscriptions and marketplace
4. **Independence**: No dependency on OAuth app configuration
5. **Direct Control**: Direct credential management without third-party authorization

## Migration from OAuth

If you previously configured OAuth:
- The OAuth endpoints have been removed
- OAuth credentials stored in Firebase remain unchanged
- You can continue using the same credentials, just enter them manually
- No data loss occurs with this update

## Testing Checklist

- [ ] Settings page displays both sections for Superadmin
- [ ] "MercadoPago Suscripción" opens the subscription form
- [ ] "MercadoPago Marketplace" opens the marketplace form
- [ ] Both forms have Public Key and Access Token fields
- [ ] Access Token can be toggled between visible/hidden
- [ ] Forms save successfully to Firebase
- [ ] Success messages display after saving
- [ ] Credentials persist after page reload
- [ ] Active toggle works correctly
- [ ] Non-superadmin users don't see these sections

## Visual Flow

```
Settings Page
    ↓
[Two MercadoPago Cards for Superadmin]
    ├── MercadoPago Suscripción
    │       ↓
    │   [Click Card]
    │       ↓
    │   Modal Opens
    │       ↓
    │   Enter Public Key
    │   Enter Access Token
    │   Toggle Active
    │       ↓
    │   [Save Configuration]
    │       ↓
    │   Success Message
    │       ↓
    │   Credentials Saved to Firebase
    │
    └── MercadoPago Marketplace
            ↓
        [Same flow as above]
            ↓
        Saved to different Firebase location
```

## Troubleshooting

### Credentials not saving
- Check Firebase permissions for systemSettings
- Verify user is a Superadmin
- Check browser console for errors

### Active toggle not working
- Ensure both Public Key and Access Token are filled
- Check that the form validates before submission

### Can't see MercadoPago sections
- Verify you're logged in as a Superadmin user
- Check that permissions service is working correctly

## Related Files

- `/src/app/(dashboard)/settings/page.tsx` - Settings page
- `/src/components/forms/MercadoPagoForm.tsx` - Subscription credentials form
- `/src/components/forms/MercadoPagoConnectForm.tsx` - Marketplace credentials form
- `/src/services/firebaseService.ts` - Firebase operations
- `/src/types/index.ts` - TypeScript type definitions

## Future Enhancements

Possible improvements for the future:
- Credential validation on save
- Test connection button to verify credentials
- Credential history/audit log
- Credential expiration warnings
- Support for multiple marketplace accounts

