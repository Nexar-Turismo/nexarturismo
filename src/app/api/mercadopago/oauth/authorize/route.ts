import { NextRequest, NextResponse } from 'next/server';
import { mercadoPagoOAuthService } from '@/services/mercadoPagoOAuthService';

/**
 * Initiate MercadoPago OAuth flow
 * GET /api/mercadopago/oauth/authorize
 * query: { userId: string }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!mercadoPagoOAuthService.isConfigured()) {
      return NextResponse.json(
        { error: 'MercadoPago OAuth is not configured' },
        { status: 500 }
      );
    }

    console.log('🔄 [MercadoPago OAuth] Initiating OAuth flow for user:', userId);

    // Generate state parameter for security
    const state = `user_${userId}_${Date.now()}`;
    
    // Generate authorization URL
    const authUrl = mercadoPagoOAuthService.generateAuthUrl(userId, state);

    console.log('✅ [MercadoPago OAuth] Generated auth URL');

    return NextResponse.json({
      authUrl,
      state
    });

  } catch (error) {
    console.error('❌ [MercadoPago OAuth] Error initiating OAuth:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
