'use client';

import { motion } from 'framer-motion';
import { Advertisement } from './AdvertisementModal';

interface SidebarAdvertisementProps {
  advertisement: Advertisement;
  className?: string;
}

export default function SidebarAdvertisement({ 
  advertisement, 
  className = '' 
}: SidebarAdvertisementProps) {
  const handleClick = () => {
    if (advertisement.linkUrl) {
      window.open(advertisement.linkUrl, advertisement.target || '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <div
        className={`glass rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 ${
          advertisement.linkUrl ? 'cursor-pointer' : ''
        }`}
        onClick={advertisement.linkUrl ? handleClick : undefined}
      >
        {/* Square background image container */}
        <div 
          className="relative w-full aspect-square bg-cover bg-center bg-no-repeat"
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

