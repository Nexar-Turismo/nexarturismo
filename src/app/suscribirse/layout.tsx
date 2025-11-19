'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/types';
import { 
  Home, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User,
  Bell,
  Users,
  Shield,
  Calendar,
  Heart,
  CreditCard,
  Crown,
  Zap,
  Star
} from 'lucide-react';
import { useUserPlan } from '@/hooks/useUserPlan';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

export default function SuscribirseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { logout, user, hasRole } = useAuth();
  const { userPlan, currentPostsCount, remainingPosts } = useUserPlan();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Define navigation items based on user roles
  const getNavigationItems = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['publisher', 'superadmin'] },
      { name: 'Publicaciones', href: '/posts', icon: FileText, roles: ['publisher', 'superadmin'] },
      { name: 'Favoritos', href: '/favorites', icon: Heart, roles: ['client', 'publisher', 'superadmin'] },
      { name: 'Configuración', href: '/settings', icon: Settings, roles: ['publisher', 'superadmin'] },
    ];

    // Add superadmin-only items
    if (hasRole('superadmin')) {
      baseItems.push(
        { name: 'Users', href: '/users', icon: Users, roles: ['superadmin'] },
        { name: 'Planes', href: '/plans', icon: CreditCard, roles: ['superadmin'] }
      );
    }

    // Add publisher-specific items
    if (hasRole('publisher')) {
      baseItems.push(
        { name: 'Mi Plan', href: '/mi-plan', icon: Crown, roles: ['publisher'] }
      );
    }

    // Add client-only items
    if (hasRole('client')) {
      baseItems.push(
        { name: 'Mis Reservas', href: '/bookings', icon: Calendar, roles: ['client'] },
        { name: 'Mi Perfil', href: '/profile', icon: User, roles: ['client'] }
      );
    }

    return baseItems;
  };

  const navigation = getNavigationItems();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Check if user has access to current page
  const canAccessCurrentPage = () => {
    const currentNavItem = navigation.find(item => item.href === pathname);
    if (!currentNavItem) return true; // Allow access to dashboard pages
    
    return currentNavItem.roles.some(role => hasRole(role));
  };

  // Redirect if user doesn't have access
  useEffect(() => {
    if (user && !canAccessCurrentPage()) {
      // Redirect clients to their bookings page, others to dashboard
      if (hasRole('client')) {
        router.push('/bookings');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, pathname, hasRole, canAccessCurrentPage, router]);

  return (
    <ProtectedRoute requiredRoles={['publisher', 'superadmin', 'client']}>
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Desktop Layout */}
        <div className="hidden lg:flex h-screen">
          {/* Sidebar */}
          <div className="w-64 glass flex-shrink-0">
            <div className="flex h-full flex-col">

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const hasAccess = item.roles.some(role => hasRole(role));
                  
                  if (!hasAccess) return null;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                      {item.roles.includes('superadmin') && (
                        <Shield className="w-4 h-4 ml-auto text-yellow-500" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* User section */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email || 'user@example.com'}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user?.roles
                        .filter(role => role.isActive)
                        .map((role) => (
                          <span
                            key={role.roleId}
                            className={`px-1.5 py-0.5 text-xs font-medium rounded-full border ${
                              role.roleName === 'superadmin' 
                                ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                                : role.roleName === 'publisher'
                                ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                : 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                            }`}
                          >
                            {role.roleName}
                          </span>
                        ))}
                    </div>
                    {hasRole('publisher') && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Plan actual
                        </p>
                        <span className="mt-1 inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                          {userPlan?.name || 'Sin plan activo'}
                        </span>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Publicaciones usadas: {currentPostsCount ?? '—'}
                          {userPlan?.maxPosts != null ? ` / ${userPlan.maxPosts}` : ''}
                          {typeof remainingPosts === 'number' ? ` (${remainingPosts} disponibles)` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="mt-4 w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Page content */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
              {children}
            </main>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-sm">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/dashboard" className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">MT</span>
              </div>
              <span className="text-xl font-bold gradient-text">Nexar</span>
            </Link>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Mobile Sidebar */}
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: sidebarOpen ? 0 : -300 }}
            transition={{ type: 'spring', damping: 20 }}
            className={`fixed inset-y-0 left-0 z-50 w-64 glass ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex h-full flex-col">
              {/* Logo */}
              <div className="flex h-16 items-center justify-between px-6">
                <Link href="/dashboard" className="flex items-center">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">MT</span>
                  </div>
                  <span className="text-xl font-bold gradient-text">Nexar</span>
                </Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const hasAccess = item.roles.some(role => hasRole(role));
                  
                  if (!hasAccess) return null;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-primary text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                      {item.roles.includes('superadmin') && (
                        <Shield className="w-4 h-4 ml-auto text-yellow-500" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* User section */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.email || 'user@example.com'}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user?.roles
                        .filter(role => role.isActive)
                        .map((role) => (
                          <span
                            key={role.roleId}
                            className={`px-1.5 py-0.5 text-xs font-medium rounded-full border ${
                              role.roleName === 'superadmin' 
                                ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                                : role.roleName === 'publisher'
                                ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                : 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                            }`}
                          >
                            {role.roleName}
                          </span>
                        ))}
                    </div>
                    {hasRole('publisher') && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Plan actual
                        </p>
                        <span className="mt-1 inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                          {userPlan?.name || 'Sin plan activo'}
                        </span>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Publicaciones usadas: {currentPostsCount ?? '—'}
                          {userPlan?.maxPosts != null ? ` / ${userPlan.maxPosts}` : ''}
                          {typeof remainingPosts === 'number' ? ` (${remainingPosts} disponibles)` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Plan Information */}
                {userPlan && hasRole('publisher') && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {userPlan.name.toLowerCase().includes('basic') && <Zap className="w-4 h-4 text-blue-600" />}
                        {userPlan.name.toLowerCase().includes('premium') && <Star className="w-4 h-4 text-yellow-600" />}
                        {userPlan.name.toLowerCase().includes('enterprise') && <Crown className="w-4 h-4 text-purple-600" />}
                        <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                          {userPlan.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        ${userPlan.price}
                      </span>
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <div className="flex justify-between">
                        <span>Publicaciones:</span>
                        <span className="font-medium">0 / {userPlan.maxPosts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reservas:</span>
                        <span className="font-medium">0 / {userPlan.maxBookings}</span>
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleLogout}
                  className="mt-4 w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </motion.div>

          {/* Mobile Main content */}
          <div className="flex flex-col min-h-screen">
            {/* Page content */}
            <main className="flex-1 p-4 sm:p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
