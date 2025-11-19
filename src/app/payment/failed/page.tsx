'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    console.log('❌ [Payment Failed] URL params:', {
      status: searchParams.get('status'),
      paymentId: searchParams.get('payment_id'),
      externalReference: searchParams.get('external_reference')
    });
  }, [searchParams]);

  const handleRetry = () => {
    router.push('/suscribirse');
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full rounded-2xl border-2 border-red-200 bg-red-50 p-8 text-center"
      >
        {/* Status Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <XCircle className="h-16 w-16 text-red-500" />
        </motion.div>

        {/* Status Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Pago No Procesado
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            No pudimos procesar tu pago. Esto puede deberse a fondos insuficientes, 
            datos incorrectos o problemas con tu método de pago.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <button
            onClick={handleRetry}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Intentar de Nuevo</span>
          </button>

          <button
            onClick={handleBackToHome}
            className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Inicio</span>
          </button>
        </motion.div>

        {/* Support Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-sm text-gray-500 dark:text-gray-400"
        >
          <p className="mb-2">¿Necesitas ayuda?</p>
          <p>
            Contacta a{' '}
            <a href="mailto:soporte@tudominio.com" className="text-blue-600 hover:underline">
              soporte@tudominio.com
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Loading fallback component
function PaymentFailedLoading() {
  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border-2 border-red-200 bg-red-50 p-8 text-center">
        <div className="flex justify-center mb-6">
          <XCircle className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Cargando...
        </h1>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<PaymentFailedLoading />}>
      <PaymentFailedContent />
    </Suspense>
  );
}
