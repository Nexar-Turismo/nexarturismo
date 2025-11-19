'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function CheckSubscriptionPage() {
  const { user, refreshUser } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    if (!user?.id) {
      setError('User not logged in');
      return;
    }

    setIsChecking(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔍 [Check Subscription] Checking subscription status for user:', user.id);

      const response = await fetch(`/api/mercadopago/check-subscription-status?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check subscription status');
      }

      console.log('✅ [Check Subscription] Status check result:', data);
      setResult(data);

      // If any subscription was updated, refresh user data
      const wasUpdated = data.results?.some((r: any) => r.updated);
      if (wasUpdated && refreshUser) {
        console.log('🔄 [Check Subscription] Refreshing user data...');
        setTimeout(() => {
          refreshUser();
        }, 2000);
      }

    } catch (err) {
      console.error('❌ [Check Subscription] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'authorized':
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'cancelled':
      case 'paused':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'authorized':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
      case 'paused':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Verificar Estado de Suscripción</h1>
        <p className="text-gray-600 mt-1">
          Verifica y actualiza manualmente el estado de tu suscripción desde MercadoPago
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>¿Qué hace esta herramienta?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            Esta herramienta verifica el estado de tu suscripción directamente desde MercadoPago y lo actualiza 
            en nuestra base de datos si es necesario.
          </p>
          <p className="font-semibold text-gray-900">Úsala si:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tu suscripción aparece como "pendiente" pero el pago fue completado</li>
            <li>Tu rol de Editor no fue asignado después del pago</li>
            <li>Quieres verificar el estado actual de tu suscripción</li>
          </ul>
        </CardContent>
      </Card>

      {/* Check Button */}
      <div className="flex items-center space-x-4">
        <Button
          onClick={handleCheckStatus}
          disabled={isChecking || !user}
          size="lg"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              Verificar Estado de Suscripción
            </>
          )}
        </Button>
        {!user && (
          <span className="text-sm text-red-600">Por favor inicia sesión para verificar el estado de la suscripción</span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 font-semibold">Error:</span>
              <span className="text-red-700 ml-2">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
              Resultados de Verificación de Suscripción
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Suscripciones Verificadas</p>
                <p className="text-2xl font-bold text-blue-600">{result.checked}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Actualizadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.results?.filter((r: any) => r.updated).length || 0}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">Sin Cambios</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {result.results?.filter((r: any) => !r.updated && r.status !== 'error').length || 0}
                </p>
              </div>
            </div>

            {/* Detailed Results */}
            {result.results?.map((sub: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(sub.mercadoPagoStatus || sub.firebaseStatus)}
                    <span className="font-semibold">Suscripción {index + 1}</span>
                  </div>
                  {sub.updated && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                      ACTUALIZADA
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">ID de Suscripción (Firebase)</p>
                    <p className="font-mono text-xs">{sub.subscriptionId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">ID de MercadoPago</p>
                    <p className="font-mono text-xs">{sub.mercadoPagoId}</p>
                  </div>
                </div>

                {sub.mercadoPagoDetails && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Estado Firebase</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(sub.firebaseStatus)}`}>
                          {sub.firebaseStatus}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-600">Estado MercadoPago</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(sub.mercadoPagoStatus)}`}>
                          {sub.mercadoPagoStatus}
                        </span>
                      </div>
                    </div>

                    <div className="text-sm">
                      <p className="text-gray-600">Nombre del Plan</p>
                      <p className="font-semibold">{sub.mercadoPagoDetails.reason}</p>
                    </div>

                    {sub.mercadoPagoDetails.payer_email && (
                      <div className="text-sm">
                        <p className="text-gray-600">Email del Pagador</p>
                        <p className="font-mono text-xs">{sub.mercadoPagoDetails.payer_email}</p>
                      </div>
                    )}

                    {sub.mercadoPagoDetails.auto_recurring && (
                      <div className="text-sm">
                        <p className="text-gray-600">Facturación</p>
                        <p>
                          {sub.mercadoPagoDetails.auto_recurring.transaction_amount}{' '}
                          {sub.mercadoPagoDetails.auto_recurring.currency_id} cada{' '}
                          {sub.mercadoPagoDetails.auto_recurring.frequency}{' '}
                          {sub.mercadoPagoDetails.auto_recurring.frequency_type}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                      <div>
                        <p>Creado:</p>
                        <p>{new Date(sub.mercadoPagoDetails.date_created).toLocaleString()}</p>
                      </div>
                      <div>
                        <p>Última Modificación:</p>
                        <p>{new Date(sub.mercadoPagoDetails.last_modified).toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                )}

                {sub.status === 'error' && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800">
                      <span className="font-semibold">Error:</span> {sub.message}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {result.results?.some((r: any) => r.updated) && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-semibold">
                    ¡Estado actualizado exitosamente! Actualizando tus datos de usuario...
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Consejos para Solución de Problemas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p className="font-semibold text-gray-900">Si el estado sigue siendo "pendiente":</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Verifica si el pago fue procesado realmente en MercadoPago</li>
            <li>Espera unos minutos e intenta verificar nuevamente</li>
            <li>Verifica que la URL del webhook esté configurada en MercadoPago</li>
            <li>Revisa los logs del servidor para errores de webhook</li>
          </ol>
          
          <p className="font-semibold text-gray-900 mt-4">Si falta el rol de Editor:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Asegúrate de que el estado de la suscripción sea "autorizado" o "activo"</li>
            <li>Actualiza esta página después de la actualización del estado</li>
            <li>Cierra sesión e inicia sesión nuevamente</li>
            <li>Contacta soporte si el problema persiste</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
