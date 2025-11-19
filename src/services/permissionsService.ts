import { Permission, Role, UserRole, UserRoleAssignment } from '@/types';

// System Permissions - These define what each role can do
export const SYSTEM_PERMISSIONS: Permission[] = [
  // User Management
  { id: 'users:read', name: 'Read Users', description: 'View user information', resource: 'users', action: 'read' },
  { id: 'users:create', name: 'Create Users', description: 'Create new users', resource: 'users', action: 'create' },
  { id: 'users:update', name: 'Update Users', description: 'Modify user information', resource: 'users', action: 'update' },
  { id: 'users:delete', name: 'Delete Users', description: 'Remove users from system', resource: 'users', action: 'delete' },
  { id: 'users:assign_roles', name: 'Assign Roles', description: 'Assign roles to users', resource: 'users', action: 'assign_roles' },

  // Post Management
  { id: 'posts:read', name: 'Read Posts', description: 'View posts', resource: 'posts', action: 'read' },
  { id: 'posts:create', name: 'Create Posts', description: 'Create new posts', resource: 'posts', action: 'create' },
  { id: 'posts:update', name: 'Update Posts', description: 'Modify existing posts', resource: 'posts', action: 'update' },
  { id: 'posts:delete', name: 'Delete Posts', description: 'Remove posts', resource: 'posts', action: 'delete' },
  { id: 'posts:moderate', name: 'Moderate Posts', description: 'Approve/reject posts', resource: 'posts', action: 'moderate' },
  { id: 'posts:publish', name: 'Publish Posts', description: 'Make posts public', resource: 'posts', action: 'publish' },

  // Analytics and Reports
  { id: 'analytics:read', name: 'Read Analytics', description: 'View analytics and reports', resource: 'analytics', action: 'read' },
  { id: 'analytics:export', name: 'Export Analytics', description: 'Export analytics data', resource: 'analytics', action: 'export' },

  // System Management
  { id: 'system:settings', name: 'System Settings', description: 'Modify system settings', resource: 'system', action: 'settings' },
  { id: 'system:mercado_pago', name: 'Mercado Pago Settings', description: 'Manage Mercado Pago payment credentials', resource: 'system', action: 'mercado_pago' },
  { id: 'system:plans', name: 'Subscription Plans', description: 'Manage subscription plans and pricing', resource: 'system', action: 'plans' },
  { id: 'system:backup', name: 'System Backup', description: 'Create system backups', resource: 'system', action: 'backup' },
  { id: 'system:logs', name: 'System Logs', description: 'View system logs', resource: 'system', action: 'logs' },

  // Booking Management
  { id: 'bookings:read', name: 'Read Bookings', description: 'View booking information', resource: 'bookings', action: 'read' },
  { id: 'bookings:create', name: 'Create Bookings', description: 'Create new bookings', resource: 'bookings', action: 'create' },
  { id: 'bookings:update', name: 'Update Bookings', description: 'Modify booking details', resource: 'bookings', action: 'update' },
  { id: 'bookings:cancel', name: 'Cancel Bookings', description: 'Cancel existing bookings', resource: 'bookings', action: 'cancel' },
  { id: 'bookings:approve', name: 'Approve Bookings', description: 'Approve booking requests', resource: 'bookings', action: 'approve' },

  // Reviews and Ratings
  { id: 'reviews:read', name: 'Read Reviews', description: 'View reviews and ratings', resource: 'reviews', action: 'read' },
  { id: 'reviews:create', name: 'Create Reviews', description: 'Write reviews', resource: 'reviews', action: 'create' },
  { id: 'reviews:moderate', name: 'Moderate Reviews', description: 'Approve/reject reviews', resource: 'reviews', action: 'moderate' },
  { id: 'reviews:delete', name: 'Delete Reviews', description: 'Remove inappropriate reviews', resource: 'reviews', action: 'delete' },
];

