import { useState, useEffect } from 'react';
import { firebaseDB } from '@/services/firebaseService';
import { useAuth } from '@/lib/auth';

export interface DashboardStats {
  totalPosts: number;
  activePosts: number;
  totalViews: number;
  totalBookings: number;
  monthlyRevenue: number;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
    postId?: string;
  }>;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    activePosts: 0,
    totalViews: 0,
    totalBookings: 0,
    monthlyRevenue: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, hasRole } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const isPublisher = hasRole('publisher') || hasRole('superadmin');
        const isClient = hasRole('client') && !isPublisher;

        if (isClient) {
          // For clients, fetch their specific data
          const userBookings = await firebaseDB.bookings.getByUserId(user.id);

          const clientStats: DashboardStats = {
            totalPosts: 0,
            activePosts: 0,
            totalViews: 0,
            totalBookings: userBookings.filter(booking => booking.status === 'paid').length,
            monthlyRevenue: 0,
            recentActivity: []
          };

          setStats(clientStats);
        } else if (isPublisher) {
          // For publishers/superadmins, fetch their posts and bookings
          const [userPosts, userBookings] = await Promise.all([
            firebaseDB.posts.getByUserId(user.id),
            firebaseDB.bookings.getByOwnerId(user.id)
          ]);

          // Calculate stats
          const totalPosts = userPosts.length;
          const activePosts = userPosts.filter(post => post.isActive).length;
          
          // Count only paid bookings
          const totalBookings = userBookings.filter(booking => booking.status === 'paid').length;

          setStats({
            totalPosts,
            activePosts,
            totalViews: 0, // Not needed anymore
            totalBookings,
            monthlyRevenue: 0, // Not needed anymore
            recentActivity: [] // Not needed anymore
          });
        } else if (hasRole('superadmin')) {
          // For superadmins, fetch all data
          const [allPosts, allBookings] = await Promise.all([
            firebaseDB.posts.getAll(),
            firebaseDB.bookings.getByUserId(user.id) // Superadmin bookings as client
          ]);

          const totalPosts = allPosts.length;
          const activePosts = allPosts.filter(post => post.isActive).length;
          
          // Count only paid bookings
          const totalBookings = allBookings.filter(booking => booking.status === 'paid').length;

          setStats({
            totalPosts,
            activePosts,
            totalViews: 0, // Not needed anymore
            totalBookings,
            monthlyRevenue: 0, // Not needed anymore
            recentActivity: [] // Not needed anymore
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err instanceof Error ? err.message : 'Error fetching dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, hasRole]);

  return { stats, loading, error };
}
