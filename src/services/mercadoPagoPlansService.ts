import { MercadoPagoConfig, PreApprovalPlan } from 'mercadopago';
import { MercadoPagoAccount, SubscriptionPlan, MercadoPagoPlan } from '@/types';
import { firebaseDB } from './firebaseService';

export interface MercadoPagoSubscriptionPlan {
  reason: string;
  auto_recurring: {
    frequency: number;
    frequency_type: 'days' | 'months';
    transaction_amount: number;
    currency_id: string;
  };
  back_url: string;
  external_reference?: string;
}

class MercadoPagoPlansService {
  private client: PreApprovalPlan | null = null;

  constructor(account?: MercadoPagoAccount) {
    if (account) {
      this.setAccount(account);
    }
  }

  setAccount(account: MercadoPagoAccount) {
    const config = new MercadoPagoConfig({ 
      accessToken: account.accessToken,
      options: { timeout: 5000 }
    });
    this.client = new PreApprovalPlan(config);
  }

  /**
   * Create a subscription plan in MercadoPago
   */
  async createPlan(planData: MercadoPagoSubscriptionPlan): Promise<MercadoPagoPlan> {
    if (!this.client) {
      throw new Error('MercadoPago account not configured');
    }

    try {
      console.log('🚀 [MercadoPago SDK] Creating plan with data:', planData);
      const result = await this.client.create({ body: planData });
      console.log('📋 [MercadoPago SDK] Create plan response:', {
        resultType: typeof result,
        resultKeys: Object.keys(result || {}),
        hasId: 'id' in result,
        id: result?.id,
        fullResult: result
      });
      return result as any;
    } catch (error: any) {
      console.error('MercadoPago API error details:', error.cause);
      throw new Error(`MercadoPago API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get a subscription plan from MercadoPago
   */
  async getPlan(planId: string): Promise<MercadoPagoPlan> {
    if (!this.client) {
      throw new Error('MercadoPago account not configured');
    }

    try {
      const result = await this.client.get({ id: planId });
      return result as any;
    } catch (error: any) {
      throw new Error(`MercadoPago API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Update a subscription plan in MercadoPago
   */
  async updatePlan(planId: string, updates: Partial<MercadoPagoSubscriptionPlan>): Promise<MercadoPagoPlan> {
    if (!this.client) {
      throw new Error('MercadoPago account not configured');
    }

    try {
      const result = await this.client.update({ id: planId, body: updates });
      return result as any;
    } catch (error: any) {
      throw new Error(`MercadoPago API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a subscription plan from MercadoPago
   * Note: MercadoPago SDK doesn't support plan deletion via API
   * Plans must be deactivated or deleted through the dashboard
   */
  async deletePlan(planId: string): Promise<void> {
    if (!this.client) {
      throw new Error('MercadoPago account not configured');
    }

    // MercadoPago doesn't support plan deletion via API
    // We'll just log this for now
    console.warn('⚠️ Plan deletion not supported by MercadoPago API. Plan must be deactivated manually in dashboard:', planId);
  }

  /**
   * Sync platform subscription plan with MercadoPago
   */
  async syncPlatformPlan(platformPlan: SubscriptionPlan): Promise<MercadoPagoPlan> {
    // Convert billing cycle to MercadoPago format
    const frequencyMap: Record<string, number> = {
      daily: 1,
      weekly: 7,
      monthly: 1,
      yearly: 12
    };

    const frequencyTypeMap: Record<string, 'days' | 'months'> = {
      daily: 'days',
      weekly: 'days',
      monthly: 'months',
      yearly: 'months'
    };

    const frequency = frequencyMap[platformPlan.billingCycle] || 1;
    const frequencyType = frequencyTypeMap[platformPlan.billingCycle] || 'months';

    // Get base URL with fallback
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://asia-forworn-willena.ngrok-free.dev';
    
    // Ensure URL is valid
    let backUrl: string;
    try {
      const url = new URL(baseUrl);
      backUrl = `${url.origin}/subscription/complete`;
    } catch {
      // Fallback to ngrok URL if invalid (MercadoPago doesn't accept localhost)
      backUrl = 'https://asia-forworn-willena.ngrok-free.dev/subscription/complete';
      console.warn('⚠️ NEXT_PUBLIC_BASE_URL is invalid, using ngrok fallback');
    }

    const mercadoPagoPlan: MercadoPagoSubscriptionPlan = {
      reason: `Suscripción: ${platformPlan.name}`,
      auto_recurring: {
        frequency: frequency,
        frequency_type: frequencyType,
        transaction_amount: platformPlan.price,
        currency_id: platformPlan.currency
      },
      back_url: backUrl,
      external_reference: platformPlan.id,
    };

    let mercadoPagoPlanResult: MercadoPagoPlan;

    // Check if plan already exists in MercadoPago
    if (platformPlan.mercadoPagoPlanId) {
      try {
        // Try to get the existing plan first to verify it exists
        console.log('🔍 [MercadoPago Sync] Checking if plan exists in MercadoPago:', platformPlan.mercadoPagoPlanId);
        mercadoPagoPlanResult = await this.getPlan(platformPlan.mercadoPagoPlanId);
        console.log('✅ [MercadoPago Sync] Plan exists in MercadoPago, updating it');
        
        // Plan exists, try to update it
        mercadoPagoPlanResult = await this.updatePlan(platformPlan.mercadoPagoPlanId, mercadoPagoPlan);
      } catch (error) {
        // If get/update fails, the plan might not exist anymore, create a new one
        console.log('⚠️ [MercadoPago Sync] Plan not found or update failed, creating new plan');
        mercadoPagoPlanResult = await this.createPlan(mercadoPagoPlan);
      }
    } else {
      // Create new plan
      console.log('➕ [MercadoPago Sync] Creating new plan (no existing MercadoPago ID)');
      mercadoPagoPlanResult = await this.createPlan(mercadoPagoPlan);
    }

    // Note: Firebase update is handled by the calling function (firebaseService.ts)
    // This prevents double-updates and race conditions

    return mercadoPagoPlanResult;
  }

  /**
   * Sync all platform subscription plans with MercadoPago
   */
  async syncAllPlatformPlans(): Promise<{ success: number; errors: number; results: Array<{ planId: string; status: 'success' | 'error'; error?: string }> }> {
    try {
      const platformPlans = await firebaseDB.plans.getAll();
      const results: Array<{ planId: string; status: 'success' | 'error'; error?: string }> = [];
      let success = 0;
      let errors = 0;

      for (const plan of platformPlans) {
        try {
          console.log('🔄 [MercadoPago Sync All] Processing plan:', {
            planId: plan.id,
            planName: plan.name,
            hasExistingMercadoPagoId: !!plan.mercadoPagoPlanId,
            existingMercadoPagoId: plan.mercadoPagoPlanId
          });

          const mercadoPagoPlan = await this.syncPlatformPlan(plan);
          
          // Save the MercadoPago Plan ID to Firebase if it's a new plan or if we don't have the ID stored
          if (mercadoPagoPlan.id && !plan.mercadoPagoPlanId) {
            try {
              console.log('💾 [MercadoPago Sync All] Saving MercadoPago Plan ID to Firebase:', {
                planId: plan.id,
                mercadoPagoPlanId: mercadoPagoPlan.id
              });
              
              await firebaseDB.plans.update(plan.id, {
                mercadoPagoPlanId: mercadoPagoPlan.id
              }, 'mercado-pago-sync-all');
              
              console.log('✅ [MercadoPago Sync All] MercadoPago Plan ID saved to Firebase');
              
              // Verify the update
              const verifyPlans = await firebaseDB.plans.getAll();
              const verifyPlan = verifyPlans.find(p => p.id === plan.id);
              console.log('🔍 [MercadoPago Sync All] Verification - Plan after update:', {
                planId: plan.id,
                mercadoPagoPlanId: verifyPlan?.mercadoPagoPlanId,
                updatedAt: verifyPlan?.updatedAt
              });
              
            } catch (firebaseError) {
              console.error('❌ [MercadoPago Sync All] Failed to save MercadoPago Plan ID to Firebase:', firebaseError);
              // Don't fail the entire operation, just log the error
            }
          } else if (plan.mercadoPagoPlanId) {
            console.log('⏭️ [MercadoPago Sync All] Plan already has MercadoPago ID, skipping Firebase update:', {
              planId: plan.id,
              existingMercadoPagoId: plan.mercadoPagoPlanId
            });
          }
          
          results.push({ planId: plan.id, status: 'success' });
          success++;
        } catch (error) {
          console.error('❌ [MercadoPago Sync All] Error syncing plan:', plan.id, error);
          results.push({ 
            planId: plan.id, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          errors++;
        }
      }

      return { success, errors, results };
    } catch (error) {
      console.error('Error syncing platform plans:', error);
      throw error;
    }
  }

  /**
   * Create a subscription for a user
   */
  async createUserSubscription(userId: string, planId: string, userEmail: string): Promise<string> {
    if (!this.accessToken) {
      throw new Error('MercadoPago account not configured');
    }

    const subscriptionData = {
      reason: `Suscripción para usuario ${userId}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 0, // Will be set by the plan
        currency_id: 'ARS',
        start_date: new Date().toISOString(),
        end_date: null,
      },
      payer_email: userEmail,
      back_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscription/complete`,
      status: 'pending',
    };

    const response = await fetch(`${this.baseUrl}/preapproval`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscriptionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`MercadoPago API error: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    return result.id;
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('MercadoPago account not configured');
    }

    const response = await fetch(`${this.baseUrl}/preapproval/${subscriptionId}`, {
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
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('MercadoPago account not configured');
    }

    const response = await fetch(`${this.baseUrl}/preapproval/${subscriptionId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'cancelled'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`MercadoPago API error: ${errorData.message || response.statusText}`);
    }
  }

  /**
   * Check if account is configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }
}

export default MercadoPagoPlansService;
