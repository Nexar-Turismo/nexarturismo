# Role-Based Access Control (RBAC) System

This document describes the comprehensive role-based access control system implemented in the MKT Turismo Next.js application.

## Overview

The RBAC system provides fine-grained control over user permissions and access rights throughout the application. It's designed to be scalable, maintainable, and follows security best practices.

## Core Concepts

### 1. Roles
- **Superadmin**: Full system access with all permissions
- **Publisher**: Can create, manage, and publish service posts
- **Client**: Can browse services, make bookings, and write reviews

### 2. Permissions
Permissions are granular actions that can be performed on specific resources:
- Format: `resource:action` (e.g., `posts:create`, `users:read`)
- Resources: users, posts, analytics, system, bookings, reviews
- Actions: create, read, update, delete, moderate, publish, etc.

### 3. User Role Assignments
Users can have multiple roles, but with business rule constraints:
- A user can be both a Publisher and a Client
- Superadmin role cannot be combined with other roles
- When Superadmin is assigned, all other roles are automatically deactivated

## System Architecture

### 1. Types (`src/types/index.ts`)
```typescript
export type UserRole = 'superadmin' | 'publisher' | 'client';

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: UserRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRoleAssignment {
  roleId: string;
  roleName: UserRole;
  assignedAt: Date;
  assignedBy?: string;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRoleAssignment[];
  isActive: boolean;
  // ... other fields
}
```

### 2. Permissions Service (`src/services/permissionsService.ts`)
- Defines all system permissions and roles
- Provides utility functions for permission checking
- Implements business logic for role validation
- Exports `usePermissions` hook for components

### 3. Firebase Service (`src/services/firebaseService.ts`)
- Handles all database operations for users, roles, and posts
- Implements role assignment and removal logic
- Manages post moderation workflow
- Provides real-time updates via Firebase listeners

### 4. Auth Context (`src/lib/auth.tsx`)
- Manages user authentication state
- Provides role management functions
- Exposes permission checking methods
- Handles Firebase auth state changes

## Usage Examples

### 1. Protecting Routes
```typescript
import { RequireSuperadmin, RequirePermission } from '@/components/auth/ProtectedRoute';

// Require specific role
<RequireSuperadmin>
  <AdminDashboard />
</RequireSuperadmin>

// Require specific permission
<RequirePermission permission="posts:moderate">
  <PostModerationPanel />
</RequirePermission>

// Custom protection
<ProtectedRoute 
  requiredPermissions={['users:read', 'users:update']}
  requiredRoles={['superadmin']}
>
  <UserManagement />
</ProtectedRoute>
```

### 2. Checking Permissions in Components
```typescript
import { useAuth } from '@/lib/auth';

function MyComponent() {
  const { hasPermission, hasRole, canPerformAction } = useAuth();

  if (hasPermission('posts:create')) {
    // Show create post button
  }

  if (hasRole('publisher')) {
    // Show publisher-specific features
  }

  if (canPerformAction('users', 'assign_roles')) {
    // Show role management interface
  }
}
```

### 3. Role Management
```typescript
import { useAuth } from '@/lib/auth';

function AdminPanel() {
  const { assignRole, removeRole } = useAuth();

  const handleAssignPublisherRole = async (userId: string) => {
    try {
      await assignRole(userId, 'publisher');
      // Role assigned successfully
    } catch (error) {
      // Handle error
    }
  };

  const handleRemoveRole = async (userId: string, roleName: UserRole) => {
    try {
      await removeRole(userId, roleName);
      // Role removed successfully
    } catch (error) {
      // Handle error
    }
  };
}
```

## Database Structure

### Firebase Realtime Database Schema
```
/users/{userId}
  - id: string
  - name: string
  - email: string
  - roles: UserRoleAssignment[]
  - isActive: boolean
  - emailVerified: boolean
  - createdAt: timestamp
  - updatedAt: timestamp
  - lastLoginAt: timestamp
  - profileCompleted: boolean

/posts/{postId}
  - id: string
  - title: string
  - description: string
  - category: ServiceCategory
  - price: number
  - currency: string
  - location: string
  - images: string[]
  - isActive: boolean
  - userId: string
  - publisherId: string
  - status: 'draft' | 'pending' | 'approved' | 'rejected' | 'published'
  - moderationNotes?: string
  - moderationBy?: string
  - moderationAt?: timestamp
  - createdAt: timestamp
  - updatedAt: timestamp
  - publishedAt?: timestamp
```

