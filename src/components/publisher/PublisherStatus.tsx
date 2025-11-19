'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  CreditCard, 
  Link, 
  FileText,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
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

interface PublisherStatusProps {
  onStatusChange?: (isValid: boolean) => void;
  showDetails?: boolean;
  compact?: boolean;
}

export default function PublisherStatus({ 
  onStatusChange, 
  showDetails = true, 
  compact = false 
}: PublisherStatusProps) {
  const { user } = useAuth();
  const [validation, setValidation] = useState<PublisherValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkPublisherStatus = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/mercadopago/marketplace/validate-publisher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const result = await response.json();
        setValidation(result.validation);
        setLastChecked(new Date());
        onStatusChange?.(result.validation.isValid);
      } else {
        console.error('Failed to validate publisher status');
      }
    } catch (error) {
      console.error('Error checking publisher status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkPublisherStatus();
  }, [user]);

  if (!user) {
    return null;
  }

  if (loading && !validation) {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-gray-600">Checking publisher status...</span>
      </div>
    );
  }

  if (!validation) {
    return null;
  }

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getSubscriptionStatus = () => {
    if (validation.hasActiveSubscription) {
      return (
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-700">
            Active Subscription: {validation.subscriptionPlan}
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-2">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">No Active Subscription</span>
        </div>
      );
    }
  };

  const getMarketplaceStatus = () => {
    if (validation.hasMarketplaceConnection) {
      return (
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-700">MercadoPago Connected</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-2">
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">MercadoPago Not Connected</span>
        </div>
      );
    }
  };

  const getPostLimitsStatus = () => {
    if (validation.postLimit !== undefined && validation.currentPostsCount !== undefined) {
      const remaining = validation.remainingPosts || 0;
      const isNearLimit = remaining <= 3;
      
      return (
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-blue-500" />
          <span className={`text-sm ${isNearLimit ? 'text-amber-700' : 'text-blue-700'}`}>
            Posts: {validation.currentPostsCount}/{validation.postLimit} 
            ({remaining} remaining)
          </span>
        </div>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {getStatusIcon(validation.isValid)}
        <span className={`text-sm ${validation.isValid ? 'text-green-700' : 'text-red-700'}`}>
          {validation.isValid ? 'Ready to Publish' : 'Setup Required'}
        </span>
        <button
          onClick={checkPublisherStatus}
          disabled={loading}
          className="ml-2 p-1 hover:bg-gray-100 rounded"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg border ${
        validation.isValid ? 'border-green-200' : 'border-red-200'
      } p-4`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {getStatusIcon(validation.isValid)}
          <h3 className="text-lg font-semibold">
            {validation.isValid ? 'Publisher Status: Ready' : 'Publisher Status: Setup Required'}
          </h3>
        </div>
        <button
          onClick={checkPublisherStatus}
          disabled={loading}
          className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {showDetails && (
        <div className="space-y-3">
          {/* Subscription Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium">Subscription</span>
            </div>
            {getSubscriptionStatus()}
          </div>

          {/* Marketplace Connection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Link className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium">MercadoPago</span>
            </div>
            {getMarketplaceStatus()}
          </div>

          {/* Post Limits */}
          {validation.postLimit !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium">Post Limits</span>
              </div>
              {getPostLimitsStatus()}
            </div>
          )}

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">Issues to Resolve</span>
              </div>
              <ul className="text-sm text-red-600 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          {!validation.isValid && (
            <div className="mt-4 flex space-x-2">
              {!validation.hasActiveSubscription && (
                <a
                  href="/suscribirse"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Subscribe to Plan</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {!validation.hasMarketplaceConnection && (
                <a
                  href="/settings"
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors"
                >
                  <Link className="h-4 w-4" />
                  <span>Connect MercadoPago</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {lastChecked && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        </div>
      )}
    </motion.div>
  );
}
