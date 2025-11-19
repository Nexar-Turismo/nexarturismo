import { subscriptionService } from './subscriptionService';
import { firebaseDB } from './firebaseService';

export interface UserWithSubscription {
  id: string;
  email: string;
  name: string;
  roles: Array<{
    roleId: string;
    roleName: string;
    assignedAt: Date;
    isActive: boolean;
  }>;
  hasActiveSubscription: boolean;
  subscription?: {
    id: string;
    planName: string;
    status: string;
    remainingPosts: number;
    remainingBookings: number;
  };
  isPublisher: boolean;
  canCreatePosts: boolean;
  canCreateBookings: boolean;
}

/**
 * Auth Middleware Service
 * Dynamically manages user roles based on subscription status
 */
class AuthMiddlewareService {
  
  /**
   * Check and update user roles based on subscription status
   */
  async checkUserSubscriptionAndRoles(userId: string): Promise<UserWithSubscription> {
    try {
      console.log('🔍 [Auth Middleware] Checking subscription and roles for user:', userId);

      // Get user data
      const user = await firebaseDB.users.getById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check subscription status
      const subscriptionValidation = await subscriptionService.validatePublisherSubscription(userId);
      
      const hasActiveSubscription = subscriptionValidation.hasActiveSubscription;
      const currentRoles = user.roles || [];
      
      // Check current role assignments
      const hasClientRole = currentRoles.some(role => role.roleName === 'client' && role.isActive);
      const hasPublisherRole = currentRoles.some(role => role.roleName === 'publisher' && role.isActive);
      const hasSuperadminRole = currentRoles.some(role => role.roleName === 'superadmin' && role.isActive);
      
      console.log('📊 [Auth Middleware] Current roles:', {
        hasClientRole,
        hasPublisherRole,
        hasSuperadminRole,
        hasActiveSubscription
      });
      
      // Update user roles based on subscription status
      await this.updateUserRoles(userId, {
        hasActiveSubscription,
        hasClientRole,
        hasPublisherRole,
        hasSuperadminRole,
        currentRoles
      });

      // Build user with subscription info
      const userWithSubscription: UserWithSubscription = {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles || [],
        hasActiveSubscription,
        subscription: subscriptionValidation.subscription ? {
          id: subscriptionValidation.subscription.id,
          planName: subscriptionValidation.subscription.planName,
          status: subscriptionValidation.subscription.status,
          remainingPosts: subscriptionValidation.remainingPosts || 0,
          remainingBookings: subscriptionValidation.remainingBookings || 0,
        } : undefined,
        isPublisher: hasActiveSubscription,
        canCreatePosts: hasActiveSubscription && (subscriptionValidation.remainingPosts || 0) > 0,
        canCreateBookings: hasActiveSubscription && (subscriptionValidation.remainingBookings || 0) > 0,
      };

      console.log('📊 [Auth Middleware] User status:', {
        userId,
        hasActiveSubscription,
        isPublisher: userWithSubscription.isPublisher,
        canCreatePosts: userWithSubscription.canCreatePosts,
        canCreateBookings: userWithSubscription.canCreateBookings,
        remainingPosts: userWithSubscription.subscription?.remainingPosts,
        remainingBookings: userWithSubscription.subscription?.remainingBookings
      });

      return userWithSubscription;

    } catch (error) {
      console.error('❌ [Auth Middleware] Error checking user subscription:', error);
      throw error;
    }
  }

  /**
   * Update user roles based on subscription status and current roles
   */
  private async updateUserRoles(
    userId: string, 
    roleInfo: {
      hasActiveSubscription: boolean;
      hasClientRole: boolean;
      hasPublisherRole: boolean;
      hasSuperadminRole: boolean;
      currentRoles: any[];
    }
  ): Promise<void> {
    const { hasActiveSubscription, hasClientRole, hasPublisherRole, hasSuperadminRole } = roleInfo;

    try {
      // Superadmin users are not affected by subscription status
      if (hasSuperadminRole) {
        console.log('👑 [Auth Middleware] Superadmin user - no role changes needed');
        return;
      }

      if (hasActiveSubscription) {
        // User has active subscription - should have BOTH client and publisher roles
        
        if (!hasClientRole) {
          console.log('✅ [Auth Middleware] Adding client role to user with active subscription');
          await firebaseDB.users.assignRole(userId, 'client', 'subscription-middleware');
        }
        
        if (!hasPublisherRole) {
          console.log('✅ [Auth Middleware] Adding publisher role to user with active subscription');
          await firebaseDB.users.assignRole(userId, 'publisher', 'subscription-middleware');
        }
        
      } else {
        // User has no active subscription - should have ONLY client role
        
        if (hasPublisherRole) {
          console.log('❌ [Auth Middleware] Removing publisher role from user without active subscription');
          await this.removePublisherRoleAndDeactivatePosts(userId);
        }
        
        if (!hasClientRole) {
          console.log('✅ [Auth Middleware] Adding client role to user without active subscription');
          await firebaseDB.users.assignRole(userId, 'client', 'subscription-middleware');
        }
      }

      console.log('✅ [Auth Middleware] Role update completed for user:', userId);
    } catch (error) {
      console.error('❌ [Auth Middleware] Error updating user roles:', error);
      throw error;
    }
  }

