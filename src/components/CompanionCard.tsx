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
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-300 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group">
      <div>
        {/* Top Header & Avatar */}
        <div className="p-5 pb-3">
          <div className="flex items-start gap-3.5">
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md overflow-hidden">
                {companion.avatar_url ? (
                  <img
                    src={companion.avatar_url}
                    alt={companion.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  companion.display_name.slice(0, 2).toUpperCase()
                )}
              </div>
              {companion.is_available && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Available" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-gray-900 text-base truncate group-hover:text-indigo-600 transition-colors">
                  {companion.display_name}
                </h3>
                {companion.verification_status === 'verified' && (
                  <span title="Verified Identity" className="inline-flex">
                    <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                  </span>
                )}
              </div>

              {/* Location & Distance */}
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{companion.city || 'Coverage Area Available'}</span>
                {distance !== null && (
                  <span className="text-indigo-600 font-semibold text-[11px] ml-1">
                    ({distance} km away)
                  </span>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 mt-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{companion.rating ? companion.rating.toFixed(1) : 'New'}</span>
                {companion.reviews_count ? (
                  <span className="text-gray-400 font-normal">({companion.reviews_count})</span>
                ) : null}
              </div>
            </div>

            {/* Rate Tag */}
            <div className="text-right shrink-0">
              <div className="text-base font-extrabold text-indigo-700">
                ₹{companion.hourly_rate || 500}
              </div>
              <div className="text-[10px] text-gray-400 font-medium">/ hour</div>
            </div>
          </div>

          {/* Bio Snippet */}
          <p className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed">
            {companion.bio || 'Friendly, professional companion available for social events and activities.'}
          </p>

          {/* Services & Languages Pills */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(companion.services || ['Companionship']).slice(0, 3).map((service) => (
              <span
                key={service}
                className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-gray-100 text-gray-700"
              >
                {service}
              </span>
            ))}
            {(companion.languages || ['English']).slice(0, 2).map((lang) => (
              <span
                key={lang}
                className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-indigo-50 text-indigo-700 flex items-center gap-1"
              >
                <Globe className="w-2.5 h-2.5" />
                {lang}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Card Footer: Payment Options & CTA */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
        <div className="text-[11px] text-gray-600 font-medium flex items-center gap-1.5">
          <Banknote className="w-3.5 h-3.5 text-gray-400" />
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
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-200/70 rounded-xl transition-colors"
          >
            Details
          </button>
          <button
            onClick={() => onBook(companion)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
};
