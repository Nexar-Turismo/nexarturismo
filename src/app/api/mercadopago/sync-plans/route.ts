import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';
import MercadoPagoPlansService from '@/services/mercadoPagoPlansService';

export async function POST(request: NextRequest) {
  try {
    // Get MercadoPago Suscripción credentials from environment variables
    const publicKey = process.env.NEXAR_SUSCRIPTIONS_PUBLIC_KEY;
    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
    
    if (!publicKey || !accessToken) {
      console.error('❌ [MercadoPago Sync Plans] Missing environment variables');
      return NextResponse.json({ 
        error: 'MercadoPago Suscripción credentials not configured. Please set NEXAR_SUSCRIPTIONS_PUBLIC_KEY and NEXAR_SUSCRIPTIONS_ACCESS_TOKEN environment variables.' 
      }, { status: 500 });
    }

    // Initialize MercadoPago plans service with Suscripción credentials
    const plansService = new MercadoPagoPlansService({
      id: 'subscription-account',
      accessToken: accessToken,
      publicKey: publicKey,
      userId: 'system',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'system'
    });

    // Sync all platform plans with MercadoPago
    const result = await plansService.syncAllPlatformPlans();

    console.log('✅ [MercadoPago Sync] Plans synchronized:', {
      success: result.success,
      errors: result.errors,
      total: result.results.length
    });

    return NextResponse.json({
      message: 'Plans synchronized successfully',
      success: result.success,
      errors: result.errors,
      results: result.results
    });

  } catch (error) {
    console.error('❌ [MercadoPago Sync] Error syncing plans:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'MercadoPago plans sync endpoint' });
}
