'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  FileText,
  Calendar,
  Star,
  ArrowRight,
  Crown,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { firebaseDB } from '@/services/firebaseService';
import { subscriptionService } from '@/services/subscriptionService';
import { SubscriptionPlan } from '@/types';
import SubscriptionForm from '@/components/forms/SubscriptionForm';
import PlanUpgradeConfirmationModal from '@/components/ui/plan-upgrade-confirmation-modal';

export default function PlanesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all active and visible plans
      const allPlans = await firebaseDB.plans.getAll();
      const visiblePlans = allPlans
        .filter(p => p.isActive && p.isVisible)
        .sort((a, b) => a.price - b.price);
      
      setPlans(visiblePlans);

      // Load user's current subscription
      if (user?.id) {
        const subscription = await subscriptionService.getUserActiveSubscription(user.id);
        setCurrentSubscription(subscription);

        if (subscription) {
          const plan = visiblePlans.find(p => p.id === subscription.planId);
          setCurrentPlan(plan || null);
        }
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      setError('Error al cargar los planes. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradeClick = (plan: SubscriptionPlan) => {
    if (!currentPlan) {
      // User has no subscription, redirect to regular subscription
      router.push(`/suscribirse/${plan.id}`);
      return;
    }

    if (plan.id === currentPlan.id) {
      // Same plan, no action needed
      return;
    }

    if (plan.price < currentPlan.price) {
      // Downgrade - show warning
      alert('Para cambiar a un plan de menor precio, por favor contacta soporte.');
      return;
    }

    // Upgrade flow
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handleUpgradeConfirm = async () => {
    if (!selectedPlan || !user?.id) return;

    // Instead of creating subscription directly, show the subscription form
    // The form will handle creating the subscription with the new cardTokenId
    console.log('🔄 [Plan Upgrade] Showing subscription form for upgrade');
    console.log('From plan:', currentPlan?.name);
    console.log('To plan:', selectedPlan.name);
    console.log('Using existing subscription:', currentSubscription?.id);
  };

  const handleUpgradeSuccess = async (newSubscriptionId: string) => {
    // This is for new subscriptions via payment form (users without existing subscription)
    setIsUpgrading(true);
    try {
      console.log('✅ New subscription created:', newSubscriptionId);
      await loadData();
      setShowUpgradeModal(false);
      setSelectedPlan(null);
      alert('¡Suscripción creada exitosamente!');
    } catch (error) {
      console.error('❌ [Plan Upgrade] Error:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar la suscripción.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleUpgradeWithFormSuccess = async (newSubscriptionId: string) => {
    // This is for plan upgrades via subscription form (users with existing subscription)
    setIsUpgrading(true);
    setError(null);

    try {
      if (!currentSubscription) {
        throw new Error('No existing subscription found');
      }

      console.log('✅ [Plan Upgrade] New subscription created via form:', newSubscriptionId);
      console.log('📋 [Plan Upgrade] Now canceling old subscription and activating new one');

      // Step 2: Cancel old subscription and activate new one
      const changePlanResponse = await fetch('/api/mercadopago/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          oldSubscriptionId: currentSubscription.id,
          newSubscriptionId: newSubscriptionId,
        }),
      });

      const changePlanResult = await changePlanResponse.json();

      if (!changePlanResponse.ok) {
        throw new Error(changePlanResult.error || 'Error al cambiar el plan');
      }

      console.log('✅ [Plan Upgrade] Plan changed successfully:', changePlanResult);

      // Reload data
      await loadData();
      setShowUpgradeModal(false);
      setSelectedPlan(null);
      
      alert('¡Plan actualizado exitosamente! Ahora tienes acceso a todas las funciones del nuevo plan.');
    } catch (error) {
      console.error('❌ [Plan Upgrade] Error:', error);
      setError(error instanceof Error ? error.message : 'Error al actualizar el plan. Por favor contacta soporte.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleUpgradeError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const getBillingCycleText = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return 'mes';
      case 'yearly': return 'año';
      case 'weekly': return 'semana';
      case 'daily': return 'día';
      default: return cycle;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Elige tu Plan
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {currentPlan 
              ? `Tu plan actual: ${currentPlan.name}. Mejora tu plan para desbloquear más funciones.`
              : 'Selecciona el plan que mejor se adapte a tus necesidades'
            }
          </p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 max-w-4xl mx-auto p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Plans Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => {
            const isCurrentPlan = currentPlan?.id === plan.id;
            const canUpgrade = currentPlan && plan.price > currentPlan.price;
            const isDowngrade = currentPlan && plan.price < currentPlan.price;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`glass rounded-2xl overflow-hidden ${
                  isCurrentPlan 
                    ? 'ring-2 ring-primary shadow-2xl transform scale-105' 
                    : 'hover:transform hover:scale-105 transition-all duration-300'
                }`}
              >
                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="bg-primary text-white py-2 px-4 text-center font-semibold flex items-center justify-center space-x-2">
                    <Crown className="w-5 h-5" />
                    <span>Plan Actual</span>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  
                  {/* Plan Description */}
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">
                        {plan.currency} / {getBillingCycleText(plan.billingCycle)}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start space-x-3">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {plan.maxPosts} Publicaciones
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Crea hasta {plan.maxPosts} publicaciones activas
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {plan.maxBookings} Reservas
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Gestiona hasta {plan.maxBookings} reservas
                        </p>
                      </div>
                    </div>

                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {feature}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 px-6 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg font-semibold cursor-not-allowed"
                    >
                      Plan Actual
                    </button>
                  ) : isDowngrade ? (
                    <button
                      disabled
                      className="w-full py-3 px-6 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg font-semibold cursor-not-allowed text-sm"
                    >
                      Contacta Soporte para Cambiar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgradeClick(plan)}
                      className="w-full py-3 px-6 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 font-semibold flex items-center justify-center space-x-2 group"
                    >
                      <span>{canUpgrade ? 'Mejorar Plan' : 'Seleccionar Plan'}</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* No Plans Message */}
        {plans.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No hay planes disponibles
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Por favor contacta soporte para más información.
            </p>
          </motion.div>
        )}
      </div>

      {/* Upgrade Modal - Show confirmation for existing users, payment form for new users */}
      <AnimatePresence>
        {/* Upgrade Modal - Show subscription form for existing users */}
        {showUpgradeModal && selectedPlan && currentPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Actualizar a {selectedPlan.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Desde {currentPlan.name} - Completa el formulario para actualizar tu plan
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedPlan(null);
                    setError(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={isUpgrading}
                >
                  <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Payment Form */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Información de Pago
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Ingresa los datos de tu tarjeta para actualizar tu plan. Se utilizará el mismo método de pago de tu suscripción actual.
                  </p>
                  
                  {user && currentSubscription && (
                    <SubscriptionForm
                      plan={selectedPlan}
                      userId={user.id}
                      isUpgrade={true}
                      existingSubscriptionId={currentSubscription.id}
                      onSuccess={handleUpgradeWithFormSuccess}
                      onError={handleUpgradeError}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Payment Form Modal - For new subscriptions */}
        {showUpgradeModal && selectedPlan && !currentPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Suscribirse a {selectedPlan.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Completa el formulario para activar tu suscripción
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    setSelectedPlan(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={isUpgrading}
                >
                  <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Payment Form */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Información de Pago
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Ingresa los datos de tu tarjeta para activar tu suscripción.
                  </p>
                  
                  {user && (
                    <SubscriptionForm
                      plan={selectedPlan}
                      userId={user.id}
                      isUpgrade={false}
                      onSuccess={handleUpgradeSuccess}
                      onError={handleUpgradeError}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

