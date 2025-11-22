'use client';

import { useState, useEffect } from 'react';
import { Advertisement } from '@/components/ui/AdvertisementModal';

const SESSION_STORAGE_KEY = 'mkt_turismo_ad_shown_this_session';
const STORAGE_KEY = 'mkt_turismo_advertisements_shown';
const STORAGE_EXPIRY_DAYS = 30; // Ads won't show again for 30 days

interface ShownAd {
  id: string;
  timestamp: number;
}

export function useAdvertisement(advertisement: Advertisement | null) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!advertisement) {
      setShouldShow(false);
      return;
    }

    // First check: Has ANY ad been shown in this session?
    const adShownThisSession = checkIfAdShownThisSession();
    if (adShownThisSession) {
      setShouldShow(false);
      return;
    }

    // Second check: Has this specific ad been shown before (long-term tracking)?
    const shownAds = getShownAds();
    const adShown = shownAds.find(ad => ad.id === advertisement.id);
    
    if (!adShown) {
      // Ad hasn't been shown, show it
      setShouldShow(true);
    } else {
      // Check if ad expiry has passed
      const daysSinceShown = (Date.now() - adShown.timestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceShown > STORAGE_EXPIRY_DAYS) {
        // Expiry passed, show again
        setShouldShow(true);
      } else {
        setShouldShow(false);
      }
    }
  }, [advertisement]);

  const markAsShown = () => {
    if (!advertisement) return;

    // Mark that an ad has been shown in this session
    markAdShownThisSession();

    // Also track this specific ad for long-term storage
    const shownAds = getShownAds();
    const existingIndex = shownAds.findIndex(ad => ad.id === advertisement.id);

    if (existingIndex >= 0) {
      // Update timestamp
      shownAds[existingIndex].timestamp = Date.now();
    } else {
      // Add new entry
      shownAds.push({
        id: advertisement.id,
        timestamp: Date.now()
      });
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shownAds));
    } catch (error) {
      console.error('Error saving advertisement to localStorage:', error);
    }

    setShouldShow(false);
  };

  return {
    shouldShow,
    markAsShown
  };
}

function checkIfAdShownThisSession(): boolean {
  try {
    const shown = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return shown === 'true';
  } catch (error) {
    console.error('Error reading sessionStorage:', error);
    return false;
  }
}

function markAdShownThisSession(): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
  } catch (error) {
    console.error('Error saving to sessionStorage:', error);
  }
}

function getShownAds(): ShownAd[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored) as ShownAd[];
    // Filter out expired entries (older than expiry days)
    const now = Date.now();
    return parsed.filter(ad => {
      const daysSinceShown = (now - ad.timestamp) / (1000 * 60 * 60 * 24);
      return daysSinceShown <= STORAGE_EXPIRY_DAYS;
    });
  } catch (error) {
    console.error('Error reading advertisements from localStorage:', error);
    return [];
  }
}

// Utility function to clear all shown ads (useful for testing)
export function clearShownAds() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing advertisements from storage:', error);
  }
}

