# 🔐 Auth Middleware System - Dynamic Role Management

## Overview

The Auth Middleware System provides dynamic role management based on subscription status. Instead of assigning roles immediately when a subscription is created, the system continuously checks subscription status and manages user roles and permissions accordingly.

## 🏗️ System Architecture

### **Key Benefits:**
- ✅ **Dynamic Role Management** - Roles are managed based on real-time subscription status
- ✅ **Automatic Post Deactivation** - Posts are deactivated when subscriptions expire/cancel
- ✅ **Real-time Permission Checking** - Permissions are validated on every action
- ✅ **Subscription Pause/Resume Support** - Handles subscription state changes automatically
- ✅ **Centralized Logic** - All role and permission logic in one place

## 📁 Components

### **1. Auth Middleware Service** (`/src/services/authMiddleware.ts`)

**Core Functions:**
- `checkUserSubscriptionAndRoles()` - Main function that checks subscription and manages roles
- `checkUserPermission()` - Validates if user can perform specific actions
- `removePublisherRoleAndDeactivatePosts()` - Handles subscription cancellation
- `deactivateUserPosts()` - Deactivates all user posts when subscription expires

**Key Features:**
```typescript
// Automatically manages roles based on subscription status
if (hasActiveSubscription && !isPublisher) {
  await firebaseDB.users.assignRole(userId, 'publisher', 'subscription-middleware');
} else if (!hasActiveSubscription && isPublisher) {
  await this.removePublisherRoleAndDeactivatePosts(userId);
}
```

### **2. React Hook** (`/src/hooks/useAuthMiddleware.ts`)

**Provides:**
- `userStatus` - Current user status with subscription info
- `checkPermission()` - Check if user can perform actions
- `refresh()` - Manually refresh user status
- `isLoading` and `error` states

**Usage:**
```typescript
const { userStatus, checkPermission, refresh } = useAuthMiddleware();

const canCreatePost = await checkPermission('create_post');
```

### **3. API Routes**

#### **`/api/auth/middleware/check-user`**
- Checks user subscription status and manages roles
- Returns complete user status with subscription info

#### **`/api/auth/middleware/check-permission`**
- Validates specific permissions (create_post, create_booking, publish)
- Returns permission result with detailed reason

### **4. Subscription Status Component** (`/src/components/auth/SubscriptionStatus.tsx`)

**Features:**
- Real-time subscription status display
- Remaining posts/bookings counter
- Warning messages for low limits
- Subscribe button for non-subscribers
- Manual refresh capability

## 🔄 How It Works

### **1. User Authentication Flow**
```
User logs in → useAuthMiddleware hook → API call to check-user → 
Auth middleware checks subscription → Updates roles if needed → 
Returns user status with permissions
```

### **2. Permission Checking Flow**
```
User tries to create post → checkPermission('create_post') → 
API call to check-permission → Auth middleware validates → 
Returns allowed/denied with reason
```

### **3. Subscription Change Flow**
```
Webhook receives subscription update → Calls auth middleware → 
Middleware checks new status → Updates roles → Deactivates posts if needed
```

## 📊 User Status Object

```typescript
interface UserWithSubscription {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  hasActiveSubscription: boolean;
  subscription?: {
    id: string;
    planName: string;
    status: string;
    remainingPosts: number;
    remainingBookings: number;
  };
  isPublisher: boolean;
  canCreatePosts: boolean;
  canCreateBookings: boolean;
}
```

## 🛡️ Permission System

### **Available Actions:**
- `create_post` - Check if user can create new posts
- `create_booking` - Check if user can manage bookings
- `publish` - Check if user can publish content

### **Permission Logic:**
```typescript
// Create Post Permission
if (!hasActiveSubscription) → DENIED: "Active subscription required"
if (remainingPosts <= 0) → DENIED: "Post limit reached"
else → ALLOWED
```

## 🔧 Integration Points

### **1. Post Creation** (`PostFormWizard.tsx`)
- Uses `checkPermission('create_post')` before allowing post creation
- Shows specific error messages based on permission result

