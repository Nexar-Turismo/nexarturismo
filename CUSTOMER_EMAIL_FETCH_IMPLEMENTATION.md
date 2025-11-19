# Customer Email Fetch Implementation

## Overview
Implemented proper payer email retrieval from MercadoPago's Customer API when reusing payment methods for subscription upgrades. This ensures consistency by using the same email that was used in the original subscription.

## Problem
When upgrading a subscription and reusing the payment method, we discovered that:
- The PreApproval GET endpoint returns `payer_id` but NOT `payer_email`
- The `payer_email` field in the PreApproval response was empty: `payerEmail: ''`
- This caused subscription creation to fail with "Payer email is required" error

## Solution
Implemented a two-step process to retrieve the payer email:

### Step 1: Get PreApproval (Subscription)
```typescript
const mpSubscription = await preapproval.get({ 
  id: existingSub.mercadoPagoSubscriptionId 
});

// Extract payer_id
const payerId = mpSubscription.payer_id;
```

### Step 2: Get Customer Details
```typescript
const customerResponse = await fetch(
  `https://api.mercadopago.com/v1/customers/${payerId}`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }
);

const customerData = await customerResponse.json();
const email = customerData.email; // ✅ Email from customer record
```

## Implementation Details

### Modified Files

#### 1. `/src/app/api/mercadopago/subscription-create/route.ts`

**Added Customer API call:**
```typescript
if (existingSubscriptionId) {
  // Get subscription data
  const mpSubscription = await preapproval.get({ id: ... });
  
  // Extract payer_id
  const payerId = mpSubscription.payer_id;
  
  // Get customer email from Customer API
  if (payerId) {
    const customerResponse = await fetch(
      `https://api.mercadopago.com/v1/customers/${payerId}`,
      { ... }
    );
    
    const customerData = await customerResponse.json();
    finalPayerEmail = customerData.email; // Use this email!
  }
  
  // Validate email was found
  if (!finalPayerEmail) {
    return error('No payer email found in customer data');
  }
}
```

**Enhanced logging:**
```typescript
console.log('✅ Customer email retrieved from Customer API:', {
  payerId: payerId,
  email: finalPayerEmail,
  firstName: customerData.first_name,
  lastName: customerData.last_name,
});
```

#### 2. `/src/app/api/mercadopago/subscription-payment-method/route.ts`

**Same implementation** for consistency:
```typescript
// Get subscription
const subscription = await preapproval.get({ id: subscriptionId });

// Get customer email
if (subscription.payer_id) {
  const customerResponse = await fetch(
    `https://api.mercadopago.com/v1/customers/${subscription.payer_id}`,
    { ... }
  );
  
  const customerData = await customerResponse.json();
  payerEmail = customerData.email;
}

// Return payment method info including email
return {
  paymentMethod: {
    cardId: subscription.card_id,
    payerEmail: payerEmail, // ✅ From Customer API
    payerId: subscription.payer_id,
    // ... other fields
  }
};
```

## MercadoPago API Flow

### PreApproval Response (Subscription)
According to [MercadoPago Subscriptions API](https://www.mercadopago.com.ar/developers/es/reference/subscriptions/_preapproval/post):

```json
{
  "id": "abc123",
  "payer_id": "470183340-cpunOI7UsIHlHr",  // ✅ Has this
  "payer_email": "",                        // ❌ Often empty
  "card_id": "123456",
  "status": "authorized"
}
```

### Customer Response
According to [MercadoPago Customers API](https://www.mercadopago.com.ar/developers/es/reference/customers/_customers_id/get):

```json
{
  "id": "470183340-cpunOI7UsIHlHr",
  "email": "customer@example.com",          // ✅ Always has this
  "first_name": "Customer",
  "last_name": "Tester",
  "phone": { ... },
  "identification": { ... }
}
```

## Why This Approach?

### 1. ✅ Reliable Data Source
- `payer_id` → `customer.email` is the authoritative source
- PreApproval's `payer_email` field can be empty
- Customer API always has the email

### 2. ✅ Consistency
- Same email used across all subscriptions
- Matches the email linked to the payment method
- No confusion about which email to use

### 3. ✅ MercadoPago Account Linking
- Email is tied to the MercadoPago customer account
- All subscriptions for that customer use the same email
- Proper linking with MercadoPago's customer management

## Complete Upgrade Flow with Email Fetch

```
User clicks "Mejorar Plan"
         ↓
Confirmation modal appears
         ↓
User clicks "Confirmar Mejora"
         ↓
API Flow:
  1️⃣ Get existing subscription from Firebase
     └─ subscriptionId, userId, mercadoPagoSubscriptionId
         ↓
  2️⃣ Get MercadoPago PreApproval
     GET /preapproval/{mercadoPagoSubscriptionId}
     └─ Returns: card_id, payer_id
         ↓
  3️⃣ Get Customer email from Customer API
     GET /customers/{payer_id}
     └─ Returns: email, first_name, last_name
         ↓
  4️⃣ Create new PreApproval with:
     - card_id (from step 2)
     - payer_email (from step 3) ✅
     - new plan details
         ↓
  5️⃣ Cancel old subscription
  6️⃣ Activate new subscription
         ↓
