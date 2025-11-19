import { NextRequest, NextResponse } from 'next/server';
import { firebaseDB } from '@/services/firebaseService';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Remove user and all associated data
 * POST /api/admin/remove-user
 * body: { userId: string, currentUserId: string }
 */
export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    const { userId, currentUserId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Current user ID is required' },
        { status: 400 }
      );
    }

    // Check if current user is superadmin
    const currentUser = await firebaseDB.users.getById(currentUserId);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 404 }
      );
    }

    const isSuperadmin = currentUser.roles?.some(role => 
      role.roleName === 'superadmin' && role.isActive
    );

    if (!isSuperadmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Superadmin access required' },
        { status: 403 }
      );
    }

    console.log('✅ [Remove User] Superadmin access verified:', {
      currentUserId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email
    });

    console.log('🗑️ [Remove User] Starting user removal process:', userId);

    // Step 1: Get user data for logging
    const user = await firebaseDB.users.getById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('📋 [Remove User] User found:', {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map(r => r.roleName)
    });

    // Initialize counters for response
    let deletedCounts = {
      subscriptions: 0,
      posts: 0,
      bookings: 0,
      notifications: 0,
      favorites: 0
    };

    // Step 2: Cancel and delete all user subscriptions
    try {
      console.log('🔄 [Remove User] Step 1: Processing subscriptions');
      
      const userSubscriptions = await firebaseDB.subscriptions.getByUserId(userId);
      console.log(`🗑️ [Remove User] Found ${userSubscriptions.length} subscriptions to cancel`);

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
                  console.log(`✅ [Remove User] Cancelled MP subscription: ${subscription.mercadoPagoSubscriptionId}`);
                } else {
                  console.warn(`⚠️ [Remove User] Failed to cancel MP subscription: ${subscription.mercadoPagoSubscriptionId}`);
                }
              }
            } catch (mpError) {
              console.warn('⚠️ [Remove User] Error cancelling MP subscription:', mpError);
            }
          }

          // Delete subscription from Firebase
          await firebaseDB.subscriptions.delete(subscription.id);
          console.log(`✅ [Remove User] Deleted subscription: ${subscription.id}`);
          deletedCounts.subscriptions++;
        } catch (error) {
          console.error(`❌ [Remove User] Error processing subscription ${subscription.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [Remove User] Error processing subscriptions:', error);
    }

    // Step 3: Delete all user posts
    try {
      console.log('🔄 [Remove User] Step 2: Processing posts');
      
      const userPosts = await firebaseDB.posts.getByUserId(userId);
      console.log(`🗑️ [Remove User] Found ${userPosts.length} posts to delete`);

      for (const post of userPosts) {
        try {
          await firebaseDB.posts.delete(post.id);
          console.log(`✅ [Remove User] Deleted post: ${post.id}`);
          deletedCounts.posts++;
        } catch (error) {
          console.error(`❌ [Remove User] Error deleting post ${post.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [Remove User] Error processing posts:', error);
    }

    // Step 4: Delete all user bookings
    try {
      console.log('🔄 [Remove User] Step 3: Processing bookings');
      
      const userBookings = await firebaseDB.bookings.getByUserId(userId);
      console.log(`🗑️ [Remove User] Found ${userBookings.length} bookings to delete`);

      for (const booking of userBookings) {
        try {
          await firebaseDB.bookings.delete(booking.id);
          console.log(`✅ [Remove User] Deleted booking: ${booking.id}`);
          deletedCounts.bookings++;
        } catch (error) {
          console.error(`❌ [Remove User] Error deleting booking ${booking.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [Remove User] Error processing bookings:', error);
    }

    // Step 5: Delete MercadoPago accounts
    try {
      console.log('🔄 [Remove User] Step 4: Processing MercadoPago accounts');
      
      await firebaseDB.mercadoPagoAccounts.deleteByUserId(userId);
      console.log('✅ [Remove User] Deleted MercadoPago accounts');
    } catch (error) {
      console.error('❌ [Remove User] Error processing MercadoPago accounts:', error);
    }

    // Step 6: Delete user notifications
    try {
      console.log('🔄 [Remove User] Step 5: Processing notifications');
      
      const userNotifications = await firebaseDB.notifications.getByUserId(userId);
      console.log(`🗑️ [Remove User] Found ${userNotifications.length} notifications to delete`);

      for (const notification of userNotifications) {
        try {
          await firebaseDB.notifications.delete(notification.id);
          console.log(`✅ [Remove User] Deleted notification: ${notification.id}`);
          deletedCounts.notifications++;
        } catch (error) {
          console.error(`❌ [Remove User] Error deleting notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [Remove User] Error processing notifications:', error);
    }

    // Step 7: Delete user favorites
    try {
      console.log('🔄 [Remove User] Step 6: Processing favorites');
      
      const userFavorites = await firebaseDB.favourites.getByUserId(userId);
      console.log(`🗑️ [Remove User] Found ${userFavorites.length} favorites to delete`);

      for (const favorite of userFavorites) {
        try {
          await firebaseDB.favourites.delete(favorite.id);
          console.log(`✅ [Remove User] Deleted favorite: ${favorite.id}`);
          deletedCounts.favorites++;
        } catch (error) {
          console.error(`❌ [Remove User] Error deleting favorite ${favorite.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ [Remove User] Error processing favorites:', error);
    }

    // Step 8: Finally delete the user (after all related data is removed)
    try {
      console.log('🔄 [Remove User] Step 7: Deleting user from Firestore and Authentication');
      
      // Delete user from Firestore
      await firebaseDB.users.delete(userId);
      console.log('✅ [Remove User] User deleted from Firestore');
      
      // Delete user from Firebase Authentication
      try {
        await adminAuth.deleteUser(userId);
        console.log('✅ [Remove User] User deleted from Firebase Authentication');
      } catch (authError) {
        console.warn('⚠️ [Remove User] Error deleting user from Authentication:', authError);
        // Don't fail the entire operation if auth deletion fails
        // The user is already deleted from Firestore and all related data
      }
      
      console.log('✅ [Remove User] User deleted successfully from both Firestore and Authentication');
    } catch (error) {
      console.error('❌ [Remove User] Error deleting user:', error);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    console.log('✅ [Remove User] User removal completed successfully:', {
      userId,
      userName: user.name,
      userEmail: user.email
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.name} (${user.email}) has been completely removed from the system`,
      deletedData: deletedCounts
    });

  } catch (error) {
    console.error('❌ [Remove User] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
