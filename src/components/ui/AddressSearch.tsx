'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

interface AddressResult {
  display_name: string;
  city?: string;
  state?: string;
  country?: string;
  cityId?: string;
  stateId?: string;
}

interface AddressSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: AddressResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showSearchIcon?: boolean;
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

export default function AddressSearch({
  value,
  onChange,
  onSelect,
  placeholder = "ELEGÍ TU DESTINO",
  className = "",
  disabled = false,
  showSearchIcon = true
}: AddressSearchProps) {
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [stateSearchTerm, setStateSearchTerm] = useState<string>('');
  const [citySearchTerm, setCitySearchTerm] = useState<string>('');
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [filteredStates, setFilteredStates] = useState<State[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const lastSelectionRef = useRef<{ state: string; city: string } | null>(null);
  const parsedValueRef = useRef<string>('');

  // Load states on component mount
  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const response = await fetch('/api/locations/states?country=AR');
        const data = await response.json();
        const statesData = data.states || data;
        setStates(statesData);
        setFilteredStates(statesData);
      } catch (error) {
        console.error('Error fetching states:', error);
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, []);

  // Filter states based on search term
  useEffect(() => {
    if (stateSearchTerm.trim() === '') {
      setFilteredStates(states);
    } else {
      const filtered = states.filter(state =>
        state.name.toLowerCase().includes(stateSearchTerm.toLowerCase())
      );
      setFilteredStates(filtered);
    }
  }, [stateSearchTerm, states]);

  // Load cities when state changes
  useEffect(() => {
    if (selectedState) {
      const fetchCities = async () => {
        setLoadingCities(true);
        try {
          const response = await fetch(`/api/locations/cities?country=AR&state=${selectedState}&limit=500`);
          const data = await response.json();
          const citiesData = data.cities || data;
          setCities(citiesData);
          setFilteredCities(citiesData);
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
      setSelectedCity('');
      setCitySearchTerm('');
    }
  }, [selectedState]);

  // Filter cities based on search term
  useEffect(() => {
    if (citySearchTerm.trim() === '') {
      setFilteredCities(cities);
    } else {
      const filtered = cities.filter(city =>
        city.name.toLowerCase().includes(citySearchTerm.toLowerCase())
      );
      setFilteredCities(filtered);
    }
  }, [citySearchTerm, cities]);

  // Update value and call onSelect when city is selected
  useEffect(() => {
    // Only proceed if we have both state and city selected
    if (selectedState && selectedCity && states.length > 0 && cities.length > 0) {
      const stateObj = states.find(s => s.code === selectedState);
      const cityObj = cities.find(c => c.id === selectedCity || c.name === selectedCity);
      
      if (stateObj && cityObj) {
        // Check if this selection is different from the last one
        const currentSelection = `${selectedState}-${selectedCity}`;
        const lastSelection = lastSelectionRef.current 
          ? `${lastSelectionRef.current.state}-${lastSelectionRef.current.city}`
          : null;
        
        if (currentSelection !== lastSelection) {
          const displayName = `${cityObj.name}, ${stateObj.name}`;
          onChange(displayName);
          onSelect({
            display_name: displayName,
            city: cityObj.name,
            state: stateObj.name,
            country: 'Argentina',
            cityId: cityObj.id,
            stateId: stateObj.id
          });
          lastSelectionRef.current = { state: selectedState, city: selectedCity };
        }
      }
    } else if (!selectedState && !selectedCity) {
      // Only clear if we had a previous selection
      if (lastSelectionRef.current) {
        onChange('');
        onSelect({
          display_name: '',
          city: undefined,
          state: undefined,
          country: undefined
        });
        lastSelectionRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, selectedCity, states, cities]);

  // Parse existing value to set state and city if possible
  useEffect(() => {
    // Only parse if value changed and we haven't parsed it yet, and no selection is made
    if (value && value !== parsedValueRef.current && states.length > 0 && !selectedState && !selectedCity) {
      // Try to parse "City, State" format
      const parts = value.split(',').map(p => p.trim());
      if (parts.length === 2) {
        const [cityName, stateName] = parts;
        const stateObj = states.find(s => s.name === stateName);
        if (stateObj) {
          parsedValueRef.current = value;
          setSelectedState(stateObj.code);
          setStateSearchTerm(stateObj.name);
          // City will be set when cities are loaded
          setTimeout(() => {
            const cityObj = cities.find(c => c.name === cityName);
            if (cityObj) {
              setSelectedCity(cityObj.id);
              setCitySearchTerm(cityObj.name);
            }
          }, 100);
        }
      }
    } else if (!value) {
      // Reset parsed value ref when value is cleared
      parsedValueRef.current = '';
    }
  }, [value, states, cities, selectedState, selectedCity]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        stateDropdownRef.current &&
        !stateDropdownRef.current.contains(target)
      ) {
        setShowStateDropdown(false);
      }
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(target)
      ) {
        setShowCityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleStateSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStateSearchTerm(e.target.value);
    setShowStateDropdown(true);
  };

  const handleStateSelect = (state: State) => {
    setSelectedState(state.code);
    setStateSearchTerm(state.name);
    setShowStateDropdown(false);
    setSelectedCity('');
    setCitySearchTerm('');
  };

  const handleCitySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCitySearchTerm(e.target.value);
    setShowCityDropdown(true);
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city.id);
    setCitySearchTerm(city.name);
    setShowCityDropdown(false);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* State Searchable Dropdown */}
      <div className="flex-1 relative" ref={stateDropdownRef}>
        <div className="relative">
          {showSearchIcon && (
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
          )}
          <input
            type="text"
            value={stateSearchTerm}
            onChange={handleStateSearchChange}
            onFocus={() => setShowStateDropdown(true)}
            placeholder="Provincia"
            disabled={disabled || loadingStates}
            className={`w-full ${showSearchIcon ? 'pl-10' : 'pl-4'} pr-10 py-3 rounded-xl border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none transition-transform ${showStateDropdown ? 'rotate-180' : ''}`} />
          {loadingStates && (
            <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
        
        {/* State Dropdown */}
        {showStateDropdown && !loadingStates && filteredStates.length > 0 && (
          <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredStates.map((state) => (
              <button
                key={state.id}
                type="button"
                onClick={() => handleStateSelect(state)}
                className={`w-full px-4 py-3 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none ${
                  selectedState === state.code ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
              >
                {state.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* City Searchable Dropdown */}
      <div className="flex-1 relative" ref={cityDropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={citySearchTerm}
            onChange={handleCitySearchChange}
            onFocus={() => selectedState && setShowCityDropdown(true)}
            placeholder={!selectedState ? "Selecciona provincia primero" : "Ciudad"}
            disabled={disabled || !selectedState || loadingCities}
            className="w-full pl-4 pr-10 py-3 rounded-xl border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
          {loadingCities && (
            <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
        
        {/* City Dropdown */}
        {showCityDropdown && selectedState && !loadingCities && filteredCities.length > 0 && (
          <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredCities.slice(0, 100).map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => handleCitySelect(city)}
                className={`w-full px-4 py-3 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none ${
                  selectedCity === city.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
              >
                {city.name}
              </button>
            ))}
            {filteredCities.length > 100 && (
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                Mostrando las primeras 100 ciudades. Usa la búsqueda para filtrar.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