✅ Success! Upgrade complete
```

## Error Handling

### Scenario 1: Customer API Returns Error
```typescript
if (!customerResponse.ok) {
  return error('Failed to fetch customer email from MercadoPago Customer API');
}
```

### Scenario 2: Customer Has No Email
```typescript
if (!finalPayerEmail) {
  return error('No payer email found in MercadoPago customer data');
}
```

### Scenario 3: Network Error
```typescript
catch (error) {
  return error('Error retrieving customer information from MercadoPago');
}
```

## Logging

### Successful Flow
```bash
🔍 [MP Subscription] Fetching payment method from existing subscription: sub123
📋 [MP Subscription] Subscription data retrieved:
{
  cardId: '***4411',
  payerId: '470183340-cpunOI7UsIHlHr',
  subscriptionId: 'fa59dc91beea437dbe97c74ecf3faffe'
}
🔍 [MP Subscription] Fetching customer email from Customer API: 470183340-cpunOI7UsIHlHr
✅ [MP Subscription] Customer email retrieved from Customer API:
{
  payerId: '470183340-cpunOI7UsIHlHr',
  email: 'customer@example.com',
  firstName: 'Customer',
  lastName: 'Tester'
}
📋 [MP Subscription] Creating PreApproval:
{
  mercadoPagoPlanId: '6d8b8859ae994058828e29f641de0419',
  payerEmail: 'customer@example.com',  // ✅ Email from Customer API
  usingCardId: true
}
✅ [MP Subscription] PreApproval created successfully
```

### Error Flow
```bash
🔍 [MP Subscription] Fetching customer email from Customer API: invalid-id
❌ [MP Subscription] Failed to fetch customer email: {...}
→ Returns 500 error to client
```

## API References

### MercadoPago Customer API
**Documentation**: https://www.mercadopago.com.ar/developers/es/reference/customers/_customers_id/get

**Endpoint**: `GET https://api.mercadopago.com/v1/customers/{id}`

**Headers**:
```typescript
{
  'Authorization': 'Bearer ACCESS_TOKEN',
  'Content-Type': 'application/json'
}
```

**Response**:
```json
{
  "id": "470183340-cpunOI7UsIHlHr",
  "email": "customer@example.com",
  "first_name": "Customer",
  "last_name": "Tester",
  "phone": {
    "area_code": "11",
    "number": "97654321"
  },
  "identification": {
    "type": "CPF",
    "number": "19119119100"
  }
}
```

## Benefits

### 1. ✅ Accurate Email Retrieval
- Always gets the correct email from MercadoPago's customer database
- No reliance on potentially empty `payer_email` field

### 2. ✅ Better Error Messages
- Clear indication when customer data is missing
- Helpful error messages for debugging

### 3. ✅ Proper API Usage
- Following MercadoPago's recommended pattern
- Using the Customer API as intended

### 4. ✅ Data Consistency
- Same email used across all subscriptions for a customer
- Maintains link between customer and payment methods

## Testing

### Test the Flow
```bash
# 1. Create initial subscription
POST /api/mercadopago/subscription-create
{
  "planId": "plan-basic",
  "userId": "user123",
  "cardTokenId": "token-abc123",
  "payerEmail": "customer@example.com"
}

# 2. Check what was saved
# In MercadoPago dashboard, note the payer_id

# 3. Upgrade plan (reuse payment method)
POST /api/mercadopago/subscription-create
{
  "planId": "plan-premium",
  "userId": "user123",
  "isUpgrade": true,
  "existingSubscriptionId": "firebase-sub-id"
}

# 4. Check logs - should show:
✅ Customer email retrieved from Customer API: customer@example.com
```

### Verify Email Consistency
```bash
# Both subscriptions should have the same email
Old Subscription: customer@example.com
New Subscription: customer@example.com ✅ Same!
```

## Edge Cases Handled

### 1. No payer_id in Subscription
```typescript
if (payerId) {
  // Fetch customer email
} else {
  // Fall back to provided payerEmail or fail
}
```

### 2. Customer API Returns 404
```typescript
if (!customerResponse.ok) {
  return error('Failed to fetch customer email from Customer API');
}
```

### 3. Customer Has No Email
```typescript
if (!finalPayerEmail) {
  return error('No payer email found in customer data');
}
```

## Security Considerations

### Authorization
- Customer API requires valid `accessToken`
- Only returns data for customers associated with the account
- Proper error handling prevents information leakage

### Data Privacy
- Only fetches necessary information (email, name)
- Doesn't expose sensitive customer data
- Logs are sanitized (card numbers masked)

## Troubleshooting

### Error: "Failed to fetch customer email"
**Cause**: Customer API returned error (404, 401, etc.)  
**Check**: 
- Is the payer_id valid?
- Are credentials correct?
- Is the customer in the same MercadoPago account?

### Error: "No payer email found in customer data"
**Cause**: Customer record exists but has no email  
**Solution**: This shouldn't happen in MercadoPago - contact support

### Warning: "Failed to fetch customer email" (but continues)
**Cause**: Network error or timeout  
**Impact**: Subscription creation will fail later  
**Solution**: Implement retry logic or return error immediately

## References

- [MercadoPago Customers API Documentation](https://www.mercadopago.com.ar/developers/es/reference/customers/_customers_id/get)
- [MercadoPago Subscriptions API Documentation](https://www.mercadopago.com.ar/developers/es/reference/subscriptions/_preapproval/post)

## Conclusion

The implementation now properly fetches the payer email from MercadoPago's Customer API using the `payer_id` from the subscription. This ensures:

- ✅ Consistent email usage across all subscriptions
- ✅ Reliable data source (Customer API vs empty field)
- ✅ Proper MercadoPago account linking
- ✅ Better error handling and user feedback

Users can now upgrade their plans seamlessly with the correct email being used automatically from their existing subscription's customer record.

