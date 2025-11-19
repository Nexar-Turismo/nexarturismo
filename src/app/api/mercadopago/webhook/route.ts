import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';

/**
 * Public webhook endpoint for MercadoPago notifications
 * This endpoint is designed to be called externally by MercadoPago
 * POST /api/mercadopago/webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Log request details for debugging
    console.log('🔔 [MercadoPago Public Webhook] === WEBHOOK RECEIVED ===');
    console.log('🔔 [MercadoPago Public Webhook] Timestamp:', new Date().toISOString());
    console.log('🔔 [MercadoPago Public Webhook] Headers:', Object.fromEntries(request.headers.entries()));
    console.log('🔔 [MercadoPago Public Webhook] URL:', request.url);
    console.log('🔔 [MercadoPago Public Webhook] Method:', request.method);
    console.log('🔔 [MercadoPago Public Webhook] User-Agent:', request.headers.get('user-agent'));
    console.log('🔔 [MercadoPago Public Webhook] X-Forwarded-For:', request.headers.get('x-forwarded-for'));
    console.log('🔔 [MercadoPago Public Webhook] X-Real-IP:', request.headers.get('x-real-ip'));
    
    const body = await request.json();
    console.log('🔔 [MercadoPago Public Webhook] Raw body:', JSON.stringify(body, null, 2));

    const { type, data, action } = body;

    console.log('🔔 [MercadoPago Public Webhook] Parsed data:', { 
      type, 
      action,
      dataId: data?.id,
      fullData: data 
    });

    // Handle different webhook types
    if (type === 'payment') {
      console.log('💳 [MercadoPago Public Webhook] Processing payment notification');
    await handlePaymentNotification(body);
    } else if (type === 'preapproval' || type === 'subscription_preapproval') {
      console.log('🔄 [MercadoPago Public Webhook] Processing subscription notification');
      await handleSubscriptionNotification(data, action);
    } else {
      console.log('ℹ️ [MercadoPago Public Webhook] Unknown webhook type:', type);
    }

    console.log('✅ [MercadoPago Public Webhook] Webhook processed successfully');
    return NextResponse.json({ received: true, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('❌ [MercadoPago Public Webhook] Error:', error);
    console.error('❌ [MercadoPago Public Webhook] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return 200 to prevent MercadoPago from retrying
    return NextResponse.json(
      { error: 'Webhook processing failed', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  }
}

/**
 * Handle payment notifications
 */
async function handlePaymentNotification(notification: any) {
  try {
    const paymentId = notification?.data?.id;
    if (!paymentId) {
      console.error('❌ [MercadoPago Public Webhook] No payment ID in payment notification');
      return;
    }

    console.log('💳 [MercadoPago Public Webhook] Processing payment notification:', {
      paymentId,
      userId: notification?.user_id,
      action: notification?.action,
    });

    const candidateTokens: string[] = [];
    const mercadoPagoUserId = notification?.user_id ? String(notification.user_id) : undefined;

    if (mercadoPagoUserId) {
      const publisherAccount = await firebaseDB.mercadoPagoAccounts.getByMercadoPagoUserId(mercadoPagoUserId);
      if (publisherAccount?.accessToken) {
        candidateTokens.push(publisherAccount.accessToken);
      }
    }

    if (process.env.NEXAR_MARKETPLACE_ACCESS_TOKEN) {
      candidateTokens.push(process.env.NEXAR_MARKETPLACE_ACCESS_TOKEN);
    }

    if (process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN) {
      candidateTokens.push(process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN);
    }

    const paymentDetails = await getPaymentDetails(paymentId, candidateTokens);
    
    if (paymentDetails) {
      if (paymentDetails.operation_type === 'recurring_payment') {
        const { paymentTrackingService } = await import('@/services/paymentTrackingService');
        await paymentTrackingService.processPaymentWebhook(paymentDetails);
        await processSubscriptionPayment(paymentDetails);
      } else {
        await processBookingPayment(paymentDetails);
      }
    } else {
      console.error('❌ [MercadoPago Public Webhook] Could not retrieve payment details for notification', {
        paymentId,
        candidateTokens: candidateTokens.length,
      });
    }
  } catch (error) {
    console.error('❌ [MercadoPago Public Webhook] Error handling payment notification:', error);
  }
}

/**
 * Handle subscription notifications
 */
