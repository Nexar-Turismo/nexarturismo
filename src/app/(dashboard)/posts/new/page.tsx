'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { usePostCreation } from '@/hooks/usePostCreation';
import { useMercadoPagoAccount } from '@/hooks/useMercadoPagoAccount';
import PostFormWizard from '@/components/forms/PostFormWizard';
import MercadoPagoAccountCard from '@/components/ui/mercado-pago-account-card';
import { useRouter } from 'next/navigation';

export default function NewPostPage() {
  const router = useRouter();
  const { 
    canCreatePost, 
    isLoading, 
    userPlan, 
    postLimitReached,
    remainingPosts,
    errorMessage,
    redirectToSubscription, 
    redirectToPosts 
  } = usePostCreation();
  
  const { 
    hasActiveAccount, 
    accountStatus, 
    loading: mercadoPagoLoading,
    checkAccountStatus 
  } = useMercadoPagoAccount();

  useEffect(() => {
    if (!isLoading && canCreatePost === false && !postLimitReached) {
      // User doesn't have publisher role - redirect to subscription
      redirectToSubscription();
    }
  }, [canCreatePost, isLoading, postLimitReached, redirectToSubscription]);

  if (isLoading || mercadoPagoLoading) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Verificando permisos y cuenta de MercadoPago...</p>
        </div>
      </div>
    );
  }

  // Show post limit reached modal
  if (canCreatePost === false && postLimitReached) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="glass rounded-2xl max-w-md overflow-hidden"
        >
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Límite de publicaciones alcanzado
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {errorMessage}
            </p>
            
            {userPlan && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Plan actual:
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {userPlan.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Publicaciones:
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {userPlan.maxPosts} / {userPlan.maxPosts}
                  </span>
                </div>
              </div>
            )}
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Para crear más publicaciones, mejora tu plan o elimina publicaciones existentes.
            </p>
          </div>
          
          <div className="flex gap-3 p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={() => router.push('/suscribirse/planes')}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 font-medium"
            >
              Mejorar plan
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show general access denied (no publisher role or no subscription)
  if (canCreatePost === false) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="glass rounded-2xl p-8 max-w-md text-center"
        >
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Acceso Denegado
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {errorMessage || 'No tienes permisos para crear publicaciones. Redirigiendo a la página de suscripción...'}
          </p>
          <div className="animate-pulse">
            <div className="w-4 h-4 bg-primary rounded-full mx-auto"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (canCreatePost === null) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="glass rounded-2xl p-8 max-w-md text-center"
        >
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Verificando...
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Estamos verificando tu suscripción y permisos...
          </p>
          <div className="animate-pulse">
            <div className="w-4 h-4 bg-primary rounded-full mx-auto"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show MercadoPago account requirement modal if plan validation passed but account is missing
  if (canCreatePost === true && !hasActiveAccount) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="glass rounded-2xl max-w-md overflow-hidden w-full"
        >
          <div className="p-6">
            <div className="mb-4">
              <MercadoPagoAccountCard 
                onStatusChange={async (hasAccount) => {
                  if (hasAccount) {
                    // Refresh account status to ensure it's up to date
                    await checkAccountStatus();
                  }
                }}
              />
            </div>
            <button
              onClick={() => router.push('/posts')}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Volver a Publicaciones
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // User can create posts and has MercadoPago account - show the form
  if (canCreatePost === true && hasActiveAccount) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Crear Nueva Publicación
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Completa el formulario para crear tu nueva publicación de servicios turísticos
            </p>
            
            {/* Plan Info */}
            {userPlan && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 inline-flex items-center space-x-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-4 py-2 rounded-full"
              >
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Plan: {userPlan.name} - {remainingPosts} de {userPlan.maxPosts} publicaciones disponibles
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Post Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-4xl mx-auto"
          >
            <PostFormWizard 
              onSuccess={() => router.push('/posts?success=created')}
            />
          </motion.div>
        </div>
      </div>
    );
  }

  // Fallback - should not reach here if logic is correct
  return null;
} 