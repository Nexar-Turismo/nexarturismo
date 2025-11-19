import { MercadoPagoAccount } from '@/types';
import { subscriptionService } from './subscriptionService';

export interface MarketplaceConnection {
  id: string;
  userId: string;
  mercadoPagoUserId: string;
  mercadoPagoAccessToken: string;
  mercadoPagoPublicKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  connectedBy: string;
}

export interface PublisherValidationResult {
  isValid: boolean;
  hasActiveSubscription: boolean;
  hasMarketplaceConnection: boolean;
  subscriptionPlan?: string;
  postLimit?: number;
  currentPostsCount?: number;
  remainingPosts?: number;
  errors: string[];
}

class MercadoPagoMarketplaceService {
  private baseUrl = 'https://api.mercadopago.com';

  constructor() {
    console.log('✅ [MercadoPago Marketplace] Service initialized');
  }

  /**
   * Check if marketplace service is configured
   */
  isConfigured(): boolean {
    const publicKey = process.env.NEXAR_MARKETPLACE_PUBLIC_KEY;
    const accessToken = process.env.NEXAR_MARKETPLACE_ACCESS_TOKEN;
    const appId = process.env.NEXAR_MARKETPLACE_APP_ID;
    const clientSecret = process.env.NEXAR_MARKETPLACE_CLIENT_SECRET;

    return !!(publicKey && accessToken && appId && clientSecret);
  }

  /**
   * Get marketplace credentials from environment variables
   */
  getMarketplaceCredentials() {
    return {
      publicKey: process.env.NEXAR_MARKETPLACE_PUBLIC_KEY,
      accessToken: process.env.NEXAR_MARKETPLACE_ACCESS_TOKEN,
      appId: process.env.NEXAR_MARKETPLACE_APP_ID,
      clientSecret: process.env.NEXAR_MARKETPLACE_CLIENT_SECRET
    };
  }

  /**
   * Validate publisher requirements for post creation
   */
  async validatePublisherForPostCreation(userId: string): Promise<PublisherValidationResult> {
    const result: PublisherValidationResult = {
      isValid: false,
      hasActiveSubscription: false,
      hasMarketplaceConnection: false,
      errors: []
    };

    try {
      // Import firebaseDB here to avoid circular dependencies
      const { firebaseDB } = await import('./firebaseService');

      // Check if user has active subscription using the subscription service
      const subscriptionValidation = await subscriptionService.validatePublisherSubscription(userId);
      
      if (!subscriptionValidation.hasActiveSubscription) {
        result.errors.push(subscriptionValidation.error || 'No active subscription found. Please subscribe to a plan to create posts.');
        return result;
      }

      result.hasActiveSubscription = true;
      result.subscriptionPlan = subscriptionValidation.subscription?.planName;
      result.postLimit = subscriptionValidation.subscription?.metadata?.maxPosts;
      result.remainingPosts = subscriptionValidation.remainingPosts;

      // Check for marketplace connection
      const marketplaceConnection = await this.getUserMarketplaceConnection(userId);
      if (marketplaceConnection && marketplaceConnection.isActive) {
        result.hasMarketplaceConnection = true;
      } else {
        result.errors.push('MercadoPago Marketplace connection required. Please connect your MercadoPago account.');
        return result;
      }

      // Check post limits using subscription service
      const postValidation = await subscriptionService.canCreatePost(userId);
      result.currentPostsCount = (result.postLimit || 0) - (result.remainingPosts || 0);

      if (!postValidation.canCreate) {
        result.errors.push(postValidation.error || 'Cannot create post at this time.');
        return result;
      }

      // If we get here, everything is valid
      result.isValid = true;
      return result;

    } catch (error) {
      console.error('Error validating publisher:', error);
      result.errors.push('Validation error occurred. Please try again.');
      return result;
    }
  }


