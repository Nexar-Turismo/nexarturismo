'use client';

import { useEffect, useMemo, Suspense, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, DollarSign, Lock, MapPin, User, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { Booking } from '@/types';
import { calculateCurrentPrice, formatAddressForDisplay } from '@/lib/utils';

function CheckoutContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const bookingId = params.id as string;

  useEffect(() => {
    const fetchBooking = async () => {
      if (!user || !bookingId) return;

      try {
        setLoading(true);
        setError(null);

        const bookingData = await firebaseDB.bookings.getById(bookingId);
        if (!bookingData) {
          setError('Reserva no encontrada');
          return;
        }

        if (bookingData.clientId !== user.id) {
          setError('No tienes permisos para ver esta reserva');
          return;
        }

        if (bookingData.status !== 'pending_payment') {
          setError('Esta reserva no está pendiente de pago');
          return;
        }

        setBooking(bookingData);
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar la reserva');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [user, bookingId]);

  const handlePayment = async () => {
    if (!booking) return;

    try {
      setProcessing(true);
      const paymentReturnUrl = new URL(`${window.location.origin}/payment/complete`);
      paymentReturnUrl.searchParams.set('context', 'booking');
      paymentReturnUrl.searchParams.set('bookingId', booking.id);

      const response = await fetch('/api/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          returnUrl: paymentReturnUrl.toString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo iniciar el pago con Mercado Pago');
      }

      const data = await response.json();
      if (!data.initPoint) {
        throw new Error('Mercado Pago no devolvió una URL de pago válida.');
      }

      window.location.href = data.initPoint;
    } catch (err) {
      console.error('Error initiating Mercado Pago checkout:', err);
      alert(
        err instanceof Error
          ? err.message
          : 'Error al iniciar el pago con Mercado Pago. Por favor, intenta nuevamente.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(price);

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const priceBreakdown = useMemo(() => {
    if (!booking?.post) {
      return {
        nights: 0,
        nightlyBreakdown: [] as { date: Date; price: number }[],
        subtotal: booking?.totalAmount ?? 0,
        serviceCharge: 0,
        totalWithService: booking?.totalAmount ?? 0,
      };
    }

    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    const nights = Math.max(
      0,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    const nightlyBreakdown: { date: Date; price: number }[] = [];
    let subtotal = 0;

    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const pricing = calculateCurrentPrice(booking.post, currentDate);
      subtotal += pricing.price;
      nightlyBreakdown.push({ date: currentDate, price: pricing.price });
    }

    subtotal = Number(subtotal.toFixed(2));
    const serviceCharge = Number((booking.totalAmount - subtotal).toFixed(2));
    const totalWithService = Number((subtotal + serviceCharge).toFixed(2));

    return {
      nights,
      nightlyBreakdown,
      subtotal,
      serviceCharge: serviceCharge >= 0 ? serviceCharge : 0,
      totalWithService: totalWithService > 0 ? totalWithService : booking.totalAmount,
    };
  }, [booking]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <XCircle className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/bookings')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
          >
            Volver a Reservas
          </button>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Reserva no encontrada
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            La reserva que buscas no existe o no tienes permisos para verla.
          </p>
          <button
            onClick={() => router.push('/bookings')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
          >
            Volver a Reservas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <button
            onClick={() => router.push('/bookings')}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a Reservas
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Resumen de la Reserva
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {booking.post.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">{booking.post.category}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {booking.post.address
                        ? formatAddressForDisplay(booking.post.address)
                        : booking.post.location || 'Ubicación no disponible'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {booking.guestCount} {booking.guestCount === 1 ? 'viajero' : 'viajeros'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detalle de Precios</h3>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {priceBreakdown.nightlyBreakdown.map(({ date, price }, index) => (
                  <div
                    key={`${date.toISOString()}-${index}`}
                    className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {date.toLocaleDateString('es-AR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="text-sm font-medium text-primary">
                      {formatPrice(price, booking.currency)}
                    </span>
                  </div>
                ))}
                {priceBreakdown.nightlyBreakdown.length === 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    No se encontró el detalle de noches. Verificá las fechas de la reserva.
                  </p>
                )}
              </div>

              <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>
                    Subtotal hospedaje ({priceBreakdown.nights}{' '}
                    {priceBreakdown.nights === 1 ? 'noche' : 'noches'})
                  </span>
                  <span>{formatPrice(priceBreakdown.subtotal, booking.currency)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>Cargo de servicio (10%)</span>
                  <span>{formatPrice(priceBreakdown.serviceCharge, booking.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-base font-semibold text-gray-900 dark:text-white">
                  <span>Total a pagar</span>
                  <span>{formatPrice(priceBreakdown.totalWithService, booking.currency)}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  El cargo de servicio ayuda a mantener nuestra plataforma segura y en funcionamiento.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Completá tu pago
              </h2>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Serás redirigido a Mercado Pago para completar el pago de tu reserva. Una vez
                  acreditado, notificaremos automáticamente al proveedor y podrás ver el estado
                  actualizado en tu panel.
                </p>

                <div className="flex items-center gap-3 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg px-4 py-3">
                  <Lock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Checkout seguro
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Mercado Pago protege tus datos y te permite pagar con tarjeta, saldo o efectivo.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Generando enlace...</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5" />
                      <span>Pagar con Mercado Pago</span>
                    </>
                  )}
                </button>

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p>
                    Al continuar, aceptás que la plataforma retenga un cargo de servicio del 10% del
                    total de la reserva.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Cargando...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
