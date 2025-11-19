'use client';

import { motion } from 'framer-motion';
import { X, TrendingUp, FileText, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { SubscriptionPlan } from '@/types';

interface PlanUpgradeConfirmationModalProps {
  isOpen: boolean;
  currentPlan: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function PlanUpgradeConfirmationModal({
  isOpen,
  currentPlan,
  newPlan,
  onConfirm,
  onCancel,
  isLoading = false,
  error,
}: PlanUpgradeConfirmationModalProps) {
  if (!isOpen) return null;

  const getBillingCycleText = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return 'mes';
      case 'yearly': return 'año';
      case 'weekly': return 'semana';
      case 'daily': return 'día';
      default: return cycle;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Confirmar Mejora de Plan
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Revisa los cambios antes de confirmar
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Plan Comparison */}
          <div className="grid grid-cols-2 gap-6">
            {/* Current Plan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Plan Actual
                </h3>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                  Actual
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {currentPlan.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {currentPlan.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${currentPlan.price}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {currentPlan.currency} / {getBillingCycleText(currentPlan.billingCycle)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2 text-sm">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {currentPlan.maxPosts} publicaciones
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {currentPlan.maxBookings} reservas
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* New Plan */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Nuevo Plan
                </h3>
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded font-medium">
                  Mejora
                </span>
              </div>
              <div className="bg-primary/5 border-2 border-primary rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-lg font-bold text-primary">
                    {newPlan.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {newPlan.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-primary/20">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-bold text-primary">
                      ${newPlan.price}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {newPlan.currency} / {getBillingCycleText(newPlan.billingCycle)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 pt-3 border-t border-primary/20">
                  <div className="flex items-center space-x-2 text-sm">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-gray-900 dark:text-white font-medium">
                      {newPlan.maxPosts} publicaciones
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-gray-900 dark:text-white font-medium">
                      {newPlan.maxBookings} reservas
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Información Importante
                </h4>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>• Tu método de pago actual será usado para el nuevo plan</li>
                  <li>• El plan anterior se cancelará automáticamente</li>
                  <li>• El nuevo ciclo de facturación comenzará inmediatamente</li>
                  <li>• Tendrás acceso instantáneo a las nuevas características</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Error
                  </h4>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Procesando...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                <span>Confirmar Mejora</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

