import { MercadoPagoConfig } from 'mercadopago';

export interface MercadoPagoAccount {
  id: string;
  userId: string;
  mercadoPagoUserId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MercadoPagoOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token?: string;
}

class MercadoPagoOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly baseUrl: string;

  constructor() {
    this.clientId = process.env.NEXAR_MARKETPLACE_APP_ID || '';
    this.clientSecret = process.env.NEXAR_MARKETPLACE_CLIENT_SECRET || '';
    this.baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    this.redirectUri = `${this.baseUrl}/api/mercadopago/oauth/callback`;

    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️ [MercadoPago OAuth] Missing credentials. OAuth will not work.');
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(userId: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      platform_id: 'mp',
      redirect_uri: this.redirectUri,
      state: state || `user_${userId}_${Date.now()}`
    });

    return `https://auth.mercadopago.com/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<MercadoPagoOAuthResponse> {
    try {
      const response = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MercadoPago OAuth] Token exchange failed:', response.status, errorText);
        throw new Error(`OAuth token exchange failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [MercadoPago OAuth] Token exchange successful');
      
      return data;
    } catch (error) {
      console.error('❌ [MercadoPago OAuth] Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<MercadoPagoOAuthResponse> {
    try {
      const response = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MercadoPago OAuth] Token refresh failed:', response.status, errorText);
        throw new Error(`OAuth token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [MercadoPago OAuth] Token refresh successful');
      
      return data;
    } catch (error) {
      console.error('❌ [MercadoPago OAuth] Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Get user information from MercadoPago
   */
  async getUserInfo(accessToken: string): Promise<any> {
    try {
      const response = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [MercadoPago OAuth] Get user info failed:', response.status, errorText);
        throw new Error(`Get user info failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [MercadoPago OAuth] User info retrieved');
      
      return data;
    } catch (error) {
      console.error('❌ [MercadoPago OAuth] Error getting user info:', error);
      throw error;
    }
  }

  /**
   * Validate if access token is still valid
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getUserInfo(accessToken);
      return true;
    } catch (error) {
      console.log('⚠️ [MercadoPago OAuth] Token validation failed:', error);
      return false;
    }
  }

  /**
   * Check if OAuth is properly configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}

export const mercadoPagoOAuthService = new MercadoPagoOAuthService();