### **2. Subscription Webhook** (`subscription-webhook/route.ts`)
- Calls auth middleware when subscription status changes
- Middleware automatically manages roles and posts

### **3. Payment Complete** (`payment/complete/page.tsx`)
- Triggers webhook to update subscription status
- Middleware handles role assignment automatically

## 🚀 Usage Examples

### **1. Check User Status**
```typescript
const { userStatus, isLoading } = useAuthMiddleware();

if (userStatus?.hasActiveSubscription) {
  console.log('User can publish posts');
  console.log('Remaining posts:', userStatus.subscription?.remainingPosts);
}
```

### **2. Validate Permission**
```typescript
const { checkPermission } = useAuthMiddleware();

const handleCreatePost = async () => {
  const permission = await checkPermission('create_post');
  
  if (!permission.allowed) {
    alert(permission.reason);
    return;
  }
  
  // Proceed with post creation
};
```

### **3. Display Subscription Status**
```tsx
import SubscriptionStatus from '@/components/auth/SubscriptionStatus';

<SubscriptionStatus showDetails={true} onRefresh={handleRefresh} />
```

## 🔄 Subscription Lifecycle Management

### **Active Subscription:**
1. ✅ User has active subscription → Publisher role assigned
2. ✅ User can create posts (within limits)
3. ✅ User can manage bookings
4. ✅ All permissions granted

### **Subscription Cancelled/Expired:**
1. ❌ Publisher role removed automatically
2. ❌ All user posts deactivated
3. ❌ Post creation blocked
4. ❌ Booking management blocked

### **Subscription Paused:**
1. ⏸️ Publisher role removed
2. ⏸️ Posts remain but user cannot create new ones
3. ⏸️ Booking management limited

## 🧪 Testing

### **Test Scenarios:**
1. **New Subscription** - User subscribes → Publisher role assigned
2. **Subscription Cancellation** - User cancels → Role removed, posts deactivated
3. **Subscription Pause** - User pauses → Role removed, new posts blocked
4. **Post Limit Reached** - User hits limit → New posts blocked
5. **Permission Validation** - Check all permission scenarios

### **Manual Testing:**
```typescript
// Test subscription status check
const response = await fetch('/api/auth/middleware/check-user', {
  method: 'POST',
  body: JSON.stringify({ userId: 'test-user-id' })
});

// Test permission check
const permission = await fetch('/api/auth/middleware/check-permission', {
  method: 'POST',
  body: JSON.stringify({ userId: 'test-user-id', action: 'create_post' })
});
```

## 📈 Benefits

### **1. Dynamic Management**
- Roles automatically adjust based on subscription status
- No manual intervention required for subscription changes

### **2. Content Protection**
- Posts automatically deactivated when subscription expires
- Prevents unauthorized access to publisher features

### **3. Real-time Validation**
- Permissions checked on every action
- Always up-to-date with current subscription status

### **4. Scalable Architecture**
- Centralized logic easy to maintain
- Easy to add new permission types
- Consistent across all components

### **5. User Experience**
- Clear error messages for permission denials
- Real-time subscription status display
- Automatic role management (no user confusion)

## 🔮 Future Enhancements

### **Planned Features:**
- **Bulk User Management** - Check multiple users at once
- **Advanced Permissions** - More granular permission system
- **Audit Logging** - Track role changes and permission checks
- **Caching** - Cache user status for better performance
- **Webhooks** - Real-time updates for subscription changes

---

## ✅ Implementation Status

- ✅ **Auth Middleware Service** - Complete
- ✅ **React Hook** - Complete
- ✅ **API Routes** - Complete
- ✅ **Subscription Status Component** - Complete
- ✅ **Post Creation Integration** - Complete
- ✅ **Webhook Integration** - Complete
- ✅ **Payment Flow Integration** - Complete
- 🔄 **Testing & Validation** - In Progress

The Auth Middleware System is now fully implemented and ready for testing! 🚀
