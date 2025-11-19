'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, User, Star, Share2, Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { firebaseDB } from '@/services/firebaseService';
import { BasePost, PostImage } from '@/types';
import PostImages from '@/components/ui/PostImages';
import BookingForm from '@/components/booking/BookingForm';
import ShareModal from '@/components/ui/ShareModal';
import { formatAddressForDisplay, calculateCurrentPrice, getMinPriceFromDynamicPricing, getMaxPriceFromDynamicPricing } from '@/lib/utils';
import { categoryAmenities, mainCategoryMapping } from '@/services/dummyData';
import { Weekday } from '@/types';

// Helper function to get weekday label in Spanish
function getWeekdayLabel(weekday: Weekday): string {
  const labels: Record<Weekday, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };
  return labels[weekday];
}

// Function to mask phone numbers and email addresses
const maskContactInfo = (text: string): string => {
  if (!text) return text;
  
  // Mask phone numbers (various formats)
  // Matches: +54 9 11 1234-5678, (011) 1234-5678, 11-1234-5678, 1234567890, etc.
  let maskedText = text.replace(/(\+?\d{1,4}[\s\-\(\)]?)?(\d{2,4}[\s\-\(\)]?)?(\d{3,4}[\s\-]?\d{3,4})/g, '*****');
  
  // Mask email addresses
  // Matches: user@domain.com, user.name@domain.co.uk, etc.
  maskedText = maskedText.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '*****');
  
  return maskedText;
};

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const [post, setPost] = useState<BasePost | null>(null);
  const [images, setImages] = useState<PostImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isFavourited, setIsFavourited] = useState(false);
  const [favouriteLoading, setFavouriteLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [hasPendingBookingRequest, setHasPendingBookingRequest] = useState(false);

  const postId = params.id as string;

  useEffect(() => {
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

        // Check if post is published
        if (postData.status !== 'published' && postData.status !== 'approved') {
          setError('Esta publicación no está disponible');
          return;
        }

        // Check if post is disabled - only allow owner, superadmin, or clients with bookings to view
        if (postData.isEnabled === false) {
          const isOwner = user?.id === postData.userId;
          const isSuperAdmin = hasRole('superadmin');
          
          // Check if user has a booking for this post
          let hasBooking = false;
          if (user && hasRole('client')) {
            const userBookings = await firebaseDB.bookings.getByUserId(user.id);
            hasBooking = userBookings.some(booking => booking.postId === postId);
          }
          
          if (!isOwner && !isSuperAdmin && !hasBooking) {
            setError('Esta publicación no está disponible');
            return;
          }
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
  }, [postId, user, hasRole]);

  const handleBookingClick = () => {
    if (hasPendingBookingRequest) {
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!hasRole('client')) {
      alert('Necesitas ser un cliente para realizar reservas');
      return;
    }
    
    // Prevent users from booking their own services
    if (user.id === post?.userId) {
      alert('No puedes reservar tu propio servicio. Solo puedes reservar servicios de otros usuarios.');
      return;
    }
    
    setShowBookingForm(true);
  };

  const getMinPrice = () => {
    if (!post) return 0;
    return getMinPriceFromDynamicPricing(post);
  };

  const getCurrentPrice = () => {
    if (!post) return { price: 0, currency: 'ARS', isDynamic: false };
    return calculateCurrentPrice(post);
  };

  const getPriceRange = () => {
    if (!post) return { min: 0, max: 0 };
    const minPrice = getMinPriceFromDynamicPricing(post);
    const maxPrice = getMaxPriceFromDynamicPricing(post);
    return { min: minPrice, max: maxPrice };
  };

  // Check if post is favourited when component loads
  useEffect(() => {
    const checkFavouriteStatus = async () => {
      if (user && post) {
        try {
          const favourited = await firebaseDB.favourites.isFavourited(user.id, post.id);
          setIsFavourited(favourited);
        } catch (error) {
          console.error('Error checking favourite status:', error);
        }
      }
    };

    checkFavouriteStatus();
  }, [user, post]);

  useEffect(() => {
    const checkPendingRequest = async () => {
      if (!user || !post || !hasRole('client')) {
        setHasPendingBookingRequest(false);
        return;
      }

      try {
        const bookings = await firebaseDB.bookings.getByUserId(user.id);
        const hasPending = bookings.some(
          (booking) =>
            booking.postId === post.id &&
            (booking.status === 'requested' || booking.status === 'pending_payment')
        );
        setHasPendingBookingRequest(hasPending);
      } catch (error) {
        console.error('Error checking booking requests:', error);
        setHasPendingBookingRequest(false);
      }
    };

    checkPendingRequest();
  }, [user, post, hasRole]);

  // Handle favourite toggle
  const handleFavouriteToggle = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!post) return;

    setFavouriteLoading(true);
    try {
      if (isFavourited) {
        await firebaseDB.favourites.remove(user.id, post.id);
        setIsFavourited(false);
      } else {
        await firebaseDB.favourites.add(user.id, post.id);
        setIsFavourited(true);
      }
    } catch (error) {
      console.error('Error toggling favourite:', error);
      // Show error message to user
      alert('Error al guardar en favoritos. Inténtalo de nuevo.');
    } finally {
      setFavouriteLoading(false);
    }
  };

  // Handle share functionality
  const handleShare = () => {
    setShowShareModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
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
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
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
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            La publicación que buscas no existe o ha sido eliminada.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content - 75% */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-3 space-y-8"
          >
            {/* Images */}
            <div className="glass rounded-xl p-6">
              <PostImages 
                postId={post.id} 
                className="w-full"
                showMainImageOnly={false}
                showGallery={true}
              />
            </div>

            {/* Post Details */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {post.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-300">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>
                        {post.address ? 
                          formatAddressForDisplay(post.address) : 
                          'Ubicación no disponible'
                        }
                      </span>
                    </div>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      <span>{post.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={handleShare}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Compartir"
                  >
                    <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button 
                    onClick={handleFavouriteToggle}
                    disabled={favouriteLoading}
                    className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${
                      favouriteLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={isFavourited ? "Quitar de favoritos" : "Guardar en favoritos"}
                  >
                    <Heart 
                      className={`w-5 h-5 transition-colors ${
                        isFavourited 
                          ? 'text-red-500 fill-red-500' 
                          : 'text-gray-600 dark:text-gray-300'
                      }`} 
                    />
                  </button>
                </div>
              </div>

              <div className="prose prose-lg dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {maskContactInfo(post.description)}
                </p>
              </div>
            </div>

            {/* Specific Information */}
            {post.specificFields && Object.keys(post.specificFields).length > 0 && (
              <div className="glass rounded-xl p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Información Específica
                </h2>

                <div className="space-y-6">
                  {/* Check if it's an accommodation category */}
                  {Boolean(mainCategoryMapping['alojamiento']?.includes(post.category as any)) && (
                    <>
                      {/* Basic Information for Accommodations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {post.specificFields?.maxPeople !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Cantidad de personas
                            </span>
                            <span className="text-lg font-bold text-primary">
                              {String(post.specificFields.maxPeople)}
                            </span>
                          </div>
                        )}
                        {post.specificFields?.checkIn !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Check In
                            </span>
                            <span className="text-lg font-bold text-primary">
                              {String(post.specificFields.checkIn)}
                            </span>
                          </div>
                        )}
                        {post.specificFields?.checkOut !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Check Out
                            </span>
                            <span className="text-lg font-bold text-primary">
                              {String(post.specificFields.checkOut)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Amenities for Accommodations */}
                      {categoryAmenities[post.category as keyof typeof categoryAmenities] && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Características y Servicios
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {categoryAmenities[post.category as keyof typeof categoryAmenities]?.map((amenity) => {
                              const hasAmenity = post.specificFields?.[amenity] === true;
                              if (!hasAmenity) return null;
                              
                              return (
                                <div key={amenity} className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm text-gray-900 dark:text-white">{amenity}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Check if it's a vehicle rental category */}
                  {Boolean(mainCategoryMapping['alquiler-vehiculos']?.includes(post.category as any)) && (
                    <>
                      {/* Basic Information for Vehicles */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {post.specificFields?.maxPeople !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Capacidad
                            </span>
                            <span className="text-lg font-bold text-primary">
                              {String(post.specificFields.maxPeople)} personas
                            </span>
                          </div>
                        )}
                        {post.specificFields?.pickupTime !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Horario de retiro
                            </span>
                            <span className="text-lg font-bold text-primary">
                              {String(post.specificFields.pickupTime)}
                            </span>
                          </div>
                        )}
                        {post.specificFields?.returnTime !== undefined && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Horario de devolución
                            </span>
                            <span className="text-lg font-bold text-primary">
                              {String(post.specificFields.returnTime)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Service Options for Vehicles */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Servicios Adicionales
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {post.specificFields?.deliveryPoints === true && (
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Entrega en puntos a convenir</span>
                            </div>
                          )}
                          {post.specificFields?.childSeat === true && (
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Silla para niños</span>
                            </div>
                          )}
                          {post.specificFields?.snowChains === true && (
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Cadenas para nieve</span>
                            </div>
                          )}
                          {post.specificFields?.countryPermission === true && (
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Permiso para salir del país</span>
                            </div>
                          )}
                          {post.specificFields?.spareWheel === true && (
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Rueda de auxilio</span>
                            </div>
                          )}
                          {post.specificFields?.gnc === true && (
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 dark:text-white">GNC</span>
                            </div>
                          )}
                          {post.specificFields?.helmet === true && (
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Casco</span>
                            </div>
                          )}
                          {post.specificFields?.vest === true && (
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Chaleco</span>
                            </div>
                          )}
                          {post.specificFields?.extraHours === true && (
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Horas extras</span>
                            </div>
                          )}
                          {post.specificFields?.lifeJacket === true && (
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Poncho salvavidas</span>
                            </div>
                          )}
                          {post.specificFields?.paddles === true && (
                            <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-900 dark:text-white">Remos y salvaremos</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* For other services categories */}
                  {Boolean(mainCategoryMapping['otros-servicios']?.includes(post.category as any)) && (
                    <>
                      {post.specificFields?.includes !== undefined && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Incluye
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg whitespace-pre-line">
                            {String(post.specificFields.includes)}
                          </p>
                        </div>
                      )}
                      {post.specificFields?.requirements !== undefined && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            Requisitos
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg whitespace-pre-line">
                            {String(post.specificFields.requirements)}
                          </p>
                        </div>
                      )}
                    </>
                  )}

              
                </div>
              </div>
            )}

            {/* Location */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Ubicación
              </h2>
              <div className="flex items-center text-gray-600 dark:text-gray-300">
                <MapPin className="w-5 h-5 mr-2" />
                <span>
                  {post.address ? 
                    formatAddressForDisplay(post.address) : 
                    'Ubicación no disponible'
                  }
                </span>
              </div>
            </div>
          </motion.div>

          {/* Booking Sidebar - 25% */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-8">
              <div className="glass rounded-xl p-6">
                {/* Price */}
                <div className="mb-6">
                  {(() => {
                    const currentPricing = getCurrentPrice();
                    const priceRange = getPriceRange();
                    
                    return (
                      <>
                        <div className="flex items-baseline space-x-2 mb-2">
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            {currentPricing.isDynamic ? 'Desde' : ''} ${currentPricing.price.toLocaleString()}
                          </span>
                          {currentPricing.isDynamic && currentPricing.seasonInfo && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({getWeekdayLabel(currentPricing.seasonInfo.weekday)})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Precio por noche/día
                          {currentPricing.isDynamic && priceRange.min !== priceRange.max && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Rango: ${priceRange.min.toLocaleString()} - ${priceRange.max.toLocaleString()}
                            </span>
                          )}
                        </p>
                      </>
                    );
                  })()}
                </div>

                {/* Booking Button */}
                {user && user.id === post.userId ? (
                  <div className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-center font-semibold">
                    Este es tu servicio
                  </div>
                ) : (
                  <button
                    onClick={handleBookingClick}
                    disabled={hasPendingBookingRequest}
                    className={`w-full py-3 px-4 rounded-lg transition-all duration-300 font-semibold ${
                      hasPendingBookingRequest
                        ? 'bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-secondary'
                    }`}
                  >
                    {hasPendingBookingRequest ? 'Reserva solicitada' : 'Solicitar Reserva'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <BookingForm
          post={post}
          onClose={() => setShowBookingForm(false)}
          onSuccess={() => {
            setShowBookingForm(false);
            setHasPendingBookingRequest(true);
            // Show success message or redirect
          }}
        />
      )}

      {/* Share Modal */}
      {post && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          post={{
            title: post.title,
            description: post.description,
            url: window.location.href,
          }}
        />
      )}
    </div>
  );
}
