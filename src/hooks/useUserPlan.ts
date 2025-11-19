import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { subscriptionService } from '@/services/subscriptionService';
import { SubscriptionPlan, UserSubscription } from '@/types';

export function useUserPlan() {
  const { user, hasRole } = useAuth();
  const [userPlan, setUserPlan] = useState<SubscriptionPlan | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPostsCount, setCurrentPostsCount] = useState<number | null>(null);
  const [remainingPosts, setRemainingPosts] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setUserPlan(null);
      setUserSubscription(null);
      setCurrentPostsCount(null);
      setRemainingPosts(null);
      setIsLoading(false);
      return;
    }

    loadUserPlan();
  }, [user]);

  const loadUserPlan = async () => {
    try {
      setIsLoading(true);

      // Only check for plans if user has publisher role
      if (!hasRole('publisher')) {
        setUserPlan(null);
        setUserSubscription(null);
        setCurrentPostsCount(null);
        setRemainingPosts(null);
        setIsLoading(false);
        return;
      }

      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      // Fetch the actual subscription
      const subscription = await subscriptionService.getUserActiveSubscription(user.id);
      
      if (subscription) {
        setUserSubscription(subscription as any);
        
        // Get plan details from the subscription's planId
        const plans = await firebaseDB.plans.getAll();
        const plan = plans.find(p => p.id === subscription.planId);
        
        if (plan) {
          // Use the subscription's planName instead of the plan's name
          const planWithSubscriptionName: SubscriptionPlan = {
            ...plan,
            name: subscription.planName // Use the planName from subscription
          };
          setUserPlan(planWithSubscriptionName);
          
          // Calculate current posts usage
          const userPosts = await firebaseDB.posts.getByUserId(user.id);
          const relevantPosts = userPosts.filter(post => 
            post.status ? ['published', 'draft'].includes(post.status) : true
          );

          const currentCount = relevantPosts.length;
          setCurrentPostsCount(currentCount);
          setRemainingPosts(Math.max(0, plan.maxPosts - currentCount));
        } else {
          // Plan not found, but we have subscription - create a minimal plan object with subscription name
          const minimalPlan: SubscriptionPlan = {
            id: subscription.planId,
            name: subscription.planName,
            description: '',
            price: subscription.amount,
            currency: subscription.currency,
            billingCycle: subscription.billingCycle as 'monthly' | 'yearly' | 'weekly' | 'daily',
            features: [],
            maxPosts: 0,
            maxBookings: 0,
            isActive: true,
            isVisible: true,
            createdAt: subscription.createdAt,
            updatedAt: subscription.updatedAt,
            createdBy: subscription.createdBy,
            updatedBy: subscription.createdBy
          };
          setUserPlan(minimalPlan);
          setCurrentPostsCount(null);
          setRemainingPosts(null);
        }
      } else {
        // No active subscription
        setUserPlan(null);
        setUserSubscription(null);
        setCurrentPostsCount(null);
        setRemainingPosts(null);
      }
    } catch (error) {
      console.error('Error loading user plan:', error);
      setUserPlan(null);
      setUserSubscription(null);
      setCurrentPostsCount(null);
      setRemainingPosts(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPlan = () => {
    loadUserPlan();
  };

  return {
    userPlan,
    userSubscription,
    isLoading,
    currentPostsCount,
    remainingPosts,
    refreshPlan
  };
}
