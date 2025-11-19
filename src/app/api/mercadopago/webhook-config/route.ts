import { NextRequest, NextResponse } from 'next/server';

/**
 * Check webhook configuration and provide debugging info
 * GET /api/mercadopago/webhook-config
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [Webhook Config] Checking webhook configuration');
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asia-forworn-willena.ngrok-free.dev';
    const webhookUrl = `${baseUrl}/api/mercadopago/subscription-webhook`;
    
    // Check if webhook URL is accessible
    let webhookAccessible = false;
    let webhookResponse = null;
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'WebhookConfigChecker/1.0'
        }
      });
      
      webhookAccessible = response.ok;
      webhookResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      console.log('✅ [Webhook Config] Webhook URL is accessible:', webhookResponse);
    } catch (error) {
      console.error('❌ [Webhook Config] Webhook URL not accessible:', error);
      webhookResponse = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    const config = {
      environment: process.env.NODE_ENV,
      baseUrl: baseUrl,
      webhookUrl: webhookUrl,
      webhookAccessible: webhookAccessible,
      webhookResponse: webhookResponse,
      environmentVariables: {
        hasNexarSubscriptionsPublicKey: !!process.env.NEXAR_SUSCRIPTIONS_PUBLIC_KEY,
        hasNexarSubscriptionsAccessToken: !!process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN,
        hasNexarMarketplacePublicKey: !!process.env.NEXAR_MARKETPLACE_PUBLIC_KEY,
        hasNexarMarketplaceAccessToken: !!process.env.NEXAR_MARKETPLACE_ACCESS_TOKEN,
        hasNexarMarketplaceAppId: !!process.env.NEXAR_MARKETPLACE_APP_ID,
        hasNexarMarketplaceClientSecret: !!process.env.NEXAR_MARKETPLACE_CLIENT_SECRET,
        hasNextPublicBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('🔧 [Webhook Config] Configuration check completed:', config);
    
    return NextResponse.json(config);
    
  } catch (error) {
    console.error('❌ [Webhook Config] Error:', error);
    return NextResponse.json(
      { error: 'Configuration check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
