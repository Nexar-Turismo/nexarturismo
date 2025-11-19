# Publisher Subscription & Post Processing System

## 🎯 Overview

A comprehensive system that validates publisher requirements before allowing post creation, including active subscription validation and MercadoPago Marketplace connection requirements.

## 🔧 Components Created

### 1. **MercadoPago Marketplace Service**
**File:** `src/services/mercadoPagoMarketplaceService.ts`

- **Purpose:** Manages publisher validation and marketplace connections
- **Features:**
  - Validates active subscriptions
  - Checks marketplace connections
  - Enforces post limits based on subscription plans
  - Manages marketplace connection storage

**Key Methods:**
- `validatePublisherForPostCreation()` - Complete publisher validation
- `saveMarketplaceConnection()` - Store marketplace credentials
- `getUserMarketplaceConnection()` - Retrieve connection status

### 2. **API Routes**

#### **Publisher Validation**
**File:** `src/app/api/mercadopago/marketplace/validate-publisher/route.ts`
- **Endpoint:** `POST /api/mercadopago/marketplace/validate-publisher`
- **Purpose:** Validates publisher requirements for post creation

#### **Marketplace Connection**
**File:** `src/app/api/mercadopago/marketplace/connect/route.ts`
- **Endpoint:** `POST /api/mercadopago/marketplace/connect`
- **Purpose:** Connects user's MercadoPago account for marketplace

### 3. **UI Components**

#### **Publisher Status Component**
**File:** `src/components/publisher/PublisherStatus.tsx`

**Features:**
- Real-time publisher status display
- Subscription status indicators
- Marketplace connection status
- Post limits and remaining posts
- Action buttons for setup
- Compact and detailed views

**Props:**
- `onStatusChange?: (isValid: boolean) => void`
- `showDetails?: boolean`
- `compact?: boolean`

#### **Marketplace Connection Form**
**File:** `src/components/forms/MarketplaceConnectionForm.tsx`

**Features:**
- Secure credential input with show/hide toggles
- Form validation
- Success/error states
- Modal overlay
- Integration with MercadoPago Developer Panel

### 4. **Custom Hook**
**File:** `src/hooks/usePublisherValidation.ts`

**Features:**
- Reactive publisher validation
- Auto-refresh on user changes
- Loading and error states
- Convenient validation methods

**Returns:**
```typescript
{
  validation: PublisherValidationResult | null,
  loading: boolean,
  error: string | null,
  validatePublisher: (userId?: string) => Promise<PublisherValidationResult | null>,
  refreshValidation: () => void,
  isValid: boolean,
  hasActiveSubscription: boolean,
  hasMarketplaceConnection: boolean,
  postLimit?: number,
  currentPostsCount?: number,
  remainingPosts?: number,
  errors: string[]
}
```

## 🔄 Validation Flow

### **Post Creation Validation**

1. **User clicks "Create Post"**
2. **Pre-validation Check** (PostFormWizard.tsx):
   ```typescript
   // Only for new posts (not edits)
   if (!editMode) {
     const validation = await validatePublisher(user.id);
     if (!validation.isValid) {
       throw new Error(validation.errors.join(' '));
     }
   }
   ```

3. **Validation Criteria:**
   - ✅ **Active Subscription Required**
   - ✅ **MercadoPago Marketplace Connection Required**
   - ✅ **Post Limit Not Exceeded**
   - ✅ **Valid User Account**

### **Validation Results**

**Success Example:**
```json
{
  "isValid": true,
  "hasActiveSubscription": true,
  "hasMarketplaceConnection": true,
  "subscriptionPlan": "Avanzado",
  "postLimit": 10,
  "currentPostsCount": 3,
  "remainingPosts": 7,
  "errors": []
}
```

**Failure Example:**
```json
{
  "isValid": false,
  "hasActiveSubscription": false,
  "hasMarketplaceConnection": false,
  "errors": [
    "No active subscription found. Please subscribe to a plan to create posts.",
    "MercadoPago Marketplace connection required. Please connect your MercadoPago account."
  ]
}
```

## 🛠️ Environment Variables Required

