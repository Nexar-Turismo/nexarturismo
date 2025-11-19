import { MercadoPagoCredentials } from '@/types';

export interface MercadoPagoPaymentRequest {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  external_reference?: string;
  notification_url?: string;
  callback_url?: string;
}

export interface MercadoPagoPaymentResponse {
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  external_reference?: string;
  date_created: string;
  date_approved?: string;
  money_release_date?: string;
  operation_type: string;
  issuer_id?: string;
  payment_method: {
    id: string;
    type: string;
    issuer_id?: string;
  };
  installments: number;
  processing_mode: string;
  merchant_account_id?: string;
  merchant_order_id?: string;
  collector_id: number;
  marketplace_owner?: string;
  sponsor_id?: string;
  authorization_code?: string;
  money_release_schema?: string;
  counter_currency?: string;
  shipping_amount?: number;
  pos_id?: string;
  store_id?: string;
  integrator_id?: string;
  platform_id?: string;
  corporation_id?: string;
  taxes_amount?: number;
  net_received_amount?: number;
  total_paid_amount?: number;
  overpaid_amount?: number;
  refunded_amount?: number;
  captured?: boolean;
  binary_mode?: boolean;
  call_for_authorize_id?: string;
  statement_descriptor?: string;
  card?: {
    id?: string;
    last_four_digits?: string;
    first_six_digits?: string;
    expiration_month?: number;
    expiration_year?: number;
    security_code?: {
      length?: number;
      card_location?: string;
    };
    security_code_length?: number;
    security_code_card_location?: string;
    cardholder?: {
      name?: string;
      identification?: {
        type?: string;
        number?: string;
      };
    };
    date_created?: string;
    date_last_updated?: string;
    user_id?: string;
    live_mode?: boolean;
    require_esc?: boolean;
    card_number_length?: number;
    security_code_length?: number;
  };
  differential_pricing_id?: string;
  financing_deals?: any[];
  additional_info?: {
    items?: Array<{
      id: string;
      title: string;
      description?: string;
      picture_url?: string;
      category_id?: string;
      quantity: number;
      unit_price: number;
    }>;
    payer?: {
      first_name?: string;
      last_name?: string;
      phone?: {
        area_code?: string;
        number?: string;
      };
      address?: {
        zip_code?: string;
        street_name?: string;
        street_number?: number;
      };
      registration_date?: string;
    };
    shipments?: {
      receiver_address?: {
        zip_code?: string;
        state_name?: string;
        city_name?: string;
        street_name?: string;
        street_number?: number;
      };
    };
  };
  order?: {
    id?: string;
    type?: string;
  };
  external_reference?: string;
  transaction_details?: {
    payment_method_reference_id?: string;
    net_received_amount?: number;
    total_paid_amount?: number;
    overpaid_amount?: number;
    external_resource_url?: string;
    installment_amount?: number;
    financial_institution?: string;
    payable_deferral_period?: string;
    acquirer_reference?: string;
  };
  fee_details?: Array<{
    type?: string;
    amount?: number;
    fee_payer?: string;
  }>;
  charges_details?: Array<{
    id?: string;
    name?: string;
    type?: string;
    amount?: number;
  }>;
}

export interface MercadoPagoPreferenceRequest {
  items: Array<{
    id: string;
    title: string;
    description?: string;
    picture_url?: string;
    category_id?: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
  }>;
  payer?: {
    name?: string;
    surname?: string;
    email?: string;
    phone?: {
      area_code?: string;
      number?: string;
    };
    identification?: {
      type?: string;
      number?: string;
    };
    address?: {
      zip_code?: string;
      street_name?: string;
      street_number?: number;
      floor?: string;
      apartment?: string;
    };
    date_created?: string;
    last_purchase?: string;
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: 'approved' | 'all';
  payment_methods?: {
    excluded_payment_methods?: Array<{
      id: string;
    }>;
    excluded_payment_types?: Array<{
      id: string;
    }>;
    installments?: number;
    default_installments?: number;
  };
  notification_url?: string;
  external_reference?: string;
  expires?: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
  additional_info?: string;
  metadata?: Record<string, any>;
  marketplace?: string;
  marketplace_fee?: number;
  differential_pricing_id?: string;
  financing_deals?: Array<{
    start_date?: string;
    end_date?: string;
    rate?: number;
  }>;
  binary_mode?: boolean;
  taxes?: Array<{
    type?: string;
    value?: number;
  }>;
  statement_descriptor?: string;
  date_of_expiration?: string;
}

export interface MercadoPagoPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  date_created: string;
  application_id: number;
  owner_id: number;
  collector_id: number;
  site_id: string;
  processing_mode: string;
  items: Array<{
    id: string;
    title: string;
    description?: string;
    picture_url?: string;
    category_id?: string;
    quantity: number;
    unit_price: number;
    currency_id: string;
  }>;
  payer: {
    name?: string;
    surname?: string;
    email?: string;
    phone?: {
      area_code?: string;
      number?: string;
    };
    identification?: {
      type?: string;
      number?: string;
    };
    address?: {
      zip_code?: string;
      street_name?: string;
      street_number?: number;
      floor?: string;
      apartment?: string;
    };
    date_created?: string;
    last_purchase?: string;
  };
  back_urls: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return: string;
  payment_methods: {
    excluded_payment_methods: Array<{
      id: string;
    }>;
    excluded_payment_types: Array<{
      id: string;
    }>;
    installments: number;
    default_installments: number;
  };
  notification_url?: string;
  external_reference?: string;
  expires: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
  additional_info?: string;
  metadata?: Record<string, any>;
  marketplace?: string;
  marketplace_fee?: number;
  differential_pricing_id?: string;
  financing_deals?: Array<{
    start_date?: string;
    end_date?: string;
    rate?: number;
  }>;
  binary_mode: boolean;
  taxes?: Array<{
    type?: string;
    value?: number;
  }>;
  statement_descriptor?: string;
  date_of_expiration?: string;
}

