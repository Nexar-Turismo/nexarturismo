import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { firebaseDB } from '@/services/firebaseService';

/**
 * Create a subscription preference for MercadoPago Checkout Pro
 * POST /api/mercadopago/subscription-preference
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, userId, returnUrl } = body;

    if (!planId || !userId) {
      return NextResponse.json({ error: 'Plan ID and User ID are required' }, { status: 400 });
    }

    console.log('🛒 [MercadoPago Subscription] Creating preference for:', { planId, userId });

    // Get MercadoPago Subscriptions credentials from environment variables
    const publicKey = process.env.NEXAR_SUSCRIPTIONS_PUBLIC_KEY;
    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
    
    if (!publicKey || !accessToken) {
      console.error('❌ [MercadoPago Subscription] Missing environment variables');
      return NextResponse.json(
        { error: 'MercadoPago Subscriptions credentials not configured. Please set NEXAR_SUSCRIPTIONS_PUBLIC_KEY and NEXAR_SUSCRIPTIONS_ACCESS_TOKEN environment variables.' },
        { status: 500 }
      );
    }

    // Get the plan data from Firebase
    const plans = await firebaseDB.plans.getAll();
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get user data
    const user = await firebaseDB.users.getById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Initialize MercadoPago client
    const config = new MercadoPagoConfig({ 
      accessToken: accessToken,
      options: { timeout: 5000 }
    });
    const preference = new Preference(config);

    // Get base URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asia-forworn-willena.ngrok-free.dev';
    
    // Ensure URL is valid and remove trailing slash
    let validBaseUrl: string;
    try {
      const url = new URL(baseUrl);
      validBaseUrl = url.origin; // This removes trailing slash and gives us the clean base URL
      console.log('✅ [MercadoPago Subscription] Using base URL:', validBaseUrl);
    } catch (error) {
      // Fallback to ngrok URL if invalid (MercadoPago doesn't accept localhost)
      validBaseUrl = 'https://asia-forworn-willena.ngrok-free.dev';
      console.warn('⚠️ NEXT_PUBLIC_BASE_URL is invalid, using ngrok fallback:', baseUrl);
    }

    // Set up return URLs - always use production URL for MercadoPago compatibility
    const successUrl = `${validBaseUrl}/payment/complete`;
    const failureUrl = `${validBaseUrl}/payment/failed`;
    const pendingUrl = `${validBaseUrl}/payment/pending`;

    // Create preference data
    const preferenceData = {
      items: [
        {
          id: plan.id,
          title: `Suscripción ${plan.name}`,
          description: plan.description || `Plan ${plan.name} - ${plan.maxPosts} publicaciones, ${plan.maxBookings} reservas`,
          category_id: 'services',
          quantity: 1,
          currency_id: plan.currency || 'ARS',
          unit_price: plan.price,
        }
      ],
      payer: {
        name: user.name || 'Usuario',
        email: user.email,
        identification: {
          type: 'DNI',
          number: '12345678' // You might want to collect this from user
        }
      },
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 1
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl
      },
      auto_return: 'approved',
      notification_url: `${validBaseUrl}/api/mercadopago/subscription-webhook`,
      external_reference: `subscription_${planId}_${userId}`,
      metadata: {
        planId: plan.id,
        planName: plan.name,
        userId: user.id,
        userEmail: user.email,
        subscriptionType: 'plan_subscription'
      }
    };

    console.log('📋 [MercadoPago Subscription] Preference data:', {
      planName: plan.name,
      price: plan.price,
      currency: plan.currency,
      userEmail: user.email,
      successUrl: successUrl,
      failureUrl: failureUrl,
      pendingUrl: pendingUrl,
      notificationUrl: `${validBaseUrl}/api/mercadopago/subscription-webhook`
    });

    // Create the preference
    const result = await preference.create({ body: preferenceData });

    console.log('✅ [MercadoPago Subscription] Preference created:', {
      preferenceId: result.id,
      planName: plan.name,
      price: plan.price
    });

    return NextResponse.json({
      success: true,
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
      publicKey: publicKey,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        maxPosts: plan.maxPosts,
        maxBookings: plan.maxBookings
      }
    });

  } catch (error) {
    console.error('❌ [MercadoPago Subscription] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create subscription preference',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'MercadoPago subscription preference endpoint' });
}
