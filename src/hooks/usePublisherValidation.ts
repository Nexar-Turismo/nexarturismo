import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

interface PublisherValidationResult {
  isValid: boolean;
  hasActiveSubscription: boolean;
  hasMarketplaceConnection: boolean;
  subscriptionPlan?: string;
  postLimit?: number;
  currentPostsCount?: number;
  remainingPosts?: number;
  errors: string[];
}

export function usePublisherValidation() {
  const { user } = useAuth();
  const [validation, setValidation] = useState<PublisherValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePublisher = async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      setError('User not found');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mercadopago/marketplace/validate-publisher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: targetUserId }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate publisher requirements');
      }

      const result = await response.json();
      setValidation(result.validation);
      return result.validation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      setError(errorMessage);
      console.error('Publisher validation error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refreshValidation = () => {
    if (user?.id) {
      validatePublisher();
    }
  };

  // Auto-validate when user changes
  useEffect(() => {
    if (user?.id) {
      validatePublisher();
    } else {
      setValidation(null);
    }
  }, [user?.id]);

  return {
    validation,
    loading,
    error,
    validatePublisher,
    refreshValidation,
    isValid: validation?.isValid ?? false,
    hasActiveSubscription: validation?.hasActiveSubscription ?? false,
    hasMarketplaceConnection: validation?.hasMarketplaceConnection ?? false,
    postLimit: validation?.postLimit,
    currentPostsCount: validation?.currentPostsCount,
    remainingPosts: validation?.remainingPosts,
    errors: validation?.errors ?? []
  };
}