// System Roles - These are predefined and cannot be modified
export const SYSTEM_ROLES: Role[] = [
  {
    id: 'role_superadmin',
    name: 'superadmin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: SYSTEM_PERMISSIONS, // Superadmin gets all permissions
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'role_publisher',
    name: 'publisher',
    displayName: 'Service Publisher',
    description: 'Can create, manage, and publish service posts',
    permissions: SYSTEM_PERMISSIONS.filter(p => 
      ['posts:read', 'posts:create', 'posts:update', 'posts:delete', 'posts:publish', 
       'bookings:read', 'bookings:update', 'bookings:approve',
       'reviews:read', 'analytics:read'].includes(p.id)
    ),
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'role_client',
    name: 'client',
    displayName: 'Service Client',
    description: 'Can browse services, make bookings, and write reviews',
    permissions: SYSTEM_PERMISSIONS.filter(p => 
      ['posts:read', 'bookings:read', 'bookings:create', 'bookings:update', 'bookings:cancel',
       'reviews:read', 'reviews:create'].includes(p.id)
    ),
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'role_referral',
    name: 'referral',
    displayName: 'Referral User',
    description: 'Can invite publishers to register on the platform',
    permissions: SYSTEM_PERMISSIONS.filter(p => 
      ['posts:read'].includes(p.id)
    ),
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Permission checking utilities
export class PermissionService {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(userRoles: UserRoleAssignment[], permissionId: string): boolean {
    const userPermissions = this.getUserPermissions(userRoles);
    return userPermissions.some(p => p.id === permissionId);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static hasAnyPermission(userRoles: UserRoleAssignment[], permissionIds: string[]): boolean {
    const userPermissions = this.getUserPermissions(userRoles);
    return permissionIds.some(id => userPermissions.some(p => p.id === id));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static hasAllPermissions(userRoles: UserRoleAssignment[], permissionIds: string[]): boolean {
    const userPermissions = this.getUserPermissions(userRoles);
    return permissionIds.every(id => userPermissions.some(p => p.id === id));
  }

  /**
   * Check if a user has a specific role
   */
  static hasRole(userRoles: UserRoleAssignment[], roleName: UserRole): boolean {
    return userRoles.some(role => role.roleName === roleName && role.isActive);
  }

  /**
   * Check if a user has any of the specified roles
   */
  static hasAnyRole(userRoles: UserRoleAssignment[], roleNames: UserRole[]): boolean {
    return roleNames.some(roleName => this.hasRole(userRoles, roleName));
  }

  /**
   * Check if a user has all of the specified roles
   */
  static hasAllRoles(userRoles: UserRoleAssignment[], roleNames: UserRole[]): boolean {
    return roleNames.every(roleName => this.hasRole(userRoles, roleName));
  }

  /**
   * Get all permissions for a user based on their roles
   */
  static getUserPermissions(userRoles: UserRoleAssignment[]): Permission[] {
    const permissions: Permission[] = [];
    const activeRoles = userRoles.filter(role => role.isActive);
    
    activeRoles.forEach(role => {
      const systemRole = SYSTEM_ROLES.find(sr => sr.name === role.roleName);
      if (systemRole) {
        systemRole.permissions.forEach(permission => {
          if (!permissions.find(p => p.id === permission.id)) {
            permissions.push(permission);
          }
        });
      }
    });
    
    return permissions;
  }

  /**
   * Get all roles for a user
   */
  static getUserRoles(userRoles: UserRoleAssignment[]): Role[] {
    const activeRoles = userRoles.filter(role => role.isActive);
    return activeRoles.map(role => {
      const systemRole = SYSTEM_ROLES.find(sr => sr.name === role.roleName);
      return systemRole!;
    });
  }

  /**
   * Check if a user can perform an action on a resource
   */
  static canPerformAction(userRoles: UserRoleAssignment[], resource: string, action: string): boolean {
    const permissionId = `${resource}:${action}`;
    return this.hasPermission(userRoles, permissionId);
  }

  /**
   * Get role by name
   */
  static getRoleByName(roleName: UserRole): Role | undefined {
    return SYSTEM_ROLES.find(role => role.name === roleName);
  }

  /**
   * Get all system roles
   */
  static getAllRoles(): Role[] {
    return SYSTEM_ROLES;
  }

  /**
   * Validate role assignment (business rules)
   */
  static validateRoleAssignment(currentRoles: UserRoleAssignment[], newRole: UserRole): { valid: boolean; message?: string } {
    // Superadmin cannot be combined with other roles
    if (newRole === 'superadmin') {
      if (currentRoles.some(role => role.roleName !== 'superadmin' && role.isActive)) {
        return { 
          valid: false, 
          message: 'Superadmin role cannot be combined with other roles' 
        };
      }
    }

    // If adding superadmin, remove all other roles
    if (newRole === 'superadmin' && currentRoles.some(role => role.roleName !== 'superadmin' && role.isActive)) {
      return { 
        valid: false, 
        message: 'Cannot add superadmin role when user has other active roles' 
      };
    }

    return { valid: true };
  }
}

// Hook for using permissions in components
export const usePermissions = (userRoles: UserRoleAssignment[]) => {
  return {
    hasPermission: (permissionId: string) => PermissionService.hasPermission(userRoles, permissionId),
    hasAnyPermission: (permissionIds: string[]) => PermissionService.hasAnyPermission(userRoles, permissionIds),
    hasAllPermissions: (permissionIds: string[]) => PermissionService.hasAllPermissions(userRoles, permissionIds),
    hasRole: (roleName: UserRole) => PermissionService.hasRole(userRoles, roleName),
    hasAnyRole: (roleNames: UserRole[]) => PermissionService.hasAnyRole(userRoles, roleNames),
    hasAllRoles: (roleNames: UserRole[]) => PermissionService.hasAllRoles(userRoles, roleNames),
    canPerformAction: (resource: string, action: string) => PermissionService.canPerformAction(userRoles, resource, action),
    getUserPermissions: () => PermissionService.getUserPermissions(userRoles),
    getUserRoles: () => PermissionService.getUserRoles(userRoles),
  };
};
