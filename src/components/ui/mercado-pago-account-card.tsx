'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useMercadoPagoAccount } from '@/hooks/useMercadoPagoAccount';

interface MercadoPagoAccountCardProps {
  onStatusChange?: (hasActiveAccount: boolean) => void;
}

export default function MercadoPagoAccountCard({ onStatusChange }: MercadoPagoAccountCardProps) {
  const { 
    accountStatus, 
    loading, 
    error, 
    checkAccountStatus, 
    initiateOAuth, 
    disconnectAccount,
    hasActiveAccount 
  } = useMercadoPagoAccount();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Notify parent component when status changes
  React.useEffect(() => {
    if (onStatusChange && accountStatus) {
      onStatusChange(hasActiveAccount);
    }
  }, [hasActiveAccount, onStatusChange]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await initiateOAuth();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectAccount();
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefresh = async () => {
    await checkAccountStatus();
  };

  if (loading && !accountStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Verificando cuenta de MercadoPago...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center">
            <XCircle className="h-6 w-6 text-red-500 mr-2" />
            <div>
              <p className="text-red-800 font-medium">Error al verificar cuenta</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!accountStatus?.hasAccount) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center text-yellow-800">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Cuenta de MercadoPago Requerida
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700 mb-4">
            Para crear publicaciones y recibir pagos de reservas, necesitas conectar tu cuenta de MercadoPago.
          </p>
          <Button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Conectar con MercadoPago
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (accountStatus.hasAccount && !accountStatus.isActive) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center text-red-800">
            <XCircle className="h-5 w-5 mr-2" />
            Cuenta Desconectada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700 mb-4">
            Tu cuenta de MercadoPago está desconectada. {accountStatus.message}
          </p>
          <div className="flex space-x-2">
            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reconectando...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Reconectar
                </>
              )}
            </Button>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Account is active and connected
  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center text-green-800">
            <CheckCircle className="h-5 w-5 mr-2" />
            Cuenta Conectada
          </div>
          <Badge className="bg-green-100 text-green-800">
            Activa
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Usuario:</span>
            <span className="font-medium">{accountStatus.account?.nickname}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Email:</span>
            <span className="font-medium">{accountStatus.account?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">País:</span>
            <span className="font-medium">{accountStatus.account?.country}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Conectado:</span>
            <span className="font-medium">
              {accountStatus.account?.createdAt ? 
                new Date(accountStatus.account.createdAt).toLocaleDateString('es-AR') : 
                'N/A'
              }
            </span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-green-200">
          <div className="flex space-x-2">
            <Button 
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desconectando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Desconectar
                </>
              )}
            </Button>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
