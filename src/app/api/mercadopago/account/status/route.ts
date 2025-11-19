import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';
import { mercadoPagoOAuthService } from '@/services/mercadoPagoOAuthService';

/**
 * Check MercadoPago account status for a user
 * GET /api/mercadopago/account/status
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

    console.log('🔍 [MercadoPago Account] Checking account status for user:', userId);

    // Get MercadoPago account from database
    const account = await firebaseDB.mercadoPagoAccounts.getByUserId(userId);

    if (!account) {
      return NextResponse.json({
        hasAccount: false,
        isActive: false,
        message: 'No MercadoPago account connected'
      });
    }

    // Validate if the access token is still valid
    const isTokenValid = await mercadoPagoOAuthService.validateToken(account.accessToken);

    if (!isTokenValid) {
      console.log('⚠️ [MercadoPago Account] Token expired, attempting refresh');
      
      try {
        // Try to refresh the token
        if (account.refreshToken) {
          const refreshedToken = await mercadoPagoOAuthService.refreshAccessToken(account.refreshToken);
          
          // Update account with new token
          await firebaseDB.mercadoPagoAccounts.update(account.id, {
            accessToken: refreshedToken.access_token,
            refreshToken: refreshedToken.refresh_token || account.refreshToken,
            expiresAt: refreshedToken.expires_in ? 
              new Date(Date.now() + refreshedToken.expires_in * 1000) : 
              undefined,
          });

          console.log('✅ [MercadoPago Account] Token refreshed successfully');
          
          return NextResponse.json({
            hasAccount: true,
            isActive: true,
            isTokenValid: true,
            account: {
              id: account.id,
              mercadoPagoUserId: account.mercadoPagoUserId,
              nickname: account.userInfo?.nickname,
              email: account.userInfo?.email,
              country: account.userInfo?.country_id,
              scope: account.scope,
              createdAt: account.createdAt,
              updatedAt: account.updatedAt,
            }
          });
        } else {
          // No refresh token available, mark as inactive
          await firebaseDB.mercadoPagoAccounts.update(account.id, {
            isActive: false,
          });

          return NextResponse.json({
            hasAccount: true,
            isActive: false,
            isTokenValid: false,
            message: 'MercadoPago account token expired and cannot be refreshed'
          });
        }
      } catch (refreshError) {
        console.error('❌ [MercadoPago Account] Token refresh failed:', refreshError);
        
        // Mark account as inactive
        await firebaseDB.mercadoPagoAccounts.update(account.id, {
          isActive: false,
        });

        return NextResponse.json({
          hasAccount: true,
          isActive: false,
          isTokenValid: false,
          message: 'MercadoPago account token expired and refresh failed'
        });
      }
    }

    console.log('✅ [MercadoPago Account] Account is active and valid');

    return NextResponse.json({
      hasAccount: true,
      isActive: true,
      isTokenValid: true,
      account: {
        id: account.id,
        mercadoPagoUserId: account.mercadoPagoUserId,
        nickname: account.userInfo?.nickname,
        email: account.userInfo?.email,
        country: account.userInfo?.country_id,
        scope: account.scope,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      }
    });

  } catch (error) {
    console.error('❌ [MercadoPago Account] Error checking account status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check account status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
