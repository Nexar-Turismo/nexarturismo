'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { BasePost, PostImage } from '@/types';
import PostFormWizard from '@/components/forms/PostFormWizard';

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const [post, setPost] = useState<BasePost | null>(null);
  const [images, setImages] = useState<PostImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const postId = params.id as string;

  useEffect(() => {
    if (!user) return;

    // Redirect non-publisher users
    if (!hasRole('publisher') && !hasRole('superadmin')) {
      router.push('/suscribirse');
      return;
    }

    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch post data
        const postData = await firebaseDB.posts.getById(postId);
        if (!postData) {
          setError('Publicación no encontrada');
          return;
        }

        // Check if user owns the post (unless superadmin)
        if (!hasRole('superadmin') && postData.userId !== user.id) {
          setError('No tienes permisos para editar esta publicación');
          return;
        }

        setPost(postData);

        // Fetch images from subcollection
        const postImages = await firebaseDB.postImages.getByPostId(postId);
        setImages(postImages);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar la publicación');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [user, hasRole, postId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Cargando publicación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Publicación no encontrada
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            La publicación que buscas no existe o ha sido eliminada.
          </p>
          <button
            onClick={() => router.push('/posts')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
          >
            Volver a Publicaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Editar Publicación
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Modifica los detalles de tu publicación
              </p>
            </div>
          </div>
        </motion.div>

        {/* Post Form Wizard with Edit Mode */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <PostFormWizard 
            editMode={true}
            postData={post}
            images={images}
            onSuccess={() => router.push('/posts?success=updated')}
          />
        </motion.div>
      </div>
    </div>
  );
}
