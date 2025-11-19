import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { firebaseDB } from '@/services/firebaseService';
import { subscriptionService } from '@/services/subscriptionService';

/**
 * Change user's subscription plan
 * POST /api/mercadopago/change-plan
 * 
 * Since MercadoPago doesn't support plan changes directly, this endpoint:
 * 1. Cancels the old subscription in MercadoPago
 * 2. Marks the old subscription as 'cancelled' in Firebase
 * 3. Marks the new subscription as 'active' in Firebase
 * 
 * Note: The new subscription should already be created via subscription-create endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, oldSubscriptionId, newSubscriptionId } = body ?? {};

    if (!userId || !oldSubscriptionId || !newSubscriptionId) {
      return NextResponse.json(
        { error: 'userId, oldSubscriptionId, and newSubscriptionId are required' },
        { status: 400 },
      );
    }

    console.log('🔄 [Change Plan] Starting plan change:', {
      userId,
      oldSubscriptionId,
      newSubscriptionId,
    });

    // ---- ENV & SDK ---------------------------------------------------------
    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;

    if (!accessToken) {
      console.error('❌ [Change Plan] Missing MP access token');
      return NextResponse.json(
        { error: 'MercadoPago credentials not configured' },
        { status: 500 },
      );
    }

    const mp = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
    const preapproval = new PreApproval(mp);

    // ---- Get Old Subscription ----------------------------------------------
    const oldSubscriptionDoc = await firebaseDB.subscriptions.getById(oldSubscriptionId);
    
    if (!oldSubscriptionDoc) {
      return NextResponse.json(
        { error: 'Old subscription not found' },
        { status: 404 },
      );
    }

    if (oldSubscriptionDoc.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Subscription does not belong to user' },
        { status: 403 },
      );
    }

    // ---- Get New Subscription ----------------------------------------------
    // Try to find by Firebase document ID first, then by MercadoPago ID
    // Also add retry logic in case there's a slight delay in Firebase propagation
    let newSubscriptionDoc = await firebaseDB.subscriptions.getById(newSubscriptionId);
    
    if (!newSubscriptionDoc) {
      // If not found by document ID, try to find by MercadoPago subscription ID
      console.log('🔄 [Change Plan] Subscription not found by document ID, trying MercadoPago ID:', newSubscriptionId);
      newSubscriptionDoc = await firebaseDB.subscriptions.getByMercadoPagoId(newSubscriptionId);
    }
    
    // If still not found, wait a bit and retry (in case of Firebase propagation delay)
    if (!newSubscriptionDoc) {
      console.log('⏳ [Change Plan] Subscription not found, waiting 1 second and retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Retry both methods
      newSubscriptionDoc = await firebaseDB.subscriptions.getById(newSubscriptionId);
      if (!newSubscriptionDoc) {
        newSubscriptionDoc = await firebaseDB.subscriptions.getByMercadoPagoId(newSubscriptionId);
      }
    }
    
    if (!newSubscriptionDoc) {
      console.error('❌ [Change Plan] New subscription not found by either ID after retry:', newSubscriptionId);
      return NextResponse.json(
        { error: 'New subscription not found. Please wait a moment and try again, or contact support if the issue persists.' },
        { status: 404 },
      );
    }
    
    // If we found it by MercadoPago ID, use the Firebase document ID for updates
    const newSubscriptionFirebaseId = newSubscriptionDoc.id;
    console.log('✅ [Change Plan] Found new subscription:', {
      mercadoPagoId: newSubscriptionDoc.mercadoPagoSubscriptionId,
      firebaseId: newSubscriptionFirebaseId,
      searchedWith: newSubscriptionId,
    });

    if (newSubscriptionDoc.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: New subscription does not belong to user' },
        { status: 403 },
      );
    }

    // ---- Cancel Old Subscription in MercadoPago ----------------------------
    if (oldSubscriptionDoc.mercadoPagoSubscriptionId) {
      try {
        console.log('🔄 [Change Plan] Canceling old MP subscription:', oldSubscriptionDoc.mercadoPagoSubscriptionId);
        
        await preapproval.update({
          id: oldSubscriptionDoc.mercadoPagoSubscriptionId,
          body: {
            status: 'cancelled',
          },
        });

        console.log('✅ [Change Plan] Old MP subscription cancelled');
      } catch (mpError) {
        console.error('❌ [Change Plan] Error canceling old MP subscription:', mpError);
        // Continue anyway - we'll update Firebase even if MP fails
      }
    }

    // ---- Update Old Subscription in Firebase -------------------------------
    try {
      await firebaseDB.subscriptions.update(oldSubscriptionId, {
        status: 'cancelled',
        updatedAt: new Date(),
        endDate: new Date(),
        metadata: {
          ...oldSubscriptionDoc.metadata,
          cancelledAt: new Date(),
          cancelReason: 'Plan changed',
          newSubscriptionId: newSubscriptionFirebaseId,
        },
      });

      console.log('✅ [Change Plan] Old subscription marked as cancelled in Firebase');
    } catch (firebaseError) {
      console.error('❌ [Change Plan] Error updating old subscription in Firebase:', firebaseError);
      return NextResponse.json(
        { error: 'Failed to cancel old subscription' },
        { status: 500 },
      );
    }

    // ---- Activate New Subscription in Firebase -----------------------------
    try {
      await firebaseDB.subscriptions.update(newSubscriptionFirebaseId, {
        status: 'active',
        updatedAt: new Date(),
        startDate: new Date(),
        metadata: {
          ...newSubscriptionDoc.metadata,
          activatedAt: new Date(),
          previousSubscriptionId: oldSubscriptionId,
          upgradedFrom: oldSubscriptionDoc.planName,
        },
      });

      console.log('✅ [Change Plan] New subscription marked as active in Firebase');
    } catch (firebaseError) {
      console.error('❌ [Change Plan] Error activating new subscription in Firebase:', firebaseError);
      return NextResponse.json(
        { error: 'Failed to activate new subscription' },
        { status: 500 },
      );
    }

    // ---- Response ----------------------------------------------------------
    return NextResponse.json({
      success: true,
      message: 'Plan changed successfully',
      oldSubscriptionId,
      newSubscriptionId: newSubscriptionFirebaseId,
      newPlanName: newSubscriptionDoc.planName,
    });

  } catch (error) {
    console.error('❌ [Change Plan] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to change plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 },
    );
  }
}

