'use client';

import { usePostImages } from '@/hooks/usePostImages';
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PostImagesProps {
  postId: string;
  className?: string;
  showMainImageOnly?: boolean;
  showGallery?: boolean;
  aspectRatio?: 'square' | 'tall';
  imageHeightClass?: string;
}

export default function PostImages({ 
  postId, 
  className = '', 
  showMainImageOnly = false,
  showGallery = true,
  aspectRatio = 'tall',
  imageHeightClass
}: PostImagesProps) {
  const { images, loading, error } = usePostImages(postId);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Ensure images is always an array to prevent hook dependency issues
  const safeImages = images || [];
  const displayImagesLength = showMainImageOnly ? Math.min(1, safeImages.length) : safeImages.length;

  const nextImage = useCallback(() => {
    if (displayImagesLength === 0) return;
    setSelectedImageIndex((prev) => (prev + 1) % displayImagesLength);
  }, [displayImagesLength]);

  const prevImage = useCallback(() => {
    if (displayImagesLength === 0) return;
    setSelectedImageIndex((prev) => (prev - 1 + displayImagesLength) % displayImagesLength);
  }, [displayImagesLength]);

  const openFullscreen = useCallback((index: number) => {
    setSelectedImageIndex(index);
    setShowFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setShowFullscreen(false);
  }, []);

  // Handle keyboard navigation in fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showFullscreen) return;
      
      switch (event.key) {
        case 'Escape':
          closeFullscreen();
          break;
        case 'ArrowLeft':
          prevImage();
          break;
        case 'ArrowRight':
          nextImage();
          break;
      }
    };

    if (showFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFullscreen, prevImage, nextImage, closeFullscreen]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-red-500">Error loading images: {error}</p>
      </div>
    );
  }

  if (safeImages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No images available</p>
      </div>
    );
  }

  const displayImages = showMainImageOnly ? [safeImages[0]] : safeImages;

  // Determine image height class
  const getImageHeightClass = () => {
    if (imageHeightClass) return imageHeightClass;
    if (aspectRatio === 'square') return 'aspect-square';
    return 'h-96 md:h-[500px] lg:h-[600px]';
  };

  return (
    <>
      <div className={`${className} overflow-hidden`}>
        {/* Main Image Display */}
        <div className="relative">
          <img
            src={displayImages[selectedImageIndex]?.data}
            alt={`Post image ${selectedImageIndex + 1}`}
            className={`w-full object-cover cursor-pointer transition-transform hover:scale-[1.02] ${getImageHeightClass()}`}
            onClick={() => showGallery && openFullscreen(selectedImageIndex)}
          />
          
          {/* Navigation arrows for multiple images */}
          {displayImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Gallery */}
        {displayImages.length > 1 && !showMainImageOnly && (
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {displayImages.map((image, index) => (
              <img
                key={image.id}
                src={image.data}
                alt={`Thumbnail ${index + 1}`}
                className={`w-full h-20 md:h-24 object-cover rounded-lg cursor-pointer border-2 transition-all hover:scale-105 ${
                  index === selectedImageIndex
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                }`}
                onClick={() => setSelectedImageIndex(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {showFullscreen && showGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
            onClick={closeFullscreen}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeFullscreen}
                className="absolute top-4 right-4 z-10 bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-all backdrop-blur-sm"
              >
                <X className="w-6 h-6" />
              </button>
              
              {/* Main Image */}
              <motion.img
                key={selectedImageIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                src={displayImages[selectedImageIndex]?.data}
                alt={`Fullscreen image ${selectedImageIndex + 1}`}
                className="w-full h-full object-contain rounded-lg shadow-2xl"
              />
              
              {/* Navigation in fullscreen */}
              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-4 rounded-full hover:bg-opacity-80 transition-all backdrop-blur-sm"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-60 text-white p-4 rounded-full hover:bg-opacity-80 transition-all backdrop-blur-sm"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
              
              {/* Image counter */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
                {selectedImageIndex + 1} / {displayImages.length}
              </div>

              {/* Thumbnail strip at bottom */}
              {displayImages.length > 1 && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex space-x-2 max-w-full overflow-x-auto px-4">
                  {displayImages.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        index === selectedImageIndex
                          ? 'border-white'
                          : 'border-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <img
                        src={image.data}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
