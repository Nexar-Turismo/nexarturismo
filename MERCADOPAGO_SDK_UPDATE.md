# MercadoPago Official SDK Integration

## ✅ What Changed

Migrated from manual API calls to the **official MercadoPago Node.js SDK** ([mercadopago npm package](https://www.npmjs.com/package/mercadopago)).

### Benefits

1. ✅ **Proper API Format** - SDK handles correct parameter structure
2. ✅ **Better Error Handling** - Clear error messages from SDK
3. ✅ **Type Safety** - TypeScript definitions included
4. ✅ **Maintained by MercadoPago** - Always up-to-date with API changes
5. ✅ **Timeout Management** - Built-in timeout handling

## 📦 SDK Installed

```json
"mercadopago": "^2.9.0"
```

Already in your `package.json` - no additional installation needed!

## 🔄 Migration Details

### Before (Manual API Calls)

```typescript
const response = await fetch(`${baseUrl}/preapproval_plan`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(planData),
});
```

### After (Official SDK)

```typescript
import { MercadoPagoConfig, PreApprovalPlan } from 'mercadopago';

const config = new MercadoPagoConfig({ 
  accessToken: account.accessToken,
  options: { timeout: 5000 }
});

const client = new PreApprovalPlan(config);
const result = await client.create({ body: planData });
```

## 📊 Updated Data Structure

### PreApproval Plan Format

The official SDK uses the correct MercadoPago plan structure:

```typescript
{
  reason: "Suscripción: Plan Name",
  auto_recurring: {
    frequency: 1,              // 1 for monthly, 7 for weekly, etc.
    frequency_type: "months",  // "days" or "months"
    transaction_amount: 1000,  // Plan price
    currency_id: "ARS"         // Currency code
  },
  back_url: "https://yoursite.com/subscription/complete",
  external_reference: "plan_id_123"
}
```

### Billing Cycle Conversion

| Platform      | Frequency | Type      |
|---------------|-----------|-----------|
| `daily`       | 1         | `days`    |
| `weekly`      | 7         | `days`    |
| `monthly`     | 1         | `months`  |
| `yearly`      | 12        | `months`  |

## 🔧 Updated Files

### 1. `src/services/mercadoPagoPlansService.ts`

**Changed:**
- ✅ Now uses `PreApprovalPlan` from official SDK
- ✅ Updated plan data structure to match MercadoPago API
- ✅ Better error handling with SDK error messages
- ✅ Proper TypeScript types

**Methods:**
- `createPlan()` - Uses `client.create()`
- `getPlan()` - Uses `client.get()`
- `updatePlan()` - Uses `client.update()`
- `deletePlan()` - Logs warning (API doesn't support deletion)

### 2. `src/app/api/mercadopago/sync-plan/route.ts`

**Changed:**
- ✅ Updated plan data format to match SDK requirements
- ✅ Correct billing cycle conversion
- ✅ Proper frequency and frequency_type mapping

## 🎯 How It Works Now

### When Creating a Plan:

```
User creates plan in UI
    ↓
Save to Firebase
    ↓
Trigger automatic sync
    ↓
Convert plan data to MercadoPago format:
  {
    reason: "Suscripción: Basic Plan",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 1000,
      currency_id: "ARS"
    },
    back_url: "...",
    external_reference: "plan_firebase_id"
  }
    ↓
Call MercadoPago SDK:
  client.create({ body: planData })
    ↓
✅ Plan created in MercadoPago
    ↓
Save mercadoPagoPlanId back to Firebase
```

## 🚀 Testing

### Test Plan Creation:

1. Go to Plans page
2. Click "Create Plan"
3. Fill in details:
   - Name: "Test Plan"
   - Price: 1000
   - Currency: ARS
   - Billing Cycle: Monthly
4. Submit

**Expected Result:**
```
✅ Plan created in Firebase
✅ Automatically synced to MercadoPago
✅ mercadoPagoPlanId saved
✅ No parameter errors
```

### Check Console Logs:

```bash
# Success:
✅ [MercadoPago Sync Plan] Creating new plan
✅ [MercadoPago Sync Plan] Plan created successfully
✅ Plan synced with MercadoPago: plan_xxx

# Detailed errors (if any):
❌ MercadoPago API error: [specific error message]
```

## 🐛 Troubleshooting

### "Parameters passed are invalid"

**Fixed!** This was caused by using the wrong API structure. The official SDK now uses the correct format.

### "Could not reach Cloud Firestore backend"

See `FIREBASE_API_TROUBLESHOOTING.md` for Firebase connection issues.

### Plan Not Syncing

1. **Check credentials:**
   - Settings → MercadoPago Suscripción
   - Verify Access Token is valid
   - Ensure "Active" is checked

2. **Check console logs:**
   - Browser console for client errors
   - Server terminal for API errors

3. **Verify plan data:**
   ```typescript
   // Plan must have:
   - name ✓
   - price ✓
   - currency ✓
   - billingCycle ✓
   ```

## 📚 SDK Documentation

### Official Resources:

- **NPM Package**: https://www.npmjs.com/package/mercadopago
- **GitHub**: https://github.com/mercadopago/sdk-nodejs
- **MercadoPago Docs**: https://developers.mercadopago.com/

### SDK Features Used:

1. **MercadoPagoConfig** - Configuration object
2. **PreApprovalPlan** - Subscription plan management
3. **Error Handling** - SDK error types
4. **Timeout Management** - Request timeout configuration

## 🎓 Key Learnings

### 1. Correct API Structure

MercadoPago subscription plans use `auto_recurring` structure, not the old plan format:

```typescript
// ✅ Correct (new SDK format)
{
  auto_recurring: {
    frequency: 1,
    frequency_type: "months",
    transaction_amount: 1000,
    currency_id: "ARS"
  }
}

// ❌ Wrong (old format)
{
  frequency: {
    type: "month",
    frequency: 1
  },
  amount: 1000,
  currency: "ARS"
}
```

### 2. Frequency Types

- Use `"days"` for daily/weekly cycles
- Use `"months"` for monthly/yearly cycles

### 3. Plan Deletion

MercadoPago API doesn't support plan deletion. Plans must be:
- Deactivated via dashboard
- Or marked inactive in your system

## ✨ Benefits of Official SDK

### Before (Manual API):
- ❌ Had to manually construct requests
- ❌ Had to handle authentication manually
- ❌ Had to parse error responses manually
- ❌ API structure could change without notice

### After (Official SDK):
- ✅ SDK handles request construction
- ✅ Authentication managed by SDK
- ✅ Error handling built-in
- ✅ Updates maintained by MercadoPago
- ✅ TypeScript types included
- ✅ Timeout management built-in

## 🔐 Security

### Access Token Protection:

```typescript
// ✅ SDK handles token securely
const config = new MercadoPagoConfig({ 
  accessToken: credentials.accessToken  // Only used server-side
});

// ✅ Never exposed to client
const client = new PreApprovalPlan(config);
```

### Server-Side Only:

- All MercadoPago SDK calls happen server-side
- Access tokens never sent to browser
- Credentials stored securely in Firebase

## 📈 Performance

### Timeout Configuration:

```typescript
const config = new MercadoPagoConfig({ 
  accessToken: account.accessToken,
  options: { 
    timeout: 5000  // 5 second timeout
  }
});
```

### Fast Response Times:

- SDK optimized for performance
- Connection pooling
- Efficient error handling
- Automatic retry on network issues

## 🎉 Success Indicators

After plan creation, you should see:

1. **Browser Console:**
   ```
   ✅ Plan synced with MercadoPago: plan_abc123
   ```

2. **Server Logs:**
   ```
   ✅ [MercadoPago Sync Plan] Plan created successfully
   ```

3. **Firebase:**
   ```
   Plan document has mercadoPagoPlanId field populated
   ```

4. **MercadoPago Dashboard:**
   ```
   Plan appears in Subscriptions section
   ```

## 🔮 Future Enhancements

With the official SDK, we can now easily add:

- ✅ Subscription management
- ✅ Payment processing
- ✅ Customer management
- ✅ Refund handling
- ✅ Webhook validation
- ✅ Payment methods
- ✅ And more!

## 💡 Best Practices

### 1. Always Use SDK

```typescript
// ✅ Do this:
const client = new PreApprovalPlan(config);
await client.create({ body: planData });

// ❌ Don't do this:
await fetch('https://api.mercadopago.com/...');
```

### 2. Error Handling

```typescript
try {
  const result = await client.create({ body: planData });
} catch (error: any) {
  console.error('MercadoPago error:', error.message);
  console.error('Details:', error.cause);
}
```

### 3. Timeout Configuration

```typescript
// Always set timeouts for external APIs
const config = new MercadoPagoConfig({ 
  accessToken: token,
  options: { timeout: 5000 }
});
```

## 📞 Support

### If Issues Persist:

1. **Check SDK Version:**
   ```bash
   npm list mercadopago
   # Should show: mercadopago@2.9.0 or higher
   ```

2. **Update SDK:**
   ```bash
   npm update mercadopago
   ```

3. **Check MercadoPago Status:**
   - Visit https://status.mercadopago.com
   - Verify API is operational

4. **Review Logs:**
   - Browser console (F12)
   - Server terminal
   - Firebase console

---

**Status:** ✅ **SDK Integration Complete**

**Version:** MercadoPago SDK 2.9.0

**Last Updated:** Current session

