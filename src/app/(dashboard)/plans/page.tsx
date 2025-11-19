'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle,
  Calendar,
  Users,
  FileText,
  Star,
  ExternalLink,
  RefreshCw,
  Link
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

import { firebaseDB } from '@/services/firebaseService';
import { SubscriptionPlan } from '@/types';
import CreatePlanForm from '@/components/forms/CreatePlanForm';
import EditPlanForm from '@/components/forms/EditPlanForm';

export default function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      console.log('Loading plans...');
      setIsLoading(true);
      
      // Test if the service is accessible
      console.log('Firebase service accessible:', !!firebaseDB.plans);
      console.log('getAll method accessible:', !!firebaseDB.plans.getAll);
      
      const allPlans = await firebaseDB.plans.getAll();
      console.log('Plans loaded:', allPlans);
      setPlans(allPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      setMessage({ type: 'error', text: `Error loading subscription plans: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsLoading(false);
    }
  }, []);



  useEffect(() => {
    console.log('Plans page useEffect triggered');
    console.log('User roles:', user?.roles);
    
    if (!user) {
      console.log('No user found, keeping loading state');
      return;
    }
    
    const isSuperadmin = user.roles?.some(role => role.roleName === 'superadmin' && role.isActive) || false;
    console.log('Has superadmin role:', isSuperadmin);
    
    if (isSuperadmin) {
      loadPlans();
    } else {
      console.log('User does not have superadmin role');
      setIsLoading(false);
    }
  }, [user, loadPlans]);

  const handleToggleActive = async (planId: string, currentStatus: boolean) => {
    if (!user) return;
    
    try {
      // Find the plan to get its Mobbex subscription ID
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        setMessage({ type: 'error', text: 'Plan not found' });
        return;
      }

      // Update local plan status
      await firebaseDB.plans.toggleActive(planId, !currentStatus, user.id);
      setMessage({ 
        type: 'success', 
        text: `Plan ${currentStatus ? 'deactivated' : 'activated'} successfully` 
      });
      await loadPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
      setMessage({ type: 'error', text: 'Error updating plan status' });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }

    try {
      await firebaseDB.plans.delete(planId);
      setMessage({ type: 'success', text: 'Plan deleted successfully' });
      await loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      setMessage({ type: 'error', text: 'Error deleting plan' });
    }
  };

  const handleSyncWithMercadoPago = async () => {
    try {
      setIsSyncing(true);
      setMessage(null);

      const response = await fetch('/api/mercadopago/sync-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to sync plans with MercadoPago');
      }

      const result = await response.json();
      
      if (result.errors > 0) {
        setMessage({ 
          type: 'error', 
          text: `Sync completed with ${result.errors} errors. ${result.success} plans synced successfully.` 
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: `Successfully synced ${result.success} plans with MercadoPago!` 
        });
      }

      // Reload plans to get updated data
      await loadPlans();
    } catch (error) {
      console.error('Error syncing plans:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error syncing plans with MercadoPago' 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getBillingCycleText = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      case 'weekly': return 'Weekly';
      case 'daily': return 'Daily';
      default: return cycle;
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
      : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
  };

  const isSuperadmin = user?.roles?.some(role => role.roleName === 'superadmin' && role.isActive) || false;
  
  if (user && !isSuperadmin) {
    return (
      <div className="w-full max-w-none">
        <div className="text-center py-12">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-none">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading subscription plans...</p>
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
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Planes de Suscripción
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Gestiona los planes de suscripción y precios para tus usuarios
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSyncWithMercadoPago}
              disabled={isSyncing}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-accent transition-all duration-300 flex items-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>Sincronizar con MercadoPago</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 flex items-center space-x-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Plan</span>
            </button>
          </div>
        </motion.div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center space-x-2 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </motion.div>
        )}



        {/* Plans Grid */}
        {!isLoading && plans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center py-12"
          >
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Aún No Hay Planes Creados
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Crea tu primer plan de suscripción para comenzar a monetizar tu plataforma
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Primer Plan</span>
            </button>
          </motion.div>
        ) : !isLoading && plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="glass rounded-xl p-6 hover:transform hover:scale-105 transition-all duration-300"
              >
                {/* Plan Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {plan.description}
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(plan.isActive)}`}>
                      {plan.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    {plan.mercadoPagoPlanId ? (
                      <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                        <CheckCircle className="w-3 h-3" />
                        <span>Sincronizado</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                        <XCircle className="w-3 h-3" />
                        <span>No Sincronizado</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">
                      {plan.currency} /{getBillingCycleText(plan.billingCycle)}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Hasta {plan.maxPosts} publicaciones
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Hasta {plan.maxBookings} reservas
                    </span>
                  </div>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <Star className="w-4 h-4 text-primary" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Not Synced Warning */}
                {!plan.mercadoPagoPlanId && (
                  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <XCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-amber-800 dark:text-amber-300 font-medium mb-1">
                          Error de Sincronización con MercadoPago
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Este plan no pudo ser sincronizado con MercadoPago. Intenta sincronización manual o verifica tu configuración.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="flex-1 px-3 py-2 text-sm text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center justify-center space-x-1"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleToggleActive(plan.id, plan.isActive)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-center space-x-1 ${
                      plan.isActive
                        ? 'text-red-600 border border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-green-600 border border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    {plan.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{plan.isActive ? 'Desactivar' : 'Activar'}</span>
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan.id)}
                    className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Create Plan Form Modal */}
      {showCreateForm && (
        <CreatePlanForm 
          onClose={() => setShowCreateForm(false)}
          onPlanCreated={loadPlans}
        />
      )}

      {/* Edit Plan Form Modal */}
      {editingPlan && (
        <EditPlanForm 
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onPlanUpdated={loadPlans}
        />
      )}
    </div>
  );
}
