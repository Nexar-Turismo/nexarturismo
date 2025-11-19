import { type ClassValue, clsx } from "clsx";
import { BasePost, Pricing, DynamicPricingSeason, Weekday } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number, currency: string = 'ARS'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    // Alojamiento
    'Hotel': 'bed',
    'Casa': 'home',
    'Departamento': 'building',
    'Cabaña': 'tree-pine',
    'Camping': 'tent',
    'Domo': 'circle-dot',
    // Alquiler de vehículos
    'Alquiler de autos': 'car',
    'Alquiler de bicicletas': 'bike',
    'Alquiler de kayaks': 'waves',
    // Clases/instructorados
    'Clases de Esquí': 'mountain',
    'Clases de snowboard': 'mountain',
    'Clases de surf': 'waves',
    'Clases de wingfoil': 'wind',
    'Clases de wing surf': 'wind',
    // Alquileres
    'Alquiler equipo de esquí': 'mountain',
    'Alquiler equipo de snowboard': 'mountain',
    'Alquiler ropa de nieve': 'snowflake',
    'Alquiler equipo de surf': 'waves',
    'Alquiler equipo de wingfoil': 'wind',
    'Alquiler equipo de wing surf': 'wind',
    'Alquiler de carpa': 'tent',
    'Alquiler de sombrilla': 'umbrella',
    'Alquiler': 'package',
    // Excursiones
    'Excursiones lacustres': 'waves',
    'Excursiones terrestres': 'map',
    'Experiencias 4x4': 'car',
    'Cabalgatas': 'horse',
    'Excursiones aéreas': 'plane',
    // Fotografía
    'Vuelo de drone': 'camera',
    'Fotografía': 'camera',
  };
  return icons[category] || 'package';
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    // Alojamiento
    'Hotel': 'bg-red-100 text-red-800',
    'Casa': 'bg-indigo-100 text-indigo-800',
    'Departamento': 'bg-blue-100 text-blue-800',
    'Cabaña': 'bg-amber-100 text-amber-800',
    'Camping': 'bg-orange-100 text-orange-800',
    'Domo': 'bg-purple-100 text-purple-800',
    // Alquiler de vehículos
    'Alquiler de autos': 'bg-blue-100 text-blue-800',
    'Alquiler de bicicletas': 'bg-green-100 text-green-800',
    'Alquiler de kayaks': 'bg-cyan-100 text-cyan-800',
    // Clases/instructorados
    'Clases de Esquí': 'bg-sky-100 text-sky-800',
    'Clases de snowboard': 'bg-purple-100 text-purple-800',
    'Clases de surf': 'bg-blue-100 text-blue-800',
    'Clases de wingfoil': 'bg-cyan-100 text-cyan-800',
    'Clases de wing surf': 'bg-teal-100 text-teal-800',
    // Alquileres
    'Alquiler equipo de esquí': 'bg-sky-100 text-sky-800',
    'Alquiler equipo de snowboard': 'bg-purple-100 text-purple-800',
    'Alquiler ropa de nieve': 'bg-blue-100 text-blue-800',
    'Alquiler equipo de surf': 'bg-blue-100 text-blue-800',
    'Alquiler equipo de wingfoil': 'bg-cyan-100 text-cyan-800',
    'Alquiler equipo de wing surf': 'bg-teal-100 text-teal-800',
    'Alquiler de carpa': 'bg-green-100 text-green-800',
    'Alquiler de sombrilla': 'bg-yellow-100 text-yellow-800',
    'Alquiler': 'bg-gray-100 text-gray-800',
    // Excursiones
    'Excursiones lacustres': 'bg-blue-100 text-blue-800',
    'Excursiones terrestres': 'bg-green-100 text-green-800',
    'Experiencias 4x4': 'bg-orange-100 text-orange-800',
    'Cabalgatas': 'bg-amber-100 text-amber-800',
    'Excursiones aéreas': 'bg-sky-100 text-sky-800',
    // Fotografía
    'Vuelo de drone': 'bg-indigo-100 text-indigo-800',
    'Fotografía': 'bg-pink-100 text-pink-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
}

