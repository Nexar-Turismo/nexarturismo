'use client';

import { BasePost } from '@/types';
import PostImages from './PostImages';
import { MapPin } from 'lucide-react';
import { formatAddressForDisplay, calculateCurrentPrice } from '@/lib/utils';
import { Weekday } from '@/types';

// Helper function to get weekday label in Spanish
function getWeekdayLabel(weekday: Weekday): string {
  const labels: Record<Weekday, string> = {
    monday: 'Lun',
    tuesday: 'Mar',
    wednesday: 'Mié',
    thursday: 'Jue',
    friday: 'Vie',
    saturday: 'Sáb',
    sunday: 'Dom'
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

interface PostCardProps {
  post: BasePost;
  className?: string;
  showImages?: boolean;
  isGridView?: boolean;
  showStatus?: boolean;
  onClick?: () => void;
  imageHeight?: 'sm' | 'md' | 'lg';
}

export default function PostCard({ 
  post, 
  className = '', 
  showImages = true, 
  isGridView = true,
  showStatus = true,
  onClick,
  imageHeight = 'md'
}: PostCardProps) {
  // Calculate current price based on dynamic pricing
  const currentPricing = calculateCurrentPrice(post);
  
  // Define image height classes
  const heightClasses = {
    sm: 'h-48',
    md: 'h-64',
    lg: 'h-80'
  };

  return (
    <div 
      className={`glass rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Images */}
      {showImages && (
        <div className="relative">
          <PostImages 
            postId={post.id} 
            className="w-full"
            showMainImageOnly={true}
            showGallery={false}
            aspectRatio="square"
            imageHeightClass={heightClasses[imageHeight]}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
            {post.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {maskContactInfo(post.description)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {post.address ? 
                formatAddressForDisplay(post.address) : 
                'Ubicación no disponible'
              }
            </span>
          </div>
          <div className="flex items-center text-lg font-bold text-primary">
            <span>
              {currentPricing.isDynamic ? 'Desde' : ''} ${currentPricing.price.toLocaleString()}
              {currentPricing.isDynamic && currentPricing.seasonInfo && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  ({getWeekdayLabel(currentPricing.seasonInfo.weekday)})
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
            {post.category}
          </span>
          {showStatus && (
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              post.status === 'published' || post.status === 'approved'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : post.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {post.status === 'published' || post.status === 'approved' ? 'Activo' : 
               post.status === 'pending' ? 'Pendiente' : 'Inactivo'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
