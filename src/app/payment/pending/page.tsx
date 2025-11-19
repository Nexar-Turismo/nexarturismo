'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, ArrowLeft, Mail } from 'lucide-react';

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    console.log('⏳ [Payment Pending] URL params:', {
      status: searchParams.get('status'),
      paymentId: searchParams.get('payment_id'),
      externalReference: searchParams.get('external_reference')
    });
  }, [searchParams]);

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-8 text-center"
      >
        {/* Status Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <Clock className="h-16 w-16 text-yellow-500" />
        </motion.div>

        {/* Status Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Pago Pendiente
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Tu pago está siendo procesado. Te notificaremos por email una vez que 
            se confirme el pago y tu suscripción esté activa.
          </p>
        </motion.div>

        {/* Pending Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            ¿Qué sigue?
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 text-left">
            <li>• Verificaremos tu pago</li>
            <li>• Activaremos tu suscripción</li>
            <li>• Te enviaremos un email de confirmación</li>
            <li>• Podrás acceder a todas las funcionalidades</li>
          </ul>
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={handleBackToHome}
            className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Inicio</span>
          </button>
        </motion.div>

        {/* Email Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-sm text-gray-500 dark:text-gray-400"
        >
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Mail className="h-4 w-4" />
            <span>Revisa tu email para actualizaciones</span>
          </div>
          <p>
            Si tienes preguntas, contacta a{' '}
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
function PaymentPendingLoading() {
  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-8 text-center">
        <div className="flex justify-center mb-6">
          <Clock className="h-16 w-16 text-yellow-500 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Cargando...
        </h1>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function PaymentPendingPage() {
  return (
    <Suspense fallback={<PaymentPendingLoading />}>
      <PaymentPendingContent />
    </Suspense>
  );
}
