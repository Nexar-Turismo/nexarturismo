'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shield, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  fallback,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, isLoading, hasPermission, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return null; // Will redirect in useEffect
  }

  // Check required permissions
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );
    
    if (!hasAllPermissions) {
      return fallback || (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You don't have the required permissions to access this page.
            </p>
            <button
              onClick={() => router.back()}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // Check required roles
  if (requiredRoles.length > 0) {
    const hasAnyRequiredRole = requiredRoles.some(role => 
      hasRole(role as UserRole)
    );
    
    if (!hasAnyRequiredRole) {
      return fallback || (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You don't have the required role to access this page.
            </p>
            <button
              onClick={() => router.back()}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // User has access, render children
  return <>{children}</>;
}

// Convenience components for common permission checks
export function RequirePermission({ 
  children, 
  permission, 
  ...props 
}: Omit<ProtectedRouteProps, 'requiredPermissions'> & { permission: string }) {
  return (
    <ProtectedRoute requiredPermissions={[permission]} {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function RequireRole({ 
  children, 
  role, 
  ...props 
}: Omit<ProtectedRouteProps, 'requiredRoles'> & { role: string }) {
  return (
    <ProtectedRoute requiredRoles={[role]} {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function RequireSuperadmin({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['superadmin']} {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function RequirePublisher({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['publisher']} {...props}>
      {children}
    </ProtectedRoute>
  );
}

export function RequireClient({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['client']} {...props}>
      {children}
    </ProtectedRoute>
  );
} 