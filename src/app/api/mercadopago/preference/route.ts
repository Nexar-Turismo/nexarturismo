import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';
import MercadoPagoService from '@/services/mercadoPagoService';
import { calculateCurrentPrice } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, returnUrl } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Get booking details
    const booking = await firebaseDB.bookings.getById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking is in pending payment status
    if (booking.status !== 'pending_payment') {
      return NextResponse.json({ error: 'Booking is not pending payment' }, { status: 400 });
    }

    const publisherAccount = await firebaseDB.mercadoPagoAccounts.getByUserId(booking.ownerId);
    if (!publisherAccount || !publisherAccount.accessToken) {
      console.error('❌ [MercadoPago API] Publisher MercadoPago account not found or inactive', {
        ownerId: booking.ownerId,
        bookingId: booking.id
      });
      return NextResponse.json(
        { error: 'No se encontró una cuenta de Mercado Pago activa para el publicador de esta reserva.' },
        { status: 400 }
      );
    }

    const marketplacePublicKey = process.env.NEXAR_MARKETPLACE_PUBLIC_KEY || '';
    const publisherPublicKey = publisherAccount.publicKey || marketplacePublicKey;

    // Initialize MercadoPago service with publisher credentials
    const mpService = new MercadoPagoService({
      id: publisherAccount.id,
      accessToken: publisherAccount.accessToken,
      publicKey: publisherPublicKey,
      createdAt: publisherAccount.createdAt,
      updatedAt: publisherAccount.updatedAt,
      isActive: publisherAccount.isActive ?? true,
      updatedBy: publisherAccount.updatedBy || booking.ownerId,
    });

    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    const millisecondsPerNight = 1000 * 60 * 60 * 24;
    const nights = Math.max(
      0,
      Math.ceil((endDate.getTime() - startDate.getTime()) / millisecondsPerNight)
    );

    let subtotal = 0;
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const pricing = calculateCurrentPrice(booking.post, currentDate);
      subtotal += pricing.price;
    }

    subtotal = Number(subtotal.toFixed(2));

    const defaultServiceFee = Number((booking.totalAmount * 0.1).toFixed(2));
    const calculatedServiceFee = Number((booking.totalAmount - subtotal).toFixed(2));
    const marketplaceFee = Number(
      (calculatedServiceFee >= 0 ? calculatedServiceFee : defaultServiceFee).toFixed(2)
    );

    const clientName = booking.client?.name || booking.clientData?.name || 'Cliente';
    const clientEmail = booking.client?.email || booking.clientData?.email || 'cliente@example.com';
    const marketplaceId = process.env.NEXAR_MARKETPLACE_APP_ID || undefined;

    const baseReturnUrl = returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/complete`;
    let resolvedReturnUrl: string;
    try {
      const returnUrlObject = new URL(baseReturnUrl);
      returnUrlObject.searchParams.set('context', 'booking');
      returnUrlObject.searchParams.set('bookingId', booking.id);
      resolvedReturnUrl = returnUrlObject.toString();
    } catch (urlError) {
      console.warn('⚠️ [MercadoPago API] Invalid returnUrl provided, falling back to default', {
        providedReturnUrl: returnUrl,
        error: urlError instanceof Error ? urlError.message : urlError
      });
      const fallbackUrl = new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/payment/complete`);
      fallbackUrl.searchParams.set('context', 'booking');
      fallbackUrl.searchParams.set('bookingId', booking.id);
      resolvedReturnUrl = fallbackUrl.toString();
    }

    // Create preference
    const preference = await mpService.createBookingPreference({
      bookingId: booking.id,
      ownerId: booking.ownerId,
      postTitle: booking.post.title,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      clientName,
      clientEmail,
      returnUrl: resolvedReturnUrl,
      webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/webhook`,
      marketplaceFee,
      marketplaceId,
    });

    console.log('✅ [MercadoPago API] Preference created:', {
      preferenceId: preference.id,
      bookingId: booking.id,
      amount: booking.totalAmount
    });

    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      publicKey: publisherPublicKey,
    });

  } catch (error) {
    console.error('❌ [MercadoPago API] Error creating preference:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'MercadoPago preference endpoint' });
}
