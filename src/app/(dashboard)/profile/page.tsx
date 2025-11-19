'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Save, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Shield,
  Calendar,
  Upload,
  X,
  Ban,
  Trash2,
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import RequireClient from '@/components/auth/ProtectedRoute';
import { firebaseDB, firebaseAuth } from '@/services/firebaseService';
import PasswordValidation, { validatePassword, isPasswordValid } from '@/components/ui/PasswordValidation';

export default function ProfilePage() {
  return (
    <RequireClient>
      <ProfileManagement />
    </RequireClient>
  );
}

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  avatar: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function ProfileManagement() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    avatar: ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Password visibility
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ 
        type: 'error', 
        text: 'Por favor selecciona un archivo de imagen válido' 
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ 
        type: 'error', 
        text: 'La imagen debe ser menor a 5MB' 
      });
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      setProfileForm(prev => ({ ...prev, avatar: base64 }));
      setMessage({ 
        type: 'success', 
        text: 'Imagen cargada correctamente' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Error al procesar la imagen' 
      });
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Update user profile in Firebase
      await firebaseDB.users.update(user.id, {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        avatar: profileForm.avatar
      });
      
      setMessage({ 
        type: 'success', 
        text: 'Perfil actualizado correctamente' 
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'error', 
        text: 'Error al actualizar el perfil' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    // Validation: Check if current password is provided
    if (!passwordForm.currentPassword) {
      setMessage({ 
        type: 'error', 
        text: 'Por favor ingresa tu contraseña actual' 
      });
      setIsLoading(false);
      return;
    }

    // Validation: Check if new password matches confirmation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ 
        type: 'error', 
        text: 'Las contraseñas no coinciden' 
      });
      setIsLoading(false);
      return;
    }

    // Validation: Check if new password is different from current password
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setMessage({ 
        type: 'error', 
        text: 'La nueva contraseña debe ser diferente a la contraseña actual' 
      });
      setIsLoading(false);
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(passwordForm.newPassword);
    if (!isPasswordValid(passwordValidation)) {
      setMessage({ 
        type: 'error', 
        text: 'La nueva contraseña no cumple con los requisitos de seguridad. Por favor, revisa los requisitos indicados.' 
      });
      setIsLoading(false);
      return;
    }

    try {
      // Update password using Firebase Auth
      await firebaseAuth.updatePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      
      setMessage({ 
        type: 'success', 
        text: 'Contraseña actualizada correctamente' 
      });
      
      // Reset password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Error al actualizar la contraseña';
      setMessage({ 
        type: 'error', 
        text: errorMessage 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!user) {
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
            Mi Perfil
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gestiona tu información personal y configuración de seguridad
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="glass rounded-xl p-6"
            >
              {/* Profile Picture */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center text-white text-4xl font-bold mb-4 overflow-hidden">
                    {profileForm.avatar ? (
                      <img 
                        src={profileForm.avatar} 
                        alt={profileForm.name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      profileForm.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {profileForm.avatar && (
                    <button
                      onClick={() => setProfileForm(prev => ({ ...prev, avatar: '' }))}
                      className="absolute top-0 right-0 p-1 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {profileForm.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {profileForm.email}
                </p>
                <div className="mt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-1 text-xs bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Cambiar foto
                  </button>
                </div>
              </div>

              {/* User Stats */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Miembro desde</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Estado</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email verificado</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.emailVerified 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                  }`}>
                    {user.emailVerified ? 'Sí' : 'No'}
                  </span>
                </div>
              </div>

              {/* Roles */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Roles asignados
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.roles
                    .filter(role => role.isActive)
                    .map((role) => (
                      <span
                        key={role.roleId}
                        className={`px-2 py-1 text-xs font-medium rounded-full border ${
                          role.roleName === 'superadmin' 
                            ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                            : role.roleName === 'publisher'
                            ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                            : 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                        }`}
                      >
                        {role.roleName}
                      </span>
                    ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Forms */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass rounded-xl p-6"
            >
              <div className="flex space-x-1 mb-6">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-primary text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <User className="w-4 h-4 inline mr-2" />
                  Perfil
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'password'
                      ? 'bg-primary text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Lock className="w-4 h-4 inline mr-2" />
                  Contraseña
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'security'
                      ? 'bg-primary text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4 inline mr-2" />
                  Seguridad
                </button>
              </div>

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <motion.form
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleProfileSubmit}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar Cambios
                        </>
                      )}
                    </button>
                  </div>

                  {/* Danger Zone */}
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Zona de Peligro
                    </h3>
                    
                    <div className="space-y-3">
                      {/* Suspend Account */}
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                              Suspender cuenta
                            </h4>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              Desactiva tu cuenta temporalmente. Si eres publisher, todas tus publicaciones se deshabilitarán.
                            </p>
                          </div>
                          <button
                            onClick={() => setShowSuspendModal(true)}
                            className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                          >
                            <Ban className="w-4 h-4" />
                            <span>Suspender</span>
                          </button>
                        </div>
                      </div>

                      {/* Delete Account */}
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-red-900 dark:text-red-200 mb-1">
                              Darse de baja
                            </h4>
                            <p className="text-xs text-red-700 dark:text-red-300">
                              Elimina permanentemente tu cuenta y todos tus datos. Esta acción no se puede deshacer.
                            </p>
                          </div>
                          <button
                            onClick={() => setShowDeleteModal(true)}
                            className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Eliminar cuenta</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.form>
              )}

              {/* Password Tab */}
              {activeTab === 'password' && (
                <motion.form
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handlePasswordSubmit}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contraseña actual
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nueva contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('new')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordValidation password={passwordForm.newPassword} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirmar nueva contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('confirm')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Actualizando...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Cambiar Contraseña
                        </>
                      )}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Configuración de seguridad
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Aquí puedes configurar opciones adicionales de seguridad para tu cuenta.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Autenticación de dos factores
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Añade una capa extra de seguridad a tu cuenta
                          </p>
                        </div>
                        <span className="px-3 py-1 text-xs bg-gray-400 text-white rounded-lg">
                          Próximamente
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Notificaciones de seguridad
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Recibe alertas sobre actividades sospechosas
                          </p>
                        </div>
                        <span className="px-3 py-1 text-xs bg-gray-400 text-white rounded-lg">
                          Próximamente
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            Sesiones activas
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Gestiona tus sesiones abiertas
                          </p>
                        </div>
                        <span className="px-3 py-1 text-xs bg-gray-400 text-white rounded-lg">
                          Próximamente
                        </span>
                      </div>
                    </div>
                  </div>

                
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Suspend Account Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-6 max-w-md w-full"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mr-4">
                <Ban className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Suspender Cuenta
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Esta acción puede revertirse
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                ¿Estás seguro de que deseas suspender tu cuenta?
              </p>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                  Lo que sucederá:
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                  <li>• Tu cuenta se desactivará</li>
                  {user?.roles.some(r => r.roleName === 'publisher' && r.isActive) && (
                    <li>• Todas tus publicaciones se deshabilitarán</li>
                  )}
                  <li>• No podrás iniciar sesión hasta que un administrador reactive tu cuenta</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSuspendModal(false)}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSuspendAccount}
                disabled={isLoading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Suspendiendo...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Suspender cuenta</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-6 max-w-lg w-full"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-4">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Eliminar Cuenta Permanentemente
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                ¿Estás absolutamente seguro de que deseas eliminar tu cuenta?
              </p>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">
                  Se eliminará permanentemente:
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                  <li>• Tu cuenta y perfil</li>
                  <li>• Todas tus suscripciones (canceladas en MercadoPago)</li>
                  <li>• Todas tus publicaciones</li>
                  <li>• Todas tus reservas</li>
                  <li>• Cuentas de MercadoPago conectadas</li>
                  <li>• Notificaciones y favoritos</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar cuenta</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
