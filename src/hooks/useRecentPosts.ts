import { useState, useEffect } from 'react';
import { firebaseDB } from '@/services/firebaseService';
import { useAuth } from '@/lib/auth';
import { BasePost } from '@/types';

export interface RecentPostData {
  id: string;
  title: string;
  category: string;
  views: number;
  bookings: number;
  status: 'active' | 'inactive';
}

export function useRecentPosts() {
  const [recentPosts, setRecentPosts] = useState<RecentPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, hasRole } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchRecentPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        const isPublisher = hasRole('publisher') || hasRole('superadmin');
        const isClient = hasRole('client') && !isPublisher;

        if (isClient) {
          // For clients, show their recent bookings
          const userBookings = await firebaseDB.bookings.getByUserId(user.id);
          
          const recentBookings = userBookings.slice(0, 3).map(booking => ({
            id: booking.id,
            title: booking.post?.title || 'Servicio no disponible',
            category: booking.post?.category || 'Sin categoría',
            views: 0,
            bookings: 1,
            status: booking.status === 'completed' ? 'active' : 'inactive' as 'active' | 'inactive'
          }));

          setRecentPosts(recentBookings);
        } else if (isPublisher) {
          // For publishers, show their recent posts with performance data
          const userPosts = await firebaseDB.posts.getByUserId(user.id);
          const userBookings = await firebaseDB.bookings.getByOwnerId(user.id);

          const recentPostsData = userPosts.slice(0, 3).map(post => {
            const postBookings = userBookings.filter(booking => booking.postId === post.id);
            
            return {
              id: post.id,
              title: post.title,
              category: post.category,
              views: post.views || 0,
              bookings: postBookings.length,
              status: post.isActive ? 'active' : 'inactive' as 'active' | 'inactive'
            };
          });

          setRecentPosts(recentPostsData);
        } else if (hasRole('superadmin')) {
          // For superadmins, show all recent posts
          const allPosts = await firebaseDB.posts.getAll();
          const allBookings = await firebaseDB.bookings.getByUserId(user.id);

          const recentPostsData = allPosts.slice(0, 3).map(post => {
            const postBookings = allBookings.filter(booking => booking.postId === post.id);
            
            return {
              id: post.id,
              title: post.title,
              category: post.category,
              views: post.views || 0,
              bookings: postBookings.length,
              status: post.isActive ? 'active' : 'inactive' as 'active' | 'inactive'
            };
          });

          setRecentPosts(recentPostsData);
        }
      } catch (err) {
        console.error('Error fetching recent posts:', err);
        setError(err instanceof Error ? err.message : 'Error fetching recent posts');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPosts();
  }, [user, hasRole]);

  return { recentPosts, loading, error };
}
