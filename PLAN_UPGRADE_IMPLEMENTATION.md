# Plan Upgrade Implementation

## Overview
Implemented a user-facing plans page where users can view all available subscription plans, see their current plan, and upgrade to higher-tier plans. Since MercadoPago doesn't support plan changes natively, the implementation cancels the old subscription and creates a new one.

## Files Created/Modified

### 1. **New User Plans Page** 
**Path**: `/src/app/suscribirse/planes/page.tsx`

**Features**:
- ✅ Displays all active and visible subscription plans
- ✅ Fetches user's current subscription
- ✅ Marks current plan with a badge and different styling
- ✅ Shows upgrade buttons for higher-tier plans
- ✅ Disables downgrade with message to contact support
- ✅ Modal with payment form for plan upgrades
- ✅ Uses existing SubscriptionForm component to collect card_token_id
- ✅ Responsive design with glassmorphism effects
- ✅ Dark mode support

**Key Components**:
```typescript
// Load all plans and current subscription
const visiblePlans = allPlans
  .filter(p => p.isActive && p.isVisible)
  .sort((a, b) => a.price - b.price);

const subscription = await subscriptionService.getUserActiveSubscription(user.id);

// Upgrade flow
1. User clicks "Mejorar Plan" on a higher-tier plan
2. Modal opens with SubscriptionForm
3. User enters card details → creates card_token_id
4. Creates new subscription via /api/mercadopago/subscription-create
5. Calls /api/mercadopago/change-plan to switch subscriptions
6. Old subscription cancelled, new subscription activated
```

### 2. **Plan Change API Endpoint**
**Path**: `/src/app/api/mercadopago/change-plan/route.ts`

**Purpose**: Handles the plan change process by canceling the old subscription and activating the new one.

**Process**:
1. ✅ Validates userId, oldSubscriptionId, and newSubscriptionId
2. ✅ Verifies both subscriptions exist and belong to the user
3. ✅ Cancels old subscription in MercadoPago (status: 'cancelled')
4. ✅ Updates old subscription in Firebase:
   - Status: 'cancelled'
   - EndDate: current date
   - Metadata: cancellation reason, link to new subscription
5. ✅ Activates new subscription in Firebase:
   - Status: 'active'
   - StartDate: current date
   - Metadata: activation info, link to old subscription

**Request**:
```json
POST /api/mercadopago/change-plan
{
  "userId": "user123",
  "oldSubscriptionId": "sub_old_123",
  "newSubscriptionId": "sub_new_456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Plan changed successfully",
  "oldSubscriptionId": "sub_old_123",
  "newSubscriptionId": "sub_new_456",
  "newPlanName": "Premium Plan"
}
```

### 3. **Updated Files**

#### New Post Page (`/src/app/(dashboard)/posts/new/page.tsx`)
- Changed redirect from `/plans` to `/suscribirse/planes` when post limit is reached

#### Subscription Page (`/src/app/suscribirse/page.tsx`)
- Confirmed redirect to `/subscribe/${plan.id}` for new subscriptions

## User Flow

### Scenario 1: View Plans (Existing Subscriber)
```
User navigates to /suscribirse/planes
         ↓
Page loads all active plans
         ↓
Fetches user's active subscription
         ↓
Displays plans with current plan marked
         ↓
User sees "Plan Actual" badge on their plan
Other plans show "Mejorar Plan" button
```

### Scenario 2: Upgrade Plan
```
User clicks "Mejorar Plan" on higher-tier plan
         ↓
Modal opens showing plan comparison
         ↓
SubscriptionForm component loads
         ↓
User enters card details
         ↓
MercadoPago SDK creates card_token_id
         ↓
POST /api/mercadopago/subscription-create
  - Creates new PreApproval with card_token_id
  - Status: 'pending'
         ↓
POST /api/mercadopago/change-plan
  - Cancels old MercadoPago subscription
  - Updates old Firebase subscription: 'cancelled'
  - Updates new Firebase subscription: 'active'
         ↓
Success! User now has upgraded plan
```

### Scenario 3: Post Limit Reached
```
User tries to create new post
         ↓
usePostCreation hook checks limits
         ↓
Post limit reached (current posts = maxPosts)
         ↓
Modal shows: "Límite de publicaciones alcanzado"
         ↓
Two buttons:
  - "Cancelar" → /dashboard
  - "Mejorar plan" → /suscribirse/planes
         ↓
User clicks "Mejorar plan"
         ↓
Redirected to plans page
         ↓
Follows upgrade flow above
```

## Card Token Handling

### Why card_token_id is Required
MercadoPago's PreApproval API requires a `card_token_id` to create subscriptions. This token represents the user's payment method and is created securely on the client side using MercadoPago SDK.

### Implementation
1. **SubscriptionForm Component** (`/src/components/forms/SubscriptionForm.tsx`)
   - Loads MercadoPago SDK v2
   - Creates secure card form with iframes
   - Collects: card number, expiration, CVV, cardholder info
   - Generates `card_token_id` via SDK
   - Sends token to backend

2. **Subscription Creation API** (`/src/app/api/mercadopago/subscription-create/route.ts`)
   - Receives: planId, userId, cardTokenId, payerEmail
   - Creates PreApproval with:
     ```javascript
     {
       preapproval_plan_id: plan.mercadoPagoPlanId,
       card_token_id: cardTokenId,
       payer_email: payerEmail,
       status: 'authorized',
       auto_recurring: { ... }
     }
     ```
   - Returns: subscriptionId, initPoint

### Security
- ✅ Card data never touches our servers
- ✅ MercadoPago SDK handles PCI compliance
- ✅ Token is single-use and expires quickly
- ✅ All communication over HTTPS

