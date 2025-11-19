import { NextResponse } from 'next/server';
import { firebaseLocationService } from '@/services/firebaseLocationService';

export async function GET() {
  try {
    const countries = await firebaseLocationService.getCountries();
    return NextResponse.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}
