'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, UserRole, UserRoleAssignment } from '@/types';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { SYSTEM_ROLES } from '@/services/permissionsService';
import { Shield, UserPlus, UserMinus, AlertCircle, CheckCircle } from 'lucide-react';

interface RoleManagementProps {
  className?: string;
}

export default function RoleManagement({ className = '' }: RoleManagementProps) {
  const { user, assignRole, removeRole, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check if user has permission to manage roles
  useEffect(() => {
    if (hasPermission('users:assign_roles')) {
      loadUsers();
    }
  }, [hasPermission]);

  if (!hasPermission('users:assign_roles')) {
    return (
      <div className="p-6 text-center">
        <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600">Access Denied</h3>
        <p className="text-gray-500">You don't have permission to manage user roles.</p>
      </div>
    );
  }

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const allUsers = await firebaseDB.users.getAll();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      setIsProcessing(true);
      await assignRole(selectedUser.id, selectedRole);
      
      setMessage({ type: 'success', text: `Role ${selectedRole} assigned successfully to ${selectedUser.name}` });
      
      // Refresh users list
      await loadUsers();
      
      // Reset selection
      setSelectedUser(null);
      setSelectedRole('');
    } catch (error: unknown) {
      console.error('Error assigning role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign role';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveRole = async (userId: string, roleName: UserRole) => {
    try {
      setIsProcessing(true);
      await removeRole(userId, roleName);
      
      setMessage({ type: 'success', text: `Role ${roleName} removed successfully` });
      
      // Refresh users list
      await loadUsers();
    } catch (error: unknown) {
      console.error('Error removing role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove role';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  const getUserRoles = (userRoles: UserRoleAssignment[]): UserRole[] => {
    return userRoles
      .filter(role => role.isActive)
      .map(role => role.roleName);
  };

  const getRoleDisplayName = (roleName: UserRole): string => {
    const role = SYSTEM_ROLES.find(r => r.name === roleName);
    return role?.displayName || roleName;
  };

  const getRoleColor = (roleName: UserRole): string => {
    switch (roleName) {
      case 'superadmin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'publisher':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'client':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Role Management</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage user roles and permissions</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border flex items-center space-x-3 ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          )}
          <span className={`text-sm ${
            message.type === 'success' 
              ? 'text-green-700 dark:text-green-300' 
              : 'text-red-700 dark:text-red-300'
          }`}>
            {message.text}
          </span>
        </motion.div>
      )}

      {/* Assign Role Section */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assign New Role</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* User Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select User
            </label>
            <select
              value={selectedUser?.id || ''}
              onChange={(e) => {
                const user = users.find(u => u.id === e.target.value);
                setSelectedUser(user || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Choose a user...</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole | '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Choose a role...</option>
              {SYSTEM_ROLES.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Assign Button */}
          <div className="flex items-end">
            <button
              onClick={handleAssignRole}
              disabled={!selectedUser || !selectedRole || isProcessing}
              className="w-full bg-primary text-white py-2 px-4 rounded-lg font-semibold hover:bg-secondary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign Role
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected User Info */}
        {selectedUser && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Selected User:</h4>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <p><strong>Name:</strong> {selectedUser.name}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Current Roles:</strong> {getUserRoles(selectedUser.roles).map(role => getRoleDisplayName(role)).join(', ') || 'None'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">All Users</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Roles</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-2">
                      {getUserRoles(user.roles).map((role) => (
                        <span
                          key={role}
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(role)}`}
                        >
                          {getRoleDisplayName(role)}
                        </span>
                      ))}
                      {getUserRoles(user.roles).length === 0 && (
                        <span className="text-gray-400 text-sm">No roles assigned</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      {getUserRoles(user.roles).map((role) => (
                        <button
                          key={role}
                          onClick={() => handleRemoveRole(user.id, role)}
                          disabled={isProcessing}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                          title={`Remove ${getRoleDisplayName(role)} role`}
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
