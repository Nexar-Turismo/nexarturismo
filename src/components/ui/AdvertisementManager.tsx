'use client';

import { useState, useEffect } from 'react';
import AdvertisementModal, { Advertisement } from './AdvertisementModal';
import { useAdvertisement } from '@/hooks/useAdvertisement';

interface AdvertisementManagerProps {
  advertisement: Advertisement | null;
  delay?: number; // Delay in milliseconds before showing the ad
}

export default function AdvertisementManager({ 
  advertisement, 
  delay = 1000 
}: AdvertisementManagerProps) {
  const { shouldShow, markAsShown } = useAdvertisement(advertisement);
  const [isReady, setIsReady] = useState(false);

  const handleClose = () => {
    markAsShown();
  };

  // Small delay before showing ad to ensure page is loaded
  useEffect(() => {
    if (shouldShow && advertisement) {
      const timer = setTimeout(() => {
        setIsReady(true);
      }, delay);

      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [shouldShow, advertisement, delay]);

  if (!shouldShow || !advertisement || !isReady) return null;

  return (
    <AdvertisementModal
      advertisement={advertisement}
      onClose={handleClose}
      showCloseButton={true}
    />
  );
}

