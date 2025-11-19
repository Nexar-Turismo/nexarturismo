import { NextRequest, NextResponse } from 'next/server';

/**
 * Comprehensive ngrok and webhook debugging tool
 * GET /api/debug/ngrok-webhook
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Ngrok Debug] Starting comprehensive webhook debugging');
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asia-forworn-willena.ngrok-free.dev';
    
    // Test 1: Check if ngrok URL is accessible from external sources
    const ngrokTests = [];
    
    // Test different endpoints
    const endpoints = [
      '/api/mercadopago/webhook',
      '/api/mercadopago/subscription-webhook', 
      '/api/mercadopago/webhook-test',
      '/api/mercadopago/webhook-config',
      '/payment/complete'
    ];
    
    for (const endpoint of endpoints) {
      const url = `${baseUrl}${endpoint}`;
      try {
        console.log(`🔍 [Ngrok Debug] Testing endpoint: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'NgrokDebug/1.0',
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        });
        
        ngrokTests.push({
          endpoint: endpoint,
          url: url,
          accessible: response.ok,
          status: response.status,
          statusText: response.statusText,
          responseTime: Date.now(),
          headers: Object.fromEntries(response.headers.entries())
        });
        
        console.log(`✅ [Ngrok Debug] ${endpoint}: ${response.status} ${response.statusText}`);
      } catch (error) {
        ngrokTests.push({
          endpoint: endpoint,
          url: url,
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        });
        
        console.error(`❌ [Ngrok Debug] ${endpoint}: ${error}`);
      }
    }
    
    // Test 2: Check ngrok status
    let ngrokStatus = null;
    try {
      console.log('🔍 [Ngrok Debug] Checking ngrok status via local API');
      const ngrokResponse = await fetch('http://localhost:4040/api/tunnels', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (ngrokResponse.ok) {
        const ngrokData = await ngrokResponse.json();
        ngrokStatus = {
          accessible: true,
          tunnels: ngrokData.tunnels || [],
          publicUrl: ngrokData.tunnels?.[0]?.public_url || null
        };
        console.log('✅ [Ngrok Debug] Ngrok status retrieved:', ngrokStatus);
      }
    } catch (error) {
      ngrokStatus = {
        accessible: false,
        error: error instanceof Error ? error.message : 'Cannot connect to ngrok API'
      };
      console.log('⚠️ [Ngrok Debug] Cannot access ngrok API (this is normal if ngrok is not running locally)');
    }
    
    // Test 3: External accessibility test
    let externalTest = null;
    try {
      console.log('🔍 [Ngrok Debug] Testing external accessibility');
      
      // Use a service to test if our URL is accessible from outside
      const externalTestUrl = `https://httpbin.org/get?url=${encodeURIComponent(baseUrl)}`;
      const externalResponse = await fetch(externalTestUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'NgrokDebug/1.0'
        }
      });
      
      if (externalResponse.ok) {
        const externalData = await externalResponse.json();
        externalTest = {
          accessible: true,
          response: externalData
        };
      }
    } catch (error) {
      externalTest = {
        accessible: false,
        error: error instanceof Error ? error.message : 'External test failed'
      };
    }
    
    // Test 4: MercadoPago webhook simulation
    let webhookSimulation = null;
    try {
      console.log('🔍 [Ngrok Debug] Simulating MercadoPago webhook call');
      
      const webhookUrl = `${baseUrl}/api/mercadopago/webhook`;
      const webhookPayload = {
        type: 'preapproval',
        action: 'created',
        data: {
          id: 'test-subscription-id'
        }
      };
      
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MercadoPago/1.0',
          'X-Forwarded-For': '181.28.0.1', // Simulate MercadoPago IP
          'X-Real-IP': '181.28.0.1'
        },
        body: JSON.stringify(webhookPayload)
      });
      
      const webhookResult = await webhookResponse.text();
      
      webhookSimulation = {
        url: webhookUrl,
        accessible: webhookResponse.ok,
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        response: webhookResult,
        headers: Object.fromEntries(webhookResponse.headers.entries())
      };
      
      console.log('✅ [Ngrok Debug] Webhook simulation result:', webhookSimulation);
    } catch (error) {
      webhookSimulation = {
        url: `${baseUrl}/api/mercadopago/webhook`,
        accessible: false,
        error: error instanceof Error ? error.message : 'Webhook simulation failed'
      };
      console.error('❌ [Ngrok Debug] Webhook simulation failed:', error);
    }
    
    const debugResult = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      baseUrl: baseUrl,
      ngrokTests: ngrokTests,
      ngrokStatus: ngrokStatus,
      externalTest: externalTest,
      webhookSimulation: webhookSimulation,
      recommendations: generateRecommendations(ngrokTests, ngrokStatus, webhookSimulation),
      mercadopagoConfiguration: {
        webhookUrl: `${baseUrl}/api/mercadopago/webhook`,
        backUrl: `${baseUrl}/payment/complete`,
        instructions: {
          step1: 'Ensure ngrok is running and accessible',
          step2: `Configure webhook URL in MercadoPago: ${baseUrl}/api/mercadopago/webhook`,
          step3: 'Enable events: preapproval, subscription_preapproval, payment',
          step4: 'Test with a real subscription'
        }
      }
    };
    
    console.log('🔍 [Ngrok Debug] Complete debug result:', debugResult);
    
    return NextResponse.json(debugResult);
    
  } catch (error) {
    console.error('❌ [Ngrok Debug] Error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(ngrokTests: any[], ngrokStatus: any, webhookSimulation: any): string[] {
  const recommendations = [];
  
  // Check if any endpoints are not accessible
  const failedTests = ngrokTests.filter(test => !test.accessible);
  if (failedTests.length > 0) {
    recommendations.push(`❌ ${failedTests.length} endpoints are not accessible: ${failedTests.map(t => t.endpoint).join(', ')}`);
  }
  
  // Check ngrok status
  if (ngrokStatus && !ngrokStatus.accessible) {
    recommendations.push('❌ Cannot access ngrok API - ensure ngrok is running with: ngrok http 3000');
  }
  
  // Check webhook simulation
  if (webhookSimulation && !webhookSimulation.accessible) {
    recommendations.push('❌ Webhook endpoint is not accessible - check ngrok tunnel');
  }
  
  // Check if ngrok URL is stable
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asia-forworn-willena.ngrok-free.dev';
  if (baseUrl.includes('ngrok-free.dev')) {
    recommendations.push('⚠️ Using ngrok free tier - URLs change on restart. Consider ngrok paid plan for stable URLs.');
  }
  
  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('✅ All tests passed! Your ngrok setup looks good.');
  }
  
  recommendations.push('💡 To configure MercadoPago webhook:');
  recommendations.push('   1. Go to MercadoPago Dashboard > Developers > Webhooks');
  recommendations.push(`   2. Set webhook URL to: ${baseUrl}/api/mercadopago/webhook`);
  recommendations.push('   3. Enable events: preapproval, subscription_preapproval, payment');
  recommendations.push('   4. Test with a real subscription');
  
  return recommendations;
}
