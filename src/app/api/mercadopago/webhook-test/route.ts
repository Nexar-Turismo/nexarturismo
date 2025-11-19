import { NextRequest, NextResponse } from 'next/server';

/**
 * Test webhook URL accessibility and configuration
 * GET /api/mercadopago/webhook-test
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [Webhook Test] Testing webhook configuration');
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asia-forworn-willena.ngrok-free.dev';
    const webhookUrl = `${baseUrl}/api/mercadopago/webhook`;
    
    // Test webhook accessibility
    let webhookTest = {
      accessible: false,
      status: 0,
      statusText: '',
      response: null,
      error: null
    };
    
    try {
      console.log('🧪 [Webhook Test] Testing webhook URL:', webhookUrl);
      
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'WebhookTest/1.0',
          'Content-Type': 'application/json'
        }
      });
      
      webhookTest = {
        accessible: response.ok,
        status: response.status,
        statusText: response.statusText,
        response: await response.text(),
        error: null
      };
      
      console.log('✅ [Webhook Test] Webhook test result:', webhookTest);
    } catch (error) {
      webhookTest.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [Webhook Test] Webhook test failed:', error);
    }
    
    // Test with different webhook URLs
    const alternativeWebhooks = [
      `${baseUrl}/api/mercadopago/subscription-webhook`,
      `${baseUrl}/api/mercadopago/webhook`,
      `${baseUrl}/api/mercadopago/test-webhook`
    ];
    
    const webhookTests = [];
    for (const url of alternativeWebhooks) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'WebhookTest/1.0'
          }
        });
        
        webhookTests.push({
          url: url,
          accessible: response.ok,
          status: response.status,
          statusText: response.statusText
        });
      } catch (error) {
        webhookTests.push({
          url: url,
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const testResult = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      baseUrl: baseUrl,
      primaryWebhookTest: webhookTest,
      allWebhookTests: webhookTests,
      environmentVariables: {
        hasNexarSubscriptionsPublicKey: !!process.env.NEXAR_SUSCRIPTIONS_PUBLIC_KEY,
        hasNexarSubscriptionsAccessToken: !!process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN,
        hasNextPublicBaseUrl: !!process.env.NEXT_PUBLIC_BASE_URL,
        nextPublicBaseUrl: process.env.NEXT_PUBLIC_BASE_URL
      },
      mercadopagoConfiguration: {
        webhookUrl: webhookUrl,
        backUrl: `${baseUrl}/payment/complete`,
        instructions: {
          step1: 'Go to MercadoPago Dashboard > Developers > Webhooks',
          step2: `Set webhook URL to: ${webhookUrl}`,
          step3: 'Enable events: preapproval, subscription_preapproval, payment',
          step4: 'Test the webhook by creating a subscription'
        }
      }
    };
    
    console.log('🧪 [Webhook Test] Complete test result:', testResult);
    
    return NextResponse.json(testResult);
    
  } catch (error) {
    console.error('❌ [Webhook Test] Error:', error);
    return NextResponse.json(
      { error: 'Webhook test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Simulate a webhook call for testing
 * POST /api/mercadopago/webhook-test
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [Webhook Test] Simulating webhook call');
    
    const body = await request.json();
    console.log('🧪 [Webhook Test] Simulated webhook data:', body);
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asia-forworn-willena.ngrok-free.dev';
    const webhookUrl = `${baseUrl}/api/mercadopago/webhook`;
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WebhookTest/1.0'
        },
        body: JSON.stringify(body)
      });
      
      const result = await response.text();
      
      console.log('🧪 [Webhook Test] Webhook simulation result:', {
        status: response.status,
        statusText: response.statusText,
        body: result
      });
      
      return NextResponse.json({
        message: 'Webhook simulation completed',
        webhookUrl: webhookUrl,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: result
        }
      });
      
    } catch (fetchError) {
      console.error('❌ [Webhook Test] Error calling webhook:', fetchError);
      return NextResponse.json({
        message: 'Webhook simulation failed',
        error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        webhookUrl: webhookUrl
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ [Webhook Test] Error:', error);
    return NextResponse.json(
      { error: 'Webhook test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
