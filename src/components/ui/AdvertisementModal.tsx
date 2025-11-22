'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';

export interface Advertisement {
  id: string;
  imageUrl: string;
  alt?: string;
  linkUrl?: string;
  target?: '_blank' | '_self';
}

interface AdvertisementModalProps {
  advertisement: Advertisement | null;
  onClose: () => void;
  showCloseButton?: boolean;
}

export default function AdvertisementModal({
  advertisement,
  onClose,
  showCloseButton = true
}: AdvertisementModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (advertisement) {
      setIsVisible(true);
    }
  }, [advertisement]);

  if (!advertisement || !isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleImageClick = () => {
    if (advertisement.linkUrl) {
      window.open(advertisement.linkUrl, advertisement.target || '_blank');
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3, type: 'spring', damping: 25 }}
            className="relative max-w-4xl w-full max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Cerrar anuncio"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
            )}

            <div
              className={`relative w-full ${advertisement.linkUrl ? 'cursor-pointer' : ''}`}
              onClick={advertisement.linkUrl ? handleImageClick : undefined}
            >
              <Image
                src={advertisement.imageUrl}
                alt={advertisement.alt || 'Anuncio'}
                width={1200}
                height={800}
                className="w-full h-auto object-contain max-h-[90vh]"
                priority
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

