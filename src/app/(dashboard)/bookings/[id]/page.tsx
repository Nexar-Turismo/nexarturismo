'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  DollarSign, 
  User, 
  Phone, 
  Mail, 
  MessageSquare,
  Check,
  X,
  CreditCard,
  AlertCircle,
  Download,
  Info
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { Booking } from '@/types';
import { calculateCancellationPenalty, CancellationPenalty } from '@/lib/cancellationUtils';
import { formatAddressForDisplay, calculateCurrentPrice } from '@/lib/utils';
import CancellationModal from '@/components/booking/CancellationModal';
import { voucherService } from '@/services/voucherService';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationPenalty, setCancellationPenalty] = useState<CancellationPenalty | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectionReasonTouched, setIsRejectionReasonTouched] = useState(false);

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

        // Check if user has permission to view this booking
        if (bookingData.clientId !== user.id && bookingData.ownerId !== user.id && !hasRole('superadmin')) {
          setError('No tienes permisos para ver esta reserva');
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
  }, [user, bookingId, hasRole]);

  const SERVICE_FEE_RATE = 0.1;

  const priceBreakdown = useMemo(() => {
    if (!booking || !booking.startDate || !booking.endDate || !booking.post) {
      return {
        nights: 0,
        nightlyBreakdown: [] as { date: Date; price: number }[],
        subtotal: 0,
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
      nightlyBreakdown.push({
        date: currentDate,
        price: pricing.price,
      });
    }

    subtotal = Number(subtotal.toFixed(2));
    const expectedService = Number((subtotal * SERVICE_FEE_RATE).toFixed(2));
    const recordedTotal = booking.totalAmount
      ? Number(booking.totalAmount.toFixed(2))
      : Number((subtotal + expectedService).toFixed(2));
    const derivedService = Number((recordedTotal - subtotal).toFixed(2));
    const serviceCharge =
      derivedService >= 0 && !Number.isNaN(derivedService) ? derivedService : expectedService;
    const totalWithService = Number((subtotal + serviceCharge).toFixed(2));

    return {
      nights,
      nightlyBreakdown,
      subtotal,
      serviceCharge,
      totalWithService,
    };
  }, [booking]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleAcceptBooking = async () => {
    if (!booking) return;

    try {
      setActionLoading('accept');
      console.log('🎯 [BookingDetail] Starting booking acceptance process for booking:', booking.id);
      console.log('🎯 [BookingDetail] Booking data:', {
        id: booking.id,
        postTitle: booking.post.title,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        clientName: booking.client.name,
        clientEmail: booking.client.email
      });

      console.log('💾 [BookingDetail] Updating booking status to pending_payment...');
      // Update booking status to pending payment
      await firebaseDB.bookings.updateStatus(booking.id, 'pending_payment');
      console.log('✅ [BookingDetail] Booking status updated successfully');

      console.log('🔔 [BookingDetail] Creating notification for client...');
      // Create notification for client
      await firebaseDB.notifications.create({
        userId: booking.clientId,
        type: 'payment_pending',
        title: 'Reserva aceptada - Pago pendiente',
        message: `Tu reserva para "${booking.post.title}" ha sido aceptada. Completa el pago para confirmar.`,
        isRead: false,
        data: {
          bookingId: booking.id,
          postId: booking.postId
        }
      });
      console.log('✅ [BookingDetail] Notification created successfully');

      console.log('🔄 [BookingDetail] Refreshing page...');
      // Refresh booking data
      window.location.reload();
    } catch (err) {
      console.error('❌ [BookingDetail] Error accepting booking:', err);
      console.error('❌ [BookingDetail] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      alert('Error al aceptar la reserva: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(null);
      setShowAcceptConfirm(false);
    }
  };

  const handleDeclineBooking = async () => {
    if (!booking) return;

    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setIsRejectionReasonTouched(true);
      return;
    }

    try {
      setActionLoading('decline');
      await firebaseDB.bookings.updateStatus(booking.id, 'declined', {
        rejectionReason: trimmedReason
      });

      // Create notification for client
      await firebaseDB.notifications.create({
        userId: booking.clientId,
        type: 'booking_declined',
        title: 'Reserva rechazada',
        message: `Tu reserva para "${booking.post.title}" ha sido rechazada. Motivo: ${trimmedReason}`,
        isRead: false,
        data: {
          bookingId: booking.id,
          postId: booking.postId,
          rejectionReason: trimmedReason
        }
      });

      // Reset form state
      setRejectionReason('');
      setIsRejectionReasonTouched(false);
      
      // Refresh booking data
      window.location.reload();
    } catch (err) {
      console.error('Error declining booking:', err);
      alert('Error al rechazar la reserva');
    } finally {
      setActionLoading(null);
      setShowDeclineConfirm(false);
    }
  };

  const handlePaymentClick = async () => {
    if (!booking) {
      alert('No hay información de reserva disponible.');
      return;
    }

    // Redirect to mock checkout page
    router.push(`/checkout/${booking.id}`);
  };

  const handleCancelBooking = () => {
    if (!booking) return;

    // Calculate cancellation penalty
    const penalty = calculateCancellationPenalty(
      booking.post.cancellationPolicies || [],
      booking.totalAmount,
      new Date(booking.startDate)
    );

    setCancellationPenalty(penalty);
    setShowCancellationModal(true);
  };

  const handleConfirmCancellation = async (reason: string) => {
    if (!booking || !user) return;

    setIsCancelling(true);

    try {
      const cancelledBy = booking.clientId === user.id ? 'client' : 'publisher';

      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelledBy,
          cancellationReason: reason.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cancelar la reserva');
      }

      const result = await response.json();
      
      // Show success message
      alert(`Reserva cancelada exitosamente${result.penaltyAmount > 0 ? ` (Penalización: ${result.penaltyAmount} ${booking.currency})` : ''}`);
      
      // Close modal and refresh page
      setShowCancellationModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert('Error al cancelar la reserva: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'pending_payment':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'requested':
        return 'Solicitada';
      case 'accepted':
        return 'Aceptada';
      case 'declined':
        return 'Rechazada';
      case 'pending_payment':
        return 'Pago Pendiente';
      case 'paid':
        return 'Pagada';
      case 'cancelled':
        return 'Cancelada';
      case 'completed':
        return 'Completada';
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const handleDownloadVoucher = async () => {
    if (!booking) return;
    
    try {
      const type = booking.clientId === user?.id ? 'client' : 'publisher';
      await voucherService.generateVoucher({ booking, type });
    } catch (error) {
      console.error('Error downloading voucher:', error);
      alert('Error al descargar el voucher. Por favor, intenta nuevamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando reserva...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <AlertCircle className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error
          </h1>
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

  const isOwner = booking.ownerId === user?.id;
  const isClient = booking.clientId === user?.id;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-8">
        {/* Back Button */}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Booking Header */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {booking.post.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    {booking.post.category}
                  </p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(booking.status)}`}>
                  {getStatusText(booking.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {booking.post.address ? formatAddressForDisplay(booking.post.address) : 'Ubicación no disponible'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatPrice(booking.totalAmount, booking.currency)}
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

            {/* Rejection Reason - Show if booking is declined */}
            {booking.status === 'declined' && booking.rejectionReason && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Motivo de Rechazo
                </h2>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    {booking.rejectionReason}
                  </p>
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            {priceBreakdown.nightlyBreakdown.length > 0 && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Detalle de Fechas y Precios
                </h2>
                <div className="space-y-2 max-h-48 overflow-y-auto">
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
                        ${formatCurrency(price)} {booking.currency}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                    <span>
                      Subtotal hospedaje ({priceBreakdown.nights}{' '}
                      {priceBreakdown.nights === 1 ? 'noche' : 'noches'})
                    </span>
                    <span>
                      ${formatCurrency(priceBreakdown.subtotal)} {booking.currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                    <span>Cargo de servicio (10%)</span>
                    <span>
                      ${formatCurrency(priceBreakdown.serviceCharge)} {booking.currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                      Total con servicio
                    </span>
                    <span className="text-base font-bold text-primary">
                      ${formatCurrency(priceBreakdown.totalWithService)} {booking.currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cancellation Policies */}
            {booking.post?.cancellationPolicies && booking.post.cancellationPolicies.length > 0 && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Políticas de Cancelación
                </h2>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="flex-1">
                      <div className="space-y-2">
                        {booking.post.cancellationPolicies
                          .sort((a, b) => a.days_quantity - b.days_quantity)
                          .map((policy) => (
                            <div
                              key={policy.id}
                              className="text-sm text-blue-800 dark:text-blue-300 bg-white dark:bg-gray-800 rounded p-2 border border-blue-200 dark:border-blue-700"
                            >
                              <p>
                                <strong>
                                  {policy.days_quantity >= 9999
                                    ? 'Cancelación en cualquier momento'
                                    : `Cancelación con ${policy.days_quantity} días o menos de anticipación`}
                                </strong>
                                : Se cobrará{' '}
                                {policy.cancellation_type === 'Porcentaje' ? (
                                  <strong>{policy.cancellation_amount}% del total</strong>
                                ) : (
                                  <strong>
                                    {new Intl.NumberFormat('es-ES', {
                                      style: 'currency',
                                      currency: booking.currency
                                    }).format(policy.cancellation_amount)}
                                  </strong>
                                )}{' '}
                                como penalización.
                              </p>
                            </div>
                          ))}
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-3">
                        Estas políticas se aplicarán según la fecha de cancelación en relación con la fecha de inicio de tu reserva.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Client Information - Only show when booking is paid */}
            {booking.status === 'paid' && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Información del Cliente
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">{booking.client.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">{booking.client.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">{booking.clientData.phone}</span>
                  </div>
                </div>
                {booking.clientData.notes && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Notas:
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {booking.clientData.notes}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Publisher Information - Only show to clients when booking is paid */}
            {isClient && booking.status === 'paid' && booking.owner && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Información del Proveedor
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">{booking.owner.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">{booking.owner.email}</span>
                  </div>
                  {booking.owner.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{booking.owner.phone}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                        Reserva Confirmada
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        Tu pago ha sido procesado exitosamente. Puedes contactar al proveedor usando la información de arriba.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Actions Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Acciones
              </h3>
              
              <div className="space-y-3">
                {/* Download Voucher - Available for paid bookings */}
                {booking.status === 'paid' && (
                  <button
                    onClick={handleDownloadVoucher}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Voucher</span>
                  </button>
                )}

                {/* Owner Actions */}
                {isOwner && booking.status === 'requested' && (
                  <>
                    <button
                      onClick={() => setShowAcceptConfirm(true)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aceptar solicitud de reserva</span>
                    </button>
                    <button
                      onClick={() => setShowDeclineConfirm(true)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>Rechazar solicitud de reserva</span>
                    </button>
                  </>
                )}

                {/* Client Actions */}
                {isClient && booking.status === 'pending_payment' && (
                  <button
                    onClick={handlePaymentClick}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Completar Pago</span>
                  </button>
                )}

                {/* Cancellation Actions - Only show for bookings that can be cancelled */}
                {(booking.status === 'pending_payment' || booking.status === 'paid') && (
                  <button
                    onClick={handleCancelBooking}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancelar Reserva</span>
                  </button>
                )}

                {/* View Post Button */}
                <button
                  onClick={() => router.push(`/post/${booking.postId}`)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                >
                  <span>Ver Servicio</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {booking && cancellationPenalty && (
        <CancellationModal
          isOpen={showCancellationModal}
          onClose={() => setShowCancellationModal(false)}
          onConfirm={handleConfirmCancellation}
          booking={booking}
          penalty={cancellationPenalty}
          isCancelling={isCancelling}
          actorType={booking.clientId === user?.id ? 'client' : 'publisher'}
        />
      )}

      {/* Accept Confirmation Modal */}
      {showAcceptConfirm && booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="glass max-w-md w-full rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirmar aceptación
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              ¿Seguro que querés aceptar esta solicitud de reserva para <strong>{booking.post.title}</strong>? El huésped recibirá una notificación para completar el pago.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAcceptConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                disabled={actionLoading === 'accept'}
              >
                Cancelar
              </button>
              <button
                onClick={handleAcceptBooking}
                disabled={actionLoading === 'accept'}
                className="px-5 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {actionLoading === 'accept' ? 'Confirmando...' : 'Confirmar aceptación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Confirmation Modal */}
      {showDeclineConfirm && booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-white max-w-md w-full rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar rechazo
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Seguro que querés rechazar esta solicitud de reserva? El cliente será notificado y la reserva se marcará como rechazada.
            </p>
            
            {/* Rejection Reason Textarea */}
            <div className="mb-6">
              <label
                htmlFor="rejection-reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Motivo de rechazo <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                onBlur={() => setIsRejectionReasonTouched(true)}
                disabled={actionLoading === 'decline'}
                required
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-60"
                placeholder="Explicá brevemente el motivo del rechazo"
              />
              {isRejectionReasonTouched && !rejectionReason.trim() && (
                <p className="mt-1 text-sm text-red-500">
                  El motivo de rechazo es obligatorio.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeclineConfirm(false);
                  setRejectionReason('');
                  setIsRejectionReasonTouched(false);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                disabled={actionLoading === 'decline'}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeclineBooking}
                disabled={actionLoading === 'decline' || !rejectionReason.trim()}
                className="px-5 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {actionLoading === 'decline' ? 'Confirmando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
