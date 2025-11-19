'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Grid, List, Search, MapPin, DollarSign, Car, Zap, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { firebaseDB } from '@/services/firebaseService';
import { BasePost, ServiceCategory } from '@/types';
import PostCard from '@/components/ui/PostCard';
import { useRouter, useSearchParams } from 'next/navigation';

const VEHICULO_CATEGORIES: ServiceCategory[] = ['Alquiler de autos', 'Alquiler de bicicletas', 'Alquiler de kayaks'];

function VehiculosContent() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<BasePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 50000 });
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [citySearchTerm, setCitySearchTerm] = useState<string>('');
  const [filteredCities, setFilteredCities] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [maxPeopleFilter, setMaxPeopleFilter] = useState<string>('all');
  const [deliveryPointsFilter, setDeliveryPointsFilter] = useState<boolean>(false);
  const [childSeatFilter, setChildSeatFilter] = useState<boolean>(false);
  const [snowChainsFilter, setSnowChainsFilter] = useState<boolean>(false);
  const [countryPermissionFilter, setCountryPermissionFilter] = useState<boolean>(false);
  const [spareWheelFilter, setSpareWheelFilter] = useState<boolean>(false);
  const [gncFilter, setGncFilter] = useState<boolean>(false);
  const [helmetFilter, setHelmetFilter] = useState<boolean>(false);
  const [vestFilter, setVestFilter] = useState<boolean>(false);
  const [extraHoursFilter, setExtraHoursFilter] = useState<boolean>(false);
  const [lifeJacketFilter, setLifeJacketFilter] = useState<boolean>(false);
  const [paddlesFilter, setPaddlesFilter] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage] = useState(12);
  const router = useRouter();

  // Update category when URL changes
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  // Load states on component mount
  useEffect(() => {
    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const response = await fetch('/api/locations/states?country=AR');
        const data = await response.json();
        setStates(data.states || data);
      } catch (error) {
        console.error('Error fetching states:', error);
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, []);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.city-dropdown-container')) {
        setShowCityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get all posts and filter by vehículo categories
        const allPosts = await firebaseDB.posts.getAll();
        console.log('All posts:', allPosts.length);
        console.log('Sample post:', allPosts[0]);
        
        const vehiculoPosts = allPosts.filter(post => {
          const matchesCategory = VEHICULO_CATEGORIES.includes(post.category);
          // Only show published or approved posts - explicitly exclude draft, pending, rejected, and undefined/null
          const matchesStatus = post.status === 'published' || post.status === 'approved';
          const isEnabled = post.isEnabled !== false; // Default to true if undefined
          
          console.log('Post filter:', {
            title: post.title,
            category: post.category,
            matchesCategory,
            status: post.status,
            matchesStatus,
            isEnabled: post.isEnabled,
            passes: matchesCategory && matchesStatus && isEnabled
          });
          
          return matchesCategory && matchesStatus && isEnabled;
        });
        
        console.log('Filtered vehículo posts:', vehiculoPosts.length);
        setPosts(vehiculoPosts);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchTerm === '' || 
                         post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Location filtering based on address structure
    const matchesLocation = () => {
      // If no location filters are selected, show all posts
      if (!selectedState && !selectedCity) return true;
      
      // Check if post has address structure
      if (post.address) {
        // For state: compare with both state code and state name to support both old and new data
        const selectedStateObj = states.find(s => s.code === selectedState);
        const stateMatch = !selectedState || 
                          post.address.state === selectedState || // Match by code (e.g., "buenos_aires")
                          post.address.state === selectedStateObj?.name; // Match by name (e.g., "Buenos Aires")
        
        const cityMatch = !selectedCity || post.address.city === selectedCity;
        return stateMatch && cityMatch;
      }
      
      // Fallback to old location string matching
      const locationString = post.location.toLowerCase();
      const selectedStateObj = states.find(s => s.code === selectedState);
      const stateMatch = !selectedState || 
                        locationString.includes(selectedState.toLowerCase()) ||
                        (selectedStateObj && locationString.includes(selectedStateObj.name.toLowerCase()));
      const cityMatch = !selectedCity || locationString.includes(selectedCity.toLowerCase());
      return stateMatch && cityMatch;
    };
    
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    
    const matchesPrice = post.price >= priceRange.min && post.price <= priceRange.max;
    
    
    // New vehicle-specific filters
    const matchesMaxPeople = maxPeopleFilter === 'all' || 
                            (post.specificFields?.maxPeople && Number(post.specificFields.maxPeople) >= Number(maxPeopleFilter));
    
    const matchesDeliveryPoints = !deliveryPointsFilter || post.specificFields?.deliveryPoints === true;
    const matchesChildSeat = !childSeatFilter || post.specificFields?.childSeat === true;
    const matchesSnowChains = !snowChainsFilter || post.specificFields?.snowChains === true;
    const matchesCountryPermission = !countryPermissionFilter || post.specificFields?.countryPermission === true;
    const matchesSpareWheel = !spareWheelFilter || post.specificFields?.spareWheel === true;
    const matchesGnc = !gncFilter || post.specificFields?.gnc === true;
    const matchesHelmet = !helmetFilter || post.specificFields?.helmet === true;
    const matchesVest = !vestFilter || post.specificFields?.vest === true;
    const matchesExtraHours = !extraHoursFilter || post.specificFields?.extraHours === true;
    const matchesLifeJacket = !lifeJacketFilter || post.specificFields?.lifeJacket === true;
    const matchesPaddles = !paddlesFilter || post.specificFields?.paddles === true;
    
    return matchesSearch && matchesLocation() && matchesCategory && matchesPrice && 
           matchesMaxPeople && matchesDeliveryPoints && matchesChildSeat && matchesSnowChains &&
           matchesCountryPermission && matchesSpareWheel && matchesGnc && matchesHelmet &&
           matchesVest && matchesExtraHours && matchesLifeJacket && matchesPaddles;
  });

  // Pagination
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePostClick = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  const handleCitySelect = (city: any) => {
    setSelectedCity(city.name);
    setCitySearchTerm(city.name);
    setShowCityDropdown(false);
  };

  const handleCitySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCitySearchTerm(value);
    setShowCityDropdown(true);
    
    // If user clears the input, clear the selection
    if (value === '') {
      setSelectedCity('');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Vehículos
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Alquila el vehículo perfecto para tu aventura
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:w-80 flex-shrink-0"
          >
            <div className="glass rounded-xl p-6 sticky top-8 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Filtros
              </h2>

              {/* Text Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Location Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Ubicación
                </label>
                <div className="space-y-3">
                  {/* State Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Provincia/Estado
                    </label>
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        setSelectedCity(''); // Reset city when state changes
                      }}
                      disabled={loadingStates}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                    >
                      <option value="">Seleccionar provincia/estado</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.code}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                    {loadingStates && (
                      <p className="text-xs text-gray-500 mt-1">Cargando provincias...</p>
                    )}
                  </div>

                  {/* City Filter */}
                  <div className="relative city-dropdown-container">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Ciudad
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={citySearchTerm}
                        onChange={handleCitySearchChange}
                        onFocus={() => setShowCityDropdown(true)}
                        placeholder={!selectedState ? "Selecciona una provincia primero" : "Buscar ciudad..."}
                        disabled={!selectedState || loadingCities}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                      />
                      
                      {/* Dropdown */}
                      {showCityDropdown && selectedState && !loadingCities && filteredCities.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredCities.slice(0, 50).map((city) => (
                            <button
                              key={city.id}
                              type="button"
                              onClick={() => handleCitySelect(city)}
                              className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                            >
                              {city.name}
                            </button>
                          ))}
                          {filteredCities.length > 50 && (
                            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                              Mostrando las primeras 50 ciudades. Usa la búsqueda para filtrar.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {loadingCities && (
                      <p className="text-xs text-gray-500 mt-1">Cargando ciudades...</p>
                    )}
                    {!selectedState && (
                      <p className="text-xs text-gray-500 mt-1">Selecciona una provincia primero</p>
                    )}
                    {selectedState && !loadingCities && cities.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No se encontraron ciudades</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Car className="w-4 h-4 inline mr-1" />
                  Tipo de Vehículo
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">Todos los tipos</option>
                  {VEHICULO_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Rango de Precio
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Desde:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatPrice(priceRange.min)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="500"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Hasta:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatPrice(priceRange.max)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="500"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>


              {/* Max People Filter (for all vehicles) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Cantidad de Personas
                </label>
                <select
                  value={maxPeopleFilter}
                  onChange={(e) => setMaxPeopleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">Cualquier cantidad</option>
                  <option value="1">1+ personas</option>
                  <option value="2">2+ personas</option>
                  <option value="4">4+ personas</option>
                  <option value="6">6+ personas</option>
                  <option value="8">8+ personas</option>
                </select>
              </div>

              {/* Vehicle-specific checkboxes */}
              {selectedCategory === 'Alquiler de autos' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Servicios Adicionales
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={deliveryPointsFilter}
                        onChange={(e) => setDeliveryPointsFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Entrega en puntos a convenir</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={childSeatFilter}
                        onChange={(e) => setChildSeatFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Silla para niños</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={snowChainsFilter}
                        onChange={(e) => setSnowChainsFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Cadenas para nieve</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={countryPermissionFilter}
                        onChange={(e) => setCountryPermissionFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Permiso para salir del país</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={spareWheelFilter}
                        onChange={(e) => setSpareWheelFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Rueda de auxilio</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={gncFilter}
                        onChange={(e) => setGncFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">GNC</span>
                    </label>
                  </div>
                </div>
              )}

              {selectedCategory === 'Alquiler de bicicletas' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Servicios Adicionales
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={deliveryPointsFilter}
                        onChange={(e) => setDeliveryPointsFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Entrega en puntos a convenir</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={helmetFilter}
                        onChange={(e) => setHelmetFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Casco</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={vestFilter}
                        onChange={(e) => setVestFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Chaleco</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={extraHoursFilter}
                        onChange={(e) => setExtraHoursFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Horas extras</span>
                    </label>
                  </div>
                </div>
              )}

              {selectedCategory === 'Alquiler de kayaks' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Servicios Adicionales
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={deliveryPointsFilter}
                        onChange={(e) => setDeliveryPointsFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Entrega en puntos a convenir</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={lifeJacketFilter}
                        onChange={(e) => setLifeJacketFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Poncho salvavidas</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={paddlesFilter}
                        onChange={(e) => setPaddlesFilter(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Remos y salvaremos</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Reset Filters */}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedState('');
                  setSelectedCity('');
                  setCitySearchTerm('');
                  setShowCityDropdown(false);
                  setSelectedCategory('all');
                  setPriceRange({ min: 0, max: 50000 });
                  setMaxPeopleFilter('all');
                  setDeliveryPointsFilter(false);
                  setChildSeatFilter(false);
                  setSnowChainsFilter(false);
                  setCountryPermissionFilter(false);
                  setSpareWheelFilter(false);
                  setGncFilter(false);
                  setHelmetFilter(false);
                  setVestFilter(false);
                  setExtraHoursFilter(false);
                  setLifeJacketFilter(false);
                  setPaddlesFilter(false);
                }}
                className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </motion.aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Top Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass rounded-xl p-6 mb-6"
            >
              <div className="flex items-center justify-between">
                <p className="text-gray-600 dark:text-gray-300">
                  {filteredPosts.length} {filteredPosts.length === 1 ? 'vehículo encontrado' : 'vehículos encontrados'}
                </p>
                
                {/* View Mode Toggle */}
                <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Results */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {error ? (
                <div className="glass rounded-xl p-12 text-center">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition-all duration-300"
                  >
                    Reintentar
                  </button>
                </div>
              ) : currentPosts.length === 0 ? (
                <div className="glass rounded-xl p-12 text-center">
                  <Car className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No se encontraron vehículos
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Intenta ajustar los filtros de búsqueda
                  </p>
                </div>
              ) : (
                <>
                  {/* Posts Grid/List */}
                  <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                    : 'space-y-4'
                  }>
                    {currentPosts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                      >
                        <PostCard 
                          post={post} 
                          onClick={() => handlePostClick(post.id)}
                          showStatus={false}
                          imageHeight="md"
                        />
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-8">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => handlePageChange(pageNumber)}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              currentPage === pageNumber
                                ? 'bg-primary text-white'
                                : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Posts Count */}
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                    Mostrando {indexOfFirstPost + 1}-{Math.min(indexOfLastPost, filteredPosts.length)} de {filteredPosts.length}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VehiculosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    }>
      <VehiculosContent />
    </Suspense>
  );
}