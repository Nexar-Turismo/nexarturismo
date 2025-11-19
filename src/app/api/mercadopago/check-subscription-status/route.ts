import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';

/**
 * Manual subscription status checker
 * This endpoint can be called to manually check and update subscription status
 * GET /api/mercadopago/check-subscription-status?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const subscriptionId = searchParams.get('subscriptionId');

    if (!userId && !subscriptionId) {
      return NextResponse.json({ 
        error: 'Missing userId or subscriptionId parameter' 
      }, { status: 400 });
    }

    console.log('🔍 [Check Subscription Status] Checking subscription:', { userId, subscriptionId });

    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    // Get user's subscriptions from Firebase
    let userSubscriptions = [];
    if (userId) {
      userSubscriptions = await firebaseDB.subscriptions.getByUserId(userId);
    } else if (subscriptionId) {
      const sub = await firebaseDB.subscriptions.getById(subscriptionId);
      if (sub) userSubscriptions = [sub];
    }

    if (userSubscriptions.length === 0) {
      return NextResponse.json({
        error: 'No subscriptions found',
        userId,
        subscriptionId
      }, { status: 404 });
    }

    console.log('📋 [Check Subscription Status] Found subscriptions:', userSubscriptions.length);

    const results = [];

    for (const subscription of userSubscriptions) {
      const mercadoPagoId = subscription.mercadoPagoSubscriptionId;
      
      if (!mercadoPagoId) {
        results.push({
          subscriptionId: subscription.id,
          status: 'error',
          message: 'No MercadoPago subscription ID found'
        });
        continue;
      }

      console.log('🔍 [Check Subscription Status] Checking MercadoPago subscription:', mercadoPagoId);

      // Get subscription details from MercadoPago
      try {
        const response = await fetch(`https://api.mercadopago.com/preapproval/${mercadoPagoId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          results.push({
            subscriptionId: subscription.id,
            mercadoPagoId,
            status: 'error',
            message: `Failed to get MercadoPago subscription: ${response.statusText}`,
            httpStatus: response.status
          });
          continue;
        }

        const mpSubscription = await response.json();
        
        console.log('✅ [Check Subscription Status] MercadoPago subscription details:', {
          id: mpSubscription.id,
          status: mpSubscription.status,
          reason: mpSubscription.reason,
          auto_recurring: mpSubscription.auto_recurring
        });

        // Check if status needs to be updated in Firebase
        const needsUpdate = subscription.status !== mpSubscription.status;

        if (needsUpdate) {
          console.log('🔄 [Check Subscription Status] Updating subscription status:', {
            from: subscription.status,
            to: mpSubscription.status
          });

          await firebaseDB.subscriptions.update(subscription.id, {
            status: mpSubscription.status,
            mercadoPagoStatus: mpSubscription.status,
            updatedAt: new Date(),
            lastStatusUpdate: new Date()
          });

          // Trigger auth middleware to update roles
          if (mpSubscription.status === 'authorized' || mpSubscription.status === 'cancelled') {
            try {
              const { authMiddleware } = await import('@/services/authMiddleware');
              const { globalAuthMiddleware } = await import('@/services/globalAuthMiddleware');
              
              globalAuthMiddleware.clearUserCache(subscription.userId);
              await authMiddleware.checkUserSubscriptionAndRoles(subscription.userId);
              
              console.log('✅ [Check Subscription Status] User roles updated');
            } catch (error) {
              console.error('❌ [Check Subscription Status] Error updating user roles:', error);
            }
          }
        }

        results.push({
          subscriptionId: subscription.id,
          mercadoPagoId,
          firebaseStatus: subscription.status,
          mercadoPagoStatus: mpSubscription.status,
          needsUpdate,
          updated: needsUpdate,
          mercadoPagoDetails: {
            id: mpSubscription.id,
            status: mpSubscription.status,
            reason: mpSubscription.reason,
            init_point: mpSubscription.init_point,
            payer_email: mpSubscription.payer_email,
            auto_recurring: mpSubscription.auto_recurring,
            date_created: mpSubscription.date_created,
            last_modified: mpSubscription.last_modified
          }
        });

      } catch (error) {
        console.error('❌ [Check Subscription Status] Error checking subscription:', error);
        results.push({
          subscriptionId: subscription.id,
          mercadoPagoId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      checked: results.length,
      results
    });

  } catch (error) {
    console.error('❌ [Check Subscription Status] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to check subscription status'
      },
      { status: 500 }
    );
  }
}

/**
 * Test endpoint to verify webhook is working
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🧪 [Check Subscription Status] Test webhook call:', body);

    return NextResponse.json({
      message: 'Webhook test endpoint - use GET to check subscription status',
      received: body
    });
  } catch (error) {
    console.error('❌ [Check Subscription Status] Test error:', error);
    return NextResponse.json(
      { error: 'Test failed' },
      { status: 500 }
    );
  }
}
