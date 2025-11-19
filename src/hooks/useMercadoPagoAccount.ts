'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';

interface MercadoPagoAccount {
  id: string;
  mercadoPagoUserId: string;
  nickname: string;
  email: string;
  country: string;
  scope: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MercadoPagoAccountStatus {
  hasAccount: boolean;
  isActive: boolean;
  isTokenValid: boolean;
  account?: MercadoPagoAccount;
  message?: string;
}

export function useMercadoPagoAccount() {
  const { user } = useAuth();
  const [accountStatus, setAccountStatus] = useState<MercadoPagoAccountStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAccountStatus = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/mercadopago/account/status?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check account status');
      }

      setAccountStatus(data);
    } catch (err) {
      console.error('Error checking MercadoPago account status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const initiateOAuth = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/mercadopago/oauth/authorize?userId=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate OAuth');
      }

      // Redirect to MercadoPago OAuth
      window.location.href = data.authUrl;
    } catch (err) {
      console.error('Error initiating OAuth:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const disconnectAccount = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/mercadopago/account/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect account');
      }

      // Refresh account status
      await checkAccountStatus();
    } catch (err) {
      console.error('Error disconnecting account:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    checkAccountStatus();
  }, [user?.id]);

  return {
    accountStatus,
    loading,
    error,
    checkAccountStatus,
    initiateOAuth,
    disconnectAccount,
    hasActiveAccount: accountStatus?.hasAccount && accountStatus?.isActive && accountStatus?.isTokenValid,
  };
}