/**
 * Parses OpenStreetMap address format to extract city and state/province
 * @param address - The full address string from OpenStreetMap
 * @returns Object with city and state, or fallback to original address
 */
export function parseAddress(address: string): { city: string; state: string } {
  if (!address) return { city: '', state: '' };

  // Split by comma and clean up whitespace
  const parts = address.split(',').map(part => part.trim());
  
  if (parts.length < 2) {
    return { city: address, state: '' };
  }

  // Common patterns for OpenStreetMap addresses:
  // "Street Name, City, Province/State, Country"
  // "Street Name, City, Province/State, Postal Code, Country"
  
  let city = '';
  let state = '';
  
  // Try to identify city and state from the parts
  // Usually city is the second part and state is the third
  if (parts.length >= 3) {
    city = parts[1];
    
    // Check if the third part looks like a state/province (not a postal code)
    const thirdPart = parts[2];
    const isPostalCode = /^\d{4,5}$/.test(thirdPart); // Simple postal code check
    
    if (!isPostalCode) {
      state = thirdPart;
    } else if (parts.length >= 4) {
      // If third part is postal code, state might be fourth part
      state = parts[3];
    }
  } else if (parts.length === 2) {
    // Only two parts, assume first is city, second is state
    city = parts[0];
    state = parts[1];
  } else {
    // Fallback to original address
    city = address;
  }

  // Clean up common suffixes and prefixes
  city = city.replace(/^(Calle|Avenida|Plaza|Paseo)\s+/i, '').trim();
  state = state.replace(/\s+(Provincia|Estado|State|Province)$/i, '').trim();
  
  return { city, state };
}

/**
 * Formats address for display showing only city and state
 * @param address - The full address string from OpenStreetMap or address object
 * @returns Formatted string with city and state
 */
export function formatAddressForDisplay(address: string | { country: string; state: string; city: string; postalCode: string; address: string }): string {
  // Handle new address object format
  if (typeof address === 'object' && address !== null) {
    const parts = [];
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postalCode) parts.push(address.postalCode);
    
    return parts.length > 0 ? parts.join(', ') : 'Ubicación no especificada';
  }
  
  // Handle legacy string format
  const { city, state } = parseAddress(address);
  
  if (!city && !state) return address;
  if (!state) return city;
  if (!city) return state;
  
  return `${city}, ${state}`;
}

/**
 * Calculate the current price for a post based on dynamic pricing
 * @param post - The post with pricing information
 * @param targetDate - Optional target date (defaults to current date)
 * @returns Object with price, currency, and pricing info
 */
export function calculateCurrentPrice(post: BasePost, targetDate?: Date): {
  price: number;
  currency: string;
  isDynamic: boolean;
  seasonInfo?: {
    startDate: string;
    endDate: string;
    weekday: Weekday;
  };
} {
  const date = targetDate || new Date();
  
  // If no pricing data, return the fixed price
  if (!post.pricing) {
    return {
      price: post.price,
      currency: post.currency,
      isDynamic: false
    };
  }

  // Handle fixed pricing
  if (post.pricing.type === 'fixed') {
    return {
      price: post.pricing.price,
      currency: post.pricing.currency,
      isDynamic: false
    };
  }

  // Handle dynamic pricing
  if (post.pricing.type === 'dynamic') {
    // Use local date format to avoid timezone issues
    const currentDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const currentWeekday = getWeekdayFromDate(date);
    
    // Find applicable season
    const applicableSeason = post.pricing.seasons.find(season => {
      return currentDateStr >= season.startDate && currentDateStr <= season.endDate;
    });

    if (applicableSeason) {
      // Check if there's a price for the current weekday
      const weekdayPrice = applicableSeason.weekdayPrices[currentWeekday];
      
      if (weekdayPrice !== undefined) {
        return {
          price: weekdayPrice,
          currency: applicableSeason.currency,
          isDynamic: true,
          seasonInfo: {
            startDate: applicableSeason.startDate,
            endDate: applicableSeason.endDate,
            weekday: currentWeekday
          }
        };
      }
    }

    // If no applicable season or weekday price, return the minimum available price
    const allPrices: number[] = [];
    post.pricing.seasons.forEach(season => {
      Object.values(season.weekdayPrices).forEach(price => {
        if (price !== undefined) {
          allPrices.push(price);
        }
      });
    });

    if (allPrices.length > 0) {
      const minPrice = Math.min(...allPrices);
      const seasonWithMinPrice = post.pricing.seasons.find(season => 
        Object.values(season.weekdayPrices).includes(minPrice)
      );
      
      return {
        price: minPrice,
        currency: seasonWithMinPrice?.currency || post.currency,
        isDynamic: true
      };
    }
  }

  // Fallback to fixed price
  return {
    price: post.price,
    currency: post.currency,
    isDynamic: false
  };
}

