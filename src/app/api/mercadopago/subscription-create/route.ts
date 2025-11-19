// app/api/mercadopago/subscription-create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { firebaseDB } from '@/services/firebaseService';

/**
 * Create a user subscription (PreApproval) from an existing PreApprovalPlan
 * POST /api/mercadopago/subscription-create
 * body: { planId: string, userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      planId, 
      userId, 
      cardTokenId, 
      payerEmail, 
      isUpgrade = false,
      existingSubscriptionId  // For reusing payment method from existing subscription
    } = body ?? {};

    if (!planId || !userId) {
      return NextResponse.json(
        { error: 'Plan ID and User ID are required' },
        { status: 400 },
      );
    }

    // For plan upgrades, we need BOTH cardTokenId AND existingSubscriptionId
    // For new subscriptions, we need cardTokenId
    if (!cardTokenId) {
      return NextResponse.json(
        { error: 'Card token ID is required for all subscriptions' },
        { status: 400 },
      );
    }

    // Validate payerEmail only if NOT reusing payment method (will fetch from existing)
    if (!existingSubscriptionId && !payerEmail) {
      return NextResponse.json(
        { error: 'Payer email is required for new subscriptions' },
        { status: 400 }
      );
    }

    console.log('🔄 [MP Subscription] Create request:', { 
      planId, 
      userId, 
      cardTokenId: cardTokenId ? cardTokenId?.substring(0, 10) + '...' : 'N/A (reusing existing)', 
      payerEmail: payerEmail || 'Will fetch from existing subscription',
      isUpgrade,
      reusingPaymentMethod: !!existingSubscriptionId
    });

    // ---- ENV & SDK ---------------------------------------------------------
    const publicKey = process.env.NEXAR_SUSCRIPTIONS_PUBLIC_KEY;
    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;

    if (!publicKey || !accessToken) {
      console.error('❌ [MP Subscription] Missing MP env vars');
      return NextResponse.json(
        {
          error:
            'MercadoPago credentials not configured. Set NEXAR_SUSCRIPTIONS_PUBLIC_KEY and NEXAR_SUSCRIPTIONS_ACCESS_TOKEN.',
        },
        { status: 500 },
      );
    }

    const mp = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
    const preapproval = new PreApproval(mp);

    // ---- DATA: plan & user -------------------------------------------------
    const plans = await firebaseDB.plans.getAll();
    const plan = plans.find((p: any) => p.id === planId);

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    if (!plan.mercadoPagoPlanId) {
      console.error('❌ [MP Subscription] Plan without mercadoPagoPlanId', {
        planId,
        planName: plan.name,
      });
      return NextResponse.json(
        { error: 'Plan is not synced with MercadoPago (missing mercadoPagoPlanId).' },
        { status: 400 },
      );
    }

    const user = await firebaseDB.users.getById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Optional: prevent duplicate active subs (skip check if upgrading)
    const existingSubscription = await getActiveUserSubscription(userId);
    if (existingSubscription && !isUpgrade) {
      console.log(
        '⚠️ [MP Subscription] User already has active subscription:',
        existingSubscription.id,
      );
      return NextResponse.json(
        {
          error: 'User already has an active subscription',
          existingSubscription: existingSubscription.id,
        },
        { status: 400 },
      );
    }

    if (isUpgrade && existingSubscription) {
      console.log(
        '🔄 [MP Subscription] Upgrade mode: User has existing subscription:',
        existingSubscription.id,
        '- Will be cancelled after new subscription is created'
      );
    }

    // ---- Get payment method from existing subscription (if reusing) --------
    let cardId: string | undefined;
    let finalPayerEmail = payerEmail;

    if (existingSubscriptionId) {
      console.log('🔄 [MP Subscription] Fetching payment method from existing subscription:', existingSubscriptionId);
      
      try {
        // Get the existing subscription from our database
        const existingSub = await firebaseDB.subscriptions.getById(existingSubscriptionId);
        
        if (!existingSub) {
          return NextResponse.json(
            { error: 'Existing subscription not found' },
            { status: 404 }
          );
        }

        if (existingSub.userId !== userId) {
          return NextResponse.json(
            { error: 'Unauthorized: Subscription does not belong to user' },
            { status: 403 }
          );
        }

        // Get payer email from stored subscriptionEmail field (top-level, not metadata)
        const existingSubData = existingSub as any;
        finalPayerEmail = existingSubData.subscriptionEmail;

        console.log('📋 [MP Subscription] Subscription email from Firestore:', {
          email: finalPayerEmail || 'NOT FOUND',
          subscriptionId: existingSub.id,
        });

        // Get card_id from stored metadata first (faster), then from MercadoPago as fallback
        // Note: We don't reuse cardTokenId as it's single-use, we always use the new one provided
        cardId = (existingSub as any).metadata?.cardId;
        
        if (cardId) {
          console.log('✅ [MP Subscription] Card ID retrieved from stored metadata:', {
            cardId: '***' + cardId.substring(cardId.length - 4),
            newCardTokenId: cardTokenId ? '***' + cardTokenId.substring(cardTokenId.length - 4) : 'N/A',
            source: 'Firebase metadata'
          });
        } else {
          console.log('🔍 [MP Subscription] Card ID not in metadata, fetching from MercadoPago subscription...');
          
          const mpSubscription: any = await preapproval.get({ 
            id: existingSub.mercadoPagoSubscriptionId as string 
          });
          
          cardId = mpSubscription.card_id as string | undefined;
          
          console.log('✅ [MP Subscription] Card ID retrieved from MercadoPago:', {
            cardId: cardId ? '***' + cardId.substring(cardId.length - 4) : 'N/A',
            newCardTokenId: cardTokenId ? '***' + cardTokenId.substring(cardTokenId.length - 4) : 'N/A',
            subscriptionId: mpSubscription.id,
            source: 'MercadoPago API'
          });
        }

        // If email not found in Firestore, try to get from MercadoPago (fallback)
        if (!finalPayerEmail) {
          console.log('⚠️ [MP Subscription] Email not in Firestore, trying MercadoPago payer_email field...');
          
          // If we didn't fetch from MercadoPago yet, do it now for email
          if (!cardId) {
            const mpSubscription: any = await preapproval.get({ 
              id: existingSub.mercadoPagoSubscriptionId as string 
            });
            finalPayerEmail = mpSubscription.payer_email;
            
            console.log('📋 [MP Subscription] Payer email from MercadoPago:', {
              payerEmail: finalPayerEmail || 'EMPTY',
              payerId: mpSubscription.payer_id,
            });
          }
        }

        // Validation - we always have cardTokenId from the request, just need to check if we have cardId for reference
        if (!cardId) {
          console.log('⚠️ [MP Subscription] No cardId found in existing subscription, but proceeding with new cardTokenId');
        }

        if (!finalPayerEmail) {
          return NextResponse.json(
            { error: 'No subscription email found. Please ensure the original subscription was created with a valid email address.' },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('❌ [MP Subscription] Error fetching payment method:', error);
        return NextResponse.json(
          { error: 'Failed to retrieve payment method from existing subscription' },
          { status: 500 }
        );
      }
    }

    if (!finalPayerEmail) {
      return NextResponse.json(
        { error: 'Payer email is required' },
        { status: 400 }
      );
    }

    // ---- Build URLs --------------------------------------------------------
    const rawBase = process.env.NEXT_PUBLIC_BASE_URL || '';
    let validBaseUrl = 'https://example.com'; // fallback to avoid bad URL build
    try {
      const u = new URL(rawBase);
      validBaseUrl = u.origin; // strip path & trailing slash
    } catch {
      console.warn(
        '⚠️ [MP Subscription] NEXT_PUBLIC_BASE_URL invalid, using fallback:',
        rawBase,
      );
    }

    const backUrl = `${validBaseUrl.replace(/\/$/, '')}/subscription/complete`;
    const webhookUrl = `${validBaseUrl.replace(/\/$/, '')}/api/mercadopago/subscription-webhook`;

    // ---- Create PreApproval (the actual user subscription) -----------------
    const externalReference = `subscription_${planId}_${userId}`;

    console.log('📋 [MP Subscription] Creating PreApproval:', {
      mercadoPagoPlanId: plan.mercadoPagoPlanId,
      payerEmail: finalPayerEmail,
      backUrl,
      externalReference,
      usingCardId: !!cardId,
      usingCardTokenId: !!cardTokenId,
    });

    // Build PreApproval body - use card_id if reusing payment method, otherwise card_token_id
    const preapprovalBody: any = {
      preapproval_plan_id: plan.mercadoPagoPlanId,
      reason: `Subscription to ${plan.name}`,
      external_reference: externalReference,
      payer_email: finalPayerEmail,
      auto_recurring: {
        frequency: plan.billingCycle === 'monthly' ? 1 : 12,
        frequency_type: plan.billingCycle === 'monthly' ? 'months' : 'months',
        transaction_amount: plan.price,
        currency_id: plan.currency || 'ARS',
      },
      back_url: backUrl,
      status: 'authorized', // According to MP docs, must be 'authorized'
    };

    // Add payment method - always use the new cardTokenId (single-use tokens)
    preapprovalBody.card_token_id = cardTokenId;
    console.log('✅ [MP Subscription] Using new card_token_id for subscription');

    const sub = await preapproval.create({
      body: preapprovalBody,
    });

    console.log('✅ [MP Subscription] PreApproval created:', {
      preapproval_id: sub.id,
      status: sub.status,
      init_point: sub.init_point,
    });

    // ---- Persist local pending record -------------------------------------
    const localSubscriptionId = await createUserSubscription({
      userId,
      planId,
      planName: plan.name,
      mercadoPagoSubscriptionId: sub.id, // << THIS is the real subscription id
      subscriptionEmail: finalPayerEmail, // IMPORTANT: Store email as top-level field for future upgrades
      amount: plan.price,
      currency: plan.currency || 'ARS',
      status: 'pending',
      billingCycle: plan.billingCycle,
      startDate: new Date(),
      metadata: {
        initPoint: sub.init_point,
        externalReference,
        backUrl,
        ...(cardId && { cardId }), // Store cardId for reference (same card, different token)
        cardTokenId, // Store new cardTokenId for future reference
      },
    });

    // ---- Useful logs for dashboard setup ----------------------------------
    console.log('🔔 [MP Subscription] Configure this WEBHOOK URL in MP:', webhookUrl);
    console.log('🔗 [MP Subscription] Back URL (return):', backUrl);

    // ---- Response to frontend ---------------------------------------------
    return NextResponse.json({
      success: true,
      subscriptionId: sub.id, // preapproval_id
      initPoint: sub.init_point, // redirect user to this URL
      publicKey,
      localSubscriptionId,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        billingCycle: plan.billingCycle,
        maxPosts: plan.maxPosts,
        maxBookings: plan.maxBookings,
        features: plan.features,
      },
    });
  } catch (error: any) {
    console.error('❌ [MP Subscription] Error:', error);
    
    // Log detailed MercadoPago error information
    if (error.cause) {
      console.error('❌ [MP Subscription] Error cause:', JSON.stringify(error.cause, null, 2));
    }
    if (error.message) {
      console.error('❌ [MP Subscription] Error message:', error.message);
    }
    
    // Extract MercadoPago error details
    const mpError = error.cause?.[0] || error;
    const errorMessage = mpError.message || error.message || 'Failed to create subscription';
    const errorCode = mpError.code || '';
    
    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        details: error instanceof Error ? error.stack : undefined,
        mpError: mpError,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const publicKey = process.env.NEXAR_SUSCRIPTIONS_PUBLIC_KEY;
  
  if (!publicKey) {
    return NextResponse.json(
      { error: 'Public key not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: 'MercadoPago subscription creation endpoint',
    publicKey: publicKey,
  });
}

/* ======================= Helpers (local) ======================= */

/**
 * Return the user's active subscription (if any)
 */
async function getActiveUserSubscription(userId: string) {
  try {
    const { subscriptionService } = await import('@/services/subscriptionService');
    return await subscriptionService.getUserActiveSubscription(userId);
  } catch (error) {
    console.error('Error getting active user subscription:', error);
    return null;
  }
}

/**
 * Create local subscription record in Firestore
 */
async function createUserSubscription(subscriptionData: any) {
  try {
    const docId = await firebaseDB.subscriptions.create({
      ...subscriptionData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    });
    return docId;
  } catch (error) {
    console.error('Error creating user subscription:', error);
    throw error;
  }
}
