// Firebase-based location service for fetching geographical data
import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit 
} from 'firebase/firestore';

export interface Country {
  id: string;
  name: string;
  code: string;
}

export interface State {
  id: string;
  name: string;
  code: string;
  cityCount?: number;
}

export interface City {
  id: string;
  name: string;
  code: string;
  stateName?: string;
}

class FirebaseLocationService {
  constructor() {
    // Service is ready to use
  }

  /**
   * Get all countries from Firebase
   */
  async getCountries(): Promise<Country[]> {
    try {
      const countriesRef = collection(db, 'locations', 'main', 'countries');
      const countriesSnapshot = await getDocs(countriesRef);
      
      const countries: Country[] = [];
      countriesSnapshot.forEach((doc) => {
        const data = doc.data();
        countries.push({
          id: doc.id,
          name: data.name,
          code: data.code || doc.id.toUpperCase()
        });
      });

      return countries;
    } catch (error) {
      console.error('Error fetching countries from Firebase:', error);
      throw new Error('Failed to fetch countries');
    }
  }

  /**
   * Get states for a specific country from Firebase
   */
  async getStates(countryCode: string): Promise<State[]> {
    try {
      // Use the country document ID instead of country code
      // For Argentina, the document ID is "argentina", not "AR"
      const countryDocId = countryCode.toLowerCase() === 'ar' ? 'argentina' : countryCode.toLowerCase();
      
      const statesRef = collection(db, 'locations', 'main', 'countries', countryDocId, 'states');
      const statesSnapshot = await getDocs(statesRef);
      
      const states: State[] = [];
      statesSnapshot.forEach((doc) => {
        const data = doc.data();
        states.push({
          id: doc.id,
          name: data.name,
          code: doc.id, // Use document ID as code (e.g., "buenos_aires")
          cityCount: data.cityCount || 0
        });
      });

      // Sort states alphabetically by name
      return states.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching states from Firebase:', error);
      throw new Error('Failed to fetch states');
    }
  }

  /**
   * Get cities for a specific state from Firebase
   */
  async getCities(
    countryCode: string, 
    stateCode: string, 
    searchTerm?: string, 
    limitCount?: number
  ): Promise<City[]> {
    try {
      // Use the country document ID instead of country code
      // For Argentina, the document ID is "argentina", not "AR"
      const countryDocId = countryCode.toLowerCase() === 'ar' ? 'argentina' : countryCode.toLowerCase();
      
      // stateCode is already in the correct format (e.g., "buenos_aires")
      const citiesRef = collection(
        db, 
        'locations', 
        'main', 
        'countries', 
        countryDocId, 
        'states', 
        stateCode, 
        'cities'
      );

      let citiesQuery = query(citiesRef, orderBy('name'));
      
      if (limitCount) {
        citiesQuery = query(citiesQuery, firestoreLimit(limitCount));
      }

      const citiesSnapshot = await getDocs(citiesQuery);
      
      let cities: City[] = [];
      citiesSnapshot.forEach((doc) => {
        const data = doc.data();
        cities.push({
          id: doc.id,
          name: data.name,
          code: doc.id, // Use document ID as code (e.g., "25_de_mayo")
          stateName: data.stateName
        });
      });

      // Filter by search term if provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        cities = cities.filter(city => 
          city.name.toLowerCase().includes(searchLower)
        );
      }

      return cities;
    } catch (error) {
      console.error('Error fetching cities from Firebase:', error);
      throw new Error('Failed to fetch cities');
    }
  }

  /**
   * Search cities across all states for a country
   */
  async searchCities(
    countryCode: string, 
    searchTerm: string, 
    limitCount: number = 100
  ): Promise<City[]> {
    try {
      // First get all states
      const states = await this.getStates(countryCode);
      
      // Search cities in each state
      const allCities: City[] = [];
      
      for (const state of states) {
        try {
          const cities = await this.getCities(countryCode, state.code, searchTerm, limitCount);
          allCities.push(...cities);
          
          // Stop if we have enough results
          if (allCities.length >= limitCount) {
            break;
          }
        } catch (stateError) {
          console.warn(`Error fetching cities for state ${state.code}:`, stateError);
          // Continue with other states
        }
      }

      // Sort by name and limit results
      return allCities
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, limitCount);
    } catch (error) {
      console.error('Error searching cities:', error);
      throw new Error('Failed to search cities');
    }
  }

  /**
   * Get a specific state by code
   */
  async getState(countryCode: string, stateCode: string): Promise<State | null> {
    try {
      // Use the country document ID instead of country code
      const countryDocId = countryCode.toLowerCase() === 'ar' ? 'argentina' : countryCode.toLowerCase();
      
      // stateCode is already in the correct format (e.g., "buenos_aires")
      const stateRef = doc(
        db, 
        'locations', 
        'main', 
        'countries', 
        countryDocId, 
        'states', 
        stateCode
      );
      
      const stateSnapshot = await getDoc(stateRef);
      
      if (stateSnapshot.exists()) {
        const data = stateSnapshot.data();
        return {
          id: stateSnapshot.id,
          name: data.name,
          code: stateSnapshot.id, // Use document ID as code
          cityCount: data.cityCount || 0
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching state from Firebase:', error);
      throw new Error('Failed to fetch state');
    }
  }

  /**
   * Get a specific city by code
   */
  async getCity(countryCode: string, stateCode: string, cityCode: string): Promise<City | null> {
    try {
      // Use the country document ID instead of country code
      const countryDocId = countryCode.toLowerCase() === 'ar' ? 'argentina' : countryCode.toLowerCase();
      
      // stateCode and cityCode are already in the correct format (e.g., "buenos_aires", "25_de_mayo")
      const cityRef = doc(
        db, 
        'locations', 
        'main', 
        'countries', 
        countryDocId, 
        'states', 
        stateCode, 
        'cities', 
        cityCode
      );
      
      const citySnapshot = await getDoc(cityRef);
      
      if (citySnapshot.exists()) {
        const data = citySnapshot.data();
        return {
          id: citySnapshot.id,
          name: data.name,
          code: citySnapshot.id, // Use document ID as code
          stateName: data.stateName
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching city from Firebase:', error);
      throw new Error('Failed to fetch city');
    }
  }

  /**
   * Get location statistics
   */
  async getLocationStats(): Promise<{
    countries: number;
    states: number;
    cities: number;
  }> {
    try {
      // Get countries count
      const countriesRef = collection(db, 'locations', 'main', 'countries');
      const countriesSnapshot = await getDocs(countriesRef);
      const countriesCount = countriesSnapshot.size;

      // Get states count (only for Argentina for now)
      const argentinaStatesRef = collection(db, 'locations', 'main', 'countries', 'argentina', 'states');
      const argentinaStatesSnapshot = await getDocs(argentinaStatesRef);
      const statesCount = argentinaStatesSnapshot.size;

      // Get cities count (sum from all states)
      let citiesCount = 0;
      argentinaStatesSnapshot.forEach((stateDoc) => {
        const data = stateDoc.data();
        citiesCount += data.cityCount || 0;
      });

      return {
        countries: countriesCount,
        states: statesCount,
        cities: citiesCount
      };
    } catch (error) {
      console.error('Error fetching location stats:', error);
      throw new Error('Failed to fetch location statistics');
    }
  }
}

export const firebaseLocationService = new FirebaseLocationService();
