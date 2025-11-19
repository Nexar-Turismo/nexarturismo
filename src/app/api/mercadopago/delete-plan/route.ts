import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';
import MercadoPagoPlansService from '@/services/mercadoPagoPlansService';

/**
 * Delete a plan from MercadoPago
 * POST /api/mercadopago/delete-plan
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mercadoPagoPlanId } = body;

    if (!mercadoPagoPlanId) {
      return NextResponse.json({ error: 'MercadoPago Plan ID is required' }, { status: 400 });
    }

    console.log('🗑️ [MercadoPago Delete Plan] Deleting plan from MercadoPago:', mercadoPagoPlanId);

    // Get MercadoPago Suscripción credentials from environment variables
    const publicKey = process.env.NEXAR_SUSCRIPTIONS_PUBLIC_KEY;
    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
    
    if (!publicKey || !accessToken) {
      console.error('❌ [MercadoPago Delete Plan] Missing environment variables');
      return NextResponse.json(
        { error: 'MercadoPago Suscripción credentials not configured. Please set NEXAR_SUSCRIPTIONS_PUBLIC_KEY and NEXAR_SUSCRIPTIONS_ACCESS_TOKEN environment variables.' },
        { status: 500 }
      );
    }

    // Initialize MercadoPago Plans Service with Suscripción credentials
    const mpService = new MercadoPagoPlansService({
      id: 'subscription-account',
      accessToken: accessToken,
      publicKey: publicKey,
      userId: 'system',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'system'
    });

    // Delete the plan from MercadoPago
    await mpService.deletePlan(mercadoPagoPlanId);
    
    console.log('✅ [MercadoPago Delete Plan] Plan deleted successfully:', mercadoPagoPlanId);

    return NextResponse.json({
      success: true,
      message: 'Plan deleted successfully from MercadoPago'
    });

  } catch (error) {
    console.error('❌ [MercadoPago Delete Plan] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete plan from MercadoPago',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

