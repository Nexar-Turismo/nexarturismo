'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Eye, 
  Calendar, 
  DollarSign, 
  FileText,
  Users,
  Clock,
  Settings,
  Heart,
  User
} from 'lucide-react';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useRecentPosts } from '@/hooks/useRecentPosts';
import { useClientStats } from '@/hooks/useClientStats';

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  
  // Use custom hooks for real data
  const { stats: dashboardStats, loading: statsLoading, error: statsError } = useDashboardStats();
  const { recentPosts, loading: postsLoading, error: postsError } = useRecentPosts();
  const { clientStats, recentActivity, loading: clientLoading, error: clientError } = useClientStats();
  
  // Redirect clients away from dashboard
  useEffect(() => {
    if (user && hasRole('client') && !hasRole('publisher') && !hasRole('superadmin')) {
      router.push('/bookings');
    }
  }, [user, hasRole, router]);
  
  const isClient = hasRole('client');
  const isPublisher = hasRole('publisher') || hasRole('superadmin');
  
  // Don't render dashboard content for clients
  if (isClient && !isPublisher) {
    return null;
  }

  // Check if any data is loading
  const isLoading = statsLoading || postsLoading || clientLoading;
  const hasError = statsError || postsError || clientError;
  
  const stats = [
    {
      title: 'Total de Publicaciones',
      value: isLoading ? '...' : dashboardStats.totalPosts,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      showFor: ['publisher', 'superadmin'] as const,
    },
    {
      title: 'Publicaciones Activas',
      value: isLoading ? '...' : dashboardStats.activePosts,
      icon: Eye,
      color: 'from-green-500 to-green-600',
      showFor: ['publisher', 'superadmin'] as const,
    },
    {
      title: 'Reservas',
      value: isLoading ? '...' : dashboardStats.totalBookings,
      icon: Calendar,
      color: 'from-orange-500 to-orange-600',
      showFor: ['publisher', 'superadmin', 'client'] as const,
    },
  ];

  // Client-specific stats
  const clientStatsArray = [
    {
      title: 'Mis Reservas',
      value: isLoading ? '...' : clientStats.totalBookings.toString(),
      icon: Calendar,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Favoritos',
      value: isLoading ? '...' : clientStats.totalFavorites.toString(),
      icon: Heart,
      color: 'from-pink-500 to-pink-600',
    },
    {
      title: 'Servicios Visitados',
      value: isLoading ? '...' : clientStats.totalServicesVisited.toString(),
      icon: Eye,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Próxima Reserva',
      value: isLoading ? '...' : (clientStats.nextBooking || 'Sin reservas'),
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
    },
  ];

  // Client-specific recent activity (using real data from hook)
  const clientRecentActivity = recentActivity;

  // Filter stats based on user role
  const filteredStats = isClient ? clientStatsArray : stats.filter(stat => 
    stat.showFor.some(role => hasRole(role))
  );

  return (
    <div className="w-full max-w-none">
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Panel de Control
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Bienvenido de vuelta, {user?.name || 'Usuario'}. Aquí tienes un resumen de tu actividad.
          </p>
          {hasError && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
              <p className="text-sm">
                ⚠️ Algunos datos pueden no estar actualizados. {hasError}
              </p>
            </div>
          )}
        </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {filteredStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="glass rounded-xl p-6 hover:transform hover:scale-105 transition-all duration-300"
          >
            <div className="flex items-center mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stat.value}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {stat.title}
            </p>
          </motion.div>
        ))}
      </div>


      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="glass rounded-xl p-6"
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isClient ? (
            <>
              <button className="flex items-center justify-center p-4 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 transform hover:scale-105">
                <Calendar className="w-5 h-5 mr-2" />
                Ver Mis Reservas
              </button>
              <button className="flex items-center justify-center p-4 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-all duration-300 transform hover:scale-105">
                <Heart className="w-5 h-5 mr-2" />
                Mis Favoritos
              </button>
              <button className="flex items-center justify-center p-4 bg-primary text-white rounded-lg hover:bg-accent transition-all duration-300 transform hover:scale-105">
                <User className="w-5 h-5 mr-2" />
                Mi Perfil
              </button>
            </>
          ) : (
            <>
              {/* Nueva Publicación button - Hidden for superadmin users */}
              {!hasRole('superadmin') && (
                <button 
                  onClick={() => {
                    if (!hasRole('publisher')) {
                      router.push('/suscribirse');
                    } else {
                      router.push('/posts/new');
                    }
                  }}
                  className="flex items-center justify-center p-4 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300 transform hover:scale-105"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Nueva Publicación
                </button>
              )}
              <button className="flex items-center justify-center p-4 bg-primary text-white rounded-lg hover:bg-accent transition-all duration-300 transform hover:scale-105">
                <Users className="w-5 h-5 mr-2" />
                Ver Publicaciones
              </button>
              <button className="flex items-center justify-center p-4 bg-accent text-white rounded-lg hover:bg-purple-600 transition-all duration-300 transform hover:scale-105">
                <Settings className="w-5 h-5 mr-2" />
                Configuración
              </button>
            </>
          )}
        </div>
      </motion.div>
      </div>
    </div>
  );
} 