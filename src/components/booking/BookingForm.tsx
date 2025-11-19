'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, MessageSquare, Users, Info } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { BasePost, Booking } from '@/types';
import { formatAddressForDisplay, calculateCurrentPrice } from '@/lib/utils';
import DateRangePicker from '@/components/ui/DateRangePicker';

interface BookingFormProps {
  post: BasePost;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingForm({ post, onClose, onSuccess }: BookingFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    guestCount: 1,
    clientData: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      notes: ''
    }
  });

  const maxGuests = Number((post?.specificFields as any)?.maxPeople || 0) || null;
  
  const [selectedRange, setSelectedRange] = useState<{
    startDate: Date;
    endDate: Date;
    nights: number;
    totalPrice: number;
  } | null>(null);

  const SERVICE_FEE_RATE = 0.1;

  const serviceCharge = selectedRange
    ? Number((selectedRange.totalPrice * SERVICE_FEE_RATE).toFixed(2))
    : 0;

  const totalWithServiceCharge = selectedRange
    ? Number((selectedRange.totalPrice + serviceCharge).toFixed(2))
    : 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Handle date range selection
  const handleRangeChange = useCallback((range: { startDate: Date; endDate: Date; nights: number; totalPrice: number }) => {
    setSelectedRange(range);
    setFormData(prev => ({
      ...prev,
      startDate: range.startDate.toISOString().split('T')[0],
      endDate: range.endDate.toISOString().split('T')[0]
    }));
  }, []);

  useEffect(() => {
    // Pre-fill form with user data if available
    if (user) {
      setFormData(prev => ({
        ...prev,
        clientData: {
          ...prev.clientData,
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || ''
        }
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Debes estar logueado para realizar una reserva');
      return;
    }

    // Prevent users from booking their own services/posts
    if (user.id === post.userId) {
      setError('No puedes reservar tu propio servicio. Solo puedes reservar servicios de otros usuarios.');
      return;
    }

    if (!selectedRange) {
      setError('Por favor selecciona las fechas de la reserva');
      return;
    }

    if (maxGuests && formData.guestCount > maxGuests) {
      setError(`El número de viajeros no puede exceder ${maxGuests}`);
      return;
    }

    if (selectedRange.nights <= 0) {
      setError('Debes seleccionar al menos una noche');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the calculated price plus service charge
      const serviceFeeAmount = Number((selectedRange.totalPrice * SERVICE_FEE_RATE).toFixed(2));
      const totalAmount = Number((selectedRange.totalPrice + serviceFeeAmount).toFixed(2));

      // Create booking
      const bookingData = {
        postId: post.id,
        clientId: user.id,
        ownerId: post.userId,
        status: 'requested' as const,
        startDate: selectedRange.startDate,
        endDate: selectedRange.endDate,
        totalAmount,
        currency: post.currency,
        guestCount: formData.guestCount,
        clientData: formData.clientData
      };

      const bookingId = await firebaseDB.bookings.create(bookingData);

      // Create notification for post owner
      await firebaseDB.notifications.create({
        userId: post.userId,
        type: 'booking_request',
        title: 'Nueva solicitud de reserva',
        message: `${user.name} ha solicitado una reserva para "${post.title}"`,
        isRead: false,
        data: {
          bookingId,
          postId: post.id
        }
      });

      onSuccess();
    } catch (err) {
      console.error('Error creating booking:', err);
      setError(err instanceof Error ? err.message : 'Error al crear la reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'clientData') {
        setFormData(prev => ({
          ...prev,
          clientData: {
            ...prev.clientData,
            [child]: value
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [parent]: value
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Solicitar Reserva
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-6">
            {/* Post Info */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {post.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {post.address ? formatAddressForDisplay(post.address) : 'Ubicación no disponible'}
                {selectedRange && (
                  <span className="block mt-1 font-medium text-primary">
                    ${formatCurrency(selectedRange.totalPrice)} total por {selectedRange.nights} noches
                  </span>
                )}
              </p>
            </div>

            {/* Date Range Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Seleccionar Fechas *
              </label>
              <DateRangePicker 
                post={post} 
                onRangeChange={handleRangeChange}
                className="w-full"
              />
            </div>

            {/* Detailed Date and Price Breakdown */}
            {selectedRange && selectedRange.nights > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Detalle de Fechas y Precios
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Array.from({ length: selectedRange.nights }, (_, i) => {
                    const currentDate = new Date(selectedRange.startDate);
                    currentDate.setDate(selectedRange.startDate.getDate() + i);
                    const pricing = calculateCurrentPrice(post, currentDate);
                    
                    return (
                      <div 
                        key={i}
                        className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {currentDate.toLocaleDateString('es-AR', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </span>
                        <span className="text-sm font-medium text-primary">
                          ${formatCurrency(pricing.price)} {post.currency}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      Subtotal hospedaje ({selectedRange.nights} {selectedRange.nights === 1 ? 'noche' : 'noches'}):
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      ${formatCurrency(selectedRange.totalPrice)} {post.currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-700 dark:text-gray-300">
                    <span>Cargo de servicio (10%)</span>
                    <span>${formatCurrency(serviceCharge)} {post.currency}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">
                      Total con servicio:
                    </span>
                    <span className="text-base font-bold text-primary">
                      ${formatCurrency(totalWithServiceCharge)} {post.currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Guest Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Número de Viajeros *
              </label>
              <input
                type="number"
                min="1"
                max={maxGuests || 20}
                value={formData.guestCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  const bounded = Math.max(1, Math.min(val, maxGuests || 20));
                  handleInputChange('guestCount', bounded);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Notas Adicionales (Opcional)
              </label>
              <textarea
                value={formData.clientData.notes}
                onChange={(e) => handleInputChange('clientData.notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Información adicional sobre tu reserva..."
              />
            </div>

            {/* Cancellation Policies */}
            {post.cancellationPolicies && post.cancellationPolicies.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3 mb-3">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                      Políticas de Cancelación
                    </h3>
                    <div className="space-y-2">
                      {post.cancellationPolicies
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
                                    currency: post.currency
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
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Total Amount */}
            {selectedRange && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>Subtotal hospedaje</span>
                  <span>${formatCurrency(selectedRange.totalPrice)} {post.currency}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                  <span>Cargo de servicio (10%)</span>
                  <span>${formatCurrency(serviceCharge)} {post.currency}</span>
                </div>
                <div className="border-t border-primary/20 pt-3 flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Total Estimado:
                  </span>
                  <span className="text-lg font-bold text-primary">
                    ${formatCurrency(totalWithServiceCharge)} {post.currency}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  El cargo de servicio ayuda a mantener nuestra plataforma segura y funcionando correctamente.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedRange.nights} noches - Fechas: {selectedRange.startDate.toLocaleDateString('es-AR')} a {selectedRange.endDate.toLocaleDateString('es-AR')}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