## Security Features

### 1. Permission Validation
- All permission checks are performed server-side
- Client-side checks are for UX only
- Firebase security rules enforce access control

### 2. Role Assignment Validation
- Business rules prevent invalid role combinations
- Superadmin role automatically deactivates other roles
- Audit trail of role assignments and removals

### 3. Post Moderation
- All posts require approval before publication
- Only superadmins can moderate posts
- Moderation history is tracked

## Business Rules

### 1. Role Assignment Rules
- **Superadmin**: Cannot be combined with other roles
- **Publisher + Client**: Valid combination
- **Client**: Default role for new users
- **Role Inheritance**: Permissions are inherited from active roles

### 2. Post Workflow
1. User creates post → Status: `draft`
2. User submits for review → Status: `pending`
3. Superadmin reviews → Status: `approved` or `rejected`
4. Approved posts → Status: `published`

### 3. Permission Inheritance
- Users inherit all permissions from their active roles
- Permissions are additive (union of all role permissions)
- No permission conflicts (same permission from multiple roles)

## Extending the System

### 1. Adding New Permissions
```typescript
// In permissionsService.ts
export const SYSTEM_PERMISSIONS: Permission[] = [
  // ... existing permissions
  { 
    id: 'new_resource:new_action', 
    name: 'New Permission', 
    description: 'Description of new permission',
    resource: 'new_resource', 
    action: 'new_action' 
  },
];
```

### 2. Adding New Roles
```typescript
export const SYSTEM_ROLES: Role[] = [
  // ... existing roles
  {
    id: 'role_new_role',
    name: 'new_role',
    displayName: 'New Role Display Name',
    description: 'Description of new role',
    permissions: SYSTEM_PERMISSIONS.filter(p => 
      ['permission1', 'permission2'].includes(p.id)
    ),
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
```

### 3. Custom Permission Checks
```typescript
// In components or services
import { PermissionService } from '@/services/permissionsService';

const canDoSomething = PermissionService.canPerformAction(userRoles, 'resource', 'action');
const hasSpecificPermission = PermissionService.hasPermission(userRoles, 'permission:id');
```

## Best Practices

### 1. Permission Naming
- Use consistent naming: `resource:action`
- Be specific about resources and actions
- Avoid overly granular permissions

### 2. Role Design
- Keep roles focused on specific responsibilities
- Avoid role explosion
- Use permission combinations for flexibility

### 3. Security
- Always validate permissions server-side
- Use Firebase security rules as additional layer
- Log all permission-related actions

### 4. Performance
- Cache permission checks when possible
- Use Firebase listeners for real-time updates
- Minimize database queries

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check if user has required role
   - Verify permission exists in system
   - Check role activation status

2. **Role Assignment Failures**
   - Validate business rules
   - Check user existence
   - Verify assigner permissions

3. **Firebase Integration Issues**
   - Verify Firebase configuration
   - Check database rules
   - Validate data structure

### Debug Tools

```typescript
// Enable debug logging
console.log('User roles:', user.roles);
console.log('User permissions:', PermissionService.getUserPermissions(user.roles));
console.log('Can perform action:', PermissionService.canPerformAction(user.roles, 'resource', 'action'));
```

## Future Enhancements

1. **Custom Roles**: Allow superadmins to create custom roles
2. **Permission Groups**: Group related permissions for easier management
3. **Temporary Permissions**: Time-limited permission grants
4. **Audit Logging**: Comprehensive logging of all permission changes
5. **Role Templates**: Predefined role templates for common use cases

## Support

For questions or issues with the RBAC system:
1. Check this documentation
2. Review the code examples
3. Check Firebase security rules
4. Verify permission configurations
5. Test with different user roles
