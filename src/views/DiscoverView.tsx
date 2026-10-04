import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  Clock,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { Profile, UserRole } from '../types';
import { getSupabaseClient, parseProfileRecord } from '../lib/supabase';
import { CompanionCard } from '../components/CompanionCard';
import { CompanionDetailModal } from '../components/CompanionDetailModal';
import { BookingModal } from '../components/BookingModal';
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
      {/* Hero Banner with Neon Pink Glow */}
      <div className="bg-gradient-to-br from-[#1c0818] via-[#100c14] to-[#080808] border border-pink-500/25 rounded-3xl p-6 sm:p-10 text-white shadow-[0_0_30px_rgba(255,45,141,0.15)] mb-8 relative overflow-hidden">
        {/* Subtle decorative glow orb */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30 text-xs font-semibold mb-3 shadow-[0_0_10px_rgba(255,45,141,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>₹0 Platform Fee on All Bookings</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Discover Verified Companions
          </h1>
          <p className="text-zinc-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Connect with verified companions for scheduled events, social dinners, city guidance, and friendly company. Filter by location, availability, and transparent hourly rates.
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-[#121214] rounded-2xl border border-zinc-800 p-4 shadow-xs mb-8 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by companion name, languages, or services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
            />
          </div>

          {/* City selector */}
          <div className="w-full md:w-64">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
            >
              <option value="all">All Locations</option>
              {POPULAR_LOCATIONS.map((loc) => (
                <option key={loc.city} value={loc.city}>
                  {loc.city} ({loc.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Price slider */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-medium">Max Rate:</span>
              <input
                type="range"
                min="300"
                max="5000"
                step="100"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-24 sm:w-32 accent-pink-500 cursor-pointer"
              />
              <span className="font-bold text-pink-400 font-mono">₹{maxPrice}/hr</span>
            </div>

            {/* Availability checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 text-pink-500 rounded focus:ring-pink-500 border-zinc-700 bg-zinc-900"
              />
              <span className="text-zinc-300 font-medium">Available Now Only</span>
            </label>
          </div>

          {/* Result Count & Live Refresh */}
          <div className="flex items-center gap-2 text-zinc-400">
            <span>{filteredCompanions.length} companions found</span>
            <button
              onClick={fetchCompanions}
              disabled={loading}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded cursor-pointer transition-colors"
              title="Refresh results"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering: Companion Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs text-zinc-400 font-medium">
            Discovering verified companions near you...
          </p>
        </div>
      ) : filteredCompanions.length === 0 ? (
        <div className="bg-[#121214] rounded-3xl border border-zinc-800 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-white text-base">
            No companions available in your selected area.
          </h3>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
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
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
            >
              Reset Filters
            </button>
            <button
              onClick={() => onOpenAuth('signup', 'companion')}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-[0_0_12px_rgba(255,45,141,0.35)] transition-all"
            >
              Become the First Companion
            </button>
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
