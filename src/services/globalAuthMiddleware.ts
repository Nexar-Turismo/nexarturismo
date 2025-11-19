import { authMiddleware } from './authMiddleware';

/**
 * Global Auth Middleware Service
 * Handles authentication and role management across the entire app
 */
class GlobalAuthMiddlewareService {
  private static instance: GlobalAuthMiddlewareService;
  private userCache = new Map<string, { 
    lastChecked: number; 
    userStatus: any; 
    isChecking: boolean;
  }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): GlobalAuthMiddlewareService {
    if (!GlobalAuthMiddlewareService.instance) {
      GlobalAuthMiddlewareService.instance = new GlobalAuthMiddlewareService();
    }
    return GlobalAuthMiddlewareService.instance;
  }

  /**
   * Check user authentication and roles globally
   * This should be called whenever the user context changes
   */
  async checkGlobalUserStatus(userId: string): Promise<any> {
    if (!userId) {
      return null;
    }

    // Check cache first
    const cached = this.userCache.get(userId);
    const now = Date.now();
    
    if (cached && (now - cached.lastChecked) < this.CACHE_DURATION) {
      console.log('📦 [Global Auth Middleware] Using cached user status for:', userId);
      return cached.userStatus;
    }

    // Prevent multiple simultaneous checks for the same user
    if (cached?.isChecking) {
      console.log('⏳ [Global Auth Middleware] User status check already in progress for:', userId);
      // Wait for the existing check to complete
      await this.waitForCheck(userId);
      const updatedCache = this.userCache.get(userId);
      return updatedCache?.userStatus;
    }

    try {
      // Mark as checking
      this.userCache.set(userId, {
        lastChecked: now,
        userStatus: cached?.userStatus || null,
        isChecking: true
      });

      console.log('🔄 [Global Auth Middleware] Checking user status for:', userId);

      // Use the auth middleware to check and update roles
      const userStatus = await authMiddleware.checkUserSubscriptionAndRoles(userId);

      // Update cache
      this.userCache.set(userId, {
        lastChecked: now,
        userStatus,
        isChecking: false
      });

      console.log('✅ [Global Auth Middleware] User status updated:', {
        userId,
        hasActiveSubscription: userStatus.hasActiveSubscription,
        isPublisher: userStatus.isPublisher,
        roles: userStatus.roles?.map((r: any) => r.roleName)
      });

      return userStatus;

    } catch (error) {
      console.error('❌ [Global Auth Middleware] Error checking user status:', error);
      
      // Update cache with error state
      this.userCache.set(userId, {
        lastChecked: now,
        userStatus: null,
        isChecking: false
      });

      return null;
    }
  }

  /**
   * Wait for an ongoing check to complete
   */
  private async waitForCheck(userId: string, maxWait = 10000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < maxWait) {
      const cached = this.userCache.get(userId);
      if (!cached?.isChecking) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Clear cache for a specific user (useful after subscription changes)
   */
  clearUserCache(userId: string): void {
    console.log('🗑️ [Global Auth Middleware] Clearing cache for user:', userId);
    this.userCache.delete(userId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    console.log('🗑️ [Global Auth Middleware] Clearing all cache');
    this.userCache.clear();
  }

  /**
   * Force refresh user status (bypass cache)
   */
  async forceRefreshUserStatus(userId: string): Promise<any> {
    console.log('🔄 [Global Auth Middleware] Force refreshing user status for:', userId);
    this.clearUserCache(userId);
    return await this.checkGlobalUserStatus(userId);
  }

  /**
   * Check if user has permission for an action
   */
  async checkGlobalPermission(
    userId: string, 
    action: 'create_post' | 'create_booking' | 'publish'
  ): Promise<{ allowed: boolean; reason?: string; userStatus?: any }> {
    try {
      // First ensure user status is up to date
      await this.checkGlobalUserStatus(userId);
      
      // Then check permission using auth middleware
      return await authMiddleware.checkUserPermission(userId, action);
    } catch (error) {
      console.error('❌ [Global Auth Middleware] Error checking permission:', error);
      return { allowed: false, reason: 'Error checking permissions' };
    }
  }

  /**
   * Get cached user status without triggering a check
   */
  getCachedUserStatus(userId: string): any {
    const cached = this.userCache.get(userId);
    return cached?.userStatus || null;
  }

  /**
   * Check if user status is currently being fetched
   */
  isUserStatusLoading(userId: string): boolean {
    const cached = this.userCache.get(userId);
    return cached?.isChecking || false;
  }
}

export const globalAuthMiddleware = GlobalAuthMiddlewareService.getInstance();