/**
 * Get weekday from a date
 * Fixed to handle local time properly and avoid timezone offset issues
 */
function getWeekdayFromDate(date: Date): Weekday {
  // Use local date methods to avoid timezone issues
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekdays: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return weekdays[localDate.getDay()];
}

/**
 * Calculate minimum price from dynamic pricing
 */
export function getMinPriceFromDynamicPricing(post: BasePost): number {
  if (!post.pricing || post.pricing.type === 'fixed') {
    return post.price;
  }

  if (post.pricing.type === 'dynamic') {
    const allPrices: number[] = [];
    post.pricing.seasons.forEach(season => {
      Object.values(season.weekdayPrices).forEach(price => {
        if (price !== undefined) {
          allPrices.push(price);
        }
      });
    });

    return allPrices.length > 0 ? Math.min(...allPrices) : post.price;
  }

  return post.price;
}

/**
 * Calculate maximum price from dynamic pricing
 */
export function getMaxPriceFromDynamicPricing(post: BasePost): number {
  if (!post.pricing || post.pricing.type === 'fixed') {
    return post.price;
  }

  if (post.pricing.type === 'dynamic') {
    const allPrices: number[] = [];
    post.pricing.seasons.forEach(season => {
      Object.values(season.weekdayPrices).forEach(price => {
        if (price !== undefined) {
          allPrices.push(price);
        }
      });
    });

    return allPrices.length > 0 ? Math.max(...allPrices) : post.price;
  }

  return post.price;
}

/**
 * Get available dates for a post based on dynamic pricing
 * Returns an array of available dates where the post has pricing configured
 */
export function getAvailableDates(post: BasePost, startDate?: Date, endDate?: Date): Date[] {
  if (!post.pricing || post.pricing.type === 'fixed') {
    // If fixed pricing, all dates are available
    return [];
  }

  const availableDates: Date[] = [];
  const start = startDate || new Date();
  const end = endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year from now

  // Iterate through each day in the range
  const current = new Date(start);
  while (current <= end) {
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    const weekday = getWeekdayFromDate(current);

    // Check if there's a season that covers this date
    const applicableSeason = post.pricing.seasons.find(season => {
      return dateStr >= season.startDate && dateStr <= season.endDate;
    });

    // If there's a season and it has a price for this weekday, the date is available
    if (applicableSeason && applicableSeason.weekdayPrices[weekday] !== undefined) {
      availableDates.push(new Date(current));
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return availableDates;
}

/**
 * Check if a specific date is available for booking
 */
export function isDateAvailable(post: BasePost, date: Date): boolean {
  if (!post.pricing || post.pricing.type === 'fixed') {
    return true; // Fixed pricing means all dates are available
  }

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const weekday = getWeekdayFromDate(date);

  // Check if there's a season that covers this date
  const applicableSeason = post.pricing.seasons.find(season => {
    return dateStr >= season.startDate && dateStr <= season.endDate;
  });

  // Return true if there's a season and it has a price for this weekday
  return !!(applicableSeason && applicableSeason.weekdayPrices[weekday] !== undefined);
}

/**
 * Get the next available date for a post
 */
export function getNextAvailableDate(post: BasePost, fromDate?: Date): Date | null {
  const start = fromDate || new Date();
  const maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Check up to 1 year ahead
  
  const current = new Date(start);
  while (current <= maxDate) {
    if (isDateAvailable(post, current)) {
      return new Date(current);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return null; // No available dates found
} 