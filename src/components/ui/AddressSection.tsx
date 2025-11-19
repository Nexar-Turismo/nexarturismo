'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Search, MapPin } from 'lucide-react';

interface Country {
  id: string;
  name: string;
  code: string;
}

interface State {
  id: string;
  name: string;
  code: string;
}

interface City {
  id: string;
  name: string;
  code: string;
}

interface AddressData {
  country: string;
  state: string;
  city: string;
  postalCode: string;
  address: string;
}

interface AddressSectionProps {
  value: AddressData;
  onChange: (address: AddressData) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function AddressSection({ 
  value, 
  onChange, 
  placeholder = "Seleccionar dirección...",
  disabled = false
}: AddressSectionProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load countries on component mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/locations/countries');
        const data = await response.json();
        setCountries(data);
        
        // Set default country to Argentina only if no country is set
        if (data.length > 0 && !value.country) {
          const argentina = data.find((c: Country) => c.code === 'AR');
          if (argentina) {
            onChange({
              ...value,
              country: argentina.code
            });
          }
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      }
    };

    fetchCountries();
  }, []);

  // Initialize city search with existing city value
  useEffect(() => {
    if (value.city && !citySearch) {
      setCitySearch(value.city);
    }
  }, [value.city, citySearch]);

  // Load states when component mounts with existing country data
  useEffect(() => {
    if (value.country && countries.length > 0) {
      const fetchStates = async () => {
        try {
          const response = await fetch(`/api/locations/states?country=${value.country}`);
          const data = await response.json();
          setStates(data);
        } catch (error) {
          console.error('Error fetching states:', error);
        }
      };
      fetchStates();
    }
  }, [value.country, countries.length]);

  // Handle state name to code conversion when states are loaded
  useEffect(() => {
    if (value.state && states.length > 0) {
      // Check if the state value is a name instead of a code
      // Also handle different formats like "río_negro" -> "Río Negro"
      const stateByName = states.find(s => 
        s.name === value.state || 
        s.name.toLowerCase().replace(/\s+/g, '_') === value.state.toLowerCase() ||
        s.code === value.state
      );
      
      if (stateByName && stateByName.code !== value.state) {
        // Only update the state code, preserve all other fields
        onChange({
          ...value,
          state: stateByName.code
        });
      }
    }
  }, [value.state, states, onChange]);

  // Load cities when component mounts with existing state data
  useEffect(() => {
    if (value.country && value.state && countries.length > 0) {
      const fetchCities = async () => {
        try {
          const response = await fetch(`/api/locations/cities?country=${value.country}&state=${value.state}&limit=500`);
          const data = await response.json();
          const citiesData = data.cities || data;
          setCities(citiesData);
          setFilteredCities(citiesData);
        } catch (error) {
          console.error('Error fetching cities:', error);
        }
      };
      fetchCities();
    }
  }, [value.country, value.state, countries.length]);

  // Load states when country changes (only reset fields if this is a user-initiated change)
  useEffect(() => {
    if (value.country) {
      const fetchStates = async () => {
        setLoadingStates(true);
        try {
          const response = await fetch(`/api/locations/states?country=${value.country}`);
          const data = await response.json();
          setStates(data);
          
          // Only reset fields if this is a user-initiated country change
          // Don't reset if we're just loading data for existing values
          if (isInitialLoad) {
            // This is initial data loading, don't reset existing values
            setIsInitialLoad(false);
            return;
          }
          
          // This is a user-initiated change, reset dependent fields
          onChange({
            ...value,
            state: '',
            city: '',
            postalCode: '',
            address: ''
          });
        } catch (error) {
          console.error('Error fetching states:', error);
        } finally {
          setLoadingStates(false);
        }
      };

      fetchStates();
    } else {
      setStates([]);
      setCities([]);
    }
  }, [value.country]);

  // Load cities when state changes (only reset fields if this is a user-initiated change)
  useEffect(() => {
    if (value.state && value.country) {
      const fetchCities = async () => {
        setLoadingCities(true);
        try {
          // value.state now contains the state code directly
          const response = await fetch(`/api/locations/cities?country=${value.country}&state=${value.state}&limit=500`);
          const data = await response.json();
          
          // Handle both old format (array) and new format (object with cities property)
          const citiesData = data.cities || data;
          setCities(citiesData);
          setFilteredCities(citiesData);
          
          // Only reset fields if this is a user-initiated state change
          // Don't reset if we're just loading data for existing values
          if (isInitialLoad) {
            // This is initial data loading, don't reset existing values
            return;
          }
          
          // This is a user-initiated change, reset dependent fields
          onChange({
            ...value,
            city: '',
            postalCode: '',
            address: ''
          });
        } catch (error) {
          console.error('Error fetching cities:', error);
          setCities([]);
          setFilteredCities([]);
        } finally {
          setLoadingCities(false);
        }
      };

      fetchCities();
    } else {
      setCities([]);
      setFilteredCities([]);
    }
  }, [value.state, value.country]);

  // Filter cities based on search
  useEffect(() => {
    if (citySearch) {
      const filtered = cities.filter(city =>
        city.name.toLowerCase().includes(citySearch.toLowerCase())
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities(cities);
    }
  }, [citySearch, cities]);

  const handleCountryChange = (countryCode: string) => {
    const selectedCountry = countries.find(c => c.code === countryCode);
    setIsInitialLoad(false); // Mark as user-initiated change
    onChange({
      ...value,
      country: countryCode, // Store the country code for consistency
      state: '',
      city: '',
      postalCode: '',
      address: ''
    });
  };

  const handleStateChange = (stateCode: string) => {
    setIsInitialLoad(false); // Mark as user-initiated change
    onChange({
      ...value,
      state: stateCode, // Store the state code/ID
      city: '',
      // Preserve postalCode and address when state changes
      postalCode: value.postalCode,
      address: value.address
    });
  };

  const handleCitySelect = (city: City) => {
    onChange({
      ...value,
      city: city.name // Store the actual city name instead of code
    });
    setCitySearch(city.name);
    setShowCityDropdown(false);
  };

  const handleCitySearchChange = (search: string) => {
    setCitySearch(search);
    setShowCityDropdown(true);
  };

  const getSelectedCountry = () => {
    // Handle both country code and country name
    return countries.find(c => c.code === value.country || c.name === value.country);
  };

  const getSelectedState = () => {
    // Handle both state code and state name
    return states.find(s => s.code === value.state || s.name === value.state);
  };

  const getSelectedCity = () => {
    return cities.find(c => c.name === value.city);
  };

  return (
    <div className="space-y-4">
      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          País *
        </label>
        <select
          value={value.country}
          onChange={(e) => handleCountryChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Seleccionar país</option>
          {countries.map((country) => (
            <option key={country.id} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {/* State */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Provincia/Estado *
        </label>
        <select
          value={value.state}
          onChange={(e) => handleStateChange(e.target.value)}
          disabled={disabled || !value.country || loadingStates}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">
            {loadingStates ? 'Cargando provincias...' : 'Seleccionar provincia/estado'}
          </option>
          {states.map((state) => (
            <option key={state.id} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
      </div>


      {/* City */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Ciudad *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={citySearch}
            onChange={(e) => handleCitySearchChange(e.target.value)}
            onFocus={() => setShowCityDropdown(true)}
            disabled={disabled || !value.state || loadingCities}
            placeholder={loadingCities ? 'Cargando ciudades...' : 'Buscar ciudad...'}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* City Dropdown */}
        {showCityDropdown && filteredCities.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredCities.map((city) => (
              <button
                key={city.id}
                onClick={() => handleCitySelect(city)}
                className="w-full px-4 py-3 text-left text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
              >
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                  {city.name}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No cities found */}
        {showCityDropdown && filteredCities.length === 0 && citySearch && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
              No se encontraron ciudades
            </div>
          </div>
        )}
      </div>

      {/* Postal Code */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Código Postal
        </label>
        <input
          type="text"
          value={value.postalCode}
          onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
          disabled={disabled}
          placeholder="Ej: 1000"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Dirección *
        </label>
        <input
          type="text"
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          disabled={disabled}
          placeholder="Ej: Av. Corrientes 1234"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Address Summary */}
      {(value.country || value.state || value.city || value.address) && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Resumen de la dirección:
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {[
              value.address,
              getSelectedCity()?.name,
              getSelectedState()?.name,
              getSelectedCountry()?.name || (value.country === 'AR' ? 'Argentina' : value.country)
            ].filter(Boolean).join(', ')}
            {value.postalCode && ` (${value.postalCode})`}
          </p>
        </div>
      )}
    </div>
  );
}