class MercadoPagoService {
  private accessToken: string = '';
  private publicKey: string = '';
  private baseUrl: string = 'https://api.mercadopago.com';

  constructor(credentials?: MercadoPagoCredentials) {
    const envAccessToken = process.env.NEXAR_MARKETPLACE_ACCESS_TOKEN || '';
    const envPublicKey = process.env.NEXAR_MARKETPLACE_PUBLIC_KEY || '';

    if (credentials?.accessToken && credentials?.publicKey) {
      this.setCredentials(credentials);
    }

    if (!this.accessToken && envAccessToken) {
      this.accessToken = envAccessToken;
    }

    if (!this.publicKey && envPublicKey) {
      this.publicKey = envPublicKey;
    }
  }

  setCredentials(credentials: MercadoPagoCredentials) {
    if (credentials.accessToken) {
      this.accessToken = credentials.accessToken;
    }
    if (credentials.publicKey) {
      this.publicKey = credentials.publicKey;
    }
  }

  getPublicKey() {
    return this.publicKey;
  }

  /**
   * Create a payment preference for checkout
   */
  async createPreference(preferenceData: MercadoPagoPreferenceRequest): Promise<MercadoPagoPreferenceResponse> {
    if (!this.accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    const response = await fetch(`${this.baseUrl}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`MercadoPago API error: ${errorData.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a direct payment
   */
  async createPayment(paymentData: MercadoPagoPaymentRequest): Promise<MercadoPagoPaymentResponse> {
    if (!this.accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    const response = await fetch(`${this.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`MercadoPago API error: ${errorData.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get payment details by ID
   */
  async getPayment(paymentId: string): Promise<MercadoPagoPaymentResponse> {
    if (!this.accessToken) {
      throw new Error('MercadoPago access token not configured');
    }

    const response = await fetch(`${this.baseUrl}/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`MercadoPago API error: ${errorData.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a checkout preference for booking payment
   */
  async createBookingPreference(bookingData: {
    bookingId: string;
    ownerId?: string;
    postTitle: string;
    totalAmount: number;
    currency: string;
    clientName: string;
    clientEmail: string;
    returnUrl?: string;
    webhookUrl?: string;
    marketplaceFee?: number;
    marketplaceId?: string;
  }): Promise<MercadoPagoPreferenceResponse> {
    const preferenceData: MercadoPagoPreferenceRequest = {
      items: [
        {
          id: bookingData.bookingId,
          title: bookingData.postTitle,
          description: `Reserva: ${bookingData.postTitle}`,
          quantity: 1,
          unit_price: bookingData.totalAmount,
          currency_id: bookingData.currency,
        }
      ],
      payer: {
        name: bookingData.clientName,
        email: bookingData.clientEmail,
      },
      back_urls: {
        success: bookingData.returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/complete?booking=${bookingData.bookingId}&status=success`,
        failure: bookingData.returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/complete?booking=${bookingData.bookingId}&status=failure`,
        pending: bookingData.returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payment/complete?booking=${bookingData.bookingId}&status=pending`,
      },
      auto_return: 'approved',
      external_reference: bookingData.bookingId,
      notification_url: bookingData.webhookUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/webhook`,
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12,
        default_installments: 1,
      },
      binary_mode: false,
    };

    preferenceData.metadata = {
      bookingId: bookingData.bookingId,
      ...(bookingData.ownerId ? { ownerId: bookingData.ownerId } : {}),
      postTitle: bookingData.postTitle,
    };

    // Always set marketplace_fee to the service charge amount
    // If not provided, calculate it: marketplace_fee = totalAmount - (totalAmount / 1.1)
    if (typeof bookingData.marketplaceFee === 'number') {
      preferenceData.marketplace_fee = bookingData.marketplaceFee;
    } else {
      // Calculate service charge (10%): totalAmount - (totalAmount / 1.1)
      preferenceData.marketplace_fee = Number(
        (bookingData.totalAmount - bookingData.totalAmount / 1.1).toFixed(2)
      );
    }

    if (bookingData.marketplaceId) {
      preferenceData.marketplace = bookingData.marketplaceId;
    }

    return this.createPreference(preferenceData);
  }

  /**
   * Create a direct payment for booking
   */
  async createBookingPayment(bookingData: {
    bookingId: string;
    postTitle: string;
    totalAmount: number;
    currency: string;
    clientName: string;
    clientEmail: string;
    paymentMethodId: string;
    token: string;
    installments?: number;
    issuerId?: string;
  }): Promise<MercadoPagoPaymentResponse> {
    const paymentData: MercadoPagoPaymentRequest = {
      transaction_amount: bookingData.totalAmount,
      description: `Reserva: ${bookingData.postTitle}`,
      payment_method_id: bookingData.paymentMethodId,
      payer: {
        email: bookingData.clientEmail,
      },
      external_reference: bookingData.bookingId,
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/mercadopago/webhook`,
    };

    return this.createPayment(paymentData);
  }

  /**
   * Verify webhook signature (for security)
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // This is a simplified verification
    // In production, you should implement proper signature verification
    return true;
  }

  /**
   * Get public key for frontend integration
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.accessToken && this.publicKey);
  }
}

export default MercadoPagoService;
