import { NextRequest, NextResponse } from 'next/server';
import mercadoPagoMarketplaceService from '@/services/mercadoPagoMarketplaceService';

/**
 * Validate publisher requirements for post creation
 * POST /api/mercadopago/marketplace/validate-publisher
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔍 [MercadoPago Marketplace] Validating publisher:', userId);

    // Validate publisher requirements
    const validation = await mercadoPagoMarketplaceService.validatePublisherForPostCreation(userId);

    console.log('📋 [MercadoPago Marketplace] Validation result:', {
      isValid: validation.isValid,
      hasActiveSubscription: validation.hasActiveSubscription,
      hasMarketplaceConnection: validation.hasMarketplaceConnection,
      postLimit: validation.postLimit,
      currentPostsCount: validation.currentPostsCount,
      remainingPosts: validation.remainingPosts,
      errorsCount: validation.errors.length
    });

    return NextResponse.json({
      success: true,
      validation
    });

  } catch (error) {
    console.error('❌ [MercadoPago Marketplace] Validation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to validate publisher',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'MercadoPago Marketplace publisher validation endpoint' });
}
