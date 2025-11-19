'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Search, Filter, Edit, Trash2, Eye, MoreVertical, ChevronLeft, ChevronRight, Power, PowerOff, User as UserIcon, CheckCircle, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { firebaseDB } from '@/services/firebaseService';
import { BasePost, ServiceCategory, User } from '@/types';
import PostCard from '@/components/ui/PostCard';

function PostsPageContent() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<BasePost[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterEnabled, setFilterEnabled] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(9);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Check for success message in URL params
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'created') {
      setSuccessMessage('Publicación creada exitosamente');
      setShowSuccessMessage(true);
      // Remove query param from URL
      router.replace('/posts', { scroll: false });
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    } else if (success === 'updated') {
      setSuccessMessage('Publicación actualizada exitosamente');
      setShowSuccessMessage(true);
      // Remove query param from URL
      router.replace('/posts', { scroll: false });
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    }
  }, [searchParams, router]);

  // Redirect non-publisher users to subscription page
  useEffect(() => {
    if (user && !hasRole('publisher') && !hasRole('superadmin')) {
      router.push('/suscribirse');
    }
  }, [user, hasRole, router]);

  // Fetch posts and users (all posts for SuperAdmin, user's posts for others)
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        let fetchedPosts: BasePost[];
        
        // SuperAdmin can see all posts
        if (hasRole('superadmin')) {
          fetchedPosts = await firebaseDB.posts.getAll();
          // Also fetch all users for the user filter
          const users = await firebaseDB.users.getAll();
          setAllUsers(users);
          console.log('✅ SuperAdmin viewing all posts:', fetchedPosts.length);
        } else {
          // Publishers see only their own posts
          fetchedPosts = await firebaseDB.posts.getByUserId(user.id);
          console.log('✅ Publisher viewing their posts:', fetchedPosts.length);
        }
        
        setPosts(fetchedPosts);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, hasRole]);

  const handleEditPost = (postId: string) => {
    router.push(`/posts/edit/${postId}`);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta publicación?')) return;
    
    try {
      await firebaseDB.posts.delete(postId);
      setPosts(posts.filter(post => post.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete post');
    }
  };

  const handleToggleEnabled = async (postId: string, currentStatus: boolean) => {
    if (!hasRole('superadmin')) {
      alert('Solo los SuperAdmin pueden habilitar/deshabilitar publicaciones');
      return;
    }

    const action = currentStatus ? 'deshabilitar' : 'habilitar';
    if (!confirm(`¿Estás seguro de que quieres ${action} esta publicación?`)) return;
    
    try {
      await firebaseDB.posts.update(postId, { isEnabled: !currentStatus });
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, isEnabled: !currentStatus } : post
      ));
    } catch (err) {
      console.error('Error toggling post enabled status:', err);
      alert('Error al cambiar el estado de la publicación');
    }
  };

  // Get unique categories from posts
  const categories = Array.from(new Set(posts.map(post => post.category)));

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || post.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || post.category === filterCategory;
    const matchesUser = filterUser === 'all' || post.userId === filterUser;
    const matchesEnabled = filterEnabled === 'all' || 
                          (filterEnabled === 'enabled' && post.isEnabled !== false) ||
                          (filterEnabled === 'disabled' && post.isEnabled === false);
    
    let matchesDateRange = true;
    if (filterDateFrom) {
      matchesDateRange = matchesDateRange && new Date(post.createdAt) >= new Date(filterDateFrom);
    }
    if (filterDateTo) {
      matchesDateRange = matchesDateRange && new Date(post.createdAt) <= new Date(filterDateTo);
    }
    
    return matchesSearch && matchesStatus && matchesCategory && matchesUser && matchesEnabled && matchesDateRange;
  });

  // Pagination
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-none">
      <div className="space-y-8">
        {/* Success Message */}
        <AnimatePresence>
          {showSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="glass rounded-xl p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {successMessage}
                  </p>
                </div>
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="flex-shrink-0 ml-4 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Publicaciones
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {hasRole('superadmin') 
              ? 'Gestiona todas las publicaciones de la plataforma' 
              : 'Gestiona tus publicaciones de servicios turísticos'
            }
          </p>
        </motion.div>

        {/* Quick Actions and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Nueva Publicación button - Hidden for superadmin users */}
                {!hasRole('superadmin') && (
                  <button 
                    onClick={() => router.push('/posts/new')}
                    className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Publicación
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar publicaciones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estado
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="published">Publicados</option>
                    <option value="pending">Pendientes</option>
                    <option value="approved">Aprobados</option>
                    <option value="draft">Borradores</option>
                    <option value="rejected">Rechazados</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categoría
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">Todas las categorías</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* User Filter - Only for SuperAdmin */}
                {hasRole('superadmin') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Usuario
                    </label>
                    <select
                      value={filterUser}
                      onChange={(e) => setFilterUser(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="all">Todos los usuarios</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Enabled Filter - Only for SuperAdmin */}
                {hasRole('superadmin') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estado de Habilitación
                    </label>
                    <select
                      value={filterEnabled}
                      onChange={(e) => setFilterEnabled(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="all">Todos</option>
                      <option value="enabled">Habilitados</option>
                      <option value="disabled">Deshabilitados</option>
                    </select>
                  </div>
                )}

                {/* Date From Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Date To Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Posts Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {loading ? (
            <div className="glass rounded-xl p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Cargando publicaciones...</p>
            </div>
          ) : error ? (
            <div className="glass rounded-xl p-12 text-center">
              <div className="text-red-500 mb-4">
                <FileText className="w-16 h-16 mx-auto mb-4" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Error al cargar publicaciones
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
              >
                Reintentar
              </button>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm || filterStatus !== 'all' ? 'No se encontraron publicaciones' : 'No hay publicaciones aún'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Intenta ajustar los filtros de búsqueda' 
                  : 'Comienza creando tu primera publicación de servicios turísticos'
                }
              </p>
              {!hasRole('superadmin') && !searchTerm && filterStatus === 'all' && (
                <button 
                  onClick={() => router.push('/posts/new')}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
                >
                  Crear Primera Publicación
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Posts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="relative group"
                  >
                    <PostCard 
                      post={post} 
                      showStatus={true}
                      imageHeight="md"
                      onClick={() => handleEditPost(post.id)}
                    />
                    
                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                      <div className="flex space-x-2">
                        {/* Enable/Disable Button - SuperAdmin Only */}
                        {hasRole('superadmin') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEnabled(post.id, post.isEnabled !== false);
                            }}
                            className={`p-2 rounded-full shadow-lg transition-colors ${
                              post.isEnabled !== false
                                ? 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-orange-500 hover:text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-green-500 hover:text-white'
                            }`}
                            title={post.isEnabled !== false ? 'Deshabilitar publicación' : 'Habilitar publicación'}
                          >
                            {post.isEnabled !== false ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                        )}
                        
                        {/* Delete Button - Owner Only (not SuperAdmin) */}
                        {post.userId === user?.id && !hasRole('superadmin') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePost(post.id);
                            }}
                            className="p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                            title="Eliminar publicación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Status Indicators */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                      {/* Disabled Badge */}
                      {post.isEnabled === false && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
                          Deshabilitado
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        currentPage === pageNumber
                          ? 'bg-primary text-white'
                          : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              {/* Posts Count */}
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                Mostrando {indexOfFirstPost + 1}-{Math.min(indexOfLastPost, filteredPosts.length)} de {filteredPosts.length} publicaciones
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function PostsPageLoading() {
  return (
    <div className="w-full max-w-none">
      <div className="space-y-8">
        <div className="glass rounded-xl p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando...</p>
        </div>
      </div>
    </div>
  );
}

export default function PostsPage() {
  return (
    <Suspense fallback={<PostsPageLoading />}>
      <PostsPageContent />
    </Suspense>
  );
} 