  /**
   * Check if user has publisher role
   */
  private async checkPublisherRole(user: any, hasActiveSubscription: boolean): Promise<boolean> {
    const publisherRole = user.roles?.find((role: any) => 
      role.roleName === 'publisher' && role.isActive
    );
    return !!publisherRole;
  }

  /**
   * Remove publisher role and deactivate all user posts
   */
  private async removePublisherRoleAndDeactivatePosts(userId: string): Promise<void> {
    try {
      console.log('🔄 [Auth Middleware] Removing publisher role and deactivating posts for user:', userId);

      // Remove publisher role
      await firebaseDB.users.removeRole(userId, 'publisher', 'subscription-middleware');

      // Deactivate all user posts
      await this.deactivateUserPosts(userId);

      console.log('✅ [Auth Middleware] Publisher role removed and posts deactivated');
    } catch (error) {
      console.error('❌ [Auth Middleware] Error removing publisher role:', error);
      throw error;
    }
  }

  /**
   * Deactivate all posts for a user
   */
  private async deactivateUserPosts(userId: string): Promise<void> {
    try {
      console.log('📝 [Auth Middleware] Deactivating posts for user:', userId);

      // Get all user posts
      const userPosts = await firebaseDB.posts.getByUserId(userId);
      
      // Deactivate each post
      const deactivationPromises = userPosts.map(async (post) => {
        try {
          await firebaseDB.posts.update(post.id, {
            status: 'inactive',
            deactivatedAt: new Date(),
            deactivationReason: 'subscription_expired',
            updatedAt: new Date(),
            updatedBy: 'subscription-middleware'
          });
          console.log(`📝 [Auth Middleware] Post ${post.id} deactivated`);
        } catch (error) {
          console.error(`❌ [Auth Middleware] Error deactivating post ${post.id}:`, error);
        }
      });

      await Promise.all(deactivationPromises);
      
      console.log(`✅ [Auth Middleware] ${userPosts.length} posts deactivated for user ${userId}`);
    } catch (error) {
      console.error('❌ [Auth Middleware] Error deactivating user posts:', error);
      throw error;
    }
  }

  /**
   * Check if user can perform an action (create post, booking, etc.)
   */
  async checkUserPermission(userId: string, action: 'create_post' | 'create_booking' | 'publish'): Promise<{
    allowed: boolean;
    reason?: string;
    userStatus?: UserWithSubscription;
  }> {
    try {
      const userStatus = await this.checkUserSubscriptionAndRoles(userId);

      switch (action) {
        case 'create_post':
          if (!userStatus.hasActiveSubscription) {
            return {
              allowed: false,
              reason: 'Active subscription required to create posts',
              userStatus
            };
          }
          if (!userStatus.canCreatePosts) {
            return {
              allowed: false,
              reason: `Post limit reached. You can create up to ${userStatus.subscription?.remainingPosts || 0} more posts with your current plan.`,
              userStatus
            };
          }
          
          // Check MercadoPago account connection for publishers
          if (userStatus.isPublisher) {
            try {
              const mercadoPagoAccount = await firebaseDB.mercadoPagoAccounts.getByUserId(userId);
              if (!mercadoPagoAccount || !mercadoPagoAccount.isActive) {
                return {
                  allowed: false,
                  reason: 'MercadoPago account connection required to create posts and receive payments from bookings',
                  userStatus: {
                    ...userStatus,
                    mercadoPagoAccountRequired: true
                  }
                };
              }
            } catch (error) {
              console.error('❌ [Auth Middleware] Error checking MercadoPago account:', error);
              return {
                allowed: false,
                reason: 'Unable to verify MercadoPago account connection',
                userStatus
              };
            }
          }
          
          return { allowed: true, userStatus };

        case 'create_booking':
          if (!userStatus.hasActiveSubscription) {
            return {
              allowed: false,
              reason: 'Active subscription required to manage bookings',
              userStatus
            };
          }
          if (!userStatus.canCreateBookings) {
            return {
              allowed: false,
              reason: `Booking limit reached. You can manage up to ${userStatus.subscription?.remainingBookings || 0} more bookings with your current plan.`,
              userStatus
            };
          }
          return { allowed: true, userStatus };

        case 'publish':
          if (!userStatus.hasActiveSubscription) {
            return {
              allowed: false,
              reason: 'Active subscription required to publish content',
              userStatus
            };
          }
          return { allowed: true, userStatus };

        default:
          return { allowed: false, reason: 'Unknown action' };
      }
    } catch (error) {
      console.error('❌ [Auth Middleware] Error checking user permission:', error);
      return { allowed: false, reason: 'Error checking permissions' };
    }
  }

  /**
   * Get user status with subscription info (for dashboard, etc.)
   */
  async getUserStatus(userId: string): Promise<UserWithSubscription> {
    return await this.checkUserSubscriptionAndRoles(userId);
  }

  /**
   * Batch check multiple users (for admin purposes)
   */
  async checkMultipleUsers(userIds: string[]): Promise<Array<{ userId: string; status: UserWithSubscription }>> {
    const results = await Promise.allSettled(
      userIds.map(async (userId) => ({
        userId,
        status: await this.checkUserSubscriptionAndRoles(userId)
      }))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<{ userId: string; status: UserWithSubscription }> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }
}

export const authMiddleware = new AuthMiddlewareService();