async function handleSubscriptionNotification(data: any, action: string) {
  try {
    const subscriptionId = data?.id;
    if (!subscriptionId) {
      console.error('❌ [MercadoPago Public Webhook] No subscription ID in subscription notification');
      return;
    }

    console.log('🔄 [MercadoPago Public Webhook] Processing subscription:', {
      subscriptionId,
      action
    });

    // Get subscription details from MercadoPago
    const subscriptionDetails = await getSubscriptionDetails(subscriptionId);
    
    if (subscriptionDetails) {
      await processSubscriptionStatusChange(subscriptionDetails);
    } else {
      console.warn('⚠️ [MercadoPago Public Webhook] Could not get subscription details, might be a plan ID instead of subscription ID');
      
      // Try to find subscription by MercadoPago ID in our database
      const firebaseSubscription = await firebaseDB.subscriptions.getByMercadoPagoId(subscriptionId);
      if (firebaseSubscription) {
        console.log('📋 [MercadoPago Public Webhook] Found subscription in Firebase, updating status');
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
  } catch (error) {
    console.error('❌ [MercadoPago Public Webhook] Error handling subscription notification:', error);
  }
}

/**
 * Get payment details from MercadoPago
 */
async function getPaymentDetails(paymentId: string, accessTokens: string[]) {
  try {
    const attempts = accessTokens.filter((token): token is string => Boolean(token));
    if (!attempts.length) {
      throw new Error('No MercadoPago access tokens available to fetch payment details');
    }

    const errors: Array<{ status?: number; message: string }> = [];

    for (const [index, token] of attempts.entries()) {
      try {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          errors.push({
            status: response.status,
            message: `Attempt ${index + 1} failed: ${response.status} ${response.statusText} - ${errorBody}`,
          });
          continue;
        }

        const payment = await response.json();

        console.log('💳 [MercadoPago Public Webhook] Payment details retrieved:', {
          id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
          operation_type: payment.operation_type,
          external_reference: payment.external_reference,
        });

        return payment;
      } catch (attemptError) {
        errors.push({
          message: `Attempt ${index + 1} exception: ${
            attemptError instanceof Error ? attemptError.message : String(attemptError)
          }`,
        });
      }
    }

    console.error('❌ [MercadoPago Public Webhook] All attempts to fetch payment details failed:', errors);
    return null;

  } catch (error) {
    console.error('❌ [MercadoPago Public Webhook] Error getting payment details:', error);
    return null;
  }
}

/**
 * Get subscription details from MercadoPago
 */
async function getSubscriptionDetails(subscriptionId: string) {
  try {
    console.log('🔍 [MercadoPago Public Webhook] Fetching subscription details for:', subscriptionId);
    
    const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
    
    if (!accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    // Try the correct endpoint (without /v1)
    const url = `https://api.mercadopago.com/preapproval/${subscriptionId}`;
    console.log('📡 [MercadoPago Public Webhook] Request URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 [MercadoPago Public Webhook] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ [MercadoPago Public Webhook] Error response body:', errorBody);
      throw new Error(`Failed to get subscription details: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const subscription = await response.json();
    
    console.log('✅ [MercadoPago Public Webhook] Subscription details:', {
      id: subscription.id,
      status: subscription.status,
      payer_email: subscription.payer_email,
      external_reference: subscription.external_reference,
      reason: subscription.reason
    });

    return subscription;
  } catch (error) {
    console.error('❌ [MercadoPago Public Webhook] Error getting subscription details:', error);
    return null;
  }
}

/**
 * Process subscription payment and update user status
 */
async function processSubscriptionPayment(payment: any) {
  try {
    const { status, external_reference, metadata } = payment;

    // Only process approved payments
    if (status !== 'approved') {
      console.log(`⚠️ [MercadoPago Public Webhook] Payment not approved. Status: ${status}`);
      return;
    }

    // Extract data from external_reference or metadata
    const referenceData = external_reference || metadata?.external_reference;
    if (!referenceData || !referenceData.startsWith('subscription_')) {
      console.error('❌ [MercadoPago Public Webhook] Invalid external reference:', referenceData);
      return;
    }

    const [, planId, userId] = referenceData.split('_');
    
    if (!planId || !userId) {
      console.error('❌ [MercadoPago Public Webhook] Missing planId or userId in reference:', referenceData);
      return;
    }

    console.log('🔄 [MercadoPago Public Webhook] Processing subscription for:', { planId, userId });

    // Check if user already has an active subscription
    const existingSubscription = await getActiveUserSubscription(userId);
    if (existingSubscription) {
      console.log('⚠️ [MercadoPago Public Webhook] User already has active subscription:', existingSubscription.id);
      return;
    }

    // Get plan details
    const plans = await firebaseDB.plans.getAll();
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
      console.error('❌ [MercadoPago Public Webhook] Plan not found:', planId);
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

    console.log('✅ [MercadoPago Public Webhook] Subscription created successfully:', {
      subscriptionId,
      userId,
      planName: plan.name,
      paymentId: payment.id
    });

  } catch (error) {
    console.error('❌ [MercadoPago Public Webhook] Error processing subscription payment:', error);
  }
}

/**
 * Process a one-time booking payment
 */
async function processBookingPayment(payment: any) {
  try {
    const bookingId =
      payment.external_reference ||
      payment.metadata?.bookingId ||
      (typeof payment.metadata?.external_reference === 'string'
        ? payment.metadata.external_reference
        : undefined);

    if (!bookingId) {
      console.error('❌ [MercadoPago Public Webhook] Booking payment missing external_reference or metadata bookingId');
      return;
    }

    console.log('🔄 [MercadoPago Public Webhook] Processing booking payment:', {
      bookingId,
      paymentId: payment.id,
      status: payment.status,
    });

    const booking = await firebaseDB.bookings.getById(bookingId);
    if (!booking) {
      console.error('❌ [MercadoPago Public Webhook] Booking not found for bookingId:', bookingId);
      return;
    }

    if (payment.status === 'approved') {
      if (booking.status === 'paid') {
        console.log('ℹ️ [MercadoPago Public Webhook] Booking already marked as paid, skipping update:', bookingId);
        return;
      }

      await firebaseDB.bookings.updateStatus(bookingId, 'paid', {
        mercadoPagoPaymentId: payment.id,
        paymentStatus: payment.status,
        paymentStatusDetail: payment.status_detail,
        transactionAmount: payment.transaction_amount,
        paymentMethod: payment.payment_method_id,
        paymentReceivedAt: new Date(),
      });

      console.log('✅ [MercadoPago Public Webhook] Booking marked as paid:', {
        bookingId,
        paymentId: payment.id,
      });
    } else if (payment.status === 'rejected') {
      console.warn('⚠️ [MercadoPago Public Webhook] Booking payment rejected:', {
        bookingId,
        paymentId: payment.id,
        status_detail: payment.status_detail,
      });
    } else {
      console.log('ℹ️ [MercadoPago Public Webhook] Booking payment status:', {
        bookingId,
        paymentId: payment.id,
        status: payment.status,
      });
    }
  } catch (error) {
    console.error('❌ [MercadoPago Public Webhook] Error processing booking payment:', error);
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
      console.error('❌ [MercadoPago Public Webhook] Invalid external reference:', referenceData);
      return;
    }

    const [, planId, userId] = referenceData.split('_');
    
    if (!planId || !userId) {
      console.error('❌ [MercadoPago Public Webhook] Missing planId or userId in reference:', referenceData);
      return;
    }

    console.log('🔄 [MercadoPago Public Webhook] Processing subscription status change:', {
      subscriptionId: subscription.id,
      status,
      userId,
      planId,
      external_reference
    });

    // Find the subscription record in our database (pass external_reference for fallback lookup)
    const subscriptionRecord = await findUserSubscriptionByMercadoPagoId(subscription.id, external_reference);
    
    if (!subscriptionRecord) {
      console.error('❌ [MercadoPago Public Webhook] Subscription record not found:', subscription.id);
      return;
    }

    // Update subscription status based on MercadoPago status
    let newStatus: string;
    let shouldAssignRole = false;

    switch (status) {
      case 'authorized':
        newStatus = 'active';
        shouldAssignRole = true;
        console.log('✅ [MercadoPago Public Webhook] Subscription authorized, activating...');
        break;
      case 'cancelled':
        newStatus = 'cancelled';
        console.log('❌ [MercadoPago Public Webhook] Subscription cancelled');
        break;
      case 'paused':
        newStatus = 'paused';
        console.log('⏸️ [MercadoPago Public Webhook] Subscription paused');
        break;
      default:
        console.log('ℹ️ [MercadoPago Public Webhook] Subscription status:', status);
        return; // Don't update for unknown statuses
    }

    // Update subscription record
    await updateUserSubscription(subscriptionRecord.id, {
      status: newStatus,
      mercadoPagoStatus: status,
      updatedAt: new Date(),
      metadata: {
        ...subscriptionRecord.metadata,
        lastStatusUpdate: new Date(),
        mercadoPagoStatus: status
      }
    });

    // Note: We no longer create payment records for subscription authorization
    // Only actual recurring payments (operation_type: 'recurring_payment') are saved
    console.log('ℹ️ [MercadoPago Public Webhook] Subscription status updated, no payment record created for authorization');

    // Use auth middleware to manage roles and posts
    if (shouldAssignRole || status === 'cancelled') {
      try {
        const { authMiddleware } = await import('@/services/authMiddleware');
        const { globalAuthMiddleware } = await import('@/services/globalAuthMiddleware');
        
        // Clear user cache to force refresh
        globalAuthMiddleware.clearUserCache(userId);
        
        // Update user roles and posts
        await authMiddleware.checkUserSubscriptionAndRoles(userId);
        console.log('✅ [MercadoPago Public Webhook] User roles and posts updated via middleware for user:', userId);
      } catch (error) {
        console.error('❌ [MercadoPago Public Webhook] Error updating user via middleware:', error);
      }
    }

    console.log('✅ [MercadoPago Public Webhook] Subscription status updated:', {
      subscriptionId: subscriptionRecord.id,
      newStatus,
      userId
    });

  } catch (error) {
    console.error('❌ [MercadoPago Public Webhook] Error processing subscription status change:', error);
  }
}

/**
 * Find user subscription by MercadoPago subscription ID or external reference
 */
async function findUserSubscriptionByMercadoPagoId(mercadoPagoSubscriptionId: string, externalReference?: string) {
  try {
    console.log('🔍 [MercadoPago Public Webhook] Looking for subscription:', {
      mercadoPagoId: mercadoPagoSubscriptionId,
      externalReference
    });
    
    // Try to find by MercadoPago subscription ID first
    let subscription = await firebaseDB.subscriptions.getByMercadoPagoId(mercadoPagoSubscriptionId);
    
    if (subscription) {
      console.log('✅ [MercadoPago Public Webhook] Found subscription by MercadoPago ID:', {
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
        
        console.log('🔍 [MercadoPago Public Webhook] Trying to find by userId and planId:', { userId, planId });
        
        // Get all user subscriptions and find the one for this plan
        const userSubscriptions = await firebaseDB.subscriptions.getByUserId(userId);
        subscription = userSubscriptions.find(sub => 
          sub.planId === planId && 
          (sub.status === 'pending' || sub.status === 'active')
        );
        
        if (subscription) {
          console.log('✅ [MercadoPago Public Webhook] Found subscription by userId and planId:', {
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
          
          console.log('✅ [MercadoPago Public Webhook] Updated mercadoPagoSubscriptionId in Firebase');
          
          // Return the updated subscription
          subscription.mercadoPagoSubscriptionId = mercadoPagoSubscriptionId;
          return subscription;
        }
      }
    }
    
    console.log('❌ [MercadoPago Public Webhook] No subscription found');
    return null;
  } catch (error) {
    console.error('❌ [MercadoPago Public Webhook] Error finding subscription:', error);
    return null;
  }
}

/**
 * Update user subscription record
 */
async function updateUserSubscription(subscriptionId: string, updates: any) {
  try {
    console.log('🔄 [MercadoPago Public Webhook] Updating subscription:', {
      subscriptionId,
      updates
    });
    
    // Use the existing Firebase service method
    await firebaseDB.subscriptions.update(subscriptionId, updates);
    
    console.log('✅ [MercadoPago Public Webhook] Subscription updated successfully');
  } catch (error) {
    console.error('❌ [MercadoPago Public Webhook] Error updating user subscription:', error);
    throw error;
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

/**
 * Test endpoint for webhook accessibility
 */
export async function GET() {
  console.log('🔍 [MercadoPago Public Webhook] GET request received - testing public webhook endpoint');
  return NextResponse.json({ 
    message: 'MercadoPago public webhook endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    accessible: true
  });
}