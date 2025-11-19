import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';

/**
 * List all plans from both Firebase and MercadoPago
 * GET /api/mercadopago/plans/list
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [MercadoPago Plans List] Fetching all plans');

    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'MercadoPago access token not configured' },
        { status: 500 }
      );
    }

    // Get all plans from Firebase
    const firebasePlans = await firebaseDB.plans.getAll();
    console.log(`✅ [MercadoPago Plans List] Found ${firebasePlans.length} plans in Firebase`);

    // Get all plans from MercadoPago
    let mercadoPagoPlans: any[] = [];
    try {
      const response = await fetch('https://api.mercadopago.com/preapproval_plan/search', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        mercadoPagoPlans = data.results || [];
        console.log(`✅ [MercadoPago Plans List] Found ${mercadoPagoPlans.length} plans in MercadoPago`);
      } else {
        console.warn('⚠️ [MercadoPago Plans List] Failed to fetch MercadoPago plans:', response.statusText);
      }
    } catch (error) {
      console.error('❌ [MercadoPago Plans List] Error fetching MercadoPago plans:', error);
    }

    // Validate each Firebase plan against MercadoPago
    const validatedPlans = await Promise.all(firebasePlans.map(async (plan) => {
      let mercadoPagoStatus = 'not_synced';
      let mercadoPagoExists = false;
      let mercadoPagoPlanData = null;

      if (plan.mercadoPagoPlanId) {
        // Check if plan exists in MercadoPago
        try {
          const response = await fetch(`https://api.mercadopago.com/preapproval_plan/${plan.mercadoPagoPlanId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            mercadoPagoPlanData = await response.json();
            mercadoPagoExists = true;
            mercadoPagoStatus = mercadoPagoPlanData.status || 'active';
          } else if (response.status === 404) {
            mercadoPagoStatus = 'not_found';
          } else {
            mercadoPagoStatus = 'error';
          }
        } catch (error) {
          mercadoPagoStatus = 'error';
          console.error(`❌ [MercadoPago Plans List] Error checking plan ${plan.id}:`, error);
        }
      }

      return {
        firebase: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          billingCycle: plan.billingCycle,
          mercadoPagoPlanId: plan.mercadoPagoPlanId,
          isActive: plan.isActive
        },
        mercadoPago: mercadoPagoPlanData ? {
          id: mercadoPagoPlanData.id,
          status: mercadoPagoPlanData.status,
          reason: mercadoPagoPlanData.reason,
          auto_recurring: mercadoPagoPlanData.auto_recurring,
          init_point: mercadoPagoPlanData.init_point
        } : null,
        validation: {
          exists: mercadoPagoExists,
          status: mercadoPagoStatus,
          needsSync: !plan.mercadoPagoPlanId || !mercadoPagoExists,
          message: getMercadoPagoStatusMessage(mercadoPagoStatus, mercadoPagoExists)
        }
      };
    }));

    const summary = {
      total: validatedPlans.length,
      synced: validatedPlans.filter(p => p.validation.exists).length,
      needsSync: validatedPlans.filter(p => p.validation.needsSync).length,
      notFound: validatedPlans.filter(p => p.validation.status === 'not_found').length
    };

    console.log('📊 [MercadoPago Plans List] Summary:', summary);

    return NextResponse.json({
      success: true,
      summary,
      plans: validatedPlans,
      mercadoPagoPlans: mercadoPagoPlans.map(p => ({
        id: p.id,
        status: p.status,
        reason: p.reason,
        auto_recurring: p.auto_recurring
      })),
      actions: {
        syncAllPlans: '/api/mercadopago/sync-plans',
        syncSinglePlan: '/api/mercadopago/sync-plan'
      }
    });

  } catch (error) {
    console.error('❌ [MercadoPago Plans List] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to list plans',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Get status message for MercadoPago plan
 */
function getMercadoPagoStatusMessage(status: string, exists: boolean): string {
  if (!exists && status === 'not_synced') {
    return '⚠️ Plan not synced with MercadoPago. Click "Sync Plans" to create it.';
  }
  
  if (!exists && status === 'not_found') {
    return '❌ Plan ID exists in Firebase but not found in MercadoPago. Re-sync required.';
  }
  
  if (status === 'error') {
    return '❌ Error checking plan status in MercadoPago.';
  }
  
  if (exists && status === 'active') {
    return '✅ Plan is active and ready to use.';
  }
  
  if (exists && status === 'inactive') {
    return '⏸️ Plan exists but is inactive in MercadoPago.';
  }
  
  return `ℹ️ Status: ${status}`;
}

