# 🌐 Global Auth Middleware System

## Overview

The Global Auth Middleware System ensures that user roles are consistently managed across the entire application based on subscription status. The middleware runs automatically whenever a user is authenticated and ensures proper role assignment without duplicates.

## 🎯 Core Requirements

### **Role Management Logic:**
- ✅ **Active Subscription** → User must have **BOTH** `client` and `publisher` roles
- ✅ **No Active Subscription** → User must have **ONLY** `client` role (or `superadmin`)
- ✅ **Superadmin Users** → Not affected by subscription status
- ✅ **Role Deduplication** → Prevents duplicate role assignments

## 🏗️ System Architecture

### **Components:**

#### **1. Global Auth Middleware Service** (`globalAuthMiddleware.ts`)
- **Singleton Pattern** - Single instance across the app
- **Caching System** - 5-minute cache to prevent excessive API calls
- **Role Management** - Automatically assigns/removes roles based on subscription
- **Post Deactivation** - Deactivates posts when subscription expires

#### **2. Enhanced Auth Middleware** (`authMiddleware.ts`)
- **Role Logic** - Implements the core role assignment rules
- **Subscription Validation** - Checks subscription status and limits
- **Permission Checking** - Validates user permissions for actions

#### **3. Updated Auth Context** (`auth.tsx`)
- **Global Integration** - Uses global middleware on every auth state change
- **Automatic Refresh** - Refreshes user status when needed
- **Cache Management** - Clears cache on logout and subscription changes

#### **4. Next.js Middleware** (`middleware.ts`)
- **Request Interception** - Runs on every request
- **Selective Processing** - Skips static files and specific API routes
- **Performance Optimization** - Minimal overhead

## 🔄 How It Works

### **1. User Authentication Flow**
```
User logs in → Auth Context triggers → Global Middleware checks subscription → 
Roles updated automatically → User state refreshed → App continues
```

### **2. Role Assignment Logic**
```typescript
if (hasActiveSubscription) {
  // User needs BOTH client and publisher roles
  if (!hasClientRole) assignRole('client');
  if (!hasPublisherRole) assignRole('publisher');
} else {
  // User needs ONLY client role (unless superadmin)
  if (hasPublisherRole) removeRole('publisher') + deactivatePosts();
  if (!hasClientRole) assignRole('client');
}
```

### **3. Subscription Change Flow**
```
Webhook receives update → Clears user cache → Middleware checks new status → 
Roles updated → Posts deactivated if needed → User state refreshed
```

## 📊 Role Management Matrix

| Subscription Status | Client Role | Publisher Role | Superadmin Role |
|-------------------|-------------|----------------|-----------------|
| **Active** | ✅ Required | ✅ Required | ✅ Unaffected |
| **Inactive/Expired** | ✅ Required | ❌ Removed | ✅ Unaffected |
| **Cancelled** | ✅ Required | ❌ Removed | ✅ Unaffected |
| **Paused** | ✅ Required | ❌ Removed | ✅ Unaffected |

## 🛡️ Permission System

### **Role-Based Permissions:**
- **Client Role** - Basic user permissions
- **Publisher Role** - Content creation and management (requires active subscription)
- **Superadmin Role** - Full system access (unaffected by subscription)

### **Action Validation:**
```typescript
// Create Post Permission
if (!hasActiveSubscription) → DENIED: "Active subscription required"
if (!hasPublisherRole) → DENIED: "Publisher role required"
if (remainingPosts <= 0) → DENIED: "Post limit reached"
else → ALLOWED
```

## 🔧 Implementation Details

### **1. Global Auth Middleware Service**

**Key Features:**
```typescript
class GlobalAuthMiddlewareService {
  // Singleton pattern
  private static instance: GlobalAuthMiddlewareService;
  
  // User status caching (5 minutes)
  private userCache = new Map<string, UserCacheEntry>();
  
  // Main functions
  async checkGlobalUserStatus(userId: string): Promise<UserStatus>
  async checkGlobalPermission(userId: string, action: string): Promise<PermissionResult>
  clearUserCache(userId: string): void
  async forceRefreshUserStatus(userId: string): Promise<UserStatus>
}
```

**Caching Strategy:**
- **5-minute cache** - Prevents excessive subscription checks
- **Automatic invalidation** - Clears cache on subscription changes
- **Concurrent protection** - Prevents multiple simultaneous checks

### **2. Enhanced Role Logic**

**Subscription Active:**
```typescript
if (hasActiveSubscription) {
  // Ensure user has BOTH roles
  if (!hasClientRole) {
    await firebaseDB.users.assignRole(userId, 'client', 'subscription-middleware');
  }
  if (!hasPublisherRole) {
    await firebaseDB.users.assignRole(userId, 'publisher', 'subscription-middleware');
  }
}
```

**No Active Subscription:**
```typescript
else {
  // Remove publisher role and deactivate posts
  if (hasPublisherRole) {
    await this.removePublisherRoleAndDeactivatePosts(userId);
  }
  // Ensure user has client role
  if (!hasClientRole) {
    await firebaseDB.users.assignRole(userId, 'client', 'subscription-middleware');
  }
}
```

### **3. Auth Context Integration**

