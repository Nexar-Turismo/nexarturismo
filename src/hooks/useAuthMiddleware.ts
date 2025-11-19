import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { UserWithSubscription } from '@/services/authMiddleware';

export interface AuthMiddlewareResult {
  userStatus: UserWithSubscription | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  checkPermission: (action: 'create_post' | 'create_booking' | 'publish') => Promise<{
    allowed: boolean;
    reason?: string;
  }>;
}

/**
 * React hook that uses the auth middleware to manage user roles and permissions
 */
export function useAuthMiddleware(): AuthMiddlewareResult {
  const { user } = useAuth();
  const [userStatus, setUserStatus] = useState<UserWithSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUserStatus = async () => {
    if (!user?.uid) {
      setUserStatus(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/middleware/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        throw new Error('Failed to check user status');
      }

      const result = await response.json();
      setUserStatus(result.userStatus);
    } catch (err) {
      console.error('Error checking user status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermission = async (action: 'create_post' | 'create_booking' | 'publish') => {
    if (!user?.uid) {
      return { allowed: false, reason: 'User not authenticated' };
    }

    try {
      const response = await fetch('/api/auth/middleware/check-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.uid, 
          action 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check permission');
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error checking permission:', err);
      return { 
        allowed: false, 
        reason: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  };

  const refresh = async () => {
    await checkUserStatus();
  };

  // Check user status when user changes
  useEffect(() => {
    checkUserStatus();
  }, [user?.uid]);

  return {
    userStatus,
    isLoading,
    error,
    refresh,
    checkPermission,
  };
}
