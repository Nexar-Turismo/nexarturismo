import { NextRequest, NextResponse } from 'next/server';
import mercadoPagoMarketplaceService from '@/services/mercadoPagoMarketplaceService';

/**
 * Connect user's MercadoPago account for marketplace
 * POST /api/mercadopago/marketplace/connect
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      mercadoPagoUserId, 
      mercadoPagoAccessToken, 
      mercadoPagoPublicKey 
    } = body;

    if (!userId || !mercadoPagoUserId || !mercadoPagoAccessToken || !mercadoPagoPublicKey) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, mercadoPagoUserId, mercadoPagoAccessToken, mercadoPagoPublicKey' 
      }, { status: 400 });
    }

    console.log('🔗 [MercadoPago Marketplace] Connecting user account:', {
      userId,
      mercadoPagoUserId,
      hasAccessToken: !!mercadoPagoAccessToken,
      hasPublicKey: !!mercadoPagoPublicKey
    });

    // Check if user already has an active connection
    const existingConnection = await mercadoPagoMarketplaceService.getUserMarketplaceConnection(userId);
    if (existingConnection) {
      console.log('⚠️ [MercadoPago Marketplace] User already has active connection:', existingConnection.id);
      return NextResponse.json({
        success: true,
        connectionId: existingConnection.id,
        message: 'User already has an active marketplace connection'
      });
    }

    // Save the marketplace connection
    const connectionId = await mercadoPagoMarketplaceService.saveMarketplaceConnection({
      userId,
      mercadoPagoUserId,
      mercadoPagoAccessToken,
      mercadoPagoPublicKey,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedBy: userId
    });

    console.log('✅ [MercadoPago Marketplace] Connection created successfully:', connectionId);

    return NextResponse.json({
      success: true,
      connectionId,
      message: 'MercadoPago Marketplace connection established successfully'
    });

  } catch (error) {
    console.error('❌ [MercadoPago Marketplace] Connection error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to connect MercadoPago account',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'MercadoPago Marketplace connection endpoint' });
}
