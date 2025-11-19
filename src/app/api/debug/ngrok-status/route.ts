import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple ngrok status checker
 * GET /api/debug/ngrok-status
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Ngrok Status] Checking ngrok status');
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asia-forworn-willena.ngrok-free.dev';
    
    // Test 1: Check if ngrok is running locally
    let ngrokLocalStatus = null;
    try {
      const ngrokResponse = await fetch('http://localhost:4040/api/tunnels', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (ngrokResponse.ok) {
        const ngrokData = await ngrokResponse.json();
        ngrokLocalStatus = {
          running: true,
          tunnels: ngrokData.tunnels || [],
          publicUrl: ngrokData.tunnels?.[0]?.public_url || null,
          configUrl: ngrokData.tunnels?.[0]?.config?.addr || null
        };
      }
    } catch (error) {
      ngrokLocalStatus = {
        running: false,
        error: 'Cannot connect to ngrok API on localhost:4040'
      };
    }
    
    // Test 2: Check if our public URL is accessible
    let publicUrlStatus = null;
    try {
      const response = await fetch(`${baseUrl}/api/mercadopago/webhook`, {
        method: 'GET',
        headers: {
          'User-Agent': 'NgrokStatusChecker/1.0'
        }
      });
      
      publicUrlStatus = {
        accessible: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: `${baseUrl}/api/mercadopago/webhook`
      };
    } catch (error) {
      publicUrlStatus = {
        accessible: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        url: `${baseUrl}/api/mercadopago/webhook`
      };
    }
    
    const status = {
      timestamp: new Date().toISOString(),
      baseUrl: baseUrl,
      ngrokLocalStatus: ngrokLocalStatus,
      publicUrlStatus: publicUrlStatus,
      recommendations: generateNgrokRecommendations(ngrokLocalStatus, publicUrlStatus, baseUrl)
    };
    
    console.log('🔍 [Ngrok Status] Status check complete:', status);
    
    return NextResponse.json(status);
    
  } catch (error) {
    console.error('❌ [Ngrok Status] Error:', error);
    return NextResponse.json(
      { error: 'Status check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Generate ngrok-specific recommendations
 */
function generateNgrokRecommendations(ngrokLocalStatus: any, publicUrlStatus: any, baseUrl: string): string[] {
  const recommendations = [];
  
  if (!ngrokLocalStatus?.running) {
    recommendations.push('❌ Ngrok is not running locally. Start it with: ngrok http 3000');
    recommendations.push('💡 Make sure your Next.js app is running on port 3000');
  } else {
    recommendations.push('✅ Ngrok is running locally');
    
    if (ngrokLocalStatus.publicUrl && ngrokLocalStatus.publicUrl !== baseUrl) {
      recommendations.push(`⚠️ URL mismatch! Ngrok shows: ${ngrokLocalStatus.publicUrl}, but app uses: ${baseUrl}`);
      recommendations.push('💡 Update NEXT_PUBLIC_BASE_URL environment variable');
    }
  }
  
  if (!publicUrlStatus?.accessible) {
    recommendations.push('❌ Public URL is not accessible from external sources');
    recommendations.push('💡 Check if ngrok tunnel is active and stable');
  } else {
    recommendations.push('✅ Public URL is accessible');
  }
  
  if (baseUrl.includes('ngrok-free.dev')) {
    recommendations.push('⚠️ Using ngrok free tier - URLs change on restart');
    recommendations.push('💡 Consider ngrok paid plan for stable URLs');
    recommendations.push('💡 Or restart ngrok and update NEXT_PUBLIC_BASE_URL');
  }
  
  recommendations.push('🔧 MercadoPago Webhook Configuration:');
  recommendations.push(`   URL: ${baseUrl}/api/mercadopago/webhook`);
  recommendations.push('   Events: preapproval, subscription_preapproval, payment');
  
  return recommendations;
}
