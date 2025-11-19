import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  limit
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, Post, BasePost, UserRole, UserRoleAssignment, MercadoPagoCredentials, MercadoPagoAccount, SubscriptionPlan, UserSubscription, ServiceCategory, Pricing, Booking, BookingStatus, Notification, NotificationType, Favourite, PostImage } from '@/types';
import { SYSTEM_ROLES, PermissionService } from './permissionsService';

// Authentication Services
export const firebaseAuth = {
  // Sign up with email and password
  async signUp(email: string, password: string, userData: Partial<User>): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      if (userData.name) {
        await updateProfile(user, { displayName: userData.name });
      }
      
      // Create user document in Firestore
      const defaultRole: UserRoleAssignment = {
        roleId: 'role_client',
        roleName: 'client',
        assignedAt: new Date(),
        isActive: true,
      };

      const newUser: User = {
        id: user.uid,
        name: userData.name || 'User',
        email: email,
        phone: userData.phone || '',
        avatar: userData.avatar || '',
        roles: [defaultRole],
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        profileCompleted: false,
        ...(userData.referredBy && { referredBy: userData.referredBy }),
        ...(userData.referralCode && { referralCode: userData.referralCode }),
      };
      
      await setDoc(doc(db, 'users', user.uid), newUser);
      
      return newUser;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<FirebaseUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // Update password
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser || !currentUser.email) {
        throw new Error('Usuario no autenticado');
      }

      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, newPassword);
    } catch (error: any) {
      console.error('Error updating password:', error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/wrong-password') {
        throw new Error('La contraseña actual es incorrecta');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('La nueva contraseña es muy débil');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('Por favor, vuelve a iniciar sesión para cambiar tu contraseña');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('La contraseña actual es incorrecta');
      }
      
      throw error;
    }
  }
};