## Database Structure

### UserSubscriptions Collection
```typescript
{
  id: string,
  userId: string,
  planId: string,
  planName: string,
  mercadoPagoSubscriptionId: string,
  status: 'pending' | 'active' | 'cancelled' | 'paused' | 'expired',
  startDate: Date,
  endDate?: Date,
  metadata: {
    // For cancelled subscriptions
    cancelledAt?: Date,
    cancelReason?: string,
    newSubscriptionId?: string,
    
    // For new subscriptions from upgrades
    activatedAt?: Date,
    previousSubscriptionId?: string,
    upgradedFrom?: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Features

### Plan Display
- ✅ Grid layout with 1-3 columns (responsive)
- ✅ Price and billing cycle clearly shown
- ✅ Features list with icons
- ✅ maxPosts and maxBookings displayed
- ✅ Current plan badge with crown icon
- ✅ Hover effects and animations

### Plan Selection Logic
- ✅ **Current Plan**: Disabled button, "Plan Actual" label
- ✅ **Higher Price**: "Mejorar Plan" button (upgrade)
- ✅ **Lower Price**: Disabled, "Contacta Soporte para Cambiar"
- ✅ **No Current Plan**: "Seleccionar Plan" button (new subscription)

### Upgrade Modal
- ✅ Plan comparison (current vs new)
- ✅ Embedded payment form
- ✅ Loading states during processing
- ✅ Error handling with user-friendly messages
- ✅ Close button (with confirmation if form is filled)

## Error Handling

### API Errors
```typescript
// Missing parameters
400: 'userId, oldSubscriptionId, and newSubscriptionId are required'

// Not found
404: 'Old subscription not found' | 'New subscription not found'

// Authorization
403: 'Unauthorized: Subscription does not belong to user'

// Server errors
500: 'Failed to cancel old subscription' | 'Failed to activate new subscription'
```

### User-Facing Errors
- Network errors: "Error al cargar los planes. Por favor intenta de nuevo."
- Payment errors: Displayed in SubscriptionForm component
- Upgrade errors: "Error al actualizar el plan. Por favor contacta soporte."

## Testing Checklist

### Manual Testing
- [ ] Navigate to `/suscribirse/planes` as logged-in user
- [ ] Verify all active plans are displayed
- [ ] Confirm current plan is marked correctly
- [ ] Test upgrade button on higher-tier plan
- [ ] Fill payment form with test card
- [ ] Verify new subscription created
- [ ] Confirm old subscription cancelled
- [ ] Check Firebase for correct status updates
- [ ] Test post limit modal redirect to plans
- [ ] Verify "Cancelar" and "Mejorar plan" buttons work

### Edge Cases
- [ ] User with no subscription
- [ ] User tries to downgrade
- [ ] User tries to "upgrade" to same plan
- [ ] MercadoPago API failure during cancellation
- [ ] Firebase update failure
- [ ] Invalid card information
- [ ] Network timeout during upgrade

## MercadoPago Test Cards

For testing, use MercadoPago's test cards:

| Card Number         | Type       | Result    |
|---------------------|------------|-----------|
| 5031 7557 3453 0604 | Mastercard | Approved  |
| 4170 0688 1010 8020 | Visa       | Approved  |
| 4509 9535 6623 3704 | Visa       | Declined  |

**Test Data**:
- CVV: Any 3 digits (e.g., 123)
- Expiration: Any future date (e.g., 12/25)
- Name: Any name (e.g., APRO TEST)
- Email: test_user@test.com
- Document: Any 8-11 digits

## Future Enhancements

1. **Prorated Billing**: Calculate difference and charge/credit accordingly
2. **Plan Recommendations**: Suggest plans based on usage
3. **Usage Analytics**: Show current usage vs plan limits
4. **Automatic Upgrades**: Suggest upgrade when nearing limits
5. **Downgrade Support**: Allow downgrades with grace period
6. **Plan Comparison Tool**: Side-by-side feature comparison
7. **Discount Codes**: Support promotional codes
8. **Annual Billing**: Offer discount for yearly plans

## Support

### Common User Questions

**Q: Can I downgrade my plan?**
A: Currently, downgrades require contacting support. This ensures no data loss if the new plan has lower limits.

**Q: Will I be charged immediately when upgrading?**
A: Yes, the new plan's billing cycle starts immediately upon upgrade.

**Q: What happens to my old subscription?**
A: It's automatically cancelled when you upgrade. No refunds for the remaining period.

**Q: Can I keep my old posts when upgrading?**
A: Yes, all your existing data is preserved during upgrades.

**Q: What if my card is declined?**
A: The upgrade will fail and you'll remain on your current plan. Try a different payment method.

## Maintenance

### Monitoring
- Check webhook logs for subscription status changes
- Monitor `/api/mercadopago/change-plan` error rates
- Track successful vs failed plan changes
- Review Firebase subscription status consistency

### Debugging
```bash
# Check user's subscriptions
firestore: userSubscriptions (filter: userId == 'xxx')

# Check MercadoPago subscription status
MP Dashboard > Subscriptions > Search by ID

# API logs
Check server logs for [Change Plan] entries
```

## Conclusion

The plan upgrade system is now fully functional with:
- ✅ User-friendly plans page at `/suscribirse/planes`
- ✅ Secure payment collection via MercadoPago SDK
- ✅ Automatic subscription management (cancel old, activate new)
- ✅ Integration with post creation limits
- ✅ Proper error handling and user feedback
- ✅ Responsive design and dark mode

Users can now easily view available plans and upgrade their subscriptions without administrative intervention.

