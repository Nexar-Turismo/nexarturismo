'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Shield,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { User, UserRole } from '@/types';
import { SYSTEM_ROLES } from '@/services/permissionsService';
import RequireSuperadmin from '@/components/auth/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { UserCheck, Share2, Copy, Check, X, Download } from 'lucide-react';
import { generateReferralUrl, generateReferralCode } from '@/lib/referralUtils';
import PasswordValidation, { validatePassword, isPasswordValid } from '@/components/ui/PasswordValidation';
import { firebaseAuth } from '@/services/firebaseService';
import * as XLSX from 'xlsx';

export default function UsersPage() {
  return (
    <RequireSuperadmin>
      <UsersManagement />
    </RequireSuperadmin>
  );
}

function UsersManagement() {
  const router = useRouter();
  const { user: currentUser, assignRole, removeRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'referrals'>('users');
  const [referralUsers, setReferralUsers] = useState<User[]>([]);
  const [referralCounts, setReferralCounts] = useState<Record<string, number>>({});
  const [publisherCounts, setPublisherCounts] = useState<Record<string, number>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showAddReferralModal, setShowAddReferralModal] = useState(false);
  const [showReferralDetailModal, setShowReferralDetailModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<User | null>(null);
  const [referredUsers, setReferredUsers] = useState<User[]>([]);
  const [isLoadingReferredUsers, setIsLoadingReferredUsers] = useState(false);
  const [referralFormData, setReferralFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showReferralPassword, setShowReferralPassword] = useState(false);
  const [showReferralConfirmPassword, setShowReferralConfirmPassword] = useState(false);
  const [referralFormError, setReferralFormError] = useState('');

  useEffect(() => {
    loadUsers();
    loadReferralUsers();
  }, []);

  const loadReferralUsers = async () => {
    try {
      const referrals = await firebaseDB.users.getByRole('referral');
      setReferralUsers(referrals);
      
      // Load referral counts and publisher counts for each referral user
      const counts: Record<string, number> = {};
      const publisherCountsMap: Record<string, number> = {};
      for (const referral of referrals) {
        try {
          const referredUsers = await firebaseDB.users.getReferredUsers(referral.id);
          counts[referral.id] = referredUsers.length;
          
          // Count users with publisher role
          const publisherCount = referredUsers.filter(user => 
            user.roles.some(role => role.roleName === 'publisher' && role.isActive)
          ).length;
          publisherCountsMap[referral.id] = publisherCount;
        } catch (error) {
          console.error(`Error getting count for referral ${referral.id}:`, error);
          counts[referral.id] = 0;
          publisherCountsMap[referral.id] = 0;
        }
      }
      setReferralCounts(counts);
      setPublisherCounts(publisherCountsMap);
    } catch (error) {
      console.error('Error loading referral users:', error);
    }
  };

  const handleCopyReferralUrl = async (referralCode: string) => {
    const url = generateReferralUrl(referralCode);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(referralCode);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleViewReferralDetails = async (referral: User) => {
    setSelectedReferral(referral);
    setShowReferralDetailModal(true);
    setIsLoadingReferredUsers(true);
    
    try {
      const referred = await firebaseDB.users.getReferredUsers(referral.id);
      setReferredUsers(referred);
    } catch (error) {
      console.error('Error loading referred users:', error);
      setReferredUsers([]);
    } finally {
      setIsLoadingReferredUsers(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      setIsProcessing(true);
      
      // Get all referral users and their referred users with subscriptions
      const allReferralData: Array<{
        referral: User;
        referredUsers: User[];
        publisherUsers: User[];
      }> = [];

      for (const referral of referralUsers) {
        const referredUsers = await firebaseDB.users.getReferredUsers(referral.id);
        const publisherUsers = referredUsers.filter(user => 
          user.roles.some(role => role.roleName === 'publisher' && role.isActive)
        );
        
        allReferralData.push({
          referral,
          referredUsers,
          publisherUsers,
        });
      }

      // Prepare Resumen sheet data
      const resumenData = await Promise.all(
        allReferralData.map(async ({ referral, referredUsers, publisherUsers }) => {
          // Get subscriptions for all publisher users and calculate total
          let totalPlanAmount = 0;
          const publisherDetails: Array<{ userId: string; planName: string; amount: number }> = [];

          for (const publisher of publisherUsers) {
            try {
              const subscriptions = await firebaseDB.subscriptions.getByUserId(publisher.id);
              // Get active subscriptions
              const activeSubscriptions = subscriptions.filter(sub => 
                sub.status === 'active' && sub.plan
              );
              
              for (const subscription of activeSubscriptions) {
                const amount = subscription.plan.price || 0;
                totalPlanAmount += amount;
                publisherDetails.push({
                  userId: publisher.id,
                  planName: subscription.plan.name || 'N/A',
                  amount,
                });
              }
            } catch (error) {
              console.error(`Error getting subscriptions for user ${publisher.id}:`, error);
            }
          }

          const transferAmount = totalPlanAmount * 0.05; // 5% of total

          return {
            'Usuario Referente': referral.name,
            'Email Referente': referral.email,
            'Código de Referido': referral.referralCode || 'N/A',
            'Total Usuarios Referidos': referredUsers.length,
            'Usuarios Publisher': publisherUsers.length,
            'Cantidad a transferir': transferAmount.toFixed(2),
          };
        })
      );

      // Prepare Referidos sheet data
      const referidosData: Array<{
        'Usuario Referido': string;
        'Email Referido': string;
        'Plan Actual': string;
        'Monto del Plan': string;
        'Usuario Referente': string;
      }> = [];

      for (const { referral, referredUsers } of allReferralData) {
        for (const referredUser of referredUsers) {
          try {
            const subscriptions = await firebaseDB.subscriptions.getByUserId(referredUser.id);
            const activeSubscriptions = subscriptions.filter(sub => 
              sub.status === 'active' && sub.plan
            );

            if (activeSubscriptions.length > 0) {
              // Use the first active subscription
              const subscription = activeSubscriptions[0];
              referidosData.push({
                'Usuario Referido': referredUser.name,
                'Email Referido': referredUser.email,
                'Plan Actual': subscription.plan.name || 'N/A',
                'Monto del Plan': `${subscription.plan.currency || ''} ${subscription.plan.price || 0}`,
                'Usuario Referente': referral.name,
              });
            } else {
              // No active subscription
              referidosData.push({
                'Usuario Referido': referredUser.name,
                'Email Referido': referredUser.email,
                'Plan Actual': 'Sin plan activo',
                'Monto del Plan': '0',
                'Usuario Referente': referral.name,
              });
            }
          } catch (error) {
            console.error(`Error getting subscription for user ${referredUser.id}:`, error);
            referidosData.push({
              'Usuario Referido': referredUser.name,
              'Email Referido': referredUser.email,
              'Plan Actual': 'Error al obtener',
              'Monto del Plan': '0',
              'Usuario Referente': referral.name,
            });
          }
        }
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Create Resumen sheet
      const resumenSheet = XLSX.utils.json_to_sheet(resumenData);
      XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen');

      // Create Referidos sheet
      const referidosSheet = XLSX.utils.json_to_sheet(referidosData);
      XLSX.utils.book_append_sheet(workbook, referidosSheet, 'Referidos');

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `usuarios_referentes_${date}.xlsx`;

      // Write file
      XLSX.writeFile(workbook, filename);

      setMessage({ 
        type: 'success', 
        text: 'Excel exportado exitosamente' 
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setMessage({ 
        type: 'error', 
        text: 'Error al exportar a Excel. Por favor, inténtalo de nuevo.' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateReferralUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setReferralFormError('');

    // Validation
    if (referralFormData.password !== referralFormData.confirmPassword) {
      setReferralFormError('Las contraseñas no coinciden.');
      setIsProcessing(false);
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(referralFormData.password);
    if (!isPasswordValid(passwordValidation)) {
      setReferralFormError('La contraseña no cumple con los requisitos de seguridad.');
      setIsProcessing(false);
      return;
    }

    try {
      // Generate unique referral code
      let referralCode = generateReferralCode();
      let attempts = 0;
      while (attempts < 10) {
        const existingUser = await firebaseDB.users.getByReferralCode(referralCode);
        if (!existingUser) break;
        referralCode = generateReferralCode();
        attempts++;
      }

      if (attempts >= 10) {
        throw new Error('No se pudo generar un código de referido único. Intenta nuevamente.');
      }

      // Create user with referral role
      const userData = {
        name: referralFormData.name,
        email: referralFormData.email,
        phone: referralFormData.phone,
        referralCode,
      };

      // Create user via Firebase Auth
      const newUser = await firebaseAuth.signUp(
        referralFormData.email,
        referralFormData.password,
        userData
      );

      // Assign referral role
      await firebaseDB.users.assignRole(newUser.id, 'referral', currentUser?.id);

      // Update user with referral code
      await firebaseDB.users.updateReferralCode(newUser.id, referralCode);

      setMessage({ 
        type: 'success', 
        text: `Usuario referente creado exitosamente. Código: ${referralCode}` 
      });

      // Reset form and close modal
      setReferralFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
      });
      setShowAddReferralModal(false);

      // Reload referral users
      await loadReferralUsers();
    } catch (error: any) {
      console.error('Error creating referral user:', error);
      setReferralFormError(
        error.message || 'Error al crear el usuario referente. Por favor, inténtalo de nuevo.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

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

  const filterUsers = useCallback(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => 
        user.roles.some(role => role.roleName === roleFilter && role.isActive)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        statusFilter === 'active' ? user.isActive : !user.isActive
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    filterUsers();
  }, [filterUsers]);

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      setIsProcessing(true);
      await assignRole(selectedUser.id, selectedRole);
      
      setMessage({ type: 'success', text: `Role ${selectedRole} assigned successfully to ${selectedUser.name}` });
      
      // Refresh users list
      await loadUsers();
      
      // Reset modal
      setShowRoleModal(false);
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

  const handleRemoveUser = async () => {
    if (!selectedUser || !currentUser) return;

    try {
      setIsProcessing(true);
      setMessage(null);

      const response = await fetch('/api/admin/remove-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          currentUserId: currentUser.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove user');
      }

      setMessage({ 
        type: 'success', 
        text: `User ${selectedUser.name} has been completely removed from the system` 
      });

      // Refresh users list
      await loadUsers();

      // Close modal
      setShowRemoveModal(false);
      setSelectedUser(null);
    } catch (error: unknown) {
      console.error('Error removing user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove user';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  const getUserRoles = (userRoles: User['roles']): UserRole[] => {
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
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'publisher':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'client':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none">
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Users Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage platform users, roles, and permissions
          </p>
        </motion.div>

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

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="glass rounded-xl p-2"
        >
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Usuarios
            </button>
            <button
              onClick={() => setActiveTab('referrals')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'referrals'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Usuarios Referentes
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.filter(u => u.isActive).length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Publishers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.filter(u => u.roles.some(r => r.roleName === 'publisher' && r.isActive)).length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Superadmins</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.filter(u => u.roles.some(r => r.roleName === 'superadmin' && r.isActive)).length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters and Search - Only show for Users tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="md:w-48">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  {SYSTEM_ROLES.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="md:w-32">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Referrals Section */}
        {activeTab === 'referrals' && (
          <>
            {/* Add Referral User Button and Export Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex justify-end gap-3"
            >
              <button
                onClick={handleExportToExcel}
                disabled={isProcessing || referralUsers.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Exportar a Excel</span>
              </button>
              <button
                onClick={() => setShowAddReferralModal(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 flex items-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Agregar usuario referente</span>
              </button>
            </motion.div>

            {/* Referrals Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass rounded-xl p-6"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Usuario</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Código de Referido</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Usuarios Referidos</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">URL de Referido</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralUsers.map((referral, index) => (
                      <motion.tr
                        key={referral.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {referral.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="font-medium text-gray-900 dark:text-white">{referral.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{referral.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                            {referral.referralCode || 'N/A'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <UserCheck className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {referralCounts[referral.id] || 0}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                              <span>(</span>
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span>{publisherCounts[referral.id] || 0})</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {referral.referralCode ? (
                            <button
                              onClick={() => handleCopyReferralUrl(referral.referralCode!)}
                              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                              {copiedCode === referral.referralCode ? (
                                <>
                                  <Check className="w-4 h-4 text-green-500" />
                                  <span className="text-xs text-green-600 dark:text-green-400">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 text-gray-500" />
                                  <span className="text-xs text-gray-600 dark:text-gray-400">Copiar URL</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewReferralDetails(referral)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="Ver usuarios referidos"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {referralUsers.length === 0 && (
                <div className="text-center py-8">
                  <UserCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No hay usuarios referentes registrados</p>
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* Users Table - Only show for Users tab */}
        {activeTab === 'users' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="glass rounded-xl p-6"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Roles</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Joined</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.7 + index * 0.05 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
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
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRoleModal(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Manage roles"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            window.location.href = `/users/${user.id}`;
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="View user details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement user edit
                          }}
                          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded transition-colors"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRemoveModal(true);
                            }}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Remove user completely"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No users found matching your criteria</p>
            </div>
          )}
        </motion.div>
        )}
      </div>

      {/* Role Management Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Manage Roles for {selectedUser.name}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Roles
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
                {getUserRoles(selectedUser.roles).map((role) => (
                  <span
                    key={role}
                    className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(role)}`}
                  >
                    {getRoleDisplayName(role)}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign New Role
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

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setSelectedRole('');
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignRole}
                disabled={!selectedRole || isProcessing}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Assigning...' : 'Assign Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove User Confirmation Modal */}
      {showRemoveModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-4">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Remove User Completely
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to completely remove <strong>{selectedUser.name}</strong> ({selectedUser.email}) from the system?
              </p>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">
                  The following data will be permanently deleted:
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                  <li>• User account and profile</li>
                  <li>• All subscriptions (cancelled in MercadoPago)</li>
                  <li>• All posts and content</li>
                  <li>• All bookings</li>
                  <li>• MercadoPago account connections</li>
                  <li>• Notifications and favorites</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setSelectedUser(null);
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveUser}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Remove User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Referral User Modal */}
      {showAddReferralModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Agregar Usuario Referente
              </h3>
              <button
                onClick={() => {
                  setShowAddReferralModal(false);
                  setReferralFormError('');
                  setReferralFormData({
                    name: '',
                    email: '',
                    phone: '',
                    password: '',
                    confirmPassword: '',
                  });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {referralFormError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300">{referralFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateReferralUser} className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={referralFormData.name}
                  onChange={(e) => setReferralFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Nombre completo"
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={referralFormData.email}
                  onChange={(e) => setReferralFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="email@ejemplo.com"
                />
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={referralFormData.phone}
                  onChange={(e) => setReferralFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="+54 9 11 1234-5678"
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showReferralPassword ? 'text' : 'password'}
                    value={referralFormData.password}
                    onChange={(e) => setReferralFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowReferralPassword(!showReferralPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showReferralPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordValidation password={referralFormData.password} />
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirmar contraseña *
                </label>
                <div className="relative">
                  <input
                    type={showReferralConfirmPassword ? 'text' : 'password'}
                    value={referralFormData.confirmPassword}
                    onChange={(e) => setReferralFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowReferralConfirmPassword(!showReferralConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showReferralConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddReferralModal(false);
                    setReferralFormError('');
                    setReferralFormData({
                      name: '',
                      email: '',
                      phone: '',
                      password: '',
                      confirmPassword: '',
                    });
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Crear Usuario</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Referral Detail Modal */}
      {showReferralDetailModal && selectedReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Detalles del Usuario Referente
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedReferral.name} - {selectedReferral.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReferralDetailModal(false);
                  setSelectedReferral(null);
                  setReferredUsers([]);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Referral Info */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Código de Referido</p>
                <p className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                  {selectedReferral.referralCode || 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de Usuarios Referidos</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {referralCounts[selectedReferral.id] || 0}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">URL de Referido</p>
                {selectedReferral.referralCode ? (
                  <button
                    onClick={() => handleCopyReferralUrl(selectedReferral.referralCode!)}
                    className="flex items-center space-x-2 mt-1 text-sm text-primary hover:text-secondary"
                  >
                    {copiedCode === selectedReferral.referralCode ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>
                ) : (
                  <p className="text-sm text-gray-400">N/A</p>
                )}
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Fecha de Registro</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(selectedReferral.createdAt)}
                </p>
              </div>
            </div>

            {/* Referred Users List */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                Usuarios Referidos ({referredUsers.length})
              </h4>

              {isLoadingReferredUsers ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : referredUsers.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <UserCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Este usuario referente aún no ha referido ningún usuario
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Usuario</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Teléfono</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Roles</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Fecha Registro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-xs">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {user.phone || 'N/A'}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {getUserRoles(user.roles).map((role) => (
                                <span
                                  key={role}
                                  className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleColor(role)}`}
                                >
                                  {getRoleDisplayName(role)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(user.createdAt)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
