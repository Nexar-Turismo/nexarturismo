'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link, 
  Check, 
  X, 
  AlertCircle, 
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface MarketplaceConnectionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  isOpen: boolean;
}

export default function MarketplaceConnectionForm({ 
  onSuccess, 
  onCancel, 
  isOpen 
}: MarketplaceConnectionFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    mercadoPagoUserId: '',
    mercadoPagoAccessToken: '',
    mercadoPagoPublicKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showTokens, setShowTokens] = useState({
    accessToken: false,
    publicKey: false
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const toggleTokenVisibility = (field: 'accessToken' | 'publicKey') => {
    setShowTokens(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to connect your MercadoPago account');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mercadopago/marketplace/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          ...formData
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to connect MercadoPago account');
      }

      setSuccess(true);
      console.log('✅ Marketplace connection established:', result.connectionId);
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.();
      }, 2000);

    } catch (error) {
      console.error('❌ Marketplace connection error:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect MercadoPago account');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      mercadoPagoUserId: '',
      mercadoPagoAccessToken: '',
      mercadoPagoPublicKey: ''
    });
    setError(null);
    setSuccess(false);
    onCancel?.();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Link className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Connect MercadoPago Account
                </h2>
              </div>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {success ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Connection Successful!
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your MercadoPago account has been connected successfully. You can now create posts and receive payments.
                </p>
                <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Redirecting...</span>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-4">
                    To create posts and receive payments, you need to connect your MercadoPago account. 
                    Get your credentials from your{' '}
                    <a 
                      href="https://www.mercadopago.com/developers/panel/credentials" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline inline-flex items-center space-x-1"
                    >
                      <span>MercadoPago Developer Panel</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>

                <div>
                  <label htmlFor="mercadoPagoUserId" className="block text-sm font-medium text-gray-700 mb-1">
                    MercadoPago User ID
                  </label>
                  <input
                    type="text"
                    id="mercadoPagoUserId"
                    value={formData.mercadoPagoUserId}
                    onChange={(e) => handleInputChange('mercadoPagoUserId', e.target.value)}
                    placeholder="Your MercadoPago User ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="mercadoPagoAccessToken" className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={showTokens.accessToken ? 'text' : 'password'}
                      id="mercadoPagoAccessToken"
                      value={formData.mercadoPagoAccessToken}
                      onChange={(e) => handleInputChange('mercadoPagoAccessToken', e.target.value)}
                      placeholder="APP_USR-xxxxxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxx"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => toggleTokenVisibility('accessToken')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showTokens.accessToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="mercadoPagoPublicKey" className="block text-sm font-medium text-gray-700 mb-1">
                    Public Key
                  </label>
                  <div className="relative">
                    <input
                      type={showTokens.publicKey ? 'text' : 'password'}
                      id="mercadoPagoPublicKey"
                      value={formData.mercadoPagoPublicKey}
                      onChange={(e) => handleInputChange('mercadoPagoPublicKey', e.target.value)}
                      placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => toggleTokenVisibility('publicKey')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showTokens.publicKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md"
                  >
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-700">{error}</span>
                  </motion.div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Link className="h-4 w-4" />
                        <span>Connect Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
