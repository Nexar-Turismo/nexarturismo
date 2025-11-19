import { NextRequest, NextResponse } from 'next/server';
import { mercadoPagoOAuthService } from '@/services/mercadoPagoOAuthService';
import { firebaseDB } from '@/services/firebaseService';

/**
 * Handle MercadoPago OAuth callback
 * GET /api/mercadopago/oauth/callback
 * query: { code: string, state: string }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('❌ [MercadoPago OAuth] OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?oauth_error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      console.error('❌ [MercadoPago OAuth] Missing code or state');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?oauth_error=missing_parameters`
      );
    }

    // Extract userId from state
    const userIdMatch = state.match(/^user_(\w+)_/);
    if (!userIdMatch) {
      console.error('❌ [MercadoPago OAuth] Invalid state format:', state);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?oauth_error=invalid_state`
      );
    }

    const userId = userIdMatch[1];
    console.log('🔄 [MercadoPago OAuth] Processing callback for user:', userId);

    // Exchange code for access token
    const tokenResponse = await mercadoPagoOAuthService.exchangeCodeForToken(code, state);
    
    // Get user information from MercadoPago
    const userInfo = await mercadoPagoOAuthService.getUserInfo(tokenResponse.access_token);

    console.log('✅ [MercadoPago OAuth] Token exchange successful:', {
      userId,
      mercadoPagoUserId: tokenResponse.user_id,
      scope: tokenResponse.scope
    });

    // Deactivate any existing accounts for this user
    await firebaseDB.mercadoPagoAccounts.deactivate(userId);

    // Create new account record
    const accountData = {
      userId,
      mercadoPagoUserId: tokenResponse.user_id.toString(),
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_in ? 
        new Date(Date.now() + tokenResponse.expires_in * 1000) : 
        undefined,
      isActive: true,
      scope: tokenResponse.scope,
      userInfo: {
        id: userInfo.id,
        nickname: userInfo.nickname,
        email: userInfo.email,
        country_id: userInfo.country_id,
        site_id: userInfo.site_id,
      }
    };

    const accountId = await firebaseDB.mercadoPagoAccounts.create(accountData);

    console.log('✅ [MercadoPago OAuth] Account created successfully:', accountId);

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?oauth_success=true&account_id=${accountId}`
    );

  } catch (error) {
    console.error('❌ [MercadoPago OAuth] Error processing callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?oauth_error=${encodeURIComponent(
        error instanceof Error ? error.message : 'unknown_error'
      )}`
    );
  }
}
