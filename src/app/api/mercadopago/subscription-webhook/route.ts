import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';

/**
 * Handle MercadoPago subscription webhook notifications
 * POST /api/mercadopago/subscription-webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Log request details
    const body = await request.json();
    console.log('🔔 [MP Webhook] Received:', { method: request.method, type: body.type, action: body.action });

    const { type, data, action, id: webhookId } = body;

    // Validate webhook data
    if (!type || !data?.id) {
      console.error('❌ [MP Webhook] Invalid webhook data:', { type, data });
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    // Check if we've already processed this webhook
    const webhookSignature = `${type}_${data.id}_${action || 'default'}`;
    const webhookCache = await checkWebhookCache(webhookSignature);
    
    if (webhookCache) {
      console.log('⚠️ [MP Webhook] Duplicate webhook detected, skipping:', webhookSignature);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Cache this webhook to prevent duplicates
    await cacheWebhook(webhookSignature);

    // Parse data for processing

    if (type === 'payment') {
      const paymentId = data?.id;
      if (!paymentId) {
        console.error('❌ [MercadoPago Subscription Webhook] No payment ID in webhook data');
        return NextResponse.json({ error: 'No payment ID' }, { status: 400 });
      }

      // Get payment details from MercadoPago
      const paymentDetails = await getPaymentDetails(paymentId);
      
      if (paymentDetails) {
        // Only process recurring payments (actual subscription charges)
        if (paymentDetails.operation_type === 'recurring_payment') {
          console.log('💳 [MercadoPago Subscription Webhook] Processing recurring payment:', {
            paymentId: paymentDetails.id,
            operationType: paymentDetails.operation_type,
            status: paymentDetails.status,
            amount: paymentDetails.transaction_amount
          });
          
          // Process payment using payment tracking service
          const { paymentTrackingService } = await import('@/services/paymentTrackingService');
          await paymentTrackingService.processPaymentWebhook(paymentDetails);
          
          await processSubscriptionPayment(paymentDetails);
        } else {
          console.log('⚠️ [MercadoPago Subscription Webhook] Skipping non-recurring payment:', {
            paymentId: paymentDetails.id,
            operationType: paymentDetails.operation_type,
            status: paymentDetails.status
          });
        }
      }
    } else if (type === 'preapproval' || type === 'subscription_preapproval') {
      const subscriptionId = data?.id;
      if (!subscriptionId) {
        console.error('❌ [MercadoPago Subscription Webhook] No subscription ID in webhook data');
        return NextResponse.json({ error: 'No subscription ID' }, { status: 400 });
      }

      console.log('🔍 [MercadoPago Subscription Webhook] Preapproval notification received:', {
        type,
        action,
        subscriptionId
      });

      // Get subscription details from MercadoPago
      const subscriptionDetails = await getSubscriptionDetails(subscriptionId);
      
      if (subscriptionDetails) {
        await processSubscriptionStatusChange(subscriptionDetails);
      } else {
        console.warn('⚠️ [MercadoPago Subscription Webhook] Could not get subscription details, might be a plan ID instead of subscription ID');
        
        // Try to find subscription by MercadoPago ID in our database
        const firebaseSubscription = await firebaseDB.subscriptions.getByMercadoPagoId(subscriptionId);
        if (firebaseSubscription) {
          console.log('📋 [MercadoPago Subscription Webhook] Found subscription in Firebase, updating status');
          // If we have it in Firebase, we can update it based on the action
          if (action === 'created' || action === 'updated') {
            await firebaseDB.subscriptions.update(firebaseSubscription.id, {
              status: 'active',
              mercadoPagoStatus: 'authorized',
              updatedAt: new Date(),
              lastStatusUpdate: new Date()
            });
            
            // Trigger auth middleware
            const { authMiddleware } = await import('@/services/authMiddleware');
            const { globalAuthMiddleware } = await import('@/services/globalAuthMiddleware');
            globalAuthMiddleware.clearUserCache(firebaseSubscription.userId);
            await authMiddleware.checkUserSubscriptionAndRoles(firebaseSubscription.userId);
          }
        }
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Get payment details from MercadoPago
 */
