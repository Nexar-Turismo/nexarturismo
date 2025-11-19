import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { firebaseDB } from '@/services/firebaseService';
import { SubscriptionPlan, UserSubscription } from '@/types';
import { subscriptionService } from '@/services/subscriptionService';

export function usePostCreation() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const [canCreatePost, setCanCreatePost] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<SubscriptionPlan | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [postLimitReached, setPostLimitReached] = useState(false);
  const [remainingPosts, setRemainingPosts] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!user) {
      setCanCreatePost(false);
      setIsLoading(false);
      return;
    }

    checkPostCreationAbility();
  }, [user, hasRole]); // Add hasRole as dependency to re-run when roles change

  const checkPostCreationAbility = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setPostLimitReached(false);
      
      console.log('🔍 [usePostCreation] Checking post creation ability for user:', user?.id);
      console.log('📋 [usePostCreation] User roles:', user?.roles);
      console.log('✅ [usePostCreation] Has publisher role:', hasRole('publisher'));

      // Check if user has publisher role
      if (!hasRole('publisher')) {
        console.log('❌ [usePostCreation] User does not have publisher role, denying access');
        setCanCreatePost(false);
        setErrorMessage('No tienes permisos para crear publicaciones. Necesitas suscribirte a un plan.');
        setIsLoading(false);
        return;
      }

      console.log('✅ [usePostCreation] User has publisher role, checking subscription and post limits...');
      
      // Get user's active subscription
      const subscription = await subscriptionService.getUserActiveSubscription(user!.id);
      
      if (!subscription) {
        console.log('⚠️ [usePostCreation] No active subscription found');
        setCanCreatePost(false);
        setErrorMessage('No tienes una suscripción activa. Por favor suscríbete a un plan.');
        setIsLoading(false);
        return;
      }

      console.log('📋 [usePostCreation] Active subscription found:', subscription);
      setUserSubscription(subscription);

      // Get plan details
      const plans = await firebaseDB.plans.getAll();
      const plan = plans.find(p => p.id === subscription.planId);

      if (!plan) {
        console.log('⚠️ [usePostCreation] Plan not found for subscription');
        setCanCreatePost(false);
        setErrorMessage('No se pudo encontrar tu plan. Por favor contacta soporte.');
        setIsLoading(false);
        return;
      }

      console.log('📋 [usePostCreation] Plan details:', plan);
      setUserPlan(plan);

      // Check if user can create post using subscriptionService
      const canCreateResult = await subscriptionService.canCreatePost(user!.id);
      
      console.log('📋 [usePostCreation] Can create post result:', canCreateResult);
      
      if (!canCreateResult.canCreate) {
        console.log('⚠️ [usePostCreation] Post limit reached');
        setCanCreatePost(false);
        setPostLimitReached(true);
        setRemainingPosts(canCreateResult.remainingPosts || 0);
        setErrorMessage(canCreateResult.error || 'Has alcanzado el límite de publicaciones de tu plan.');
        setIsLoading(false);
        return;
      }

      // User can create posts
      console.log('✅ [usePostCreation] User can create posts');
      setCanCreatePost(true);
      setRemainingPosts(canCreateResult.remainingPosts || 0);
    } catch (error) {
      console.error('❌ [usePostCreation] Error checking post creation ability:', error);
      setCanCreatePost(false);
      setErrorMessage('Error al verificar permisos. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const getUserActiveSubscription = async (): Promise<UserSubscription | null> => {
    try {
      // This would be implemented to get the user's active subscription
      // For now, return null to simulate no subscription
      return null;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return null;
    }
  };

  const getPlanDetails = async (planId: string): Promise<SubscriptionPlan | null> => {
    try {
      // This would get the plan details from the plans collection
      // For now, return null
      return null;
    } catch (error) {
      console.error('Error getting plan details:', error);
      return null;
    }
  };

  const getUserPostCount = async (): Promise<number> => {
    try {
      // This would count the user's active posts
      // For now, return 0
      return 0;
    } catch (error) {
      console.error('Error getting user post count:', error);
      return 0;
    }
  };

  const redirectToSubscription = () => {
    router.push('/suscribirse');
  };

  const redirectToPosts = () => {
    router.push('/posts');
  };

  const forceRefresh = () => {
    console.log('Force refreshing post creation check...');
    checkPostCreationAbility();
  };

  return {
    canCreatePost,
    isLoading,
    userPlan,
    userSubscription,
    postLimitReached,
    remainingPosts,
    errorMessage,
    redirectToSubscription,
    redirectToPosts,
    refreshCheck: checkPostCreationAbility,
    forceRefresh
  };
}
