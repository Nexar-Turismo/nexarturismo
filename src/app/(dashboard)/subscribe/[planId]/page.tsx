'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { firebaseDB } from '@/services/firebaseService';
import { subscriptionService } from '@/services/subscriptionService';
import { useAuth } from '@/lib/auth';
import SubscriptionForm from '@/components/forms/SubscriptionForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  maxPosts: number;
  maxBookings: number;
  features: string[];
}

export default function SubscribePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'pending' | 'success' | 'error' | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [existingSubscription, setExistingSubscription] = useState<any>(null);

  const planId = params?.planId as string;

  useEffect(() => {
    const loadPlanAndCheckSubscription = async () => {
      if (!planId || !user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Load plan
        const plans = await firebaseDB.plans.getAll();
        const foundPlan = plans.find((p: any) => p.id === planId);
        
        if (!foundPlan) {
          setError('Plan no encontrado');
          return;
        }

        setPlan(foundPlan);

        // Check for existing active subscription
        const activeSubscription = await subscriptionService.getUserActiveSubscription(user.id);
        setExistingSubscription(activeSubscription);

        console.log('📊 [Subscribe Page] User subscription status:', {
          hasActiveSubscription: !!activeSubscription,
          currentPlan: activeSubscription?.planName,
          targetPlan: foundPlan.name
        });

      } catch (err) {
        console.error('Error loading plan or checking subscription:', err);
        setError('Error al cargar la información del plan');
      } finally {
        setLoading(false);
      }
    };

    loadPlanAndCheckSubscription();
  }, [planId, user?.id]);

  const handleSubscriptionSuccess = (id: string) => {
    console.log('Subscription created successfully:', id);
    setSubscriptionId(id);
    setSubscriptionStatus('success');
    
    // Refresh the page after 3 seconds to show new Publisher options
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  };

  const handleSubscriptionError = (error: string) => {
    console.error('Subscription error:', error);
    setError(error);
    setSubscriptionStatus('error');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p>{!user ? 'Cargando datos del usuario...' : 'Cargando plan de suscripción...'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user already has an active or pending subscription
  if (existingSubscription && (existingSubscription.status === 'active' || existingSubscription.status === 'pending')) {
    const isActive = existingSubscription.status === 'active';
    const isPending = existingSubscription.status === 'pending';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              {isActive ? (
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              ) : (
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              )}
              <h2 className="text-xl font-semibold mb-2">
                {isActive ? 'Ya tienes una suscripción activa' : 'Tienes una suscripción pendiente'}
              </h2>
              <p className="text-gray-600 mb-4">
                {isActive ? (
                  <>Actualmente tienes el plan <strong>{existingSubscription.planName}</strong> activo.</>
                ) : (
                  <>Tienes una suscripción pendiente para el plan <strong>{existingSubscription.planName}</strong>.</>
                )}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {isActive ? (
                  <>Si deseas cambiar de plan o gestionar tu suscripción actual, puedes hacerlo desde tu página "Mi Plan".</>
                ) : (
                  <>Por favor espera a que se procese tu suscripción actual antes de crear una nueva.</>
                )}
              </p>
              <div className="space-y-3">
                <Button onClick={() => router.push('/mi-plan')} className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ir a Mi Plan
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full">
                  Volver al Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (subscriptionStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">¡Suscripción Creada!</h2>
              <p className="text-gray-600 mb-4">
                Tu suscripción al plan <strong>{plan?.name}</strong> ha sido creada exitosamente.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                ID de Suscripción: {subscriptionId}
              </p>
              <p className="text-sm text-gray-500">
                Redirigiendo al panel de control...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Completa Tu Suscripción
          </h1>
          <p className="text-gray-600">
            Pago seguro con MercadoPago
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {plan?.name}
                <Badge variant="secondary" className="text-lg">
                  {plan?.currency} ${plan?.price}
                </Badge>
              </CardTitle>
              <CardDescription>
                Billed {plan?.billingCycle === 'monthly' ? 'monthly' : 'annually'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">What's included:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Up to {plan?.maxPosts} posts
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Up to {plan?.maxBookings} bookings
                    </li>
                    {plan?.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total</span>
                    <span>{plan?.currency} ${plan?.price}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Form */}
          <div>
            {plan && user && (
              <SubscriptionForm
                plan={plan}
                userId={user.id}
                onSuccess={handleSubscriptionSuccess}
                onError={handleSubscriptionError}
              />
            )}
            
            {error && subscriptionStatus === 'error' && (
              <Card className="mt-4 border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-red-700">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
