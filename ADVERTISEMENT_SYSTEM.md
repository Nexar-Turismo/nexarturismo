# Advertisement System Documentation

## Overview

The advertisement system allows you to display full-screen modal advertisements on different pages across the site. Each advertisement is tracked using localStorage to prevent showing the same ad repeatedly to users.

## Features

- ✅ **Page-specific advertisements**: Different ads for different pages
- ✅ **localStorage tracking**: Prevents showing the same ad multiple times
- ✅ **Configurable expiry**: Ads won't show again for 30 days (configurable)
- ✅ **Full-screen modal**: Beautiful modal with animations
- ✅ **Clickable ads**: Ads can link to external URLs
- ✅ **Placeholder images**: Ready to replace with actual ad images

## File Structure

```
src/
├── components/
│   └── ui/
│       ├── AdvertisementModal.tsx      # Modal component for displaying ads
│       └── AdvertisementManager.tsx     # Manager component that handles logic
├── hooks/
│   └── useAdvertisement.ts            # Hook for ad visibility logic
└── config/
    └── advertisements.ts               # Advertisement configuration
```

## How It Works

1. **Advertisement Configuration**: Ads are defined in `src/config/advertisements.ts`
2. **Page Integration**: Each page imports `AdvertisementManager` and passes the appropriate ad
3. **Visibility Check**: The `useAdvertisement` hook checks localStorage to see if the ad has been shown
4. **Display**: If the ad hasn't been shown (or expired), it displays after a 1-second delay
5. **Tracking**: When the user closes the ad, it's marked as shown in localStorage

## Usage

### Adding an Advertisement to a Page

1. Import the necessary components:
```tsx
import AdvertisementManager from '@/components/ui/AdvertisementManager';
import { getAdvertisementForPage } from '@/config/advertisements';
```

2. Get the advertisement for your page:
```tsx
const myAdvertisement = getAdvertisementForPage('page-key');
```

3. Add the AdvertisementManager component:
```tsx
<AdvertisementManager advertisement={myAdvertisement} />
```

### Configuring Advertisements

Edit `src/config/advertisements.ts` to add or modify advertisements:

```typescript
export const advertisements: Record<string, Advertisement | null> = {
  // Your page key
  'your-page-key': {
    id: 'ad_unique_id',                    // Unique identifier
    imageUrl: '/path/to/your/ad-image.jpg', // Image URL
    alt: 'Advertisement description',        // Alt text for accessibility
    linkUrl: 'https://example.com',         // Optional: URL to navigate to
    target: '_blank'                        // Optional: '_blank' or '_self'
  },
  
  // No advertisement for a page
  'no-ads-page': null
};
```

### Current Page Integrations

The following pages already have advertisements configured:

- **Homepage** (`home`): Main landing page
- **Alojamientos** (`alojamientos`): Accommodations page
- **Vehículos** (`vehiculos`): Vehicles page
- **Experiencias** (`experiencias`): Experiences page
- **Buscar** (`buscar`): Search page

## Customization

### Changing Advertisement Images

Replace the placeholder URLs in `src/config/advertisements.ts` with your actual ad images:

```typescript
imageUrl: '/img/ads/homepage-ad.jpg'  // Use local images
// or
imageUrl: 'https://your-cdn.com/ad.jpg'  // Use external URLs
```

### Adjusting Display Delay

The default delay is 1 second. You can customize it per page:

```tsx
<AdvertisementManager 
  advertisement={myAdvertisement} 
  delay={2000}  // 2 second delay
/>
```

### Changing Expiry Period

Edit `STORAGE_EXPIRY_DAYS` in `src/hooks/useAdvertisement.ts`:

```typescript
const STORAGE_EXPIRY_DAYS = 30; // Change to your desired days
```

### Disabling Expiry (Never Show Again)

To make ads never show again after being closed, modify the `useAdvertisement` hook to remove the expiry check:

```typescript
// In useAdvertisement.ts, remove the expiry check:
if (!adShown) {
  setShouldShow(true);
} else {
  setShouldShow(false); // Never show again
}
```

## Testing

### Clear Advertisement History

To test advertisements again, clear localStorage:

```javascript
// In browser console
localStorage.removeItem('mkt_turismo_advertisements_shown');
```

Or use the utility function:

```typescript
import { clearShownAds } from '@/hooks/useAdvertisement';
clearShownAds();
```

### Disable Advertisements Temporarily

Set the advertisement to `null` in the configuration:

```typescript
home: null  // Disables ad for homepage
```

## Advertisement Modal Features

- **Full-screen overlay**: Dark backdrop with 75% opacity
- **Responsive design**: Adapts to different screen sizes
- **Smooth animations**: Framer Motion animations for entrance/exit
- **Clickable ads**: If `linkUrl` is provided, clicking the image opens the link
- **Close button**: X button in top-right corner
- **Backdrop click**: Clicking outside the modal also closes it

## Best Practices

1. **Image Optimization**: Use optimized images (WebP format recommended)
2. **File Size**: Keep ad images under 500KB for better performance
3. **Dimensions**: Recommended size: 1200x800px (3:2 aspect ratio)
4. **Accessibility**: Always provide meaningful `alt` text
5. **Testing**: Test ads on different devices and screen sizes
6. **Analytics**: Consider adding analytics tracking for ad impressions/clicks

## Future Enhancements

Potential improvements:

- [ ] A/B testing support
- [ ] Time-based ad scheduling
- [ ] User segment targeting
- [ ] Analytics integration
- [ ] Multiple ads per page with rotation
- [ ] Admin panel for managing ads

## Troubleshooting

### Ad Not Showing

1. Check if the ad is configured in `advertisements.ts`
2. Verify localStorage isn't blocking it (clear it for testing)
3. Check browser console for errors
4. Ensure the image URL is accessible

### Ad Showing Too Often

1. Check the expiry period in `useAdvertisement.ts`
2. Verify localStorage is working correctly
3. Check if multiple ad IDs are conflicting

### Performance Issues

1. Optimize ad images
2. Use lazy loading for images
3. Consider using CDN for ad images
4. Reduce the number of ads per page

