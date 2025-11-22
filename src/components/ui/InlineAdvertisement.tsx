'use client';

import { motion } from 'framer-motion';
import { Advertisement } from './AdvertisementModal';

interface InlineAdvertisementProps {
  advertisement: Advertisement;
  className?: string;
  imageHeight?: 'sm' | 'md' | 'lg';
}

export default function InlineAdvertisement({ 
  advertisement, 
  className = '',
  imageHeight = 'md'
}: InlineAdvertisementProps) {
  const handleClick = () => {
    if (advertisement.linkUrl) {
      window.open(advertisement.linkUrl, advertisement.target || '_blank');
    }
  };

  // Match PostCard image height classes
  const heightClasses = {
    sm: 'h-48',
    md: 'h-64',
    lg: 'h-80'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`h-full ${className}`}
    >
      <div
        className={`glass rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 h-full ${
          advertisement.linkUrl ? 'cursor-pointer' : ''
        }`}
        onClick={advertisement.linkUrl ? handleClick : undefined}
      >
        {/* Background image container - fills the entire card space */}
        <div 
          className={`relative w-full h-full ${heightClasses[imageHeight]} bg-cover bg-center bg-no-repeat`}
          style={{
            backgroundImage: `url(${advertisement.imageUrl})`,
          }}
          role="img"
          aria-label={advertisement.alt || 'Anuncio'}
        />
      </div>
    </motion.div>
  );
}

