'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { paymentTrackingService } from '@/services/paymentTrackingService';
import { subscriptionService } from '@/services/subscriptionService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  TrendingUp,
  FileText,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import UnsubscribeModal from '@/components/ui/unsubscribe-modal';

interface PaymentRecord {
  id: string;
  mercadoPagoPaymentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  statusDetail: string;
  paymentMethod: string;
  description: string;
  createdAt: Date;
  processedAt?: Date;
  metadata: any;
}

interface SubscriptionData {
  id: string;
  planName: string;
  status: 'pending' | 'active' | 'cancelled' | 'paused' | 'expired';
  amount: number;
  currency: string;
  billingCycle: string;
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  mercadoPagoSubscriptionId: string;
}

export default function MiPlanPage() {
  const { user, refreshUser } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentStats, setPaymentStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('📊 [Mi Plan] Loading user subscription and payment data');

      // Load subscription data
      const subscriptionData = await subscriptionService.getUserActiveSubscription(user.id);
      if (subscriptionData) {
        setSubscription(subscriptionData);
      }

      // Load payment history
      const paymentHistory = await paymentTrackingService.getUserPayments(user.id);
      setPayments(paymentHistory);

      // Load payment statistics
      const stats = await paymentTrackingService.getUserPaymentStats(user.id);
      setPaymentStats(stats);

      console.log('✅ [Mi Plan] Data loaded successfully:', {
        hasSubscription: !!subscriptionData,
        paymentCount: paymentHistory.length,
        stats
      });

    } catch (error) {
      console.error('❌ [Mi Plan] Error loading data:', error);
      setError('Error al cargar los datos del plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadUserData();
    if (refreshUser) {
      await refreshUser();
    }
  };

  const handleUnsubscribe = async () => {
    if (!subscription || !user?.id) return;

    setIsUnsubscribing(true);
    setError(null);

    try {
      console.log('🔄 [Mi Plan] Starting unsubscribe process for user:', user.id);

      // Call unsubscribe API
      const response = await fetch('/api/mercadopago/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          subscriptionId: subscription.id,
          mercadoPagoSubscriptionId: subscription.mercadoPagoSubscriptionId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cancelar la suscripción');
      }

      console.log('✅ [Mi Plan] Unsubscribe successful:', result);

      // Close modal and refresh data
      setShowUnsubscribeModal(false);
      
      // Force refresh user data and roles
      if (refreshUser) {
        await refreshUser();
      }
      
      await loadUserData();

      // Show success message and refresh the page to ensure all changes are reflected
      alert('Suscripción cancelada exitosamente. Todos tus datos han sido eliminados.');
      
      // Force page refresh to ensure all UI updates are reflected
      window.location.reload();

    } catch (error) {
      console.error('❌ [Mi Plan] Unsubscribe error:', error);
      setError(error instanceof Error ? error.message : 'Error al cancelar la suscripción');
    } finally {
      setIsUnsubscribing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'expired':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
      case 'expired':
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Cargando información del plan...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Plan</h1>
          <p className="text-gray-600 mt-1">
            Gestiona tu suscripción y consulta el historial de pagos
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Subscription Status */}
      {subscription ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Estado de la Suscripción</span>
              <Badge className={getStatusColor(subscription.status)}>
                {getStatusIcon(subscription.status)}
                <span className="ml-1 capitalize">{subscription.status}</span>
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Plan</p>
                  <p className="font-semibold">{subscription.planName}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Precio</p>
                  <p className="font-semibold">{formatCurrency(subscription.amount, subscription.currency)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Facturación</p>
                  <p className="font-semibold capitalize">{subscription.billingCycle}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Fecha de inicio</p>
                <p className="font-semibold">{formatDate(subscription.startDate)}</p>
              </div>
              {subscription.nextBillingDate && (
                <div>
                  <p className="text-sm text-gray-600">Próxima facturación</p>
                  <p className="font-semibold">{formatDate(subscription.nextBillingDate)}</p>
                </div>
              )}
            </div>

            {subscription.status === 'active' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">
                      Tu suscripción está activa. Puedes crear publicaciones según tu plan.
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/suscribirse/planes'}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Mejorar Plan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowUnsubscribeModal(true)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Darse de Baja
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes una suscripción activa</h3>
            <p className="text-gray-600 mb-4">
              Suscríbete a un plan para comenzar a crear publicaciones
            </p>
            <a href="/suscribirse">
              <Button>
                <TrendingUp className="w-4 h-4 mr-2" />
                Suscribirse
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pagos</p>
                <p className="text-2xl font-bold">{paymentStats.totalPayments}</p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monto Total</p>
                <p className="text-2xl font-bold">{formatCurrency(paymentStats.totalAmount)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Exitosos</p>
                <p className="text-2xl font-bold text-green-600">{paymentStats.successfulPayments}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{paymentStats.pendingPayments}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${getStatusColor(payment.status)}`}>
                      {getStatusIcon(payment.status)}
                    </div>
                    <div>
                      <p className="font-semibold">{payment.description}</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(payment.createdAt)} • {payment.paymentMethod}
                      </p>
                      {payment.statusDetail && (
                        <p className="text-xs text-gray-500">{payment.statusDetail}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(payment.amount, payment.currency)}</p>
                    <p className="text-sm text-gray-600">ID: {payment.mercadoPagoPaymentId}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay pagos registrados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unsubscribe Modal */}
      <UnsubscribeModal
        isOpen={showUnsubscribeModal}
        onClose={() => setShowUnsubscribeModal(false)}
        onConfirm={handleUnsubscribe}
        isLoading={isUnsubscribing}
      />
    </div>
  );
}
