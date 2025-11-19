# MercadoPago Test Cards & Troubleshooting

## 🎯 Error: CC_VAL_433 - Credit Card Validation Failed

This error means MercadoPago is rejecting the card information during subscription creation. This is **NOT** a code error - it's a payment validation issue.

## ✅ Correct Test Cards for Argentina (ARS)

### Approved Cards (Use These!)

| Card Brand | Card Number | CVV | Expiration | Cardholder Name | Document | Result |
|------------|-------------|-----|------------|-----------------|----------|--------|
| **Mastercard** | `5031 7557 3453 0604` | `123` | `11/25` | `APRO` | `12345678` | ✅ Approved |
| **Visa** | `4170 0688 1010 8020` | `123` | `11/25` | `APRO` | `12345678` | ✅ Approved |
| **Amex** | `3711 8030 3257 522` | `1234` | `11/25` | `APRO` | `12345678` | ✅ Approved |

### Test Cards for Different Scenarios

| Cardholder Name | Result | Use Case |
|-----------------|--------|----------|
| `APRO` | ✅ Approved | Normal subscription creation |
| `CONT` | ⏳ Pending | Test pending payment flow |
| `CALL` | ⚠️ Pending with validation | Test manual review |
| `FUND` | ❌ Insufficient funds | Test error handling |
| `SECU` | ❌ Security code invalid | Test CVV errors |
| `EXPI` | ❌ Expired card | Test expiration errors |
| `FORM` | ❌ Invalid form | Test validation errors |
| `OTHE` | ❌ General rejection | Test rejection flow |

## 📋 Complete Test Data Template

```
Card Number: 5031 7557 3453 0604
Expiration Date: 11/25
CVV: 123
Cardholder Name: APRO
Cardholder Email: test_user_XXXXX@testuser.com
Document Type: DNI
Document Number: 12345678
Birth Date: 01/01/1990 (optional)
```

## 🚨 Common Mistakes

### 1. ❌ Wrong Card Number Format
```
Wrong: 5031755734530604 (no spaces)
Right: 5031 7557 3453 0604 (with spaces)
```

### 2. ❌ Wrong Expiration Format
```
Wrong: 25/11 (year/month)
Wrong: 2025/11 (full year)
Right: 11/25 (MM/YY)
```

### 3. ❌ Wrong CVV Length
```
Wrong: 12 (too short)
Wrong: 1234 (only for Amex)
Right: 123 (for Visa/Mastercard)
```

### 4. ❌ Using Real Card Data
```
Wrong: Using real personal card numbers
Right: Only use MercadoPago test cards
```

### 5. ❌ Production Credentials in Test
```
Wrong: NEXAR_SUSCRIPTIONS_PUBLIC_KEY=APP_USR-xxxxx (production)
Right: NEXAR_SUSCRIPTIONS_PUBLIC_KEY=TEST-xxxxx (test)
```

## 🔍 Debugging Steps

### Step 1: Verify Test Environment

Check your `.env` file:
```bash
# Both should start with TEST-
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXAR_SUSCRIPTIONS_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxx
```

### Step 2: Check MercadoPago Dashboard