async function getPaymentDetails(paymentId: string) {
  try {
    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get payment details: ${response.statusText}`);
    }

    const payment = await response.json();
    
    console.log('💳 [MercadoPago Subscription Webhook] Payment details:', {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      operation_type: payment.operation_type,
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount
    });

    return payment;
  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error getting payment details:', error);
    return null;
  }
}

/**
 * Process subscription payment and update user status
 */
async function processSubscriptionPayment(payment: any) {
  try {
    const { status, external_reference, metadata } = payment;

    // Process different payment statuses
    if (status === 'approved') {
      console.log('✅ [MercadoPago Subscription Webhook] Payment approved, processing...');
      await handleApprovedPayment(payment);
    } else if (status === 'pending' || status === 'in_process') {
      console.log('⏳ [MercadoPago Subscription Webhook] Payment pending/in process, setting subscription on hold...');
      await handlePendingPayment(payment);
    } else if (status === 'rejected' || status === 'cancelled') {
      console.log('❌ [MercadoPago Subscription Webhook] Payment rejected/cancelled, updating subscription...');
      await handleRejectedPayment(payment);
    } else {
      console.log(`⚠️ [MercadoPago Subscription Webhook] Payment not processed. Status: ${status}`);
      return;
    }

  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error processing subscription payment:', error);
  }
}

/**
 * Handle approved payment - activate subscription
 */
async function handleApprovedPayment(payment: any) {
  try {
    const { external_reference, metadata } = payment;

    // Extract data from external_reference or metadata
    const referenceData = external_reference || metadata?.external_reference;
    if (!referenceData || !referenceData.startsWith('subscription_')) {
      console.error('❌ [MercadoPago Subscription Webhook] Invalid external reference:', referenceData);
      return;
    }

    const [, planId, userId] = referenceData.split('_');
    
    if (!planId || !userId) {
      console.error('❌ [MercadoPago Subscription Webhook] Missing planId or userId in reference:', referenceData);
      return;
    }

    console.log('🔄 [MercadoPago Subscription Webhook] Processing approved payment for:', { planId, userId });

    // Check if user already has a subscription (active or on hold)
    const existingSubscription = await getUserSubscription(userId);
    if (existingSubscription) {
      console.log('⚠️ [MercadoPago Subscription Webhook] User already has subscription:', existingSubscription.id, 'Status:', existingSubscription.status);
      
      // If subscription is on hold, activate it
      if (existingSubscription.status === 'on_hold') {
        await activateSubscriptionFromHold(existingSubscription.id, payment);
        return;
      }
      
      // If already active, just update payment info
      if (existingSubscription.status === 'active') {
        await updateSubscriptionOnHold(existingSubscription.id, payment);
        return;
      }
      
      return;
    }

    // Get plan details
    const plans = await firebaseDB.plans.getAll();
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
      console.error('❌ [MercadoPago Subscription Webhook] Plan not found:', planId);
      return;
    }

    // Create user subscription record
    const subscriptionId = await createUserSubscription({
      userId,
      planId,
      planName: plan.name,
      paymentId: payment.id,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      status: 'active',
      startDate: new Date(),
      endDate: calculateEndDate(plan.billingCycle),
      metadata: {
        mercadoPagoPaymentId: payment.id,
        paymentStatus: payment.status,
        paymentStatusDetail: payment.status_detail
      }
    });

    // Assign publisher role to user
    await firebaseDB.users.assignRole(userId, 'publisher', 'system');

    console.log('✅ [MercadoPago Subscription Webhook] Subscription activated successfully:', {
      subscriptionId,
      userId,
      planName: plan.name,
      paymentId: payment.id
    });

  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error handling approved payment:', error);
  }
}

/**
 * Handle pending payment - set subscription on hold
 */
async function handlePendingPayment(payment: any) {
  try {
    const { external_reference, metadata } = payment;

    // Extract data from external_reference or metadata
    const referenceData = external_reference || metadata?.external_reference;
    if (!referenceData || !referenceData.startsWith('subscription_')) {
      console.error('❌ [MercadoPago Subscription Webhook] Invalid external reference:', referenceData);
      return;
    }

    const [, planId, userId] = referenceData.split('_');
    
    if (!planId || !userId) {
      console.error('❌ [MercadoPago Subscription Webhook] Missing planId or userId in reference:', referenceData);
      return;
    }

    console.log('🔄 [MercadoPago Subscription Webhook] Processing pending payment for:', { planId, userId });

    // Check if user already has a subscription (active or on hold)
    const existingSubscription = await getUserSubscription(userId);
    if (existingSubscription && (existingSubscription.status === 'active' || existingSubscription.status === 'on_hold')) {
      console.log('⚠️ [MercadoPago Subscription Webhook] User already has subscription:', existingSubscription.id, 'Status:', existingSubscription.status);
      
      // If subscription is on hold and payment is pending, update it
      if (existingSubscription.status === 'on_hold') {
        await updateSubscriptionOnHold(existingSubscription.id, payment);
      }
      return;
    }

    // Get plan details
    const plans = await firebaseDB.plans.getAll();
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
      console.error('❌ [MercadoPago Subscription Webhook] Plan not found:', planId);
      return;
    }

    // Create user subscription record with on_hold status
    const subscriptionId = await createUserSubscription({
      userId,
      planId,
      planName: plan.name,
      paymentId: payment.id,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      status: 'on_hold',
      startDate: new Date(),
      endDate: calculateEndDate(plan.billingCycle),
      metadata: {
        mercadoPagoPaymentId: payment.id,
        paymentStatus: payment.status,
        paymentStatusDetail: payment.status_detail,
        onHoldReason: 'Payment pending accreditation',
        onHoldAt: new Date()
      }
    });

    console.log('⏳ [MercadoPago Subscription Webhook] Subscription set on hold:', {
      subscriptionId,
      userId,
      planName: plan.name,
      paymentId: payment.id,
      status: 'on_hold'
    });

  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error handling pending payment:', error);
  }
}

/**
 * Update existing subscription that's on hold
 */
async function updateSubscriptionOnHold(subscriptionId: string, payment: any) {
  try {
    await firebaseDB.subscriptions.update(subscriptionId, {
      updatedAt: new Date(),
      metadata: {
        mercadoPagoPaymentId: payment.id,
        paymentStatus: payment.status,
        paymentStatusDetail: payment.status_detail,
        lastPaymentUpdate: new Date()
      }
    });

    console.log('✅ [MercadoPago Subscription Webhook] Updated subscription on hold:', {
      subscriptionId,
      paymentId: payment.id,
      status: payment.status
    });
  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error updating subscription on hold:', error);
  }
}

/**
 * Activate subscription that was on hold
 */
async function activateSubscriptionFromHold(subscriptionId: string, payment: any) {
  try {
    await firebaseDB.subscriptions.update(subscriptionId, {
      status: 'active',
      updatedAt: new Date(),
      metadata: {
        mercadoPagoPaymentId: payment.id,
        paymentStatus: payment.status,
        paymentStatusDetail: payment.status_detail,
        activatedFromHoldAt: new Date(),
        activatedFromHoldReason: 'Payment approved'
      }
    });

    // Assign publisher role to user if not already assigned
    const subscription = await firebaseDB.subscriptions.getById(subscriptionId);
    if (subscription) {
      await firebaseDB.users.assignRole(subscription.userId, 'publisher', 'system');
    }

    console.log('✅ [MercadoPago Subscription Webhook] Subscription activated from hold:', {
      subscriptionId,
      paymentId: payment.id,
      status: 'active'
    });
  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error activating subscription from hold:', error);
  }
}

/**
 * Handle rejected payment
 */
async function handleRejectedPayment(payment: any) {
  try {
    const { external_reference, metadata } = payment;

    // Extract data from external_reference or metadata
    const referenceData = external_reference || metadata?.external_reference;
    if (!referenceData || !referenceData.startsWith('subscription_')) {
      console.error('❌ [MercadoPago Subscription Webhook] Invalid external reference:', referenceData);
      return;
    }

    const [, planId, userId] = referenceData.split('_');
    
    if (!planId || !userId) {
      console.error('❌ [MercadoPago Subscription Webhook] Missing planId or userId in reference:', referenceData);
      return;
    }

    console.log('🔄 [MercadoPago Subscription Webhook] Processing rejected payment for:', { planId, userId });

    // Find subscription and update it
    const existingSubscription = await getUserSubscription(userId);
    if (existingSubscription) {
      await firebaseDB.subscriptions.update(existingSubscription.id, {
        status: 'cancelled',
        updatedAt: new Date(),
        metadata: {
          ...existingSubscription.metadata,
          mercadoPagoPaymentId: payment.id,
          paymentStatus: payment.status,
          paymentStatusDetail: payment.status_detail,
          cancelledAt: new Date(),
          cancellationReason: 'Payment rejected'
        }
      });

      console.log('❌ [MercadoPago Subscription Webhook] Subscription cancelled due to rejected payment:', {
        subscriptionId: existingSubscription.id,
        paymentId: payment.id,
        status: payment.status
      });
    }

  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error handling rejected payment:', error);
  }
}

/**
 * Get user subscription (active or on hold)
 */
async function getUserSubscription(userId: string) {
  try {
    const subscriptionsRef = firebaseDB.db.collection('userSubscriptions');
    const snapshot = await subscriptionsRef
      .where('userId', '==', userId)
      .where('status', 'in', ['active', 'on_hold'])
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const subscription = snapshot.docs[0].data();
    return {
      id: snapshot.docs[0].id,
      ...subscription
    };
  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error getting user subscription:', error);
    return null;
  }
}

/**
 * Get active user subscription
 */
async function getActiveUserSubscription(userId: string) {
  try {
    const subscriptionsRef = firebaseDB.db.collection('userSubscriptions');
    const snapshot = await subscriptionsRef
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const subscription = snapshot.docs[0].data();
    return {
      id: snapshot.docs[0].id,
      ...subscription
    };
  } catch (error) {
    console.error('Error getting active user subscription:', error);
    return null;
  }
}

/**
 * Create user subscription record
 */
async function createUserSubscription(subscriptionData: any) {
  try {
    const subscriptionsRef = firebaseDB.db.collection('userSubscriptions');
    const docRef = await subscriptionsRef.add({
      ...subscriptionData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system'
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating user subscription:', error);
    throw error;
  }
}

/**
 * Get subscription details from MercadoPago
 */
async function getSubscriptionDetails(subscriptionId: string) {
  try {
    console.log('🔍 [MercadoPago Subscription Webhook] Fetching subscription details for:', subscriptionId);
    
    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    // Try the correct endpoint (without /v1)
    const url = `https://api.mercadopago.com/preapproval/${subscriptionId}`;
    console.log('📡 [MercadoPago Subscription Webhook] Request URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 [MercadoPago Subscription Webhook] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ [MercadoPago Subscription Webhook] Error response body:', errorBody);
      throw new Error(`Failed to get subscription details: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const subscription = await response.json();
    
    console.log('✅ [MercadoPago Subscription Webhook] Subscription details:', {
      id: subscription.id,
      status: subscription.status,
      payer_email: subscription.payer_email,
      external_reference: subscription.external_reference,
      reason: subscription.reason
    });

    return subscription;
  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error getting subscription details:', error);
    return null;
  }
}

/**
 * Process subscription status changes
 */
async function processSubscriptionStatusChange(subscription: any) {
  try {
    const { status, external_reference, payer_email } = subscription;

    // Extract data from external_reference
    const referenceData = external_reference || '';
    if (!referenceData || !referenceData.startsWith('subscription_')) {
      console.error('❌ [MercadoPago Subscription Webhook] Invalid external reference:', referenceData);
      return;
    }

    const [, planId, userId] = referenceData.split('_');
    
    if (!planId || !userId) {
      console.error('❌ [MercadoPago Subscription Webhook] Missing planId or userId in reference:', referenceData);
      return;
    }

    console.log('🔄 [MercadoPago Subscription Webhook] Processing subscription status change:', {
      subscriptionId: subscription.id,
      status,
      userId,
      planId,
      external_reference
    });

    // Find the subscription record in our database (pass external_reference for fallback lookup)
    const subscriptionRecord = await findUserSubscriptionByMercadoPagoId(subscription.id, external_reference);
    
    if (!subscriptionRecord) {
      console.error('❌ [MercadoPago Subscription Webhook] Subscription record not found:', subscription.id);
      return;
    }

    // Update subscription status based on MercadoPago status
    let newStatus: string;
    let shouldAssignRole = false;

    switch (status) {
      case 'authorized':
        newStatus = 'active';
        shouldAssignRole = true;
        console.log('✅ [MercadoPago Subscription Webhook] Subscription authorized, activating...');
        break;
      case 'cancelled':
        newStatus = 'cancelled';
        console.log('❌ [MercadoPago Subscription Webhook] Subscription cancelled');
        break;
      case 'paused':
        newStatus = 'paused';
        console.log('⏸️ [MercadoPago Subscription Webhook] Subscription paused');
        break;
      default:
        console.log('ℹ️ [MercadoPago Subscription Webhook] Subscription status:', status);
        return; // Don't update for unknown statuses
    }

    // Extract card information for future reuse
    let cardId = subscriptionRecord.metadata?.cardId;
    let cardTokenId = subscriptionRecord.metadata?.cardTokenId;
    
    // If subscription is authorized and we have card information from MercadoPago, extract it
    if (status === 'authorized' && subscription.card_id) {
      cardId = subscription.card_id;
      console.log('💳 [MercadoPago Subscription Webhook] Extracted card_id for future reuse:', cardId);
    }

    // Update subscription record
    await updateUserSubscription(subscriptionRecord.id, {
      status: newStatus,
      mercadoPagoStatus: status,
      updatedAt: new Date(),
      metadata: {
        ...subscriptionRecord.metadata,
        lastStatusUpdate: new Date(),
        mercadoPagoStatus: status,
        ...(cardId && { cardId }), // Store cardId for future plan changes
        ...(cardTokenId && { cardTokenId }), // Keep cardTokenId if available
      }
    });

    // Note: We no longer create payment records for subscription authorization
    // Only actual recurring payments (operation_type: 'recurring_payment') are saved
    console.log('ℹ️ [MercadoPago Subscription Webhook] Subscription status updated, no payment record created for authorization');

    // Use auth middleware to manage roles and posts
    if (shouldAssignRole || status === 'cancelled') {
      try {
        const { authMiddleware } = await import('@/services/authMiddleware');
        const { globalAuthMiddleware } = await import('@/services/globalAuthMiddleware');
        
        // Clear user cache to force refresh
        globalAuthMiddleware.clearUserCache(userId);
        
        // Update user roles and posts
        await authMiddleware.checkUserSubscriptionAndRoles(userId);
        console.log('✅ [MercadoPago Subscription Webhook] User roles and posts updated via middleware for user:', userId);
      } catch (error) {
        console.error('❌ [MercadoPago Subscription Webhook] Error updating user via middleware:', error);
      }
    }

    console.log('✅ [MercadoPago Subscription Webhook] Subscription status updated:', {
      subscriptionId: subscriptionRecord.id,
      newStatus,
      userId
    });

  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error processing subscription status change:', error);
  }
}

/**
 * Find user subscription by MercadoPago subscription ID or external reference
 */
async function findUserSubscriptionByMercadoPagoId(mercadoPagoSubscriptionId: string, externalReference?: string) {
  try {
    console.log('🔍 [MercadoPago Subscription Webhook] Looking for subscription:', {
      mercadoPagoId: mercadoPagoSubscriptionId,
      externalReference
    });
    
    // Try to find by MercadoPago subscription ID first
    let subscription = await firebaseDB.subscriptions.getByMercadoPagoId(mercadoPagoSubscriptionId);
    
    if (subscription) {
      console.log('✅ [MercadoPago Subscription Webhook] Found subscription by MercadoPago ID:', {
        id: subscription.id,
        userId: subscription.userId,
        status: subscription.status
      });
      return subscription;
    }
    
    // If not found and we have external_reference, try to find by userId and planId
    if (externalReference && externalReference.startsWith('subscription_')) {
      const parts = externalReference.split('_');
      if (parts.length >= 3) {
        const planId = parts[1];
        const userId = parts[2];
        
        console.log('🔍 [MercadoPago Subscription Webhook] Trying to find by userId and planId:', { userId, planId });
        
        // Get all user subscriptions and find the one for this plan
        const userSubscriptions = await firebaseDB.subscriptions.getByUserId(userId);
        subscription = userSubscriptions.find(sub => 
          sub.planId === planId && 
          (sub.status === 'pending' || sub.status === 'active')
        );
        
        if (subscription) {
          console.log('✅ [MercadoPago Subscription Webhook] Found subscription by userId and planId:', {
            id: subscription.id,
            userId: subscription.userId,
            planId: subscription.planId,
            oldMercadoPagoId: subscription.mercadoPagoSubscriptionId,
            newMercadoPagoId: mercadoPagoSubscriptionId
          });
          
          // Update the mercadoPagoSubscriptionId to the actual subscription ID
          await firebaseDB.subscriptions.update(subscription.id, {
            mercadoPagoSubscriptionId: mercadoPagoSubscriptionId,
            updatedAt: new Date()
          });
          
          console.log('✅ [MercadoPago Subscription Webhook] Updated mercadoPagoSubscriptionId in Firebase');
          
          // Return the updated subscription
          subscription.mercadoPagoSubscriptionId = mercadoPagoSubscriptionId;
          return subscription;
        }
      }
    }
    
    console.log('❌ [MercadoPago Subscription Webhook] No subscription found');
    return null;
  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error finding subscription:', error);
    return null;
  }
}

/**
 * Update user subscription record
 */
async function updateUserSubscription(subscriptionId: string, updates: any) {
  try {
    console.log('🔄 [MercadoPago Subscription Webhook] Updating subscription:', {
      subscriptionId,
      updates
    });
    
    // Use the existing Firebase service method
    await firebaseDB.subscriptions.update(subscriptionId, updates);
    
    console.log('✅ [MercadoPago Subscription Webhook] Subscription updated successfully');
  } catch (error) {
    console.error('❌ [MercadoPago Subscription Webhook] Error updating user subscription:', error);
    throw error;
  }
}

/**
 * Calculate subscription end date based on billing cycle
 */
function calculateEndDate(billingCycle: string): Date {
  const now = new Date();
  
  switch (billingCycle) {
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    case 'yearly':
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()); // Default to monthly
  }
}

export async function GET() {
  console.log('🔍 [MercadoPago Subscription Webhook] GET request received - testing webhook endpoint');
  return NextResponse.json({ 
    message: 'MercadoPago subscription webhook endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
}

// Webhook deduplication functions
async function checkWebhookCache(webhookSignature: string): Promise<boolean> {
  try {
    // Use a simple in-memory cache for now (in production, use Redis or similar)
    if (!global.webhookCache) {
      global.webhookCache = new Map();
    }
    
    return global.webhookCache.has(webhookSignature);
  } catch (error) {
    console.error('Error checking webhook cache:', error);
    return false; // If cache fails, process the webhook
  }
}

async function cacheWebhook(webhookSignature: string): Promise<void> {
  try {
    if (!global.webhookCache) {
      global.webhookCache = new Map();
    }
    
    // Cache for 24 hours (86400000 ms)
    global.webhookCache.set(webhookSignature, Date.now());
    
    // Clean up old entries (older than 24 hours)
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, timestamp] of global.webhookCache.entries()) {
      if (now - timestamp > maxAge) {
        global.webhookCache.delete(key);
      }
    }
  } catch (error) {
    console.error('Error caching webhook:', error);
    // Don't throw - caching failure shouldn't break webhook processing
  }
}

// Extend global type for TypeScript
declare global {
  var webhookCache: Map<string, number> | undefined;
}
