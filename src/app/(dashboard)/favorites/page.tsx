'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, Calendar, User, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { BasePost, Favourite } from '@/types';
import PostCard from '@/components/ui/PostCard';
import { useRouter } from 'next/navigation';
import { formatAddressForDisplay } from '@/lib/utils';

export default function FavoritesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [posts, setPosts] = useState<BasePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavourites = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get user's favourites
        const userFavourites = await firebaseDB.favourites.getByUserId(user.id);
        setFavourites(userFavourites);

        // Get the actual posts for these favourites
        if (userFavourites.length > 0) {
          const postPromises = userFavourites.map(fav => 
            firebaseDB.posts.getById(fav.postId)
          );
          const postResults = await Promise.all(postPromises);
          
          // Filter out null results (posts that might have been deleted)
          const validPosts = postResults.filter((post): post is BasePost => post !== null);
          setPosts(validPosts);
        } else {
          setPosts([]);
        }
      } catch (err) {
        console.error('Error fetching favourites:', err);
        setError('Error al cargar tus favoritos');
      } finally {
        setLoading(false);
      }
    };

    fetchFavourites();
  }, [user]);

  const handleRemoveFavourite = async (postId: string) => {
    if (!user) return;

    try {
      await firebaseDB.favourites.remove(user.id, postId);
      
      // Update local state
      setFavourites(prev => prev.filter(fav => fav.postId !== postId));
      setPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error removing favourite:', error);
      alert('Error al quitar de favoritos');
    }
  };

  const handlePostClick = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  // Redirect if user is not authenticated
  if (!user) {
    return (
      <div className="w-full max-w-none">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Heart className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Acceso Requerido
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Necesitas iniciar sesión para ver tus favoritos
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-none">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Cargando favoritos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-none">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <Heart className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

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
            Mis Favoritos
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Publicaciones que has guardado como favoritas
          </p>
        </motion.div>

        {/* Favourites List */}
        {posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center py-12"
          >
            <div className="text-gray-400 mb-4">
              <Heart className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No tienes favoritos aún
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Explora publicaciones y guarda tus favoritas haciendo clic en el corazón
            </p>
            <button
              onClick={() => router.push('/alojamientos')}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
            >
              Explorar Alojamientos
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Stats */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {posts.length} {posts.length === 1 ? 'favorito' : 'favoritos'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Guardados recientemente
                  </p>
                </div>
                <div className="text-primary">
                  <Heart className="w-8 h-8" />
                </div>
              </div>
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="relative"
                >
                  <PostCard 
                    post={post} 
                    onClick={() => handlePostClick(post.id)}
                    showStatus={false}
                    imageHeight="md"
                  />
                  
                  {/* Remove from favourites button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavourite(post.id);
                    }}
                    className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Quitar de favoritos"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}