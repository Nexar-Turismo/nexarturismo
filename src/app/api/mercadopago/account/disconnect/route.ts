import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';

/**
 * Disconnect MercadoPago account for a user
 * POST /api/mercadopago/account/disconnect
 * body: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 [MercadoPago Account] Disconnecting account for user:', userId);

    // Deactivate all MercadoPago accounts for this user
    await firebaseDB.mercadoPagoAccounts.deactivate(userId);

    console.log('✅ [MercadoPago Account] Account disconnected successfully');

    return NextResponse.json({
      success: true,
      message: 'MercadoPago account disconnected successfully'
    });

  } catch (error) {
    console.error('❌ [MercadoPago Account] Error disconnecting account:', error);
    return NextResponse.json(
      { 
        error: 'Failed to disconnect account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
