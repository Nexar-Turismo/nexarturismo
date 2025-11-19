'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check, Star, Crown, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { SubscriptionPlan } from '@/types';
import { useRouter } from 'next/navigation';

export default function SuscribirsePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Redirect if user is already a publisher or superadmin
    if (user) {
      const hasPublisherRole = user.roles?.some(role => 
        (role.roleName === 'publisher' || role.roleName === 'superadmin') && role.isActive
      );
      if (hasPublisherRole) {
        router.push('/dashboard');
        return;
      }
    }

    loadPlans();
  }, [user, router]);

  const loadPlans = async () => {
    try {
      const availablePlans = await firebaseDB.plans.getAll();
      // Only show active and visible plans
      const visiblePlans = availablePlans.filter(plan => plan.isActive && plan.isVisible);
      setPlans(visiblePlans);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    // Redirect to the dashboard subscription page with card form
    router.push(`/subscribe/${plan.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Publica tus servicios turisticos
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Accede a todas las herramientas necesarias para publicar y gestionar tus servicios turísticos. 
            Elegí el plan que mejor se adapte a tus necesidades.
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass rounded-2xl p-8 hover:transform hover:scale-105 transition-all duration-300 cursor-pointer"
              onClick={() => handlePlanSelect(plan)}
            >
              {/* Plan Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  {plan.name.toLowerCase().includes('basic') && <Zap className="w-8 h-8 text-white" />}
                  {plan.name.toLowerCase().includes('premium') && <Star className="w-8 h-8 text-white" />}
                  {plan.name.toLowerCase().includes('enterprise') && <Crown className="w-8 h-8 text-white" />}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <div className="text-4xl font-bold text-primary mb-1">
                  ${plan.price}
                  <span className="text-lg text-gray-500 dark:text-gray-400 font-normal">
                    /{plan.billingCycle === 'monthly' ? 'mes' : plan.billingCycle === 'yearly' ? 'año' : plan.billingCycle}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {plan.description}
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Hasta {plan.maxPosts} publicaciones
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Hasta {plan.maxBookings} reservas
                  </span>
                </div>
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button className="w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-secondary transition-all duration-300 transform hover:scale-105">
                Seleccionar Plan
              </button>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <div className="glass rounded-xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              ¿Por qué suscribirse?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Publica tus servicios turisticos
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Crea y gestiona múltiples publicaciones de servicios turísticos
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Herramientas avanzadas
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Accede a analytics, gestión de reservas y más funcionalidades
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Soporte prioritario
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Recibe ayuda rápida y personalizada para tu negocio
                </p>
              </div>
            </div>
          </div>
        </motion.div>
    </div>
  );
}
