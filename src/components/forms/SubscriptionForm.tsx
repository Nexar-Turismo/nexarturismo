'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  maxPosts: number;
  maxBookings: number;
  features: string[];
}

interface SubscriptionFormProps {
  plan: Plan;
  userId: string;
  isUpgrade?: boolean;
  existingSubscriptionId?: string; // For plan upgrades
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export default function SubscriptionForm({ plan, userId, isUpgrade = false, existingSubscriptionId, onSuccess, onError }: SubscriptionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [mpLoaded, setMpLoaded] = useState(false);
  const [cardForm, setCardForm] = useState<any>(null);
  const [publicKey, setPublicKey] = useState<string>('');
  const [showEmailTooltip, setShowEmailTooltip] = useState(false);

  // Load MercadoPago SDK and public key
  useEffect(() => {
    const loadMercadoPago = async () => {
      try {
        // Load MercadoPago SDK
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => {
          setMpLoaded(true);
        };
        document.head.appendChild(script);

        // Get public key from API
        const response = await fetch('/api/mercadopago/subscription-create');
        const data = await response.json();
        if (data.publicKey) {
          setPublicKey(data.publicKey);
        }
      } catch (error) {
        console.error('Error loading MercadoPago:', error);
        onError?.('Error loading payment system');
      }
    };

    loadMercadoPago();
  }, [onError]);

  // Initialize card form when MP is loaded
  useEffect(() => {
    console.log('useEffect triggered:', { mpLoaded, publicKey: !!publicKey, cardForm: !!cardForm, windowMercadoPago: !!window.MercadoPago });
    
    if (mpLoaded && publicKey && window.MercadoPago && !cardForm) {
      console.log('Initializing MercadoPago card form...');
      const mp = new window.MercadoPago(publicKey);
      
      try {
        const form = mp.cardForm({
          amount: plan.price.toString(),
          iframe: false,
          form: {
            id: 'form-checkout',
            cardNumber: {
              id: 'form-checkout__cardNumber',
              placeholder: 'Número de tarjeta',
            },
            expirationDate: {
              id: 'form-checkout__expirationDate',
              placeholder: 'MM/AA',
            },
            securityCode: {
              id: 'form-checkout__securityCode',
              placeholder: 'Código de seguridad',
            },
            cardholderName: {
              id: 'form-checkout__cardholderName',
              placeholder: 'Titular de la tarjeta',
            },
            cardholderEmail: {
              id: 'form-checkout__cardholderEmail',
              placeholder: 'Email',
            },
            issuer: {
              id: 'form-checkout__issuer',
              placeholder: 'Banco emisor',
            },
            installments: {
              id: 'form-checkout__installments',
              placeholder: 'Cuotas',
            },
            identificationType: {
              id: 'form-checkout__identificationType',
              placeholder: 'Tipo de documento',
            },
            identificationNumber: {
              id: 'form-checkout__identificationNumber',
              placeholder: 'Número de documento',
            },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (error) {
                console.error('Error mounting form:', error);
                onError?.('Error inicializando el formulario de pago');
                setIsLoading(false);
              } else {
                console.log('Card form mounted successfully');
                setIsLoading(false); // Ensure loading is false when form is ready
              }
            },
            onFetching: (resource: string) => {
              console.log('Fetching resource: ', resource);
              // Don't set loading to true here, only when user submits
            }
          },
        });

        console.log('Card form created:', form);
        setCardForm(form);
      } catch (error) {
        console.error('Error creating card form:', error);
        onError?.('Error creando el formulario de pago');
        setIsLoading(false);
      }
    }
  }, [mpLoaded, publicKey, plan.price, onError]);

