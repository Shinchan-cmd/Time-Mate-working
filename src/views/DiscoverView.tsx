import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  Clock,
  Filter,
  Map,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { Profile, UserRole } from '../types';
import { getSupabaseClient, parseProfileRecord } from '../lib/supabase';
import { CompanionCard } from '../components/CompanionCard';
import { CompanionDetailModal } from '../components/CompanionDetailModal';
import { BookingModal } from '../components/BookingModal';
import { InteractiveMap } from '../components/InteractiveMap';
import { useLocation, POPULAR_LOCATIONS } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';

interface DiscoverViewProps {
  onOpenAuth: (mode?: 'login' | 'signup', role?: UserRole) => void;
  onOpenMessageWith: (companion: Profile) => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({ onOpenAuth, onOpenMessageWith }) => {
  const { isAuthenticated } = useAuth();
  const { location } = useLocation();

  const [companions, setCompanions] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(3000);
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Modals
  const [selectedCompanion, setSelectedCompanion] = useState<Profile | null>(null);
  const [bookingCompanion, setBookingCompanion] = useState<Profile | null>(null);

  const fetchCompanions = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'companion');

      if (error) {
        // If table is not yet created in Supabase SQL editor or schema is empty, treat gracefully as empty catalog
        if (
          error.message?.includes('schema cache') ||
          error.message?.includes('does not exist') ||
          error.code === 'PGRST116' ||
          error.code === '42P01'
        ) {
          setCompanions([]);
          setErrorMessage(null);
        } else {
          setCompanions([]);
        }
      } else {
        const parsed = (data || []).map(parseProfileRecord);
        setCompanions(parsed);
      }
    } catch {
      setCompanions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanions();
  }, []);

  // Filter companions
  const filteredCompanions = useMemo(() => {
    return companions.filter((comp) => {
      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = comp.display_name.toLowerCase().includes(q);
        const matchesBio = (comp.bio || '').toLowerCase().includes(q);
        const matchesCity = (comp.city || '').toLowerCase().includes(q);
        const matchesServices = (comp.services || []).some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesBio && !matchesCity && !matchesServices) {
          return false;
        }
      }

      // City filter
      if (selectedCity !== 'all') {
        if (!comp.city || !comp.city.toLowerCase().includes(selectedCity.toLowerCase())) {
          return false;
        }
      }

      // Price filter
      const rate = comp.hourly_rate || 500;
      if (rate > maxPrice) {
        return false;
      }

      // Availability
      if (onlyAvailable && !comp.is_available) {
        return false;
      }

      return true;
    });
  }, [companions, searchQuery, selectedCity, maxPrice, onlyAvailable]);

  const handleBook = (companion: Profile) => {
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }
    setBookingCompanion(companion);
  };

  const handleMessage = (companion: Profile) => {
    if (!isAuthenticated) {
      onOpenAuth('login');
      return;
    }
    setSelectedCompanion(null);
    onOpenMessageWith(companion);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-semibold mb-3">
            <span>₹0 Platform Fee on All Bookings</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Discover Verified Companions
          </h1>
          <p className="text-indigo-200 text-xs sm:text-sm mt-2 leading-relaxed">
            Connect with verified companions for scheduled events, social dinners, city guidance, and friendly company. Filter by location, availability, and transparent hourly rates.
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs mb-8 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by companion name, languages, or services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs md:text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* City selector */}
          <div className="w-full md:w-56">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-gray-700"
            >
              <option value="all">All Locations</option>
              {POPULAR_LOCATIONS.map((loc) => (
                <option key={loc.city} value={loc.city}>
                  {loc.city} ({loc.state})
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0 self-end md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'grid' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                viewMode === 'map' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Map View
            </button>
          </div>
        </div>

        {/* Secondary Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Price slider */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Max Rate:</span>
              <input
                type="range"
                min="300"
                max="5000"
                step="100"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-28 sm:w-36 accent-indigo-600 cursor-pointer"
              />
              <span className="font-bold text-indigo-700">₹{maxPrice}/hr</span>
            </div>

            {/* Availability toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span>Available Today Only</span>
            </label>
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <span>{filteredCompanions.length} companions found</span>
            <button
              onClick={fetchCompanions}
              disabled={loading}
              className="p-1 hover:bg-gray-100 rounded text-gray-600"
              title="Refresh results"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering: Grid vs Map */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs text-gray-500 font-medium">
            Discovering verified companions near you...
          </p>
        </div>
      ) : filteredCompanions.length === 0 ? (
        /* Proper Empty State: NEVER FAKE COMPANIONS */
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-gray-900 text-base">
            No companions available in your selected area.
          </h3>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            There are currently no companion accounts registered matching your search filters in the database.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCity('all');
                setMaxPrice(5000);
                setOnlyAvailable(false);
              }}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl"
            >
              Reset Filters
            </button>
            <button
              onClick={() => onOpenAuth('signup', 'companion')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
            >
              Become the First Companion
            </button>
          </div>
        </div>
      ) : viewMode === 'map' ? (
        <div className="space-y-4">
          <InteractiveMap
            companions={filteredCompanions}
            userLocation={location}
            onSelectCompanion={(comp) => setSelectedCompanion(comp)}
            height="500px"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompanions.map((comp) => (
              <CompanionCard
                key={comp.id}
                companion={comp}
                onSelect={(c) => setSelectedCompanion(c)}
                onBook={(c) => handleBook(c)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanions.map((comp) => (
            <CompanionCard
              key={comp.id}
              companion={comp}
              onSelect={(c) => setSelectedCompanion(c)}
              onBook={(c) => handleBook(c)}
            />
          ))}
        </div>
      )}

      {/* Companion Detail Modal */}
      <CompanionDetailModal
        companion={selectedCompanion}
        isOpen={!!selectedCompanion}
        onClose={() => setSelectedCompanion(null)}
        onBook={(comp) => {
          setSelectedCompanion(null);
          handleBook(comp);
        }}
        onMessage={(comp) => handleMessage(comp)}
      />

      {/* Booking Modal */}
      <BookingModal
        companion={bookingCompanion}
        isOpen={!!bookingCompanion}
        onClose={() => setBookingCompanion(null)}
      />
    </div>
  );
};
