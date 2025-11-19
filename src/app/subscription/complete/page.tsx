'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

/**
 * Subscription completion page
 * Handles MercadoPago subscription redirects
 */
function SubscriptionCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const preapprovalId = searchParams.get('preapproval_id');
    const status = searchParams.get('status');
    const externalReference = searchParams.get('external_reference');

    console.log('🎯 [Subscription Complete] URL params:', {
      preapprovalId,
      status,
      externalReference,
      allParams: Object.fromEntries(searchParams.entries())
    });

    // Process the subscription
    const processSubscription = async () => {
      if (!preapprovalId) {
        setError('No subscription ID found');
        setIsProcessing(false);
        return;
      }

      try {
        // Trigger webhook manually to ensure subscription is updated
        console.log('📡 [Subscription Complete] Triggering webhook for subscription:', preapprovalId);
        
        const webhookResponse = await fetch('/api/mercadopago/subscription-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'preapproval',
            action: 'created',
            data: {
              id: preapprovalId
            }
          })
        });

        console.log('✅ [Subscription Complete] Webhook triggered:', {
          status: webhookResponse.status,
          ok: webhookResponse.ok
        });

        // Wait a moment for the webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsProcessing(false);
      } catch (err) {
        console.error('❌ [Subscription Complete] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsProcessing(false);
      }
    };

    processSubscription();
  }, [searchParams]);

  const status = searchParams.get('status');
  const preapprovalId = searchParams.get('preapproval_id');

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Procesando tu suscripción
            </h1>
            <p className="text-gray-600">
              Estamos confirmando tu suscripción con MercadoPago...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <XCircle className="h-16 w-16 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Error al procesar la suscripción
            </h1>
            <p className="text-gray-600">{error}</p>
            <div className="pt-4">
              <Button onClick={() => router.push('/suscribirse')} className="w-full">
                Intentar nuevamente
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Success or other status
  const isSuccess = status === 'approved' || status === 'authorized';
  const isPending = status === 'pending';
  const isFailed = status === 'rejected' || status === 'cancelled';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {isSuccess && <CheckCircle className="h-16 w-16 text-green-600" />}
            {isPending && <Clock className="h-16 w-16 text-yellow-600" />}
            {isFailed && <XCircle className="h-16 w-16 text-red-600" />}
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            {isSuccess && '¡Suscripción exitosa!'}
            {isPending && 'Suscripción pendiente'}
            {isFailed && 'Suscripción rechazada'}
          </h1>

          <p className="text-gray-600">
            {isSuccess && 'Tu suscripción ha sido activada correctamente. Ya puedes comenzar a publicar.'}
            {isPending && 'Tu suscripción está pendiente de confirmación. Te notificaremos cuando esté activa.'}
            {isFailed && 'No se pudo procesar tu suscripción. Por favor, intenta nuevamente.'}
          </p>

          {preapprovalId && (
            <div className="text-sm text-gray-500 pt-2">
              ID de suscripción: {preapprovalId}
            </div>
          )}

          <div className="pt-4 space-y-2">
            {isSuccess && (
              <>
                <Button onClick={() => router.push('/mi-plan')} className="w-full">
                  Ver mi plan
                </Button>
                <Button onClick={() => router.push('/posts/new')} variant="outline" className="w-full">
                  Crear publicación
                </Button>
              </>
            )}
            {(isPending || isFailed) && (
              <Button onClick={() => router.push('/suscribirse')} className="w-full">
                {isFailed ? 'Intentar nuevamente' : 'Volver a planes'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function SubscriptionCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
      </div>
    }>
      <SubscriptionCompleteContent />
    </Suspense>
  );
}

