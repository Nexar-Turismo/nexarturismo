'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface BackgroundCarouselProps {
  images: string[];
  interval?: number;
  className?: string;
  showDots?: boolean;
}

export default function BackgroundCarousel({ 
  images, 
  interval = 5000, 
  className = '',
  showDots = true
}: BackgroundCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval, isPaused]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div 
      className={`relative w-full h-full overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Mobile View - Stacked images with transitions */}
      <div className="block md:hidden relative w-full">
        {/* Spacer to maintain container height based on active image */}
        <div className="relative w-full opacity-0 pointer-events-none" aria-hidden="true">
          <Image
            src={images[currentIndex]}
            alt=""
            width={1920}
            height={1080}
            className="object-cover w-full h-auto"
            quality={90}
            sizes="100vw"
          />
        </div>
        {/* All images absolutely positioned and overlaid */}
        {images.map((image, index) => (
          <div
            key={`mobile-${index}`}
            className={`absolute top-0 left-0 w-full transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            style={{ pointerEvents: index === currentIndex ? 'auto' : 'none' }}
          >
            <Image
              src={image}
              alt={`Background ${index + 1}`}
              width={1920}
              height={1080}
              className="object-cover w-full h-auto"
              priority={index === 0}
              quality={90}
              sizes="100vw"
            />
          </div>
        ))}
      </div>

      {/* Desktop View - Absolute positioned images with transitions */}
      <div className="hidden md:block relative w-full h-full">
        {images.map((image, index) => (
          <div
            key={`desktop-${index}`}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            style={index === currentIndex ? {} : { pointerEvents: 'none' }}
          >
            <Image
              src={image}
              alt={`Background ${index + 1}`}
              fill
              className="object-cover w-full h-full"
              priority={index === 0}
              quality={90}
              sizes="100vw"
            />
          </div>
        ))}
      </div>
      
      {/* Navigation Dots */}
      {showDots && images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-white scale-110'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