```env
# MercadoPago Marketplace Credentials
NEXAR_MARKETPLACE_PUBLIC_KEY=APP_USR-89469e1e-f8e9-48ae-8a4e-dc3ff813714b
NEXAR_MARKETPLACE_ACCESS_TOKEN=APP_USR-3823678763955355-101121-ad2d950dec2b03432bd360e318d5245a-2715998425
NEXAR_MARKETPLACE_APP_ID=8600619914166235
NEXAR_MARKETPLACE_CLIENT_SECRET=kEbANDPOoR97P9aRF7qY8nIsT3E4EAb9

# MercadoPago Subscriptions (for plan management)
NEXAR_SUSCRIPTIONS_PUBLIC_KEY=APP_USR-b106fad0-f5b9-4e84-9287-9da8ed155008
NEXAR_SUSCRIPTIONS_ACCESS_TOKEN=APP_USR-3510715878288844-092917-4749a0eda9834be79bb4d05f5d6582f6-115717681
```

## 📱 User Experience Flow

### **1. First-Time Publisher Setup**

1. **User registers** → Gets basic account
2. **User tries to create post** → Validation fails
3. **System shows requirements:**
   - Subscribe to a plan (link to `/suscribirse`)
   - Connect MercadoPago account (button opens form)
4. **User completes setup** → Can now create posts

### **2. Post Creation with Limits**

1. **User creates post** → System validates:
   - Active subscription ✅
   - Marketplace connection ✅
   - Post limit not exceeded ✅
2. **Post created successfully** → Remaining posts count decreases
3. **Near limit warning** → Shows when ≤3 posts remaining

### **3. Settings Page Integration**

- **Publisher Status Widget** shows real-time status
- **MercadoPago Marketplace Section** for easy connection
- **Visual indicators** for all requirements

## 🔒 Security Features

### **Credential Protection**
- Marketplace credentials stored securely in Firebase
- Access tokens hidden in UI with show/hide toggles
- Environment variables for system-level credentials

### **Validation Security**
- Server-side validation (not just client-side)
- User ID verification
- Subscription status verification
- Post count verification

## 📊 Database Schema

### **Marketplace Connections Collection**
```typescript
interface MarketplaceConnection {
  id: string;
  userId: string;
  mercadoPagoUserId: string;
  mercadoPagoAccessToken: string;
  mercadoPagoPublicKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  connectedBy: string;
}
```

### **User Subscriptions Collection**
```typescript
interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🚀 Implementation Status

### ✅ **Completed**
- [x] MercadoPago Marketplace Service
- [x] Publisher validation API routes
- [x] Post creation form validation
- [x] Publisher Status component
- [x] Marketplace Connection form
- [x] Settings page integration
- [x] Custom validation hook
- [x] Post limit enforcement
- [x] Error handling and user feedback

### 🔄 **Next Steps**
- [ ] Test complete validation flow
- [ ] Implement subscription management UI
- [ ] Add webhook handling for subscription changes
- [ ] Create admin dashboard for subscription monitoring

## 🧪 Testing

### **Test Scenarios**

1. **New User (No Setup)**
   - Try to create post → Should show setup requirements

2. **User with Subscription Only**
   - Try to create post → Should require marketplace connection

3. **User with Marketplace Only**
   - Try to create post → Should require subscription

4. **Fully Setup User**
   - Try to create post → Should succeed
   - Check post limits → Should decrease remaining count

5. **User at Post Limit**
   - Try to create post → Should be blocked with clear message

## 📝 Usage Examples

### **Using the Publisher Status Component**
```tsx
import PublisherStatus from '@/components/publisher/PublisherStatus';

// Detailed view
<PublisherStatus 
  showDetails={true} 
  onStatusChange={(isValid) => console.log('Status:', isValid)} 
/>

// Compact view
<PublisherStatus compact={true} />
```

### **Using the Validation Hook**
```tsx
import { usePublisherValidation } from '@/hooks/usePublisherValidation';

function MyComponent() {
  const { 
    isValid, 
    hasActiveSubscription, 
    postLimit, 
    remainingPosts,
    validatePublisher 
  } = usePublisherValidation();

  const handleCreatePost = async () => {
    if (!isValid) {
      await validatePublisher(); // Refresh validation
      return;
    }
    // Proceed with post creation
  };
}
```

## 🎉 Benefits

1. **Revenue Protection** - Ensures only paying subscribers can create posts
2. **Payment Integration** - Requires MercadoPago connection for revenue
3. **Scalable Limits** - Post limits based on subscription tiers
4. **User-Friendly** - Clear requirements and easy setup flow
5. **Real-time Status** - Always up-to-date validation status
6. **Secure** - Server-side validation with proper error handling

---

**Status:** ✅ **Implementation Complete**

**Ready for Testing:** Publisher subscription validation system is fully implemented and ready for testing.
