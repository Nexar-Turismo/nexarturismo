import { NextRequest, NextResponse } from 'next/server';

/**
 * Test webhook endpoint for debugging
 * GET /api/mercadopago/test-webhook
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('type') || 'basic';
    
    console.log('🧪 [Webhook Test] Testing webhook endpoint:', { testType });
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asia-forworn-willena.ngrok-free.dev';
    
    const testData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      baseUrl: baseUrl,
      webhookUrl: `${baseUrl}/api/mercadopago/subscription-webhook`,
      testType: testType,
      headers: Object.fromEntries(request.headers.entries()),
      url: request.url
    };
    
    console.log('🧪 [Webhook Test] Test data:', testData);
    
    return NextResponse.json({
      message: 'Webhook test endpoint',
      ...testData
    });
    
  } catch (error) {
    console.error('❌ [Webhook Test] Error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Simulate webhook call for testing
 * POST /api/mercadopago/test-webhook
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [Webhook Test] Simulating webhook call');
    
    const body = await request.json();
    console.log('🧪 [Webhook Test] Simulated webhook data:', body);
    
    // Forward to actual webhook endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asia-forworn-willena.ngrok-free.dev';
    const webhookUrl = `${baseUrl}/api/mercadopago/subscription-webhook`;
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
      
      const result = await response.text();
      
      console.log('🧪 [Webhook Test] Webhook response:', {
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
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
