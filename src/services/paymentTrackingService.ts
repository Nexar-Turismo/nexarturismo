import { firebaseDB } from './firebaseService';

export interface PaymentRecord {
  id: string;
  userId: string;
  subscriptionId?: string;
  mercadoPagoPaymentId: string;
  mercadoPagoSubscriptionId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  statusDetail: string;
  paymentMethod: string;
  paymentMethodId?: string;
  transactionId?: string;
  externalReference?: string;
  description: string;
  createdAt: Date;
  processedAt?: Date;
  metadata: {
    mercadoPagoData: any;
    userAgent?: string;
    ipAddress?: string;
    [key: string]: any;
  };
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  mercadoPagoSubscriptionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'active' | 'cancelled' | 'paused' | 'expired' | 'on_hold';
  mercadoPagoStatus: string;
  billingCycle: string;
  frequency: number;
  frequencyType: 'days' | 'months';
  startDate: Date;
  endDate?: Date;
  nextBillingDate?: Date;
  paymentHistory: string[]; // Array of payment record IDs
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  metadata: {
    mercadoPagoData: any;
    [key: string]: any;
  };
}

class PaymentTrackingService {
  
  /**
   * Create a new payment record
   */
  async createPaymentRecord(paymentData: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<string> {
    try {
      console.log('💳 [Payment Tracking] Creating payment record:', {
        userId: paymentData.userId,
        amount: paymentData.amount,
        status: paymentData.status,
        mercadoPagoPaymentId: paymentData.mercadoPagoPaymentId
      });

      const docId = await firebaseDB.payments.create({
        ...paymentData,
        createdAt: new Date()
      });

      console.log('✅ [Payment Tracking] Payment record created:', docId);
      return docId;
    } catch (error) {
      console.error('❌ [Payment Tracking] Error creating payment record:', error);
      throw error;
    }
  }

  /**
   * Update payment record status
   */
  async updatePaymentRecord(paymentId: string, updates: Partial<PaymentRecord>): Promise<void> {
    try {
      await firebaseDB.payments.update(paymentId, {
        ...updates,
        updatedAt: new Date()
      });
      console.log('✅ [Payment Tracking] Payment record updated:', paymentId);
    } catch (error) {
      console.error('❌ [Payment Tracking] Error updating payment record:', error);
      throw error;
    }
  }

  /**
   * Get payment record by MercadoPago payment ID
   */
  async getPaymentByMercadoPagoId(mercadoPagoPaymentId: string): Promise<PaymentRecord | null> {
    try {
      return await firebaseDB.payments.getByMercadoPagoId(mercadoPagoPaymentId);
    } catch (error) {
      console.error('❌ [Payment Tracking] Error getting payment by MercadoPago ID:', error);
      return null;
    }
  }

  /**
   * Get all payments for a user
   */
  async getUserPayments(userId: string): Promise<PaymentRecord[]> {
    try {
      return await firebaseDB.payments.getByUserId(userId);
    } catch (error) {
      console.error('❌ [Payment Tracking] Error getting user payments:', error);
      return [];
    }
  }

  /**
   * Get subscription record by MercadoPago subscription ID
   */
  async getSubscriptionByMercadoPagoId(mercadoPagoSubscriptionId: string): Promise<SubscriptionRecord | null> {
    try {
      return await firebaseDB.subscriptions.getByMercadoPagoId(mercadoPagoSubscriptionId);
    } catch (error) {
      console.error('❌ [Payment Tracking] Error getting subscription by MercadoPago ID:', error);
      return null;
    }
  }

  /**
   * Update subscription record
   */
  async updateSubscriptionRecord(subscriptionId: string, updates: Partial<SubscriptionRecord>): Promise<void> {
    try {
      await firebaseDB.subscriptions.update(subscriptionId, {
        ...updates,
        updatedAt: new Date()
      });
      console.log('✅ [Payment Tracking] Subscription record updated:', subscriptionId);
    } catch (error) {
      console.error('❌ [Payment Tracking] Error updating subscription record:', error);
      throw error;
    }
  }

  /**
   * Add payment to subscription history
   */
  async addPaymentToSubscription(subscriptionId: string, paymentId: string): Promise<void> {
    try {
      const subscription = await firebaseDB.subscriptions.getById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const currentPaymentHistory = subscription.paymentHistory || [];
      if (!currentPaymentHistory.includes(paymentId)) {
        await firebaseDB.subscriptions.update(subscriptionId, {
          paymentHistory: [...currentPaymentHistory, paymentId],
          updatedAt: new Date()
        });
        console.log('✅ [Payment Tracking] Payment added to subscription history:', { subscriptionId, paymentId });
      }
    } catch (error) {
      console.error('❌ [Payment Tracking] Error adding payment to subscription:', error);
      throw error;
    }
  }

  /**
   * Process MercadoPago payment webhook
   */
  async processPaymentWebhook(mercadoPagoData: any): Promise<void> {
    try {
      console.log('🔄 [Payment Tracking] Processing payment webhook:', {
        paymentId: mercadoPagoData.id,
        status: mercadoPagoData.status,
        operationType: mercadoPagoData.operation_type,
        externalReference: mercadoPagoData.external_reference
      });

      // Only process recurring payments (actual subscription charges)
      if (mercadoPagoData.operation_type !== 'recurring_payment') {
        console.log('⚠️ [Payment Tracking] Skipping non-recurring payment:', {
          paymentId: mercadoPagoData.id,
          operationType: mercadoPagoData.operation_type,
          status: mercadoPagoData.status
        });
        return;
      }

      // Check if payment already exists
      let paymentRecord = await this.getPaymentByMercadoPagoId(mercadoPagoData.id.toString());
      
      if (!paymentRecord) {
        // Create new payment record
        const paymentData: Omit<PaymentRecord, 'id' | 'createdAt'> = {
          userId: this.extractUserIdFromReference(mercadoPagoData.external_reference),
          mercadoPagoPaymentId: mercadoPagoData.id.toString(),
          amount: mercadoPagoData.transaction_amount,
          currency: mercadoPagoData.currency_id,
          status: this.mapMercadoPagoStatus(mercadoPagoData.status),
          statusDetail: mercadoPagoData.status_detail || '',
          paymentMethod: mercadoPagoData.payment_method?.type || '',
          paymentMethodId: mercadoPagoData.payment_method?.id?.toString(),
          transactionId: mercadoPagoData.transaction_details?.external_resource_url,
          externalReference: mercadoPagoData.external_reference,
          description: mercadoPagoData.description || `Recurring payment for subscription`,
          processedAt: new Date(),
          metadata: {
            mercadoPagoData,
            ...(mercadoPagoData.metadata?.user_agent && { userAgent: mercadoPagoData.metadata.user_agent }),
            ...(mercadoPagoData.metadata?.ip_address && { ipAddress: mercadoPagoData.metadata.ip_address })
          }
        };

        const paymentId = await this.createPaymentRecord(paymentData);
        paymentRecord = { ...paymentData, id: paymentId, createdAt: new Date() };
      } else {
        // Update existing payment record
        await this.updatePaymentRecord(paymentRecord.id, {
          status: this.mapMercadoPagoStatus(mercadoPagoData.status),
          statusDetail: mercadoPagoData.status_detail || paymentRecord.statusDetail,
          processedAt: new Date(),
          metadata: {
            ...paymentRecord.metadata,
            mercadoPagoData,
            lastUpdate: new Date()
          }
        });
      }

      // If payment is approved, update subscription status
      if (mercadoPagoData.status === 'approved') {
        await this.handleApprovedPayment(paymentRecord);
      }

      console.log('✅ [Payment Tracking] Payment webhook processed successfully');
    } catch (error) {
      console.error('❌ [Payment Tracking] Error processing payment webhook:', error);
      throw error;
    }
  }

  /**
   * Handle approved payment
   */
  private async handleApprovedPayment(paymentRecord: PaymentRecord): Promise<void> {
    try {
      if (!paymentRecord.subscriptionId) {
        // Try to find subscription by external reference
        const subscription = await this.findSubscriptionByPayment(paymentRecord);
        if (subscription) {
          // Add payment to subscription history
          await this.addPaymentToSubscription(subscription.id, paymentRecord.id);
          
          // Update subscription status if needed
          if (subscription.status !== 'active') {
            await this.updateSubscriptionRecord(subscription.id, {
              status: 'active',
              processedAt: new Date()
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ [Payment Tracking] Error handling approved payment:', error);
    }
  }

  /**
   * Find subscription by payment record
   */
  private async findSubscriptionByPayment(paymentRecord: PaymentRecord): Promise<SubscriptionRecord | null> {
    try {
      // Try to find by external reference pattern
      if (paymentRecord.externalReference?.startsWith('subscription_')) {
        const mercadoPagoSubscriptionId = paymentRecord.metadata?.mercadoPagoData?.subscription_id;
        if (mercadoPagoSubscriptionId) {
          return await this.getSubscriptionByMercadoPagoId(mercadoPagoSubscriptionId);
        }
      }
      return null;
    } catch (error) {
      console.error('❌ [Payment Tracking] Error finding subscription by payment:', error);
      return null;
    }
  }

  /**
   * Extract user ID from external reference
   */
  private extractUserIdFromReference(externalReference?: string): string {
    if (!externalReference) return '';
    
    // Pattern: subscription_{planId}_{userId}
    const parts = externalReference.split('_');
    return parts.length >= 3 ? parts[2] : '';
  }

  /**
   * Map MercadoPago status to our status
   */
  private mapMercadoPagoStatus(status: string): PaymentRecord['status'] {
    switch (status) {
      case 'approved':
        return 'approved';
      case 'pending':
        return 'pending';
      case 'rejected':
      case 'cancelled':
        return 'rejected';
      case 'refunded':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  /**
   * Get payment statistics for a user
   */
  async getUserPaymentStats(userId: string): Promise<{
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    pendingPayments: number;
    failedPayments: number;
  }> {
    try {
      const payments = await this.getUserPayments(userId);
      
      return {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
        successfulPayments: payments.filter(p => p.status === 'approved').length,
        pendingPayments: payments.filter(p => p.status === 'pending').length,
        failedPayments: payments.filter(p => p.status === 'rejected').length,
      };
    } catch (error) {
      console.error('❌ [Payment Tracking] Error getting payment stats:', error);
      return {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        pendingPayments: 0,
        failedPayments: 0,
      };
    }
  }
}

export const paymentTrackingService = new PaymentTrackingService();