  /**
   * Get user's marketplace connection
   */
  private async getUserMarketplaceConnection(userId: string): Promise<MarketplaceConnection | null> {
    try {
      const { firebaseDB } = await import('./firebaseService');
      
      // First check mercadoPagoAccounts collection (newer approach)
      try {
        const account = await firebaseDB.mercadoPagoAccounts.getByUserId(userId);
        
        if (account && account.isActive) {
          console.log('✅ [MercadoPago Marketplace] Found active MercadoPago account:', {
            userId,
            accountId: account.id,
            mercadoPagoUserId: account.mercadoPagoUserId,
            isActive: account.isActive
          });
          
          // Convert MercadoPagoAccount to MarketplaceConnection format
          return {
            id: account.id,
            userId: account.userId,
            mercadoPagoUserId: account.mercadoPagoUserId,
            mercadoPagoAccessToken: account.accessToken,
            mercadoPagoPublicKey: account.publicKey,
            isActive: account.isActive,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
            connectedBy: account.connectedBy || 'oauth'
          } as MarketplaceConnection;
        } else {
          console.log('❌ [MercadoPago Marketplace] No active MercadoPago account found:', {
            userId,
            accountFound: !!account,
            isActive: account?.isActive || false
          });
        }
      } catch (accountError) {
        console.warn('Error checking mercadoPagoAccounts:', accountError);
      }

      // Fallback: Check old marketplaceConnections collection using direct Firebase access
      try {
        if (firebaseDB.db) {
          const connectionsRef = firebaseDB.db.collection('marketplaceConnections');
          const connectionsSnapshot = await connectionsRef
            .where('userId', '==', userId)
            .where('isActive', '==', true)
            .limit(1)
            .get();

          if (!connectionsSnapshot.empty) {
            const connection = connectionsSnapshot.docs[0].data();
            return {
              id: connectionsSnapshot.docs[0].id,
              ...connection
            } as MarketplaceConnection;
          }
        }
      } catch (connectionError) {
        console.warn('Error checking marketplaceConnections:', connectionError);
      }

      console.log('❌ [MercadoPago Marketplace] No active connection found for user:', userId);
      return null;
    } catch (error) {
      console.error('Error getting marketplace connection:', error);
      return null;
    }
  }

  /**
   * Get user's current posts count
   */
  private async getUserPostsCount(userId: string): Promise<number> {
    try {
      const { firebaseDB } = await import('./firebaseService');
      const postsRef = firebaseDB.db.collection('posts');
      const snapshot = await postsRef
        .where('authorId', '==', userId)
        .where('status', '!=', 'deleted')
        .get();

      return snapshot.size;
    } catch (error) {
      console.error('Error getting user posts count:', error);
      return 0;
    }
  }

  /**
   * Save marketplace connection for user
   */
  async saveMarketplaceConnection(connection: Omit<MarketplaceConnection, 'id'>): Promise<string> {
    try {
      const { firebaseDB } = await import('./firebaseService');
      const connectionsRef = firebaseDB.db.collection('marketplaceConnections');
      const docRef = await connectionsRef.add({
        ...connection,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('✅ [MercadoPago Marketplace] Connection saved:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving marketplace connection:', error);
      throw error;
    }
  }

  /**
   * Update marketplace connection
   */
  async updateMarketplaceConnection(connectionId: string, updates: Partial<MarketplaceConnection>): Promise<void> {
    try {
      const { firebaseDB } = await import('./firebaseService');
      const connectionRef = firebaseDB.db.collection('marketplaceConnections').doc(connectionId);
      await connectionRef.update({
        ...updates,
        updatedAt: new Date()
      });

      console.log('✅ [MercadoPago Marketplace] Connection updated:', connectionId);
    } catch (error) {
      console.error('Error updating marketplace connection:', error);
      throw error;
    }
  }

  /**
   * Get marketplace connection by ID
   */
  async getMarketplaceConnection(connectionId: string): Promise<MarketplaceConnection | null> {
    try {
      const { firebaseDB } = await import('./firebaseService');
      const connectionRef = firebaseDB.db.collection('marketplaceConnections').doc(connectionId);
      const snapshot = await connectionRef.get();

      if (!snapshot.exists) {
        return null;
      }

      return {
        id: snapshot.id,
        ...snapshot.data()
      } as MarketplaceConnection;
    } catch (error) {
      console.error('Error getting marketplace connection:', error);
      return null;
    }
  }
}

export default new MercadoPagoMarketplaceService();