// Database Services (Firestore)
export const firebaseDB = {
  // User operations
  users: {
    // Get user by ID
    async getById(userId: string): Promise<User | null> {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          return userDoc.data() as User;
        }
        return null;
      } catch (error) {
        console.error('Error getting user:', error);
        throw error;
      }
    },

    // Get all users
    async getAll(): Promise<User[]> {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users: User[] = [];
        usersSnapshot.forEach((doc) => {
          users.push(doc.data() as User);
        });
        return users;
      } catch (error) {
        console.error('Error getting all users:', error);
        throw error;
      }
    },

    // Update user
    async update(userId: string, updates: Partial<User>): Promise<void> {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          ...updates,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    },

    // Assign role to user
    async assignRole(userId: string, roleName: UserRole, assignedBy?: string): Promise<void> {
      try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const user: User = userDoc.data() as User;
        const newRole: UserRoleAssignment = {
          roleId: `role_${roleName}`,
          roleName,
          assignedAt: new Date(),
          assignedBy: assignedBy || userId, // Use userId as fallback if assignedBy is undefined
          isActive: true,
        };

        // Validate role assignment
        const validation = PermissionService.validateRoleAssignment(user.roles, roleName);
        if (!validation.valid) {
          throw new Error(validation.message || 'Invalid role assignment');
        }

        // If adding superadmin, remove all other roles
        if (roleName === 'superadmin') {
          user.roles = user.roles.map(role => ({ ...role, isActive: false }));
        }

        // Add new role or update existing one
        const existingRoleIndex = user.roles.findIndex(role => role.roleName === roleName);
        if (existingRoleIndex >= 0) {
          user.roles[existingRoleIndex] = newRole;
        } else {
          user.roles.push(newRole);
        }

        // Ensure all role objects have required fields
        const validatedRoles = user.roles.map(role => ({
          roleId: role.roleId || `role_${role.roleName}`,
          roleName: role.roleName,
          assignedAt: role.assignedAt || new Date(),
          assignedBy: role.assignedBy || userId,
          isActive: role.isActive !== undefined ? role.isActive : true
        }));

        console.log('Updating user with roles:', validatedRoles);
        
        await updateDoc(userRef, {
          roles: validatedRoles,
          updatedAt: new Date()
        });
        
        console.log('Role assigned successfully');
      } catch (error) {
        console.error('Error assigning role:', error);
        throw error;
      }
    },

    // Remove role from user
    async removeRole(userId: string, roleName: UserRole, removedBy?: string): Promise<void> {
      try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const user: User = userDoc.data() as User;
        const roleIndex = user.roles.findIndex(role => role.roleName === roleName);
        
        if (roleIndex >= 0) {
          user.roles[roleIndex] = {
            ...user.roles[roleIndex],
            isActive: false,
          };

          await updateDoc(userRef, {
            roles: user.roles,
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error('Error removing role:', error);
        throw error;
      }
    },

    // Get users by role
    async getByRole(roleName: UserRole): Promise<User[]> {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users: User[] = [];
        
        usersSnapshot.forEach((doc) => {
          const user = doc.data() as User;
          if (user.roles && user.roles.some((role: UserRoleAssignment) => 
            role.roleName === roleName && role.isActive
          )) {
            users.push(user);
          }
        });
        
        return users;
      } catch (error) {
        console.error('Error getting users by role:', error);
        throw error;
      }
    },

    // Get user by referral code
    async getByReferralCode(referralCode: string): Promise<User | null> {
      try {
        const usersSnapshot = await getDocs(
          query(collection(db, 'users'), where('referralCode', '==', referralCode))
        );
        
        if (!usersSnapshot.empty) {
          return usersSnapshot.docs[0].data() as User;
        }
        
        return null;
      } catch (error) {
        console.error('Error getting user by referral code:', error);
        throw error;
      }
    },

    // Get referred users (users who were referred by a specific referral user)
    async getReferredUsers(referralUserId: string): Promise<User[]> {
      try {
        const usersSnapshot = await getDocs(
          query(collection(db, 'users'), where('referredBy', '==', referralUserId))
        );
        
        const users: User[] = [];
        usersSnapshot.forEach((doc) => {
          users.push(doc.data() as User);
        });
        
        return users;
      } catch (error) {
        console.error('Error getting referred users:', error);
        throw error;
      }
    },

    // Update referral code for a user
    async updateReferralCode(userId: string, referralCode: string): Promise<void> {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          referralCode,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Error updating referral code:', error);
        throw error;
      }
    },

    // Listen to user changes
    onUserChange(userId: string, callback: (user: User | null) => void) {
      const userRef = doc(db, 'users', userId);
      return onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          callback(doc.data() as User);
        } else {
          callback(null);
        }
      });
    },

    // Delete user
    async delete(userId: string): Promise<void> {
      try {
        await deleteDoc(doc(db, 'users', userId));
        console.log(`✅ [Firebase] User deleted: ${userId}`);
      } catch (error) {
        console.error('Error deleting user:', error);
        throw new Error('Failed to delete user');
      }
    }
  },

  // Role management operations
  roles: {
    // Get all system roles
    async getAll(): Promise<typeof SYSTEM_ROLES> {
      return SYSTEM_ROLES;
    },

    // Get role by name
    async getByName(roleName: UserRole): Promise<typeof SYSTEM_ROLES[0] | null> {
      const role = SYSTEM_ROLES.find(r => r.name === roleName);
      return role || null;
    },

    // Get users with specific role
    async getUsersWithRole(roleName: UserRole): Promise<User[]> {
      return firebaseDB.users.getByRole(roleName);
    }
  },

  // Post operations
  posts: {
    // Create new post
    async create(post: Omit<Post, 'id'>, userId: string): Promise<string> {
      try {
        const postsRef = collection(db, 'posts');
        const newPost = {
          ...post,
          userId,
          publisherId: userId,
          status: 'pending', // Posts start as pending for moderation
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const docRef = await addDoc(postsRef, newPost);
        return docRef.id;
      } catch (error) {
        console.error('Error creating post:', error);
        throw error;
      }
    },

    // Get post by ID
    async getById(postId: string): Promise<Post | null> {
      try {
        const postDoc = await getDoc(doc(db, 'posts', postId));
        if (postDoc.exists()) {
          return { id: postDoc.id, ...postDoc.data() } as Post;
        }
        return null;
      } catch (error) {
        console.error('Error getting post:', error);
        throw error;
      }
    },

    // Get posts by user ID
    async getByUserId(userId: string): Promise<Post[]> {
      try {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        const posts: Post[] = [];
        snapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...doc.data() } as Post);
        });
        
        return posts;
      } catch (error) {
        console.error('Error getting user posts:', error);
        throw error;
      }
    },

    // Get posts by status
    async getByStatus(status: Post['status']): Promise<Post[]> {
      try {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('status', '==', status));
        const snapshot = await getDocs(q);
        
        const posts: Post[] = [];
        snapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...doc.data() } as Post);
        });
        
        return posts;
      } catch (error) {
        console.error('Error getting posts by status:', error);
        throw error;
      }
    },

    // Get all posts
    async getAll(): Promise<Post[]> {
      try {
        const postsRef = collection(db, 'posts');
        const snapshot = await getDocs(postsRef);
        
        const posts: Post[] = [];
        snapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...doc.data() } as Post);
        });
        
        return posts;
      } catch (error) {
        console.error('Error getting all posts:', error);
        throw error;
      }
    },

    // Update post
    async update(postId: string, updates: Partial<Post>): Promise<void> {
      try {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          ...updates,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Error updating post:', error);
        throw error;
      }
    },

    // Moderate post (approve/reject)
    async moderatePost(postId: string, status: 'approved' | 'rejected', moderatorId: string, notes?: string): Promise<void> {
      try {
        const postRef = doc(db, 'posts', postId);
        const updates: Partial<Post> = {
          status,
          moderationBy: moderatorId,
          moderationAt: new Date(),
          updatedAt: new Date()
        };

        if (notes) {
          updates.moderationNotes = notes;
        }

        if (status === 'approved') {
          updates.publishedAt = new Date();
        }

        await updateDoc(postRef, updates);
      } catch (error) {
        console.error('Error moderating post:', error);
        throw error;
      }
    },

    // Delete post
    async delete(postId: string): Promise<void> {
      try {
        await deleteDoc(doc(db, 'posts', postId));
      } catch (error) {
        console.error('Error deleting post:', error);
        throw error;
      }
    },

    // Listen to posts changes
    onPostsChange(callback: (posts: Post[]) => void) {
      const postsRef = collection(db, 'posts');
      return onSnapshot(postsRef, (snapshot) => {
        const posts: Post[] = [];
        snapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...doc.data() } as Post);
        });
        callback(posts);
      });
    },

    // Listen to user posts changes
    onUserPostsChange(userId: string, callback: (posts: Post[]) => void) {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, where('userId', '==', userId));
      
      return onSnapshot(q, (snapshot) => {
        const posts: Post[] = [];
        snapshot.forEach((doc) => {
          posts.push({ id: doc.id, ...doc.data() } as Post);
        });
        callback(posts);
      });
    }
  },

  // System Settings operations
  systemSettings: {
    // Get Mercado Pago credentials
    async getMercadoPagoCredentials(): Promise<MercadoPagoCredentials | null> {
      try {
        const settingsDoc = await getDoc(doc(db, 'systemSettings', 'mercadoPago'));
        if (settingsDoc.exists()) {
          return settingsDoc.data() as MercadoPagoCredentials;
        }
        return null;
      } catch (error) {
        console.error('Error getting Mercado Pago credentials:', error);
        throw error;
      }
    },

    // Save Mercado Pago credentials
    async saveMercadoPagoCredentials(credentials: Omit<MercadoPagoCredentials, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<void> {
      try {
        const settingsRef = doc(db, 'systemSettings', 'mercadoPago');
        const now = new Date();
        
        const newCredentials: MercadoPagoCredentials = {
          id: 'mercadoPago',
          ...credentials,
          createdAt: now,
          updatedAt: now,
          updatedBy: userId,
        };

        await setDoc(settingsRef, newCredentials);
      } catch (error) {
        console.error('Error saving Mercado Pago credentials:', error);
        throw error;
      }
    },

    // Update Mercado Pago credentials
    async updateMercadoPagoCredentials(updates: Partial<Omit<MercadoPagoCredentials, 'id' | 'createdAt'>>, userId: string): Promise<void> {
      try {
        const settingsRef = doc(db, 'systemSettings', 'mercadoPago');
        await updateDoc(settingsRef, {
          ...updates,
          updatedAt: new Date(),
          updatedBy: userId,
        });
      } catch (error) {
        console.error('Error updating Mercado Pago credentials:', error);
        throw error;
      }
    },

    // Get Mercado Pago account (for subscription management)
    async getMercadoPagoAccount(): Promise<MercadoPagoAccount | null> {
      try {
        const settingsRef = doc(db, 'systemSettings', 'mercadoPagoAccount');
        const docSnap = await getDoc(settingsRef);
        
        if (docSnap.exists()) {
          return docSnap.data() as MercadoPagoAccount;
        }
        return null;
      } catch (error) {
        console.error('Error getting Mercado Pago account:', error);
        throw error;
      }
    },

    // Save Mercado Pago account
    async saveMercadoPagoAccount(account: Omit<MercadoPagoAccount, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<void> {
      try {
        const settingsRef = doc(db, 'systemSettings', 'mercadoPagoAccount');
        const now = new Date();
        
        const newAccount: MercadoPagoAccount = {
          id: 'mercadoPagoAccount',
          ...account,
          createdAt: now,
          updatedAt: now,
          updatedBy: userId,
        };

        await setDoc(settingsRef, newAccount);
      } catch (error) {
        console.error('Error saving Mercado Pago account:', error);
        throw error;
      }
    },

    // Update Mercado Pago account
    async updateMercadoPagoAccount(updates: Partial<Omit<MercadoPagoAccount, 'id' | 'createdAt'>>, userId: string): Promise<void> {
      try {
        const settingsRef = doc(db, 'systemSettings', 'mercadoPagoAccount');
        const now = new Date();
        
        await updateDoc(settingsRef, {
          ...updates,
          updatedAt: now,
          updatedBy: userId,
        });
      } catch (error) {
        console.error('Error updating Mercado Pago account:', error);
        throw error;
      }
    },


    // Listen to Mercado Pago credentials changes
    onMercadoPagoCredentialsChange(callback: (credentials: MercadoPagoCredentials | null) => void) {
      const settingsRef = doc(db, 'systemSettings', 'mercadoPago');
      return onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
          callback(doc.data() as MercadoPagoCredentials);
        } else {
          callback(null);
        }
      });
    }
  },

  // Subscription Plans operations
  plans: {
    // Create new subscription plan
    async create(plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> {
      try {
        const plansRef = collection(db, 'subscriptionPlans');
        const newPlan = {
          ...plan,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        };
        
        const docRef = await addDoc(plansRef, newPlan);
        const planId = docRef.id;
        
        // Automatically sync with MercadoPago after creation
        try {
          await this.syncPlanWithMercadoPago(planId);
          console.log('✅ Plan synced with MercadoPago:', planId);
        } catch (syncError) {
          console.error('⚠️ Failed to sync plan with MercadoPago (non-blocking):', syncError);
          // Don't throw - plan was created successfully in our DB
        }
        
        return planId;
      } catch (error) {
        console.error('Error creating subscription plan:', error);
        throw error;
      }
    },

    // Get all plans
    async getAll(): Promise<SubscriptionPlan[]> {
      try {
        const plansRef = collection(db, 'subscriptionPlans');
        const snapshot = await getDocs(plansRef);
        
        const plans: SubscriptionPlan[] = [];
        snapshot.forEach((doc) => {
          plans.push({ id: doc.id, ...doc.data() } as SubscriptionPlan);
        });
        
        return plans.sort((a, b) => a.price - b.price);
      } catch (error) {
        console.error('Error getting all subscription plans:', error);
        throw error;
      }
    },

    // Update plan
    async update(planId: string, updates: Partial<Omit<SubscriptionPlan, 'id' | 'createdAt' | 'createdBy'>>, userId: string): Promise<void> {
      try {
        const planRef = doc(db, 'subscriptionPlans', planId);
        await updateDoc(planRef, {
          ...updates,
          updatedAt: new Date(),
          updatedBy: userId,
        });
        
        // Automatically sync with MercadoPago after update
        try {
          await this.syncPlanWithMercadoPago(planId);
          console.log('✅ Plan synced with MercadoPago:', planId);
        } catch (syncError) {
          console.error('⚠️ Failed to sync plan with MercadoPago (non-blocking):', syncError);
          // Don't throw - plan was updated successfully in our DB
        }
      } catch (error) {
        console.error('Error updating subscription plan:', error);
        throw error;
      }
    },

    // Delete plan
    async delete(planId: string): Promise<void> {
      try {
        // Get the plan data before deletion to access mercadoPagoPlanId
        const planRef = doc(db, 'subscriptionPlans', planId);
        const planSnap = await getDoc(planRef);
        const planData = planSnap.data() as SubscriptionPlan | undefined;
        
        // Delete from Firebase
        await deleteDoc(planRef);
        
        // Automatically delete from MercadoPago if it was synced
        if (planData?.mercadoPagoPlanId) {
          try {
            await this.deletePlanFromMercadoPago(planData.mercadoPagoPlanId);
            console.log('✅ Plan deleted from MercadoPago:', planData.mercadoPagoPlanId);
          } catch (syncError) {
            console.error('⚠️ Failed to delete plan from MercadoPago (non-blocking):', syncError);
            // Don't throw - plan was deleted successfully from our DB
          }
        }
      } catch (error) {
        console.error('Error deleting subscription plan:', error);
        throw error;
      }
    },

    // Toggle plan active status
    async toggleActive(planId: string, isActive: boolean, userId: string): Promise<void> {
      try {
        const planRef = doc(db, 'subscriptionPlans', planId);
        await updateDoc(planRef, {
          isActive,
          updatedAt: new Date(),
          updatedBy: userId,
        });
        
        // Automatically sync with MercadoPago after status change
        try {
          await this.syncPlanWithMercadoPago(planId);
          console.log('✅ Plan status synced with MercadoPago:', planId);
        } catch (syncError) {
          console.error('⚠️ Failed to sync plan status with MercadoPago (non-blocking):', syncError);
          // Don't throw - plan status was updated successfully in our DB
        }
      } catch (error) {
        console.error('Error toggling plan active status:', error);
        throw error;
      }
    },

    // Helper function to sync a single plan with MercadoPago
    async syncPlanWithMercadoPago(planId: string): Promise<void> {
      try {
        // Get the plan data
        const planRef = doc(db, 'subscriptionPlans', planId);
        const planSnap = await getDoc(planRef);
        
        if (!planSnap.exists()) {
          throw new Error('Plan not found');
        }

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        try {
          const response = await fetch('/api/mercadopago/sync-plan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ planId }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || 'Failed to sync plan with MercadoPago');
          }

          const result = await response.json();
          
          console.log('🔍 [Firebase Sync] API Response:', {
            success: result.success,
            mercadoPagoPlanId: result.mercadoPagoPlanId,
            message: result.message,
            hasPlanId: !!result.mercadoPagoPlanId
          });
          
          // Update the plan with MercadoPago ID
          if (result.mercadoPagoPlanId) {
            console.log('💾 [Firebase Sync] Updating Firebase with MercadoPago Plan ID:', {
              planId: planId,
              mercadoPagoPlanId: result.mercadoPagoPlanId,
              planRef: planRef.path
            });
            
            try {
              await updateDoc(planRef, {
                mercadoPagoPlanId: result.mercadoPagoPlanId,
                updatedAt: new Date(),
                updatedBy: 'mercado-pago-sync'
              });
              console.log('✅ [Firebase Sync] Firebase updated successfully');
              
              // Verify the update
              const verifySnap = await getDoc(planRef);
              const verifyData = verifySnap.data();
              console.log('🔍 [Firebase Sync] Verification - Plan data after update:', {
                planId: planId,
                mercadoPagoPlanId: verifyData?.mercadoPagoPlanId,
                updatedAt: verifyData?.updatedAt
              });
              
            } catch (updateError) {
              console.error('❌ [Firebase Sync] Failed to update Firebase:', updateError);
              throw updateError;
            }
          } else {
            console.error('❌ [Firebase Sync] No MercadoPago Plan ID in API response:', result);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error('Sync request timed out. Please try manual sync later.');
          }
          throw fetchError;
        }
      } catch (error) {
        console.error('Error syncing plan with MercadoPago:', error);
        throw error;
      }
    },

    // Helper function to delete a plan from MercadoPago
    async deletePlanFromMercadoPago(mercadoPagoPlanId: string): Promise<void> {
      try {
        const response = await fetch('/api/mercadopago/delete-plan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mercadoPagoPlanId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete plan from MercadoPago');
        }
      } catch (error) {
        console.error('Error deleting plan from MercadoPago:', error);
        throw error;
      }
    }
  },

  // Posts Collection
  posts: {
    async create(postData: Omit<BasePost, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> {
      try {
        // Filter out undefined values to avoid Firebase errors
        const cleanData = Object.fromEntries(
          Object.entries(postData).filter(([_, value]) => value !== undefined)
        );
        
        const docRef = await addDoc(collection(db, 'posts'), {
          ...cleanData,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (error) {
        console.error('Error creating post:', error);
        throw new Error('Failed to create post');
      }
    },

    // Create post with images in subcollection
    async createWithImages(postData: Omit<BasePost, 'id' | 'createdAt' | 'updatedAt' | 'images'>, images: string[], userId: string): Promise<string> {
      try {
        // First create the post without images
        const cleanData = Object.fromEntries(
          Object.entries(postData).filter(([_, value]) => value !== undefined)
        );
        
        const docRef = await addDoc(collection(db, 'posts'), {
          ...cleanData,
          images: [], // Empty array for now, will be populated with image references
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Save images to subcollection
        if (images.length > 0) {
          const imageRefs = await firebaseDB.postImages.createMultiple(docRef.id, images);
          
          // Update the post with image references
          await updateDoc(docRef, {
            images: imageRefs,
            updatedAt: serverTimestamp(),
          });
        }

        return docRef.id;
      } catch (error) {
        console.error('Error creating post with images:', error);
        throw new Error('Failed to create post with images');
      }
    },

    async getById(postId: string): Promise<BasePost | null> {
      try {
        const docRef = doc(db, 'posts', postId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as BasePost;
        }
        return null;
      } catch (error) {
        console.error('Error getting post:', error);
        throw new Error('Failed to get post');
      }
    },

    async getByUserId(userId: string): Promise<BasePost[]> {
      try {
        const q = query(
          collection(db, 'posts'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as BasePost[];
      } catch (error) {
        console.error('Error getting user posts:', error);
        throw new Error('Failed to get user posts');
      }
    },

    async getAll(): Promise<BasePost[]> {
      try {
        const q = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as BasePost[];
      } catch (error) {
        console.error('Error getting all posts:', error);
        throw new Error('Failed to get posts');
      }
    },

    async update(postId: string, updates: Partial<Omit<BasePost, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
      try {
        // Filter out undefined values to avoid Firebase errors
        const cleanUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, value]) => value !== undefined)
        );
        
        const docRef = doc(db, 'posts', postId);
        await updateDoc(docRef, {
          ...cleanUpdates,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error updating post:', error);
        throw new Error('Failed to update post');
      }
    },

    async delete(postId: string): Promise<void> {
      try {
        const docRef = doc(db, 'posts', postId);
        await deleteDoc(docRef);
      } catch (error) {
        console.error('Error deleting post:', error);
        throw new Error('Failed to delete post');
      }
    },

    async searchByLocation(location: string): Promise<BasePost[]> {
      try {
        const q = query(
          collection(db, 'posts'),
          where('location', '>=', location),
          where('location', '<=', location + '\uf8ff'),
          orderBy('location'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as BasePost[];
      } catch (error) {
        console.error('Error searching posts by location:', error);
        throw new Error('Failed to search posts by location');
      }
    },

    async getByCategory(category: ServiceCategory): Promise<BasePost[]> {
      try {
        const q = query(
          collection(db, 'posts'),
          where('category', '==', category),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as BasePost[];
      } catch (error) {
        console.error('Error getting posts by category:', error);
        throw new Error('Failed to get posts by category');
      }
    },
  },

  // Post Images Subcollection
  postImages: {
    async create(postId: string, imageData: string, order: number = 0): Promise<string> {
      try {
        const imageRef = await addDoc(collection(db, 'posts', postId, 'images'), {
          data: imageData,
          order,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return imageRef.id;
      } catch (error) {
        console.error('Error creating post image:', error);
        throw new Error('Failed to create post image');
      }
    },

    async createMultiple(postId: string, images: string[]): Promise<string[]> {
      try {
        const imageRefs: string[] = [];
        
        for (let i = 0; i < images.length; i++) {
          const imageRef = await firebaseDB.postImages.create(postId, images[i], i);
          imageRefs.push(imageRef);
        }
        
        return imageRefs;
      } catch (error) {
        console.error('Error creating multiple post images:', error);
        throw new Error('Failed to create multiple post images');
      }
    },

    async getByPostId(postId: string): Promise<PostImage[]> {
      try {
        const q = query(
          collection(db, 'posts', postId, 'images'),
          orderBy('order', 'asc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            data: data.data,
            order: data.order,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };
        });
      } catch (error) {
        console.error('Error getting post images:', error);
        throw new Error('Failed to get post images');
      }
    },

    async getById(postId: string, imageId: string): Promise<{ id: string; data: string; order: number } | null> {
      try {
        const imageDoc = await getDoc(doc(db, 'posts', postId, 'images', imageId));
        if (imageDoc.exists()) {
          return {
            id: imageDoc.id,
            data: imageDoc.data().data,
            order: imageDoc.data().order,
          };
        }
        return null;
      } catch (error) {
        console.error('Error getting post image:', error);
        throw new Error('Failed to get post image');
      }
    },

    async delete(postId: string, imageId: string): Promise<void> {
      try {
        await deleteDoc(doc(db, 'posts', postId, 'images', imageId));
      } catch (error) {
        console.error('Error deleting post image:', error);
        throw new Error('Failed to delete post image');
      }
    },

    async deleteAll(postId: string): Promise<void> {
      try {
        const images = await firebaseDB.postImages.getByPostId(postId);
        const deletePromises = images.map(image => 
          firebaseDB.postImages.delete(postId, image.id)
        );
        await Promise.all(deletePromises);
      } catch (error) {
        console.error('Error deleting all post images:', error);
        throw new Error('Failed to delete all post images');
      }
    },

    async updateOrder(postId: string, imageId: string, newOrder: number): Promise<void> {
      try {
        await updateDoc(doc(db, 'posts', postId, 'images', imageId), {
          order: newOrder,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error updating image order:', error);
        throw new Error('Failed to update image order');
      }
    },
  },

  // Bookings Collection
  bookings: {
    async create(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'post' | 'client' | 'owner'>): Promise<string> {
      try {
        // Server-side validation: prevent users from booking their own services
        if (bookingData.clientId === bookingData.ownerId) {
          throw new Error('No puedes reservar tu propio servicio');
        }

        const cleanData = Object.fromEntries(
          Object.entries(bookingData).filter(([_, value]) => value !== undefined)
        );
        
        const docRef = await addDoc(collection(db, 'bookings'), {
          ...cleanData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (error) {
        console.error('Error creating booking:', error);
        throw error instanceof Error ? error : new Error('Failed to create booking');
      }
    },

    async getById(bookingId: string): Promise<Booking | null> {
      try {
        const docRef = doc(db, 'bookings', bookingId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const booking = {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            startDate: data.startDate?.toDate() || new Date(),
            endDate: data.endDate?.toDate() || new Date(),
            acceptedAt: data.acceptedAt?.toDate(),
            declinedAt: data.declinedAt?.toDate(),
            paidAt: data.paidAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate(),
            completedAt: data.completedAt?.toDate(),
          } as Booking;

          // Populate post, client, and owner data
          try {
            const [post, client, owner] = await Promise.all([
              firebaseDB.posts.getById(booking.postId),
              firebaseDB.users.getById(booking.clientId),
              firebaseDB.users.getById(booking.ownerId),
            ]);

            if (post) booking.post = post;
            if (client) booking.client = client;
            if (owner) booking.owner = owner;
          } catch (populateError) {
            console.error('Error populating booking data:', populateError);
            // Continue with booking even if population fails
          }

          return booking;
        }
        return null;
      } catch (error) {
        console.error('Error getting booking:', error);
        throw new Error('Failed to get booking');
      }
    },

    async getByUserId(userId: string): Promise<Booking[]> {
      try {
        const q = query(
          collection(db, 'bookings'),
          where('clientId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        const bookings: Booking[] = [];
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          const booking = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            startDate: data.startDate?.toDate() || new Date(),
            endDate: data.endDate?.toDate() || new Date(),
            acceptedAt: data.acceptedAt?.toDate(),
            declinedAt: data.declinedAt?.toDate(),
            paidAt: data.paidAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate(),
            completedAt: data.completedAt?.toDate(),
          } as Booking;

          // Populate post, client, and owner data
          try {
            const [post, client, owner] = await Promise.all([
              firebaseDB.posts.getById(booking.postId),
              firebaseDB.users.getById(booking.clientId),
              firebaseDB.users.getById(booking.ownerId),
            ]);

            if (post) booking.post = post;
            if (client) booking.client = client;
            if (owner) booking.owner = owner;
          } catch (populateError) {
            console.error('Error populating booking data:', populateError);
            // Continue with booking even if population fails
          }

          bookings.push(booking);
        }
        
        return bookings;
      } catch (error) {
        console.error('Error getting user bookings:', error);
        throw new Error('Failed to get user bookings');
      }
    },

    async getByOwnerId(ownerId: string): Promise<Booking[]> {
      try {
        const q = query(
          collection(db, 'bookings'),
          where('ownerId', '==', ownerId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        const bookings: Booking[] = [];
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          const booking = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            startDate: data.startDate?.toDate() || new Date(),
            endDate: data.endDate?.toDate() || new Date(),
            acceptedAt: data.acceptedAt?.toDate(),
            declinedAt: data.declinedAt?.toDate(),
            paidAt: data.paidAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate(),
            completedAt: data.completedAt?.toDate(),
          } as Booking;

          // Populate post, client, and owner data
          try {
            const [post, client, owner] = await Promise.all([
              firebaseDB.posts.getById(booking.postId),
              firebaseDB.users.getById(booking.clientId),
              firebaseDB.users.getById(booking.ownerId),
            ]);

            if (post) booking.post = post;
            if (client) booking.client = client;
            if (owner) booking.owner = owner;
          } catch (populateError) {
            console.error('Error populating booking data:', populateError);
            // Continue with booking even if population fails
          }

          bookings.push(booking);
        }
        
        return bookings;
      } catch (error) {
        console.error('Error getting owner bookings:', error);
        throw new Error('Failed to get owner bookings');
      }
    },

    async updateStatus(bookingId: string, status: BookingStatus, additionalData?: Record<string, unknown>): Promise<void> {
      try {
        const docRef = doc(db, 'bookings', bookingId);
        const updateData: Record<string, unknown> = {
          status,
          updatedAt: serverTimestamp(),
        };

        // Add timestamp based on status
        switch (status) {
          case 'accepted':
            updateData.acceptedAt = serverTimestamp();
            break;
          case 'declined':
            updateData.declinedAt = serverTimestamp();
            break;
          case 'paid':
            updateData.paidAt = serverTimestamp();
            break;
          case 'cancelled':
            updateData.cancelledAt = serverTimestamp();
            break;
          case 'completed':
            updateData.completedAt = serverTimestamp();
            break;
        }

        // Add additional data if provided
        if (additionalData) {
          Object.assign(updateData, additionalData);
        }

        await updateDoc(docRef, updateData);
      } catch (error) {
        console.error('Error updating booking status:', error);
        throw new Error('Failed to update booking status');
      }
    },

    async delete(bookingId: string): Promise<void> {
      try {
        await deleteDoc(doc(db, 'bookings', bookingId));
      } catch (error) {
        console.error('Error deleting booking:', error);
        throw new Error('Failed to delete booking');
      }
    },
  },

  // Notifications Collection
  notifications: {
    async create(notificationData: Omit<Notification, 'id' | 'createdAt' | 'readAt'>): Promise<string> {
      try {
        const cleanData = Object.fromEntries(
          Object.entries(notificationData).filter(([_, value]) => value !== undefined)
        );
        
        const docRef = await addDoc(collection(db, 'notifications'), {
          ...cleanData,
          isRead: false,
          createdAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (error) {
        console.error('Error creating notification:', error);
        throw new Error('Failed to create notification');
      }
    },

    async getByUserId(userId: string): Promise<Notification[]> {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          readAt: doc.data().readAt?.toDate(),
        })) as Notification[];
      } catch (error) {
        console.error('Error getting user notifications:', error);
        throw new Error('Failed to get user notifications');
      }
    },

    async markAsRead(notificationId: string): Promise<void> {
      try {
        const docRef = doc(db, 'notifications', notificationId);
        await updateDoc(docRef, {
          isRead: true,
          readAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error marking notification as read:', error);
        throw new Error('Failed to mark notification as read');
      }
    },

    async markAllAsRead(userId: string): Promise<void> {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('isRead', '==', false)
        );
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        querySnapshot.docs.forEach(doc => {
          batch.update(doc.ref, {
            isRead: true,
            readAt: serverTimestamp(),
          });
        });
        
        await batch.commit();
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw new Error('Failed to mark all notifications as read');
      }
    },

    async getUnreadCount(userId: string): Promise<number> {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('isRead', '==', false)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
      } catch (error) {
        console.error('Error getting unread count:', error);
        throw new Error('Failed to get unread count');
      }
    },

    async delete(notificationId: string): Promise<void> {
      try {
        await deleteDoc(doc(db, 'notifications', notificationId));
      } catch (error) {
        console.error('Error deleting notification:', error);
        throw new Error('Failed to delete notification');
      }
    },
  },

  // Favourites Collection
  favourites: {
    async add(userId: string, postId: string): Promise<string> {
      try {
        // Check if already favourited
        const existingFavourite = await this.getByUserAndPost(userId, postId);
        if (existingFavourite) {
          throw new Error('Post already in favourites');
        }

        const docRef = await addDoc(collection(db, 'favourites'), {
          userId,
          postId,
          createdAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (error) {
        console.error('Error adding favourite:', error);
        throw new Error('Failed to add favourite');
      }
    },

    async remove(userId: string, postId: string): Promise<void> {
      try {
        const favourite = await this.getByUserAndPost(userId, postId);
        if (!favourite) {
          throw new Error('Favourite not found');
        }

        await deleteDoc(doc(db, 'favourites', favourite.id));
      } catch (error) {
        console.error('Error removing favourite:', error);
        throw new Error('Failed to remove favourite');
      }
    },

    async getByUserAndPost(userId: string, postId: string): Promise<Favourite | null> {
      try {
        const q = query(
          collection(db, 'favourites'),
          where('userId', '==', userId),
          where('postId', '==', postId)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          return null;
        }

        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          postId: data.postId,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      } catch (error) {
        console.error('Error getting favourite:', error);
        return null;
      }
    },

    async getByUserId(userId: string): Promise<Favourite[]> {
      try {
        const q = query(
          collection(db, 'favourites'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            postId: data.postId,
            createdAt: data.createdAt?.toDate() || new Date(),
          };
        });
      } catch (error) {
        console.error('Error getting user favourites:', error);
        throw new Error('Failed to get favourites');
      }
    },

    async isFavourited(userId: string, postId: string): Promise<boolean> {
      try {
        const favourite = await this.getByUserAndPost(userId, postId);
        return favourite !== null;
      } catch (error) {
        console.error('Error checking favourite status:', error);
        return false;
      }
    },

    async delete(favouriteId: string): Promise<void> {
      try {
        await deleteDoc(doc(db, 'favourites', favouriteId));
      } catch (error) {
        console.error('Error deleting favourite:', error);
        throw new Error('Failed to delete favourite');
      }
    },
  },

  // User Subscriptions operations
  subscriptions: {
    async create(subscriptionData: any): Promise<string> {
      try {
        const subscriptionsRef = collection(db, 'userSubscriptions');
        const docRef = await addDoc(subscriptionsRef, {
          ...subscriptionData,
          createdAt: subscriptionData.createdAt || new Date(),
          updatedAt: subscriptionData.updatedAt || new Date(),
        });
        console.log('✅ [Firebase] Subscription created:', docRef.id);
        return docRef.id;
      } catch (error) {
        console.error('Error creating subscription:', error);
        throw new Error('Failed to create subscription');
      }
    },

    async getById(subscriptionId: string): Promise<UserSubscription | null> {
      try {
        const subscriptionRef = doc(db, 'userSubscriptions', subscriptionId);
        const subscriptionSnap = await getDoc(subscriptionRef);
        
        if (!subscriptionSnap.exists()) {
          return null;
        }

        const data = subscriptionSnap.data();
        return {
          id: subscriptionSnap.id,
          ...data,
          startDate: data.startDate?.toDate?.() || new Date(data.startDate),
          endDate: data.endDate?.toDate?.() || (data.endDate ? new Date(data.endDate) : undefined),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        } as UserSubscription;
      } catch (error) {
        console.error('Error getting subscription:', error);
        return null;
      }
    },

    async update(subscriptionId: string, updates: Partial<UserSubscription>): Promise<void> {
      try {
        const subscriptionRef = doc(db, 'userSubscriptions', subscriptionId);
        await updateDoc(subscriptionRef, {
          ...updates,
          updatedAt: new Date(),
        });
        console.log('✅ [Firebase] Subscription updated:', subscriptionId);
      } catch (error) {
        console.error('Error updating subscription:', error);
        throw new Error('Failed to update subscription');
      }
    },

    async getByUserId(userId: string): Promise<UserSubscription[]> {
      try {
        const subscriptionsRef = collection(db, 'userSubscriptions');
        const q = query(
          subscriptionsRef,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            startDate: data.startDate?.toDate?.() || new Date(data.startDate),
            endDate: data.endDate?.toDate?.() || (data.endDate ? new Date(data.endDate) : undefined),
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
          } as UserSubscription;
        });
      } catch (error) {
        console.error('Error getting user subscriptions:', error);
        return [];
      }
    },

    async getByMercadoPagoId(mercadoPagoSubscriptionId: string): Promise<UserSubscription | null> {
      try {
        const subscriptionsRef = collection(db, 'userSubscriptions');
        const q = query(
          subscriptionsRef,
          where('mercadoPagoSubscriptionId', '==', mercadoPagoSubscriptionId),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          return null;
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          startDate: data.startDate?.toDate?.() || new Date(data.startDate),
          endDate: data.endDate?.toDate?.() || (data.endDate ? new Date(data.endDate) : undefined),
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
        } as UserSubscription;
      } catch (error) {
        console.error('Error getting subscription by MercadoPago ID:', error);
        return null;
      }
    },
  },

  // Payment Records operations
  payments: {
    async create(paymentData: any): Promise<string> {
      try {
        const paymentsRef = collection(db, 'payments');
        const docRef = await addDoc(paymentsRef, {
          ...paymentData,
          createdAt: paymentData.createdAt || new Date(),
          updatedAt: paymentData.updatedAt || new Date(),
        });
        console.log('✅ [Firebase] Payment created:', docRef.id);
        return docRef.id;
      } catch (error) {
        console.error('Error creating payment:', error);
        throw new Error('Failed to create payment');
      }
    },

    async getById(paymentId: string): Promise<any | null> {
      try {
        const paymentRef = doc(db, 'payments', paymentId);
        const paymentSnap = await getDoc(paymentRef);
        
        if (!paymentSnap.exists()) {
          return null;
        }

        const data = paymentSnap.data();
        return {
          id: paymentSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
          processedAt: data.processedAt?.toDate?.() || (data.processedAt ? new Date(data.processedAt) : undefined),
        };
      } catch (error) {
        console.error('Error getting payment:', error);
        return null;
      }
    },

    async update(paymentId: string, updates: any): Promise<void> {
      try {
        const paymentRef = doc(db, 'payments', paymentId);
        await updateDoc(paymentRef, {
          ...updates,
          updatedAt: new Date(),
        });
        console.log('✅ [Firebase] Payment updated:', paymentId);
      } catch (error) {
        console.error('Error updating payment:', error);
        throw new Error('Failed to update payment');
      }
    },

    async getByUserId(userId: string): Promise<any[]> {
      try {
        const paymentsRef = collection(db, 'payments');
        const q = query(
          paymentsRef,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
            processedAt: data.processedAt?.toDate?.() || (data.processedAt ? new Date(data.processedAt) : undefined),
          };
        });
      } catch (error) {
        console.error('Error getting user payments:', error);
        return [];
      }
    },

    async getByMercadoPagoId(mercadoPagoPaymentId: string): Promise<any | null> {
      try {
        const paymentsRef = collection(db, 'payments');
        const q = query(
          paymentsRef,
          where('mercadoPagoPaymentId', '==', mercadoPagoPaymentId),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          return null;
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
          processedAt: data.processedAt?.toDate?.() || (data.processedAt ? new Date(data.processedAt) : undefined),
        };
      } catch (error) {
        console.error('Error getting payment by MercadoPago ID:', error);
        return null;
      }
    },
  },

  // MercadoPago Accounts Collection
  mercadoPagoAccounts: {
    async create(accountData: any): Promise<string> {
      try {
        const docRef = await addDoc(collection(db, 'mercadoPagoAccounts'), {
          ...accountData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log('✅ [Firebase] MercadoPago account created:', docRef.id);
        return docRef.id;
      } catch (error) {
        console.error('Error creating MercadoPago account:', error);
        throw new Error('Failed to create MercadoPago account');
      }
    },

    async getByUserId(userId: string): Promise<any | null> {
      try {
        const accountsRef = collection(db, 'mercadoPagoAccounts');
        const q = query(
          accountsRef,
          where('userId', '==', userId),
          where('isActive', '==', true),
          limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          return null;
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
          expiresAt: data.expiresAt?.toDate?.() || (data.expiresAt ? new Date(data.expiresAt) : undefined),
        };
      } catch (error) {
        console.error('Error getting MercadoPago account by user ID:', error);
        return null;
      }
    },

    async getByMercadoPagoUserId(mercadoPagoUserId: string): Promise<any | null> {
      try {
        const accountsRef = collection(db, 'mercadoPagoAccounts');
        const q = query(
          accountsRef,
          where('mercadoPagoUserId', '==', mercadoPagoUserId),
          where('isActive', '==', true),
          limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          return null;
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
          expiresAt: data.expiresAt?.toDate?.() || (data.expiresAt ? new Date(data.expiresAt) : undefined),
        };
      } catch (error) {
        console.error('Error getting MercadoPago account by MercadoPago user ID:', error);
        return null;
      }
    },

    async update(accountId: string, updates: any): Promise<void> {
      try {
        const accountRef = doc(db, 'mercadoPagoAccounts', accountId);
        await updateDoc(accountRef, {
          ...updates,
          updatedAt: new Date(),
        });
        console.log('✅ [Firebase] MercadoPago account updated:', accountId);
      } catch (error) {
        console.error('Error updating MercadoPago account:', error);
        throw new Error('Failed to update MercadoPago account');
      }
    },

    async deactivate(userId: string): Promise<void> {
      try {
        const accountsRef = collection(db, 'mercadoPagoAccounts');
        const q = query(
          accountsRef,
          where('userId', '==', userId),
          where('isActive', '==', true)
        );
        const querySnapshot = await getDocs(q);

        const updatePromises = querySnapshot.docs.map(doc => 
          updateDoc(doc.ref, {
            isActive: false,
            updatedAt: new Date(),
          })
        );

        await Promise.all(updatePromises);
        console.log('✅ [Firebase] MercadoPago accounts deactivated for user:', userId);
      } catch (error) {
        console.error('Error deactivating MercadoPago accounts:', error);
        throw new Error('Failed to deactivate MercadoPago accounts');
      }
    },

    async deleteByUserId(userId: string): Promise<void> {
      try {
        const accountsRef = collection(db, 'mercadoPagoAccounts');
        const q = query(accountsRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        console.log(`✅ [Firebase] Deleted ${querySnapshot.size} MercadoPago account documents for user:`, userId);
      } catch (error) {
        console.error('Error deleting MercadoPago accounts:', error);
        throw new Error('Failed to delete MercadoPago accounts');
      }
    },
  },

  // Newsletter Subscribers Collection
  newsletterSubscribers: {
    async create(email: string): Promise<string> {
      try {
        // Check if email already exists
        const subscribersRef = collection(db, 'newsletter_subscribers');
        const q = query(subscribersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          throw new Error('Email already subscribed');
        }

        const docRef = await addDoc(subscribersRef, {
          email,
          subscribedAt: serverTimestamp(),
          isActive: true,
        });
        console.log('✅ [Firebase] Newsletter subscriber added:', docRef.id);
        return docRef.id;
      } catch (error) {
        console.error('Error adding newsletter subscriber:', error);
        throw error instanceof Error ? error : new Error('Failed to add newsletter subscriber');
      }
    },

    async getAll(): Promise<Array<{ id: string; email: string; subscribedAt: any; isActive: boolean }>> {
      try {
        const subscribersRef = collection(db, 'newsletter_subscribers');
        const querySnapshot = await getDocs(subscribersRef);
        
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Array<{ id: string; email: string; subscribedAt: any; isActive: boolean }>;
      } catch (error) {
        console.error('Error fetching newsletter subscribers:', error);
        throw new Error('Failed to fetch newsletter subscribers');
      }
    },
  },

};
