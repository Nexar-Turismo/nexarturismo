'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UserCheck, 
  Users, 
  Copy, 
  Check, 
  Share2,
  Calendar,
  Mail,
  Phone
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { User } from '@/types';
import { generateReferralUrl } from '@/lib/referralUtils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function ReferentePage() {
  return (
    <ProtectedRoute requiredRoles={['referral']}>
      <ReferenteDashboard />
    </ProtectedRoute>
  );
}

function ReferenteDashboard() {
  const { user } = useAuth();
  const [referredUsers, setReferredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadReferredUsers();
    }
  }, [user]);

  const loadReferredUsers = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const referred = await firebaseDB.users.getReferredUsers(user.id);
      setReferredUsers(referred);
    } catch (error) {
      console.error('Error loading referred users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReferralUrl = async () => {
    if (!user?.referralCode) return;
    
    const url = generateReferralUrl(user.referralCode);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
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

  if (!user.referralCode) {
    return (
      <div className="w-full max-w-none">
        <div className="text-center py-12">
          <UserCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Código de Referido No Disponible
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No se encontró un código de referido asociado a tu cuenta.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Por favor, contacta con el administrador para que se te asigne un código de referido.
          </p>
        </div>
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
            Panel de Referente
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gestiona tus referidos y comparte tu código de referido
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass rounded-xl p-6"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Usuarios Referidos</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '...' : referredUsers.length}
                </p>
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
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Código de Referido</p>
                <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                  {user.referralCode}
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
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">URL de Referido</p>
                <button
                  onClick={handleCopyReferralUrl}
                  className="flex items-center space-x-2 mt-1 text-sm text-primary hover:text-secondary transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>URL Copiada</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Referral URL Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Compartir Código de Referido
          </h3>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tu URL de Referido</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                {generateReferralUrl(user.referralCode)}
              </p>
            </div>
            <button
              onClick={handleCopyReferralUrl}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 flex items-center space-x-2"
            >
              {copiedCode ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Copiar URL</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Referred Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="glass rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Usuarios Referidos ({referredUsers.length})
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : referredUsers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <UserCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                Aún no has referido ningún usuario
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Comparte tu código de referido para empezar a ganar referidos
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
                    <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Fecha Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {referredUsers.map((referredUser, index) => (
                    <motion.tr
                      key={referredUser.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.6 + index * 0.05 }}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {referredUser.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900 dark:text-white">{referredUser.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="w-4 h-4 mr-2" />
                          {referredUser.email}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          {referredUser.phone ? (
                            <>
                              <Phone className="w-4 h-4 mr-2" />
                              {referredUser.phone}
                            </>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDate(referredUser.createdAt)}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

