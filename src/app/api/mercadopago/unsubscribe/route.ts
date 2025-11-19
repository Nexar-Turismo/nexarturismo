import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';
import { authMiddleware } from '@/services/authMiddleware';
import { globalAuthMiddleware } from '@/services/globalAuthMiddleware';

/**
 * Cancel user subscription and delete all user data
 * POST /api/mercadopago/unsubscribe
 * body: { userId: string, subscriptionId: string, mercadoPagoSubscriptionId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscriptionId, mercadoPagoSubscriptionId } = body;

    if (!userId || !subscriptionId || !mercadoPagoSubscriptionId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, subscriptionId, mercadoPagoSubscriptionId' },
        { status: 400 }
      );
    }

    console.log('🔄 [Unsubscribe] Processing unsubscribe request:', {
      userId,
      subscriptionId,
      mercadoPagoSubscriptionId
    });

    // Step 1: Update subscription status to cancelled
    await firebaseDB.subscriptions.update(subscriptionId, {
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        cancelledBy: 'user_request',
        cancelledAt: new Date()
      }
    });

    console.log('✅ [Unsubscribe] Subscription marked as cancelled');

    // Step 2: Delete all user posts
    const userPosts = await firebaseDB.posts.getByUserId(userId);
    console.log(`🗑️ [Unsubscribe] Found ${userPosts.length} posts to delete`);

    for (const post of userPosts) {
      try {
        await firebaseDB.posts.delete(post.id);
        console.log(`✅ [Unsubscribe] Deleted post: ${post.id}`);
      } catch (error) {
        console.error(`❌ [Unsubscribe] Error deleting post ${post.id}:`, error);
      }
    }

    // Step 3: Delete all user bookings
    const userBookings = await firebaseDB.bookings.getByUserId(userId);
    console.log(`🗑️ [Unsubscribe] Found ${userBookings.length} bookings to delete`);

    for (const booking of userBookings) {
      try {
        await firebaseDB.bookings.delete(booking.id);
        console.log(`✅ [Unsubscribe] Deleted booking: ${booking.id}`);
      } catch (error) {
        console.error(`❌ [Unsubscribe] Error deleting booking ${booking.id}:`, error);
      }
    }

    // Step 4: Delete MercadoPago account documents
    try {
      console.log('🔄 [Unsubscribe] Deleting MercadoPago account documents');
      
      // Delete all MercadoPago account documents for this user
      await firebaseDB.mercadoPagoAccounts.deleteByUserId(userId);
      
      // Also remove from old marketplaceConnections collection if exists
      const connectionsRef = firebaseDB.db.collection('marketplaceConnections');
      const connectionsSnapshot = await connectionsRef
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();
      
      for (const doc of connectionsSnapshot.docs) {
        await doc.ref.update({
          isActive: false,
          disconnectedAt: new Date(),
          disconnectedBy: 'unsubscribe'
        });
      }
      
      console.log('✅ [Unsubscribe] MercadoPago account documents deleted');
    } catch (error) {
      console.error('❌ [Unsubscribe] Error deleting MercadoPago account documents:', error);
    }

    // Step 5: Remove publisher role and update user roles
    try {
      // Clear user cache
      globalAuthMiddleware.clearUserCache(userId);
      
      // Explicitly remove publisher role
      console.log('🔄 [Unsubscribe] Removing publisher role from user');
      await firebaseDB.users.removeRole(userId, 'publisher');
      
      // Ensure client role exists
      const user = await firebaseDB.users.getById(userId);
      const hasClientRole = user?.roles?.some((role: any) => role.roleName === 'client' && role.isActive);
      
      if (!hasClientRole) {
        console.log('✅ [Unsubscribe] Adding client role to user');
        await firebaseDB.users.assignRole(userId, 'client', 'unsubscribe-middleware');
      }
      
      console.log('✅ [Unsubscribe] User roles updated');
    } catch (error) {
      console.error('❌ [Unsubscribe] Error updating user roles:', error);
    }

    // Step 6: Cancel subscription in MercadoPago
    try {
      const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
      if (accessToken && mercadoPagoSubscriptionId) {
        console.log('🔄 [Unsubscribe] Cancelling subscription in MercadoPago:', mercadoPagoSubscriptionId);
        
        // Use direct API call to cancel subscription
        const response = await fetch(`https://api.mercadopago.com/preapproval/${mercadoPagoSubscriptionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ 
            status: 'cancelled'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [Unsubscribe] MercadoPago API error:', response.status, errorText);
          throw new Error(`MercadoPago API error: ${response.status}`);
        }
        
        console.log('✅ [Unsubscribe] Subscription cancelled in MercadoPago');
      } else {
        console.log('⚠️ [Unsubscribe] No access token or subscription ID - skipping MercadoPago cancellation');
      }
    } catch (error) {
      console.error('❌ [Unsubscribe] Error cancelling subscription in MercadoPago:', error);
      // Don't fail the entire process if MercadoPago cancellation fails
    }

    console.log('✅ [Unsubscribe] Unsubscribe process completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled and user data deleted successfully',
      deletedItems: {
        posts: userPosts.length,
        bookings: userBookings.length
      }
    });

  } catch (error) {
    console.error('❌ [Unsubscribe] Error processing unsubscribe:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process unsubscribe request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
