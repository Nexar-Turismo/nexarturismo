'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { firebaseAuth, firebaseDB } from '@/services/firebaseService';
import { User as FirebaseUser } from 'firebase/auth';
import { usePermissions } from '@/services/permissionsService';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { globalAuthMiddleware } from '@/services/globalAuthMiddleware';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, userData: Partial<User>) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  // Role management
  assignRole: (userId: string, roleName: UserRole) => Promise<void>;
  removeRole: (userId: string, roleName: UserRole) => Promise<void>;
  // Permission checking
  hasPermission: (permissionId: string) => boolean;
  hasRole: (roleName: UserRole) => boolean;
  canPerformAction: (resource: string, action: string) => boolean;
  // Global middleware
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get permissions for the current user
  const permissions = usePermissions(user?.roles || []);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          console.log('🔄 [Auth Context] User authenticated, checking global status:', firebaseUser.uid);
          
          // Use global middleware to check and update user status
          const userStatus = await globalAuthMiddleware.checkGlobalUserStatus(firebaseUser.uid);
          
          if (userStatus) {
            // Get full user data from Firebase to include all fields like referralCode, phone, etc.
            const fullUserData = await firebaseDB.users.getById(firebaseUser.uid);
            
            // Convert userStatus back to User format for compatibility
            const userData: User = {
              id: userStatus.id,
              name: userStatus.name,
              email: userStatus.email,
              phone: fullUserData?.phone || '',
              avatar: fullUserData?.avatar || '',
              roles: userStatus.roles,
              isActive: true,
              emailVerified: firebaseUser.emailVerified,
              createdAt: fullUserData?.createdAt || new Date(),
              updatedAt: fullUserData?.updatedAt || new Date(),
              profileCompleted: fullUserData?.profileCompleted || false,
              referralCode: fullUserData?.referralCode,
              referredBy: fullUserData?.referredBy,
            };
            setUser(userData);
            console.log('✅ [Auth Context] User status updated:', {
              userId: userData.id,
              roles: userData.roles?.map(r => r.roleName),
              hasActiveSubscription: userStatus.hasActiveSubscription
            });
          } else {
            // Fallback: create user with default client role if middleware fails
            const defaultRole = {
              roleId: 'role_client',
              roleName: 'client' as UserRole,
              assignedAt: new Date(),
              isActive: true,
            };

            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              phone: '',
              avatar: firebaseUser.photoURL || '',
              roles: [defaultRole],
              isActive: true,
              emailVerified: firebaseUser.emailVerified,
              createdAt: new Date(),
              updatedAt: new Date(),
              profileCompleted: false,
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
            console.log('⚠️ [Auth Context] Created fallback user with default client role');
          }
        } catch (error) {
          console.error('❌ [Auth Context] Error fetching user data:', error);
          setUser(null);
        }
      } else {
        console.log('👋 [Auth Context] User logged out');
        globalAuthMiddleware.clearAllCache(); // Clear cache when user logs out
        setUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      await firebaseAuth.signIn(email, password);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, userData: Partial<User>): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      await firebaseAuth.signUp(email, password, userData);
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await firebaseAuth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Role management functions
  const assignRole = async (userId: string, roleName: UserRole): Promise<void> => {
    try {
      await firebaseDB.users.assignRole(userId, roleName, user?.id);
      
      // Update local user state if assigning to current user
      if (userId === user?.id) {
        const updatedUser = await firebaseDB.users.getById(userId);
        if (updatedUser) {
          setUser(updatedUser);
        }
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      throw error;
    }
  };

  const removeRole = async (userId: string, roleName: UserRole): Promise<void> => {
    try {
      await firebaseDB.users.removeRole(userId, roleName, user?.id);
      
      // Update local user state if removing from current user
      if (userId === user?.id) {
        const updatedUser = await firebaseDB.users.getById(userId);
        if (updatedUser) {
          setUser(updatedUser);
        }
      }
    } catch (error) {
      console.error('Error removing role:', error);
      throw error;
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (!user?.id) return;

    try {
      console.log('🔄 [Auth Context] Refreshing user status via global middleware');
      
      // Clear cache and force refresh
      globalAuthMiddleware.clearUserCache(user.id);
      const userStatus = await globalAuthMiddleware.forceRefreshUserStatus(user.id);
      
      if (userStatus) {
        // Get full user data from Firebase to include all fields
        const fullUserData = await firebaseDB.users.getById(user.id);
        
        // Convert userStatus back to User format for compatibility
        const updatedUser: User = {
          id: userStatus.id,
          name: userStatus.name,
          email: userStatus.email,
          phone: fullUserData?.phone || user?.phone || '',
          avatar: fullUserData?.avatar || user?.avatar || '',
          roles: userStatus.roles,
          isActive: true,
          emailVerified: user?.emailVerified || false,
          createdAt: fullUserData?.createdAt || user?.createdAt || new Date(),
          updatedAt: new Date(),
          profileCompleted: fullUserData?.profileCompleted || user?.profileCompleted || false,
          referralCode: fullUserData?.referralCode,
          referredBy: fullUserData?.referredBy,
        };
        setUser(updatedUser);
        console.log('✅ [Auth Context] User status refreshed:', {
          userId: updatedUser.id,
          roles: updatedUser.roles?.map(r => r.roleName),
          hasActiveSubscription: userStatus.hasActiveSubscription
        });
      }
    } catch (error) {
      console.error('❌ [Auth Context] Error refreshing user:', error);
    }
  };

  const contextValue: AuthContextType = {
    user,
    login,
    signup,
    logout,
    isLoading,
    assignRole,
    removeRole,
    hasPermission: permissions.hasPermission,
    hasRole: permissions.hasRole,
    canPerformAction: permissions.canPerformAction,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 