**Automatic Role Management:**
```typescript
useEffect(() => {
  const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      // Use global middleware to check and update roles
      const userStatus = await globalAuthMiddleware.checkGlobalUserStatus(firebaseUser.uid);
      // Update user state with correct roles
    }
  });
}, []);
```

**Manual Refresh:**
```typescript
const refreshUser = async () => {
  globalAuthMiddleware.clearUserCache(user.id);
  const userStatus = await globalAuthMiddleware.forceRefreshUserStatus(user.id);
  setUser(userStatus);
};
```

## 🚀 Usage Examples

### **1. Automatic Role Management**
```typescript
// Roles are automatically managed when user logs in
const { user } = useAuth();

// user.roles will always be correct based on subscription status
console.log(user.roles); // [{ roleName: 'client' }, { roleName: 'publisher' }]
```

### **2. Permission Checking**
```typescript
// Check if user can create posts
const { checkPermission } = useAuthMiddleware();
const permission = await checkPermission('create_post');

if (!permission.allowed) {
  alert(permission.reason); // "Active subscription required"
}
```

### **3. Manual Refresh**
```typescript
// Force refresh user status (useful after subscription changes)
const { refreshUser } = useAuth();
await refreshUser();
```

### **4. Subscription Status Display**
```tsx
import SubscriptionStatus from '@/components/auth/SubscriptionStatus';

<SubscriptionStatus 
  showDetails={true} 
  onRefresh={() => refreshUser()} 
/>
```

## 🔄 Subscription Lifecycle

### **1. New Subscription**
1. ✅ User subscribes → Payment completed
2. ✅ Webhook triggers → Subscription status updated
3. ✅ Global middleware checks → Publisher role assigned
4. ✅ Auth context refreshes → User state updated
5. ✅ User can now create posts

### **2. Subscription Cancellation**
1. ❌ User cancels subscription
2. ❌ Webhook triggers → Subscription status updated
3. ❌ Global middleware checks → Publisher role removed
4. ❌ All user posts deactivated
5. ❌ User can no longer create posts

### **3. Subscription Pause**
1. ⏸️ Subscription paused
2. ⏸️ Publisher role removed
3. ⏸️ Posts remain but user cannot create new ones
4. ⏸️ User can resume subscription later

## 🧪 Testing Scenarios

### **1. Role Assignment Tests**
```typescript
// Test: User with active subscription should have both roles
const userStatus = await globalAuthMiddleware.checkGlobalUserStatus(userId);
expect(userStatus.roles).toContain('client');
expect(userStatus.roles).toContain('publisher');

// Test: User without subscription should have only client role
expect(userStatus.roles).toContain('client');
expect(userStatus.roles).not.toContain('publisher');
```

### **2. Permission Tests**
```typescript
// Test: User with active subscription can create posts
const permission = await globalAuthMiddleware.checkGlobalPermission(userId, 'create_post');
expect(permission.allowed).toBe(true);

// Test: User without subscription cannot create posts
const permission = await globalAuthMiddleware.checkGlobalPermission(userId, 'create_post');
expect(permission.allowed).toBe(false);
expect(permission.reason).toContain('Active subscription required');
```

### **3. Cache Tests**
```typescript
// Test: Cache prevents duplicate checks
const start = Date.now();
await globalAuthMiddleware.checkGlobalUserStatus(userId);
await globalAuthMiddleware.checkGlobalUserStatus(userId); // Should use cache
const duration = Date.now() - start;
expect(duration).toBeLessThan(1000); // Should be fast due to cache
```

## 📈 Performance Benefits

### **1. Caching System**
- **5-minute cache** - Reduces database queries
- **Smart invalidation** - Clears cache when needed
- **Concurrent protection** - Prevents race conditions

### **2. Selective Processing**
- **Next.js middleware** - Only runs on necessary requests
- **API route skipping** - Avoids infinite loops
- **Static file bypass** - No overhead for assets

### **3. Efficient Role Management**
- **Duplicate prevention** - Only assigns roles when needed
- **Batch operations** - Handles multiple role changes efficiently
- **Smart updates** - Only updates when status actually changes

## 🔮 Future Enhancements

### **Planned Features:**
- **Real-time Updates** - WebSocket integration for instant role updates
- **Advanced Caching** - Redis-based caching for better performance
- **Audit Logging** - Track all role changes and permission checks
- **Bulk Operations** - Handle multiple users simultaneously
- **Role Templates** - Predefined role sets for different subscription types

---

## ✅ Implementation Status

- ✅ **Global Auth Middleware Service** - Complete
- ✅ **Enhanced Role Logic** - Complete
- ✅ **Auth Context Integration** - Complete
- ✅ **Next.js Middleware** - Complete
- ✅ **Subscription Webhook Integration** - Complete
- ✅ **Cache Management** - Complete
- ✅ **Role Deduplication** - Complete
- 🔄 **Testing & Validation** - In Progress

The Global Auth Middleware System is now fully implemented and ensures consistent role management across the entire application! 🚀

## 🎯 Key Benefits

1. **Automatic Role Management** - Roles are always correct based on subscription status
2. **No Duplicate Assignments** - Smart logic prevents role duplication
3. **Real-time Updates** - Changes reflect immediately across the app
4. **Performance Optimized** - Caching and selective processing
5. **Scalable Architecture** - Easy to extend with new features
6. **Consistent UX** - Users always see correct permissions and status
