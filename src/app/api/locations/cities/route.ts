import { NextResponse } from 'next/server';
import { firebaseLocationService } from '@/services/firebaseLocationService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stateCode = searchParams.get('state');
    const search = searchParams.get('search');
    const countryCode = searchParams.get('country') || 'AR';
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!stateCode) {
      return NextResponse.json(
        { error: 'State code is required' },
        { status: 400 }
      );
    }

    // Use Firebase service to get cities
    const cities = await firebaseLocationService.getCities(
      countryCode, 
      stateCode, 
      search || undefined, 
      limit
    );

    return NextResponse.json({
      cities,
      total: cities.length,
      source: 'firebase',
      state: stateCode,
      country: countryCode
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}
