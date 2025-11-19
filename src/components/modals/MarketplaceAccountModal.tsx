'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, X, Loader2, Shield, CheckCircle, AlertCircle, Eye, EyeOff, Copy } from 'lucide-react';

interface MarketplaceAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MarketplaceAccountResponse {
  isConfigured: boolean;
  credentials: {
    publicKey: string | null;
    accessToken: string | null;
    accessTokenMasked: string | null;
    appId: string | null;
    clientSecret: string | null;
    clientSecretMasked: string | null;
  };
}

export default function MarketplaceAccountModal({ isOpen, onClose }: MarketplaceAccountModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MarketplaceAccountResponse | null>(null);
  const [showSecrets, setShowSecrets] = useState({
    accessToken: false,
    clientSecret: false,
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/marketplace/account');
        if (!response.ok) {
          const { error: message } = await response.json().catch(() => ({ error: 'Error desconocido' }));
          throw new Error(message || 'No se pudo obtener la información del marketplace');
        }
        const result = (await response.json()) as MarketplaceAccountResponse;
        setData(result);
      } catch (err) {
        console.error('Error fetching marketplace account info:', err);
        setError(err instanceof Error ? err.message : 'Error inesperado al obtener la información');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShowSecrets({ accessToken: false, clientSecret: false });
      setCopiedField(null);
    }
  }, [isOpen]);

  const handleCopy = (label: string, value: string | null) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  if (!isOpen) return null;

  const getDisplayValue = (
    value: string | null,
    maskedValue: string | null,
    reveal: boolean
  ) => {
    if (!value) return 'No configurado';
    return reveal ? value : maskedValue || value;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Link className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  MercadoPago Marketplace
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Información de la cuenta principal utilizada para procesar los pagos del marketplace.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Cargando información del marketplace...
                </p>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    Error al cargar la información
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={`p-4 rounded-xl border ${
                    data?.isConfigured
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {data?.isConfigured ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {data?.isConfigured
                          ? 'Credenciales configuradas correctamente'
                          : 'Credenciales incompletas'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {data?.isConfigured
                          ? 'Los pagos del marketplace se procesarán con esta cuenta.'
                          : 'Verifica las variables de entorno para completar la configuración.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CredentialCard
                    label="Public Key"
                    value={data?.credentials.publicKey}
                    maskedValue={data?.credentials.publicKey}
                    reveal={true}
                    isSecret={false}
                    onToggle={() => {}}
                    onCopy={() => handleCopy('publicKey', data?.credentials.publicKey)}
                    copied={copiedField === 'publicKey'}
                  />
                  <CredentialCard
                    label="Access Token"
                    value={data?.credentials.accessToken}
                    maskedValue={data?.credentials.accessTokenMasked}
                    reveal={showSecrets.accessToken}
                    isSecret
                    onToggle={() =>
                      setShowSecrets((prev) => ({ ...prev, accessToken: !prev.accessToken }))
                    }
                    onCopy={() => handleCopy('accessToken', data?.credentials.accessToken)}
                    copied={copiedField === 'accessToken'}
                  />
                  <CredentialCard
                    label="App ID"
                    value={data?.credentials.appId}
                    maskedValue={data?.credentials.appId}
                    reveal
                    isSecret={false}
                    onToggle={() => {}}
                    onCopy={() => handleCopy('appId', data?.credentials.appId)}
                    copied={copiedField === 'appId'}
                  />
                  <CredentialCard
                    label="Client Secret"
                    value={data?.credentials.clientSecret}
                    maskedValue={data?.credentials.clientSecretMasked}
                    reveal={showSecrets.clientSecret}
                    isSecret
                    onToggle={() =>
                      setShowSecrets((prev) => ({ ...prev, clientSecret: !prev.clientSecret }))
                    }
                    onCopy={() => handleCopy('clientSecret', data?.credentials.clientSecret)}
                    copied={copiedField === 'clientSecret'}
                  />
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                    Recomendaciones de seguridad
                  </h4>
                  <ul className="text-xs text-blue-700 dark:text-blue-200 space-y-1">
                    <li>• Asegurate de actualizar estas credenciales únicamente desde entorno seguro.</li>
                    <li>• No compartas el access token ni el client secret por canales inseguros.</li>
                    <li>• Si sospechás de un compromiso, rota las credenciales en Mercado Pago inmediatamente.</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface CredentialCardProps {
  label: string;
  value: string | null;
  maskedValue: string | null;
  reveal: boolean;
  isSecret: boolean;
  onToggle: () => void;
  onCopy: () => void;
  copied: boolean;
}

function CredentialCard({
  label,
  value,
  maskedValue,
  reveal,
  isSecret,
  onToggle,
  onCopy,
  copied,
}: CredentialCardProps) {
  const displayValue = value
    ? reveal || !isSecret
      ? value
      : maskedValue || value
    : 'No configurado';

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</span>
        <div className="flex items-center gap-2">
          {isSecret && value && (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onCopy}
            disabled={!value}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:text-secondary disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Copy className="w-3 h-3" />
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      <p
        className={`text-sm font-mono ${
          value ? 'text-gray-900 dark:text-gray-100 break-all' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {displayValue}
      </p>
    </div>
  );
}

