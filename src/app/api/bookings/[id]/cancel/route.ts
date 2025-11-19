import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';
import { calculateCancellationPenalty } from '@/lib/cancellationUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await request.json();
    const rawCancelledBy = body?.cancelledBy;
    const cancellationReason: string = body?.cancellationReason?.toString() ?? '';
    const cancelledBy = rawCancelledBy === 'owner' ? 'publisher' : rawCancelledBy;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    if (!cancelledBy || !['client', 'publisher'].includes(cancelledBy)) {
      return NextResponse.json(
        { error: 'cancelledBy debe ser "client" o "publisher"' },
        { status: 400 }
      );
    }

    const normalizedReason = cancellationReason.trim();

    if (!normalizedReason) {
      return NextResponse.json(
        { error: 'El motivo de cancelación es obligatorio' },
        { status: 400 }
      );
    }

    // Get booking data
    const booking = await firebaseDB.bookings.getById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    // Check if booking can be cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'La reserva ya está cancelada' },
        { status: 400 }
      );
    }

    if (booking.status === 'completed') {
      return NextResponse.json(
        { error: 'No se puede cancelar una reserva completada' },
        { status: 400 }
      );
    }

    if (booking.status === 'declined') {
      return NextResponse.json(
        { error: 'No se puede cancelar una reserva rechazada' },
        { status: 400 }
      );
    }

    // Only allow cancellation for specific statuses
    if (!['requested', 'pending_payment', 'paid'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'La reserva no puede ser cancelada en su estado actual' },
        { status: 400 }
      );
    }

    // Calculate penalty if cancelled by client
    let penaltyAmount = 0;
    if (cancelledBy === 'client' && booking.post.cancellationPolicies?.length > 0) {
      const penalty = calculateCancellationPenalty(
        booking.post.cancellationPolicies,
        booking.totalAmount,
        new Date(booking.startDate)
      );
      penaltyAmount = penalty.penaltyAmount;
    }

    // Update booking status
    await firebaseDB.bookings.updateStatus(bookingId, 'cancelled', {
      cancelledAt: new Date(),
      cancelledBy,
      cancellationReason: normalizedReason,
      penaltyAmount
    });

    // Create notifications
    const notificationType = cancelledBy === 'client' 
      ? 'booking_cancelled_by_client' 
      : 'booking_cancelled_by_owner';

    // Notify the other party
    const otherPartyId = cancelledBy === 'client' ? booking.ownerId : booking.clientId;
    const otherPartyName = cancelledBy === 'client' ? booking.client.name : booking.owner.name;
    
    await firebaseDB.notifications.create({
      userId: otherPartyId,
      type: notificationType,
      title: 'Reserva Cancelada',
      message: `${otherPartyName} ha cancelado la reserva para "${booking.post.title}". Motivo: ${normalizedReason}.${penaltyAmount > 0 ? ` Penalización aplicada: ${penaltyAmount} ${booking.currency}.` : ''}`,
      isRead: false,
      data: {
        bookingId,
        postId: booking.postId,
        cancelledBy,
        penaltyAmount,
        cancellationReason: normalizedReason
      }
    });

    // Notify the person who cancelled (for confirmation)
    const cancellerId = cancelledBy === 'client' ? booking.clientId : booking.ownerId;
    const cancellerName = cancelledBy === 'client' ? booking.client.name : booking.owner.name;
    
    await firebaseDB.notifications.create({
      userId: cancellerId,
      type: notificationType,
      title: 'Cancelación Confirmada',
      message: `Has cancelado exitosamente la reserva para "${booking.post.title}". Motivo: ${normalizedReason}.${penaltyAmount > 0 ? ` Penalización aplicada: ${penaltyAmount} ${booking.currency}.` : ''}`,
      isRead: false,
      data: {
        bookingId,
        postId: booking.postId,
        cancelledBy,
        penaltyAmount,
        cancellationReason: normalizedReason
      }
    });

    return NextResponse.json({ 
      success: true, 
      penaltyAmount,
      message: 'Reserva cancelada exitosamente' 
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
