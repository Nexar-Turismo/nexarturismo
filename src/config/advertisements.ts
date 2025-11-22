import { Advertisement } from '@/components/ui/AdvertisementModal';

// Advertisement configuration for different pages
// Using placeholder images - replace with actual ad images later

export const advertisements: Record<string, Advertisement | null> = {
  // Homepage advertisement
  home: {
    id: 'ad_home_001',
    imageUrl: '/img/test-advertisments/advertisment-1.png',
    alt: 'Anuncio especial para la página principal',
    linkUrl: '#',
    target: '_self'
  },

  // Alojamientos page advertisement
  alojamientos: {
    id: 'ad_alojamientos_001',
    imageUrl: '/img/test-advertisments/advertisment-2.png',
    alt: 'Anuncio para página de alojamientos',
    linkUrl: '#',
    target: '_self'
  },

  // Vehículos page advertisement
  vehiculos: {
    id: 'ad_vehiculos_001',
    imageUrl: '/img/test-advertisments/advertisment-3.png',
    alt: 'Anuncio para página de vehículos',
    linkUrl: '#',
    target: '_self'
  },

  // Experiencias page advertisement
  experiencias: {
    id: 'ad_experiencias_001',
    imageUrl: '/img/test-advertisments/advertisment-4.png',
    alt: 'Anuncio para página de experiencias',
    linkUrl: '#',
    target: '_self'
  },

  // Buscar page advertisement
  buscar: {
    id: 'ad_buscar_001',
    imageUrl: '/img/test-advertisments/advertisment-5.png',
    alt: 'Anuncio para página de búsqueda',
    linkUrl: '#',
    target: '_self'
  },

  // Additional advertisements (available for future use)
  // advertisment-6.png and advertisment-7.png are available for other pages

  // No advertisement (for pages that shouldn't show ads)
  none: null
};

// Inline advertisements (shown between posts)
export const inlineAdvertisements: Record<string, Advertisement | null> = {
  // Homepage inline ad
  home: {
    id: 'ad_inline_home_001',
    imageUrl: '/img/test-advertisments/advertisment-6.png',
    alt: 'Anuncio inline para la página principal',
    linkUrl: '#',
    target: '_self'
  },

  // Alojamientos inline ad
  alojamientos: {
    id: 'ad_inline_alojamientos_001',
    imageUrl: '/img/test-advertisments/advertisment-6.png',
    alt: 'Anuncio inline para página de alojamientos',
    linkUrl: '#',
    target: '_self'
  },

  // Vehículos inline ad
  vehiculos: {
    id: 'ad_inline_vehiculos_001',
    imageUrl: '/img/test-advertisments/advertisment-7.png',
    alt: 'Anuncio inline para página de vehículos',
    linkUrl: '#',
    target: '_self'
  },

  // Experiencias inline ad
  experiencias: {
    id: 'ad_inline_experiencias_001',
    imageUrl: '/img/test-advertisments/advertisment-solid-7.png',
    alt: 'Anuncio inline para página de experiencias',
    linkUrl: '#',
    target: '_self'
  },

  // Buscar inline ad
  buscar: {
    id: 'ad_inline_buscar_001',
    imageUrl: '/img/test-advertisments/advertisment-5.png',
    alt: 'Anuncio inline para página de búsqueda',
    linkUrl: '#',
    target: '_self'
  },

  // No inline advertisement
  none: null
};

// Sidebar advertisements (square ads shown on the right side)
export const sidebarAdvertisements: Record<string, Advertisement[]> = {
  // Alojamientos sidebar ads (can have multiple)
  alojamientos: [
    {
      id: 'ad_sidebar_alojamientos_001',
      imageUrl: '/img/test-advertisments/advertisment-1.png',
      alt: 'Anuncio sidebar para página de alojamientos',
      linkUrl: '#',
      target: '_self'
    },
    {
      id: 'ad_sidebar_alojamientos_002',
      imageUrl: '/img/test-advertisments/advertisment-2.png',
      alt: 'Anuncio sidebar para página de alojamientos',
      linkUrl: '#',
      target: '_self'
    }
  ],

  // Vehículos sidebar ads
  vehiculos: [
    {
      id: 'ad_sidebar_vehiculos_001',
      imageUrl: '/img/test-advertisments/advertisment-3.png',
      alt: 'Anuncio sidebar para página de vehículos',
      linkUrl: '#',
      target: '_self'
    },
    {
      id: 'ad_sidebar_vehiculos_002',
      imageUrl: '/img/test-advertisments/advertisment-4.png',
      alt: 'Anuncio sidebar para página de vehículos',
      linkUrl: '#',
      target: '_self'
    }
  ],

  // Experiencias sidebar ads
  experiencias: [
    {
      id: 'ad_sidebar_experiencias_001',
      imageUrl: '/img/test-advertisments/advertisment-5.png',
      alt: 'Anuncio sidebar para página de experiencias',
      linkUrl: '#',
      target: '_self'
    },
    {
      id: 'ad_sidebar_experiencias_002',
      imageUrl: '/img/test-advertisments/advertisment-6.png',
      alt: 'Anuncio sidebar para página de experiencias',
      linkUrl: '#',
      target: '_self'
    }
  ],

  // Buscar sidebar ads
  buscar: [
    {
      id: 'ad_sidebar_buscar_001',
      imageUrl: '/img/test-advertisments/advertisment-7.png',
      alt: 'Anuncio sidebar para página de búsqueda',
      linkUrl: '#',
      target: '_self'
    },
    {
      id: 'ad_sidebar_buscar_002',
      imageUrl: '/img/test-advertisments/advertisment-solid-7.png',
      alt: 'Anuncio sidebar para página de búsqueda',
      linkUrl: '#',
      target: '_self'
    }
  ],

  // Empty array for pages without sidebar ads
  none: []
};

// Helper function to get modal advertisement for a page
export function getAdvertisementForPage(page: string): Advertisement | null {
  return advertisements[page] || null;
}

// Helper function to get inline advertisement for a page
export function getInlineAdvertisementForPage(page: string): Advertisement | null {
  return inlineAdvertisements[page] || null;
}

// Helper function to get sidebar advertisements for a page
export function getSidebarAdvertisementsForPage(page: string): Advertisement[] {
  return sidebarAdvertisements[page] || [];
}

