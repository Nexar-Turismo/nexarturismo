import { firebaseDB } from './firebaseService';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, limit as firestoreLimit } from 'firebase/firestore';

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  mercadoPagoSubscriptionId: string;
  subscriptionEmail?: string; // Email used for MercadoPago subscription - stored for plan upgrades
  amount: number;
  currency: string;
  status: 'pending' | 'active' | 'cancelled' | 'paused' | 'expired' | 'on_hold';
  mercadoPagoStatus: string;
  billingCycle: string;
  frequency: number;
  frequencyType: 'days' | 'months';
  startDate: Date;
  endDate?: Date;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SubscriptionValidationResult {
  isValid: boolean;
  hasActiveSubscription: boolean;
  subscription?: UserSubscription;
  error?: string;
  remainingPosts?: number;
  remainingBookings?: number;
}

class SubscriptionService {
  private db = db;

  /**
   * Get user's active subscription (including on_hold status)
   */
  async getUserActiveSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const subscriptionsRef = collection(this.db, 'userSubscriptions');
      const q = query(
        subscriptionsRef,
        where('userId', '==', userId),
        where('status', 'in', ['active', 'on_hold']),
        firestoreLimit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const subscriptionDoc = snapshot.docs[0];
      const subscription = subscriptionDoc.data();
      return {
        id: subscriptionDoc.id,
        ...subscription,
        startDate: subscription.startDate?.toDate ? subscription.startDate.toDate() : new Date(subscription.startDate),
        endDate: subscription.endDate?.toDate ? subscription.endDate.toDate() : subscription.endDate ? new Date(subscription.endDate) : undefined,
        createdAt: subscription.createdAt?.toDate ? subscription.createdAt.toDate() : new Date(subscription.createdAt),
        updatedAt: subscription.updatedAt?.toDate ? subscription.updatedAt.toDate() : new Date(subscription.updatedAt),
      } as UserSubscription;
    } catch (error) {
      console.error('Error getting user active subscription:', error);
      return null;
    }
  }

  /**
   * Validate if user has active subscription for publishing
   */
  async validatePublisherSubscription(userId: string): Promise<SubscriptionValidationResult> {
    try {
      const subscription = await this.getUserActiveSubscription(userId);
      
      if (!subscription) {
        return {
          isValid: false,
          hasActiveSubscription: false,
          error: 'No active subscription found. Please subscribe to a plan to start publishing.'
        };
      }

      // Check if subscription is still valid
      if (subscription.status === 'cancelled' || subscription.status === 'expired') {
        return {
          isValid: false,
          hasActiveSubscription: false,
          subscription,
          error: `Subscription is ${subscription.status}. Please reactivate your subscription to continue publishing.`
        };
      }

      // Handle on_hold status - user has subscription but payment is pending
      if (subscription.status === 'on_hold') {
        return {
          isValid: false,
          hasActiveSubscription: true, // They have a subscription, just on hold
          subscription,
          error: 'Your subscription is on hold while we process your payment. You can view your content but cannot create new posts until payment is confirmed.'
        };
      }

      // Get plan details to check limits
      const plans = await firebaseDB.plans.getAll();
      const plan = plans.find(p => p.id === subscription.planId);
      
      if (!plan) {
        return {
          isValid: false,
          hasActiveSubscription: true,
          subscription,
          error: 'Plan not found. Please contact support.'
        };
      }

      // Calculate remaining posts and bookings
      const remainingPosts = await this.calculateRemainingPosts(userId, plan.maxPosts);
      const remainingBookings = await this.calculateRemainingBookings(userId, plan.maxBookings);

      return {
        isValid: true,
        hasActiveSubscription: true,
        subscription,
        remainingPosts,
        remainingBookings
      };

    } catch (error) {
      console.error('Error validating publisher subscription:', error);
      return {
        isValid: false,
        hasActiveSubscription: false,
        error: 'Error validating subscription. Please try again later.'
      };
    }
  }

  /**
   * Calculate remaining posts for user
   */
  private async calculateRemainingPosts(userId: string, maxPosts: number): Promise<number> {
    try {
      const postsRef = collection(this.db, 'posts');
      const q = query(
        postsRef,
        where('userId', '==', userId),
        where('status', 'in', ['published', 'draft'])
      );
      const snapshot = await getDocs(q);

      const currentPosts = snapshot.size;
      return Math.max(0, maxPosts - currentPosts);
    } catch (error) {
      console.error('Error calculating remaining posts:', error);
      return 0;
    }
  }

  /**
   * Calculate remaining bookings for user
   */
  private async calculateRemainingBookings(userId: string, maxBookings: number): Promise<number> {
    try {
      const bookingsRef = collection(this.db, 'bookings');
      const q = query(
        bookingsRef,
        where('publisherId', '==', userId),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const snapshot = await getDocs(q);

      const currentBookings = snapshot.size;
      return Math.max(0, maxBookings - currentBookings);
    } catch (error) {
      console.error('Error calculating remaining bookings:', error);
      return 0;
    }
  }

  /**
   * Check if user can create a new post
   */
  async canCreatePost(userId: string): Promise<{ canCreate: boolean; error?: string; remainingPosts?: number }> {
    try {
      const validation = await this.validatePublisherSubscription(userId);
      
      if (!validation.isValid) {
        return {
          canCreate: false,
          error: validation.error
        };
      }

      if (validation.remainingPosts === 0) {
        return {
          canCreate: false,
          error: 'You have reached the maximum number of posts for your current plan. Please upgrade your plan to create more posts.',
          remainingPosts: 0
        };
      }

      return {
        canCreate: true,
        remainingPosts: validation.remainingPosts
      };

    } catch (error) {
      console.error('Error checking if user can create post:', error);
      return {
        canCreate: false,
        error: 'Error checking post limits. Please try again later.'
      };
    }
  }

  /**
   * Get user's subscription history
   */
  async getUserSubscriptionHistory(userId: string): Promise<UserSubscription[]> {
    try {
      const subscriptionsRef = collection(this.db, 'userSubscriptions');
      const q = query(
        subscriptionsRef,
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);

      const subscriptions = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
          endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate ? new Date(data.endDate) : undefined,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        } as UserSubscription;
      });

      return subscriptions;
    } catch (error) {
      console.error('Error getting user subscription history:', error);
      return [];
    }
  }

  /**
   * Cancel user subscription
   */
  async cancelUserSubscription(userId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = await this.getUserActiveSubscription(userId);
      
      if (!subscription) {
        return {
          success: false,
          error: 'No active subscription found to cancel.'
        };
      }

      // Update subscription status in our database
      const subscriptionRef = doc(this.db, 'userSubscriptions', subscription.id);
      await updateDoc(subscriptionRef, {
        status: 'cancelled',
        updatedAt: new Date(),
        cancellationReason: reason,
        cancelledAt: new Date()
      });

      console.log('✅ [Subscription Service] Subscription cancelled:', {
        userId,
        subscriptionId: subscription.id,
        reason
      });

      return { success: true };

    } catch (error) {
      console.error('Error cancelling user subscription:', error);
      return {
        success: false,
        error: 'Error cancelling subscription. Please try again later.'
      };
    }
  }
}

export const subscriptionService = new SubscriptionService();
