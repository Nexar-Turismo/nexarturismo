import { useState, useEffect } from 'react';
import { firebaseDB } from '@/services/firebaseService';
import { useAuth } from '@/lib/auth';

export interface ClientStats {
  totalBookings: number;
  totalFavorites: number;
  totalServicesVisited: number;
  nextBooking: string | null;
}

export interface ClientRecentActivity {
  id: string;
  message: string;
  timestamp: Date;
}

export function useClientStats() {
  const [clientStats, setClientStats] = useState<ClientStats>({
    totalBookings: 0,
    totalFavorites: 0,
    totalServicesVisited: 0,
    nextBooking: null
  });
  const [recentActivity, setRecentActivity] = useState<ClientRecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, hasRole } = useAuth();

  useEffect(() => {
    if (!user || !hasRole('client')) {
      setLoading(false);
      return;
    }

    const fetchClientStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const [userBookings, userNotifications] = await Promise.all([
          firebaseDB.bookings.getByUserId(user.id),
          firebaseDB.notifications.getByUserId(user.id)
        ]);

        // Calculate client stats - only count paid bookings
        const totalBookings = userBookings.filter(booking => booking.status === 'paid').length;
        
        // For now, we'll use a placeholder for favorites since we don't have a favorites system yet
        const totalFavorites = 0; // TODO: Implement favorites system
        
        // Count unique services visited (posts)
        const uniqueServices = new Set(userBookings.map(booking => booking.postId));
        const totalServicesVisited = uniqueServices.size;

        // Find next upcoming booking
        const upcomingBookings = userBookings
          .filter(booking => 
            booking.status === 'confirmed' && 
            booking.startDate && 
            booking.startDate > new Date()
          )
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        const nextBooking = upcomingBookings.length > 0 
          ? upcomingBookings[0].startDate.toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : null;

        setClientStats({
          totalBookings,
          totalFavorites,
          totalServicesVisited,
          nextBooking
        });

        // Set recent activity from notifications
        const recentActivityData = userNotifications.slice(0, 3).map(notification => ({
          id: notification.id,
          message: notification.message,
          timestamp: notification.createdAt
        }));

        setRecentActivity(recentActivityData);
      } catch (err) {
        console.error('Error fetching client stats:', err);
        setError(err instanceof Error ? err.message : 'Error fetching client statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchClientStats();
  }, [user, hasRole]);

  return { clientStats, recentActivity, loading, error };
}
