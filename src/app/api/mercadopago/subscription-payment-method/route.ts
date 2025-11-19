import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';

/**
 * Get payment method from an existing MercadoPago subscription
 * GET /api/mercadopago/subscription-payment-method?subscriptionId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mercadoPagoSubscriptionId = searchParams.get('subscriptionId');

    if (!mercadoPagoSubscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [MP Payment Method] Fetching payment method for subscription:', mercadoPagoSubscriptionId);

    // Initialize MercadoPago
    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'MercadoPago credentials not configured' },
        { status: 500 }
      );
    }

    const mp = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
    const preapproval = new PreApproval(mp);

    // Get subscription details
    const subscription: any = await preapproval.get({ id: mercadoPagoSubscriptionId });

    console.log('📋 [MP Payment Method] Subscription data:', {
      id: subscription.id,
      status: subscription.status,
      hasCard: !!subscription.card_id,
      payerId: subscription.payer_id,
    });

    // Get payer email from Customer API
    let payerEmail = '';
    if (subscription.payer_id) {
      try {
        console.log('🔍 [MP Payment Method] Fetching customer email from Customer API:', subscription.payer_id);
        
        const customerResponse = await fetch(
          `https://api.mercadopago.com/v1/customers/${subscription.payer_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          payerEmail = customerData.email;
          
          console.log('✅ [MP Payment Method] Customer email retrieved:', {
            payerId: subscription.payer_id,
            email: payerEmail,
          });
        } else {
          console.warn('⚠️ [MP Payment Method] Failed to fetch customer email:', await customerResponse.text());
        }
      } catch (error) {
        console.error('❌ [MP Payment Method] Error fetching customer email:', error);
      }
    }

    // Extract payment method information
    const paymentMethodInfo = {
      cardId: subscription.card_id,
      paymentMethodId: subscription.payment_method_id,
      lastFourDigits: subscription.last_four_digits,
      firstSixDigits: subscription.first_six_digits,
      payerEmail: payerEmail, // Email from Customer API, not subscription
      payerId: subscription.payer_id,
    };

    console.log('✅ [MP Payment Method] Complete payment method info retrieved:', {
      ...paymentMethodInfo,
      cardId: paymentMethodInfo.cardId ? '***' + paymentMethodInfo.cardId.substring(paymentMethodInfo.cardId.length - 4) : 'N/A',
    });

    return NextResponse.json({
      success: true,
      paymentMethod: paymentMethodInfo,
    });

  } catch (error: any) {
    console.error('❌ [MP Payment Method] Error:', error);
    
    if (error.cause) {
      console.error('❌ [MP Payment Method] Error cause:', JSON.stringify(error.cause, null, 2));
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to get payment method',
        details: error.cause?.[0] || error,
      },
      { status: 500 }
    );
  }
}

