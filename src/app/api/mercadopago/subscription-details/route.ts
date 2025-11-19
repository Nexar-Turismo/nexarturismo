import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const preapprovalId = searchParams.get('preapproval_id');

    if (!preapprovalId) {
      return NextResponse.json(
        { error: 'preapproval_id is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [Subscription Details] Getting details for:', preapprovalId);

    // Get subscription details from MercadoPago
    const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('❌ [Subscription Details] MercadoPago API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to get subscription details from MercadoPago' },
        { status: response.status }
      );
    }

    const subscriptionData = await response.json();
    console.log('✅ [Subscription Details] Retrieved:', {
      id: subscriptionData.id,
      status: subscriptionData.status,
      reason: subscriptionData.reason
    });

    return NextResponse.json(subscriptionData);

  } catch (error) {
    console.error('❌ [Subscription Details] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