1. Go to [MercadoPago Dashboard](https://www.mercadopago.com.ar/developers/panel)
2. Verify you're in **"Modo de prueba"** (Test Mode)
3. Check that your test credentials are active

### Step 3: Test Card Token Creation

The error occurs during `card_token_id` creation or validation. Check:

1. **Card form is fully loaded** before submitting
2. **All fields are filled** correctly
3. **No browser console errors** during form submission

### Step 4: Network Inspection

Open browser DevTools → Network tab:

1. Look for call to MercadoPago SDK: `https://api.mercadopago.com/v1/card_tokens`
2. Check the response - should return a token like `abc123...`
3. If token creation fails, check the error message

## 🔧 Advanced Debugging

### Enable Detailed Logging

The API now logs detailed MercadoPago errors. Look for:

```bash
❌ [MP Subscription] Error cause: {
  "message": "CC_VAL_433 Credit card validation has failed",
  "code": "",
  "status": 401
}
```

### Common MercadoPago Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `CC_VAL_433` | Card validation failed | Use correct test card |
| `205` | Invalid parameter | Check all required fields |
| `400` | Bad request | Verify request format |
| `401` | Unauthorized | Check credentials |
| `404` | Plan not found | Verify `mercadoPagoPlanId` |

### Check Subscription Plan

Verify the plan is properly synced with MercadoPago:

```sql
-- Check in Firebase
subscriptionPlans/{planId}
  mercadoPagoPlanId: "should exist and be valid"
```

Or use the API:
```bash
GET /api/mercadopago/plans/list
```

## 🧪 Testing Workflow

### 1. Fresh Test
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### 2. Fill Form with Test Data
```
Card: 5031 7557 3453 0604
CVV: 123
Exp: 11/25
Name: APRO
Doc: 12345678
```

### 3. Submit and Monitor Logs
```bash
# Watch server logs for:
🔄 [MP Subscription] Create request
📋 [MP Subscription] Creating PreApproval
✅ [MP Subscription] PreApproval created (success)
# OR
❌ [MP Subscription] Error (failure)
```

### 4. Check Response
```json
// Success Response
{
  "success": true,
  "subscriptionId": "xxxx-xxxx-xxxx",
  "localSubscriptionId": "firebase-doc-id"
}

// Error Response
{
  "error": "CC_VAL_433 Credit card validation has failed",
  "code": "",
  "mpError": {...}
}
```

## 🌍 Region-Specific Cards

### Argentina (ARS)
- Use cards from "Approved Cards" section above
- Document Type: `DNI`

### Brazil (BRL)
```
Card: 5031 4332 1540 6351
CVV: 123
Name: APRO
Document Type: CPF
Document: 191.191.191-95
```

### Mexico (MXN)
```
Card: 5474 9254 3267 0366
CVV: 123
Name: APRO
Document Type: CURP
```

## 📞 Still Having Issues?

### 1. Verify Card Token Creation

Add logging to SubscriptionForm:
```typescript
const { token, error } = await cardForm.createCardToken();
console.log('Card token:', token);
console.log('Card token error:', error);
```

### 2. Test with MercadoPago Checkout

Try creating a subscription directly through MercadoPago dashboard to verify:
- Credentials are working
- Plan is properly configured
- Test environment is accessible

### 3. Check Browser Console

Look for JavaScript errors:
```
Failed to load MercadoPago SDK
Invalid card number
CVV validation failed
```

### 4. Test Different Browser

Sometimes browser extensions block payment forms:
- Try in Incognito/Private mode
- Try different browser (Chrome, Firefox, Edge)
- Disable ad blockers temporarily

## 🎓 Understanding the Flow

```
User enters card data in form
         ↓
MercadoPago SDK validates card
         ↓
SDK creates card_token_id
         ↓
Your API receives token
         ↓
API calls MercadoPago PreApproval API
         ↓
MercadoPago validates:
  - card_token_id is valid
  - card is not expired
  - card has sufficient funds (test cards bypass this)
  - cardholder name matches expected pattern
         ↓
✅ Subscription created OR ❌ Validation error
```

## 📚 References

- [MercadoPago Test Cards](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/integration-test/test-cards)
- [PreApproval API](https://www.mercadopago.com.ar/developers/es/reference/subscriptions/_preapproval/post)
- [Error Codes](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/response-handling/collection-results)

## ✅ Quick Checklist

Before testing, verify:

- [ ] Using TEST credentials (both start with `TEST-`)
- [ ] In MercadoPago Test Mode
- [ ] Using test card: `5031 7557 3453 0604`
- [ ] CVV: `123`
- [ ] Expiration: `11/25`
- [ ] Name: `APRO`
- [ ] Document: `12345678`
- [ ] Email: `test_user_xxxxx@testuser.com`
- [ ] Browser cache cleared
- [ ] No JavaScript errors in console
- [ ] MercadoPago SDK loaded successfully

## 💡 Pro Tips

1. **Always use APRO** as cardholder name for quick approvals
2. **Clear browser cache** between test attempts
3. **Check network tab** for actual API responses
4. **Use test environment consistently** - don't mix production/test credentials
5. **Document test results** to track what works

---

If you continue having issues after following this guide, the problem may be:
- MercadoPago account configuration
- Plan not properly synced
- Network/firewall blocking MercadoPago API
- Regional restrictions on test cards

Contact MercadoPago support with your test credentials for further assistance.

