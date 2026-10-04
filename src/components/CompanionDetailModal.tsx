import React from 'react';
import {
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  MapPin,
  MessageSquare,
  Shield,
  Star,
  X,
} from 'lucide-react';
import { Profile } from '../types';
import { useLocation } from '../context/LocationContext';
import { InteractiveMap } from './InteractiveMap';

interface CompanionDetailModalProps {
  companion: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onBook: (companion: Profile) => void;
  onMessage: (companion: Profile) => void;
}

export const CompanionDetailModal: React.FC<CompanionDetailModalProps> = ({
  companion,
  isOpen,
  onClose,
  onBook,
  onMessage,
}) => {
  const { calculateDistanceKm } = useLocation();

  if (!isOpen || !companion) return null;

  const distance = companion.latitude && companion.longitude
    ? calculateDistanceKm(companion.latitude, companion.longitude)
    : null;

  const onlineEnabled = companion.payment_settings?.online_enabled && !!companion.payment_settings.upi_id;
  const cashEnabled = companion.payment_settings?.cash_enabled ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative bg-[#121214] rounded-2xl max-w-2xl w-full shadow-2xl border border-zinc-800 my-auto max-h-[92vh] flex flex-col overflow-hidden text-white">
        {/* Sticky Mobile & Desktop Top Bar with Back and Close */}
        <div className="sticky top-0 z-20 bg-[#121214]/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-zinc-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 font-bold text-xs transition-colors cursor-pointer shadow-xs"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <span className="text-xs font-semibold text-zinc-400 truncate max-w-[160px] sm:max-w-none">
            {companion.display_name}
          </span>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400 hover:text-white transition-colors shadow-xs cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 md:p-8 space-y-6">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-zinc-800">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-pink-500/40 text-white flex items-center justify-center font-bold text-2xl shadow-lg overflow-hidden">
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
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-[#121214] rounded-full shadow-[0_0_8px_#10b981]" title="Currently Available" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {companion.display_name}
                </h2>
                {companion.verification_status === 'verified' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-500/15 text-pink-300 border border-pink-500/30">
                    <Shield className="w-3.5 h-3.5 text-pink-400" />
                    Verified
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{companion.city || 'Coverage Area Available'}</span>
                  {distance !== null && (
                    <span className="text-pink-400 font-semibold">({distance} km away)</span>
                  )}
                </div>

                <div className="flex items-center gap-1 font-semibold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{companion.rating ? companion.rating.toFixed(1) : 'New Companion'}</span>
                  {companion.reviews_count ? (
                    <span className="text-zinc-500 font-normal">({companion.reviews_count} reviews)</span>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 text-pink-400 font-extrabold text-xl">
                ₹{companion.hourly_rate || 500}
                <span className="text-xs text-zinc-400 font-normal ml-1">/ hour</span>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="py-2 space-y-6">
            {/* About / Bio */}
            <div>
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                About
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                {companion.bio || 'Professional and courteous companion for scheduled activities, networking events, dinner company, and city guidance.'}
              </p>
            </div>

            {/* Services Offered */}
            <div>
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Services Offered
              </h4>
              <div className="flex flex-wrap gap-2">
                {(companion.services || ['Social Gathering', 'Event Accompaniment', 'Conversation']).map((service) => (
                  <span
                    key={service}
                    className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-medium rounded-xl"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Languages Spoken
              </h4>
              <div className="flex flex-wrap gap-2">
                {(companion.languages || ['English']).map((lang) => (
                  <span
                    key={lang}
                    className="px-3 py-1 bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-medium rounded-xl flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* Payment Capabilities */}
            <div className="p-4 bg-zinc-900/90 rounded-2xl border border-zinc-800">
              <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-pink-400" />
                Accepted Payment Methods
              </h4>
              <div className="flex flex-wrap gap-3 text-xs text-zinc-300">
                {cashEnabled && (
                  <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-lg">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    <span>Cash on Meeting</span>
                  </div>
                )}
                {onlineEnabled && (
                  <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-pink-400" />
                    <span>Direct Online / UPI Transfer</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 sm:p-6 bg-[#0c0c0e] border-t border-zinc-800 flex items-center justify-between gap-4">
          <button
            onClick={() => onMessage(companion)}
            className="flex-1 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs sm:text-sm rounded-xl border border-zinc-700 hover:border-zinc-600 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <MessageSquare className="w-4 h-4 text-pink-400" />
            <span>Chat / Message</span>
          </button>

          <button
            onClick={() => onBook(companion)}
            className="flex-1 py-3 px-4 bg-pink-600 hover:bg-pink-500 active:opacity-90 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_15px_rgba(255,45,141,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Companion</span>
          </button>
        </div>
      </div>
    </div>
  );
};
