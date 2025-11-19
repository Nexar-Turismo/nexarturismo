import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';
import MercadoPagoPlansService from '@/services/mercadoPagoPlansService';

/**
 * Sync a single plan with MercadoPago
 * POST /api/mercadopago/sync-plan
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    console.log('🔄 [MercadoPago Sync Plan] Starting sync for plan:', planId);

    // Get MercadoPago Suscripción credentials from environment variables
    const publicKey = process.env.NEXAR_SUSCRIPTIONS_PUBLIC_KEY;
    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
    
    console.log('🔑 [MercadoPago Sync Plan] Credentials check:', {
      hasPublicKey: !!publicKey,
      hasAccessToken: !!accessToken,
      publicKeyPrefix: publicKey?.substring(0, 15) + '...',
      accessTokenPrefix: accessToken?.substring(0, 15) + '...'
    });
    
    if (!publicKey || !accessToken) {
      console.error('❌ [MercadoPago Sync Plan] Missing environment variables');
      return NextResponse.json(
        { error: 'MercadoPago Suscripción credentials not configured. Please set NEXAR_SUSCRIPTIONS_PUBLIC_KEY and NEXAR_SUSCRIPTIONS_ACCESS_TOKEN environment variables.' },
        { status: 500 }
      );
    }

    // Get the plan data from Firebase with timeout
    let plans;
    try {
      plans = await Promise.race([
        firebaseDB.plans.getAll(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Firebase timeout')), 5000)
        )
      ]);
    } catch (error) {
      console.error('❌ [MercadoPago Sync Plan] Error getting plans:', error);
      return NextResponse.json(
        { error: 'Failed to get plan data from Firebase. Please check Firebase connection.' },
        { status: 500 }
      );
    }

    const plan = plans.find(p => p.id === planId);

    if (!plan) {
      console.error('❌ [MercadoPago Sync Plan] Plan not found:', planId);
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Initialize MercadoPago Plans Service with Suscripción credentials
    const mpService = new MercadoPagoPlansService({
      id: 'subscription-account',
      accessToken: accessToken,
      publicKey: publicKey,
      userId: 'system',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'system'
    });

    // Convert billing cycle to MercadoPago format
    const frequencyMap: Record<string, number> = {
      daily: 1,
      weekly: 7,
      monthly: 1,
      yearly: 12
    };

    const frequencyTypeMap: Record<string, 'days' | 'months'> = {
      daily: 'days',
      weekly: 'days',
      monthly: 'months',
      yearly: 'months'
    };

    const frequency = frequencyMap[plan.billingCycle] || 1;
    const frequencyType = frequencyTypeMap[plan.billingCycle] || 'months';

    // Get base URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asia-forworn-willena.ngrok-free.dev';
    
    // Ensure URL is valid
    let backUrl: string;
    try {
      const url = new URL(baseUrl);
      backUrl = `${url.origin}/subscription/complete`;
    } catch {
      // Fallback to ngrok URL if invalid (MercadoPago doesn't accept localhost)
      backUrl = 'https://asia-forworn-willena.ngrok-free.dev/subscription/complete';
      console.warn('⚠️ NEXT_PUBLIC_BASE_URL is invalid, using ngrok fallback');
    }

    // Prepare plan data for MercadoPago
    const mercadoPagoPlanData = {
      reason: `Suscripción: ${plan.name}`,
      auto_recurring: {
        frequency: frequency,
        frequency_type: frequencyType,
        transaction_amount: plan.price,
        currency_id: plan.currency
      },
      back_url: backUrl,
      external_reference: plan.id,
    };

    console.log('📋 [MercadoPago Sync Plan] Plan data to send:', {
      reason: mercadoPagoPlanData.reason,
      frequency: mercadoPagoPlanData.auto_recurring.frequency,
      frequencyType: mercadoPagoPlanData.auto_recurring.frequency_type,
      amount: mercadoPagoPlanData.auto_recurring.transaction_amount,
      currency: mercadoPagoPlanData.auto_recurring.currency_id,
      backUrl: mercadoPagoPlanData.back_url
    });

    let mercadoPagoPlan;

    // Check if plan already exists in MercadoPago
    if (plan.mercadoPagoPlanId) {
      try {
        // Try to update existing plan
        console.log('📝 [MercadoPago Sync Plan] Updating existing plan:', plan.mercadoPagoPlanId);
        mercadoPagoPlan = await mpService.updatePlan(plan.mercadoPagoPlanId, mercadoPagoPlanData);
        console.log('✅ [MercadoPago Sync Plan] Plan updated successfully');
      } catch (updateError) {
        // If update fails, try to create a new plan
        console.log('⚠️ [MercadoPago Sync Plan] Update failed, creating new plan');
        mercadoPagoPlan = await mpService.createPlan(mercadoPagoPlanData);
        console.log('✅ [MercadoPago Sync Plan] New plan created');
      }
    } else {
      // Create new plan
      console.log('➕ [MercadoPago Sync Plan] Creating new plan');
      mercadoPagoPlan = await mpService.createPlan(mercadoPagoPlanData);
      console.log('✅ [MercadoPago Sync Plan] Plan created successfully');
    }

    // Note: Firebase update is handled by the calling function (firebaseService.ts)
    // This prevents double-updates and race conditions

    console.log('📤 [MercadoPago Sync Plan] Returning response:', {
      success: true,
      mercadoPagoPlanId: mercadoPagoPlan.id,
      planId: planId,
      mercadoPagoPlanType: typeof mercadoPagoPlan,
      mercadoPagoPlanKeys: Object.keys(mercadoPagoPlan || {})
    });

    return NextResponse.json({
      success: true,
      mercadoPagoPlanId: mercadoPagoPlan.id,
      message: 'Plan synced successfully with MercadoPago'
    });

  } catch (error) {
    console.error('❌ [MercadoPago Sync Plan] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync plan with MercadoPago',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

