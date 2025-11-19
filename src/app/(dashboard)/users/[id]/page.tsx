'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { paymentTrackingService } from '@/services/paymentTrackingService';
import { subscriptionService } from '@/services/subscriptionService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  TrendingUp,
  ExternalLink
} from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  roles: Array<{
    roleId: string;
    roleName: string;
    assignedAt: Date;
    isActive: boolean;
  }>;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  profileCompleted: boolean;
}

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

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const userId = params.id as string;

  const [user, setUser] = useState<UserData | null>(null);
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

  useEffect(() => {
    // Check if user is superadmin
    if (!hasRole('superadmin')) {
      router.push('/dashboard');
      return;
    }

    if (userId) {
      loadUserData();
    }
  }, [userId, hasRole, router]);

  const loadUserData = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('👤 [User Detail] Loading user data for:', userId);

      // Load user data
      const userData = await firebaseDB.users.getById(userId);
      if (!userData) {
        setError('Usuario no encontrado');
        return;
      }
      setUser(userData);

      // Load subscription data
      const subscriptionData = await subscriptionService.getUserActiveSubscription(userId);
      if (subscriptionData) {
        setSubscription(subscriptionData);
      }

      // Load payment history
      const paymentHistory = await paymentTrackingService.getUserPayments(userId);
      setPayments(paymentHistory);

      // Load payment statistics
      const stats = await paymentTrackingService.getUserPaymentStats(userId);
      setPaymentStats(stats);

      console.log('✅ [User Detail] Data loaded successfully:', {
        userName: userData.name,
        hasSubscription: !!subscriptionData,
        paymentCount: paymentHistory.length,
        stats
      });

    } catch (error) {
      console.error('❌ [User Detail] Error loading data:', error);
      setError('Error al cargar los datos del usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadUserData();
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

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'superadmin':
        return 'bg-red-100 text-red-800';
      case 'publisher':
        return 'bg-blue-100 text-blue-800';
      case 'client':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            <span>Cargando información del usuario...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Usuario no encontrado</h2>
          <p className="text-gray-600 mb-4">El usuario que buscas no existe o no tienes permisos para verlo.</p>
          <Button onClick={() => router.push('/users')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Usuarios
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={() => router.push('/users')} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600 mt-1">Detalles del usuario y historial de pagos</p>
          </div>
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

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Información del Usuario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{user.email}</p>
                </div>
              </div>
              
              {user.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Teléfono</p>
                    <p className="font-semibold">{user.phone}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Fecha de registro</p>
                  <p className="font-semibold">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {user.roles?.map((role) => (
                    <Badge key={role.roleId} className={getRoleColor(role.roleName)}>
                      <Shield className="w-3 h-3 mr-1" />
                      {role.roleName}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">Estado</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <Badge className={user.emailVerified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}>
                    {user.emailVerified ? 'Email verificado' : 'Email pendiente'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      {subscription ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Suscripción Activa</span>
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin suscripción activa</h3>
            <p className="text-gray-600">Este usuario no tiene una suscripción activa</p>
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
                <p className="text-sm text-gray-600">Fallidos</p>
                <p className="text-2xl font-bold text-red-600">{paymentStats.failedPayments}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
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
    </div>
  );
}
