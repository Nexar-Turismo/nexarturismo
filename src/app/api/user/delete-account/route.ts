import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Delete user account and all associated data
 * POST /api/user/delete-account
 * body: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ [Delete Account] Starting account deletion:', userId);

    // Get user data for logging
    const user = await firebaseDB.users.getById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('📋 [Delete Account] User found:', {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map(r => r.roleName)
    });

    // Initialize counters
    let deletedCounts = {
      subscriptions: 0,
      posts: 0,
      bookings: 0,
      notifications: 0,
      favorites: 0
    };

    // Step 1: Cancel and delete all user subscriptions
    try {
      console.log('🔄 [Delete Account] Step 1: Processing subscriptions');
      
      const userSubscriptions = await firebaseDB.subscriptions.getByUserId(userId);
      console.log(`🗑️ [Delete Account] Found ${userSubscriptions.length} subscriptions to cancel`);

      for (const subscription of userSubscriptions) {
        try {
          // Cancel subscription in MercadoPago if it exists
          if (subscription.mercadoPagoSubscriptionId) {
            try {
              const accessToken = process.env.NEXAR_SUSCRIPTIONS_ACCESS_TOKEN;
              if (accessToken) {
                const response = await fetch(`https://api.mercadopago.com/preapproval/${subscription.mercadoPagoSubscriptionId}`, {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    status: 'cancelled'
                  })
                });

                if (response.ok) {
                  console.log(`✅ [Delete Account] Cancelled MP subscription: ${subscription.mercadoPagoSubscriptionId}`);
                } else {
                  console.warn(`⚠️ [Delete Account] Failed to cancel MP subscription: ${subscription.mercadoPagoSubscriptionId}`);
                }
              }
            } catch (mpError) {
              console.warn('⚠️ [Delete Account] Error cancelling MP subscription:', mpError);
            }
          }

          // Delete subscription from Firebase
          await firebaseDB.subscriptions.delete(subscription.id);
          console.log(`✅ [Delete Account] Deleted subscription: ${subscription.id}`);
          deletedCounts.subscriptions++;
        } catch (error) {
          console.error(`❌ [Delete Account] Error processing subscription ${subscription.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [Delete Account] Error processing subscriptions:', error);
    }

    // Step 2: Delete all user posts
    try {
      console.log('🔄 [Delete Account] Step 2: Processing posts');
      
      const userPosts = await firebaseDB.posts.getByUserId(userId);
      console.log(`🗑️ [Delete Account] Found ${userPosts.length} posts to delete`);

      for (const post of userPosts) {
        try {
          await firebaseDB.posts.delete(post.id);
          console.log(`✅ [Delete Account] Deleted post: ${post.id}`);
          deletedCounts.posts++;
        } catch (error) {
          console.error(`❌ [Delete Account] Error deleting post ${post.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [Delete Account] Error processing posts:', error);
    }

    // Step 3: Delete all user bookings
    try {
      console.log('🔄 [Delete Account] Step 3: Processing bookings');
      
      const userBookings = await firebaseDB.bookings.getByUserId(userId);
      console.log(`🗑️ [Delete Account] Found ${userBookings.length} bookings to delete`);

      for (const booking of userBookings) {
        try {
          await firebaseDB.bookings.delete(booking.id);
          console.log(`✅ [Delete Account] Deleted booking: ${booking.id}`);
          deletedCounts.bookings++;
        } catch (error) {
          console.error(`❌ [Delete Account] Error deleting booking ${booking.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [Delete Account] Error processing bookings:', error);
    }

    // Step 4: Delete MercadoPago accounts
    try {
      console.log('🔄 [Delete Account] Step 4: Processing MercadoPago accounts');
      
      await firebaseDB.mercadoPagoAccounts.deleteByUserId(userId);
      console.log('✅ [Delete Account] Deleted MercadoPago accounts');
    } catch (error) {
      console.error('❌ [Delete Account] Error processing MercadoPago accounts:', error);
    }

    // Step 5: Delete user notifications
    try {
      console.log('🔄 [Delete Account] Step 5: Processing notifications');
      
      const userNotifications = await firebaseDB.notifications.getByUserId(userId);
      console.log(`🗑️ [Delete Account] Found ${userNotifications.length} notifications to delete`);

      for (const notification of userNotifications) {
        try {
          await firebaseDB.notifications.delete(notification.id);
          console.log(`✅ [Delete Account] Deleted notification: ${notification.id}`);
          deletedCounts.notifications++;
        } catch (error) {
          console.error(`❌ [Delete Account] Error deleting notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [Delete Account] Error processing notifications:', error);
    }

    // Step 6: Delete user favorites
    try {
      console.log('🔄 [Delete Account] Step 6: Processing favorites');
      
      const userFavorites = await firebaseDB.favourites.getByUserId(userId);
      console.log(`🗑️ [Delete Account] Found ${userFavorites.length} favorites to delete`);

      for (const favorite of userFavorites) {
        try {
          await firebaseDB.favourites.delete(favorite.id);
          console.log(`✅ [Delete Account] Deleted favorite: ${favorite.id}`);
          deletedCounts.favorites++;
        } catch (error) {
          console.error(`❌ [Delete Account] Error deleting favorite ${favorite.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [Delete Account] Error processing favorites:', error);
    }

    // Step 7: Finally delete the user
    try {
      console.log('🔄 [Delete Account] Step 7: Deleting user from Firestore and Authentication');
      
      // Delete user from Firestore
      await firebaseDB.users.delete(userId);
      console.log('✅ [Delete Account] User deleted from Firestore');
      
      // Delete user from Firebase Authentication
      try {
        await adminAuth.deleteUser(userId);
        console.log('✅ [Delete Account] User deleted from Firebase Authentication');
      } catch (authError) {
        console.warn('⚠️ [Delete Account] Error deleting user from Authentication:', authError);
      }
      
      console.log('✅ [Delete Account] User deleted successfully');
    } catch (error) {
      console.error('❌ [Delete Account] Error deleting user:', error);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    console.log('✅ [Delete Account] Account deletion completed successfully:', {
      userId,
      userName: user.name,
      userEmail: user.email
    });

    return NextResponse.json({
      success: true,
      message: 'Cuenta eliminada correctamente',
      deletedData: deletedCounts
    });

  } catch (error) {
    console.error('❌ [Delete Account] Error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la cuenta' },
      { status: 500 }
    );
  }
}

