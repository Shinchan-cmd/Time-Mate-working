import React from 'react';
import { Banknote, CheckCircle, Clock, Globe, MapPin, Shield, Star, Zap } from 'lucide-react';
import { Profile } from '../types';
import { useLocation } from '../context/LocationContext';

interface CompanionCardProps {
  companion: Profile;
  onSelect: (companion: Profile) => void;
  onBook: (companion: Profile) => void;
}

export const CompanionCard: React.FC<CompanionCardProps> = ({ companion, onSelect, onBook }) => {
  const { calculateDistanceKm } = useLocation();

  const distance = companion.latitude && companion.longitude
    ? calculateDistanceKm(companion.latitude, companion.longitude)
    : null;

  const onlineEnabled = companion.payment_settings?.online_enabled && !!companion.payment_settings.upi_id;
  const cashEnabled = companion.payment_settings?.cash_enabled ?? true;

  return (
    <div className="bg-[#121214] rounded-2xl border border-zinc-800 hover:border-pink-500/50 shadow-xs hover:shadow-[0_0_20px_rgba(255,45,141,0.2)] transition-all flex flex-col justify-between overflow-hidden group">
      <div>
        {/* Top Header & Avatar */}
        <div className="p-5 pb-3">
          <div className="flex items-start gap-3.5">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-pink-500/30 text-white flex items-center justify-center font-bold text-lg shadow-md overflow-hidden">
                {companion.avatar_url ? (
                  <img
                    src={companion.avatar_url}
                    alt={companion.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-pink-400 font-bold">
                    {companion.display_name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              {companion.is_available && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#121214] rounded-full shadow-[0_0_6px_#10b981]" title="Available" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white text-base truncate group-hover:text-pink-400 transition-colors">
                  {companion.display_name}
                </h3>
                {companion.verification_status === 'verified' && (
                  <span title="Verified Identity" className="inline-flex">
                    <Shield className="w-4 h-4 text-pink-400 shrink-0" />
                  </span>
                )}
              </div>

              {/* Location & Distance */}
              <div className="flex items-center gap-1 text-xs text-zinc-400 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">{companion.city || 'Coverage Area Available'}</span>
                {distance !== null && (
                  <span className="text-pink-400 font-semibold text-[11px] ml-1">
                    ({distance} km away)
                  </span>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-400 mt-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{companion.rating ? companion.rating.toFixed(1) : 'New'}</span>
                {companion.reviews_count ? (
                  <span className="text-zinc-500 font-normal">({companion.reviews_count})</span>
                ) : null}
              </div>
            </div>

            {/* Rate Tag */}
            <div className="text-right shrink-0">
              <div className="text-base font-extrabold text-pink-400">
                ₹{companion.hourly_rate || 500}
              </div>
              <div className="text-[10px] text-zinc-500 font-medium">/ hour</div>
            </div>
          </div>

          {/* Bio Snippet */}
          <p className="text-xs text-zinc-400 mt-3 line-clamp-2 leading-relaxed">
            {companion.bio || 'Friendly, professional companion available for social events and activities.'}
          </p>

          {/* Services & Languages Pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(companion.services || ['Companionship']).slice(0, 3).map((service) => (
              <span
                key={service}
                className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300"
              >
                {service}
              </span>
            ))}
            {(companion.languages || ['English']).slice(0, 2).map((lang) => (
              <span
                key={lang}
                className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-pink-500/10 text-pink-300 border border-pink-500/20 flex items-center gap-1"
              >
                <Globe className="w-2.5 h-2.5" />
                {lang}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer: Payment Options & CTA */}
      <div className="px-5 py-3 bg-[#0a0a0c] border-t border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
          <Banknote className="w-3.5 h-3.5 text-zinc-500" />
          <span>
            {onlineEnabled && cashEnabled
              ? 'Cash & Online'
              : onlineEnabled
              ? 'Online only'
              : 'Cash only'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(companion)}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors cursor-pointer"
          >
            Details
          </button>
          <button
            onClick={() => onBook(companion)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-pink-600 hover:bg-pink-500 active:opacity-90 rounded-xl shadow-[0_0_12px_rgba(255,45,141,0.35)] transition-all cursor-pointer"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
};