  // Fallback: Reset loading state after 10 seconds if form doesn't initialize
  useEffect(() => {
    if (isLoading && !cardForm) {
      const timeout = setTimeout(() => {
        console.warn('Form initialization timeout, resetting loading state');
        setIsLoading(false);
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading, cardForm]);

  const handleSubmit = async () => {
    console.log('handleSubmit called, cardForm:', !!cardForm);
    
    if (!cardForm) {
      console.error('Card form not ready');
      onError?.('Formulario de pago no está listo. Por favor, recarga la página.');
      return;
    }

    setIsLoading(true);

    try {
      const { token, error } = await cardForm.createCardToken();
      
      if (error) {
        console.error('Error creating card token:', error);
        onError?.(error.message || 'Error procesando el pago');
        setIsLoading(false);
        return;
      }

      if (!token) {
        onError?.('No se pudo crear el token de pago');
        setIsLoading(false);
        return;
      }

      console.log('Card token created:', token);

      // Get the email from the form
      const emailInput = document.getElementById('form-checkout__cardholderEmail') as HTMLInputElement;
      const payerEmail = emailInput?.value;

      if (!payerEmail) {
        onError?.('Email es requerido');
        setIsLoading(false);
        return;
      }

      // Create subscription with the card token
      const response = await fetch('/api/mercadopago/subscription-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          userId: userId,
          cardTokenId: token,
          payerEmail: payerEmail,
          isUpgrade: isUpgrade, // Pass upgrade flag to skip active subscription check
          existingSubscriptionId: existingSubscriptionId, // Pass existing subscription ID for upgrades
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la suscripción');
      }

      console.log('Subscription created successfully:', result);
      onSuccess?.(result.subscriptionId);

    } catch (error) {
      console.error('Error creating subscription:', error);
      onError?.(error instanceof Error ? error.message : 'Error al crear la suscripción');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mpLoaded || !publicKey) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando sistema de pago...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Suscribirse a {plan.name}
          <Badge variant="secondary">
            {plan.currency} ${plan.price}/{plan.billingCycle === 'monthly' ? 'mes' : 'año'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Completa tu información de pago para comenzar tu suscripción
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Plan Features */}
          <div>
            <h4 className="font-medium mb-2">Características del plan:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Hasta {plan.maxPosts} publicaciones</li>
              <li>• Hasta {plan.maxBookings} reservas</li>
              {plan.features.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>

          {/* Payment Form */}
          <form id="form-checkout">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="form-checkout__cardNumber" className="block text-sm font-medium mb-1">
                  Número de tarjeta
                </label>
                <input 
                  type="text" 
                  id="form-checkout__cardNumber" 
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1234 5678 9012 3456"
                />
              </div>
              
              <div>
                <label htmlFor="form-checkout__expirationDate" className="block text-sm font-medium mb-1">
                  Fecha de vencimiento
                </label>
                <input 
                  type="text" 
                  id="form-checkout__expirationDate" 
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="MM/AA"
                />
              </div>
              
              <div>
                <label htmlFor="form-checkout__securityCode" className="block text-sm font-medium mb-1">
                  Código de seguridad
                </label>
                <input 
                  type="text" 
                  id="form-checkout__securityCode" 
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="form-checkout__cardholderName" className="block text-sm font-medium mb-1">
                  Titular de la tarjeta
                </label>
                <input 
                  type="text" 
                  id="form-checkout__cardholderName" 
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="NOMBRE Y APELLIDO"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="form-checkout__cardholderEmail" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input 
                  type="email" 
                  id="form-checkout__cardholderEmail" 
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="tu@email.com"
                />
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500">
                    Email con el que tenés tu cuenta de MercadoPago
                  </p>
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setShowEmailTooltip(true)}
                      onMouseLeave={() => setShowEmailTooltip(false)}
                      onClick={() => setShowEmailTooltip(!showEmailTooltip)}
                      className="text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    {showEmailTooltip && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                        <div className="relative">
                          Debemos linkear la suscripción a una cuenta de MercadoPago y por eso te pedimos ese correo
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="form-checkout__identificationType" className="block text-sm font-medium mb-1">
                  Tipo de documento
                </label>
                <select 
                  id="form-checkout__identificationType" 
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar</option>
                  <option value="DNI">DNI</option>
                  <option value="CUIL">CUIL</option>
                  <option value="CUIT">CUIT</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="form-checkout__identificationNumber" className="block text-sm font-medium mb-1">
                  Número de documento
                </label>
                <input 
                  type="text" 
                  id="form-checkout__identificationNumber" 
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678"
                />
              </div>

              <select id="form-checkout__issuer" className="hidden"></select>
              <select id="form-checkout__installments" className="hidden"></select>
            </div>

            <div className="mt-6">
              <Button 
                type="button" 
                onClick={handleSubmit}
                className="w-full" 
                disabled={isLoading || !cardForm}
              >
                {isLoading ? 'Procesando...' : 
                 !cardForm ? 'Cargando formulario...' : 
                 `Suscribirse por ${plan.currency} $${plan.price}`}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
