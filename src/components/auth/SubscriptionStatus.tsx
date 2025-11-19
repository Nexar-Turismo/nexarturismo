'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { UserWithSubscription } from '@/services/authMiddleware';

interface SubscriptionStatusProps {
  showDetails?: boolean;
  onRefresh?: () => void;
}

export default function SubscriptionStatus({ showDetails = true, onRefresh }: SubscriptionStatusProps) {
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
        throw new Error('Failed to check subscription status');
      }

      const result = await response.json();
      setUserStatus(result.userStatus);
    } catch (err) {
      console.error('Error checking subscription status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkUserStatus();
  }, [user?.uid]);

  const handleRefresh = async () => {
    await checkUserStatus();
    onRefresh?.();
  };

  if (!user) {
    return null;
  }

  if (isLoading && !userStatus) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Checking subscription status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-600">
        <XCircle className="h-4 w-4" />
        <span>Error checking subscription: {error}</span>
        <button
          onClick={handleRefresh}
          className="text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!userStatus) {
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <XCircle className="h-4 w-4" />
        <span>No subscription found</span>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (userStatus.hasActiveSubscription) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (userStatus.hasActiveSubscription) {
      return 'border-green-200 bg-green-50 text-green-800';
    } else {
      return 'border-red-200 bg-red-50 text-red-800';
    }
  };

  const getStatusText = () => {
    if (userStatus.hasActiveSubscription) {
      return 'Suscripción Activa';
    } else {
      return 'Sin Suscripción Activa';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 ${getStatusColor()}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="font-medium">{getStatusText()}</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {showDetails && userStatus.subscription && (
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Plan:</span>
            <span className="font-medium">{userStatus.subscription.planName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Estado:</span>
            <span className="font-medium capitalize">{userStatus.subscription.status}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Publicaciones restantes:</span>
            <span className="font-medium">{userStatus.subscription.remainingPosts}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Reservas restantes:</span>
            <span className="font-medium">{userStatus.subscription.remainingBookings}</span>
          </div>
        </div>
      )}

      {!userStatus.hasActiveSubscription && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">
                Suscripción requerida para publicar
              </p>
              <p className="text-yellow-700 mt-1">
                Necesitas una suscripción activa para crear y gestionar publicaciones.
              </p>
              <a
                href="/suscribirse"
                className="inline-block mt-2 text-blue-600 hover:underline font-medium"
              >
                Suscribirse ahora →
              </a>
            </div>
          </div>
        </div>
      )}

      {userStatus.hasActiveSubscription && userStatus.subscription && (
        <div className="mt-3 space-y-2">
          {userStatus.subscription.remainingPosts <= 2 && (
            <div className="flex items-center space-x-2 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                Te quedan pocas publicaciones ({userStatus.subscription.remainingPosts})
              </span>
            </div>
          )}
          
          {userStatus.subscription.remainingPosts === 0 && (
            <div className="flex items-center space-x-2 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">
                Has alcanzado el límite de publicaciones de tu plan
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
