# Location APIs Configuration

This document explains how to configure and use the external location APIs for comprehensive city data.

## Overview

The application supports both local and external data sources for cities:

- **Local Data**: Comprehensive database of Argentine cities (fast, reliable)
- **External APIs**: GeoNames and Nominatim for worldwide city data (comprehensive, may be slower)

## Configuration

### Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# GeoNames API Configuration
# Get your free username at: https://www.geonames.org/login
GEONAMES_USERNAME=your_username_here

# Disable external APIs (set to 'true' to use only local data)
# Useful for development or when external APIs are unreliable
DISABLE_EXTERNAL_APIS=false

# API Timeout Settings (in milliseconds)
GEONAMES_TIMEOUT=8000
NOMINATIM_TIMEOUT=10000
```

### Default Behavior

- **Development**: External APIs are disabled by default (uses local data)
- **Production**: External APIs are enabled by default
- **Fallback**: If external APIs fail, automatically falls back to local data

## API Services

### GeoNames API

- **URL**: http://api.geonames.org/searchJSON
- **Features**: Comprehensive worldwide city data with population information
- **Rate Limits**: 1000 requests/hour (free tier)
- **Registration**: Free at https://www.geonames.org/login

### Nominatim API (OpenStreetMap)

- **URL**: https://nominatim.openstreetmap.org/search
- **Features**: Free alternative with good coverage
- **Rate Limits**: 1 request/second (free tier)
- **No Registration**: Required

## Usage Examples

### API Endpoints

```bash
# Use local data (fast)
GET /api/locations/cities?state=BA&external=false&limit=100

# Use external data (comprehensive)
GET /api/locations/cities?state=BA&external=true&limit=500

# Search cities
GET /api/locations/cities?state=BA&search=mar&external=true
```

### Component Usage

```tsx
<AddressSection
  value={addressData}
  onChange={handleAddressChange}
  showExternalToggle={true} // Show toggle for data source
/>
```

## Troubleshooting

### Common Issues

1. **Timeout Errors**: External APIs may timeout due to network issues
   - Solution: The system automatically falls back to local data
   - Configuration: Adjust timeout values in environment variables

2. **Rate Limiting**: Free APIs have rate limits
   - Solution: Get a paid GeoNames account for higher limits
   - Alternative: Use local data for development

3. **Network Issues**: External APIs may be unavailable
   - Solution: System automatically uses local data as fallback
   - Configuration: Set `DISABLE_EXTERNAL_APIS=true` to force local data

### Error Handling

The system includes comprehensive error handling:

- **Timeout Protection**: 8-10 second timeouts prevent hanging requests
- **Automatic Fallback**: Falls back to local data if external APIs fail
- **Graceful Degradation**: Always provides some city data
- **User Feedback**: Clear loading states and error messages

## Performance Considerations

### Local Data
- **Pros**: Fast, reliable, no network dependencies
- **Cons**: Limited to pre-defined cities
- **Use Case**: Development, offline usage, performance-critical scenarios

### External Data
- **Pros**: Comprehensive, up-to-date, worldwide coverage
- **Cons**: Network dependent, potential timeouts, rate limits
- **Use Case**: Production, comprehensive city coverage needed

## Data Sources

### Local Database
- **CABA**: 45+ neighborhoods
- **Buenos Aires**: 115+ cities
- **Córdoba**: 120+ cities
- **All Provinces**: 15-120+ cities each

### External APIs
- **GeoNames**: 1000+ cities per province (with population data)
- **Nominatim**: 500+ cities per province (with coordinates)

## Best Practices

1. **Development**: Use local data for faster development
2. **Production**: Enable external data for comprehensive coverage
3. **Monitoring**: Monitor API usage and implement caching if needed
4. **Fallback**: Always have local data as fallback
5. **User Experience**: Show loading states and provide clear feedback
