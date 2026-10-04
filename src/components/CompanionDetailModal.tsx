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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 my-auto max-h-[92vh] flex flex-col overflow-hidden">
        {/* Sticky Mobile & Desktop Top Bar with Back and Close */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-bold text-xs transition-colors cursor-pointer shadow-xs"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <span className="text-xs font-semibold text-gray-500 truncate max-w-[160px] sm:max-w-none">
            {companion.display_name}
          </span>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 hover:text-gray-900 transition-colors shadow-xs cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 md:p-8 space-y-6">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg overflow-hidden">
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
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" title="Currently Available" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                {companion.display_name}
              </h2>
              {companion.verification_status === 'verified' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                  <Shield className="w-3.5 h-3.5" />
                  Verified
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>{companion.city || 'Coverage Area Available'}</span>
                {distance !== null && (
                  <span className="text-indigo-600 font-semibold">({distance} km away)</span>
                )}
              </div>

              <div className="flex items-center gap-1 font-semibold text-amber-600">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{companion.rating ? companion.rating.toFixed(1) : 'New Companion'}</span>
                {companion.reviews_count ? (
                  <span className="text-gray-400 font-normal">({companion.reviews_count} reviews)</span>
                ) : null}
              </div>
            </div>

            <div className="mt-2 text-indigo-700 font-extrabold text-xl">
              ₹{companion.hourly_rate || 500}
              <span className="text-xs text-gray-500 font-normal ml-1">/ hour</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="py-6 space-y-6">
          {/* About / Bio */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
              About
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {companion.bio || 'Professional and courteous companion for scheduled activities, networking events, dinner company, and city guidance.'}
            </p>
          </div>

          {/* Services Offered */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
              Services Offered
            </h4>
            <div className="flex flex-wrap gap-2">
              {(companion.services || ['Social Gathering', 'Event Accompaniment', 'Conversation']).map((service) => (
                <span
                  key={service}
                  className="px-3 py-1 bg-gray-100 text-gray-800 rounded-xl text-xs font-medium"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
              Languages
            </h4>
            <div className="flex flex-wrap gap-2">
              {(companion.languages || ['English', 'Hindi']).map((lang) => (
                <span
                  key={lang}
                  className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-medium flex items-center gap-1"
                >
                  <Globe className="w-3 h-3" />
                  {lang}
                </span>
              ))}
            </div>
          </div>

          {/* Payment Methods Supported */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
              Accepted Payment Methods
            </h4>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-4 text-xs text-gray-700">
              <div className="flex items-center gap-1.5 font-semibold">
                <Banknote className="w-4 h-4 text-indigo-600" />
                {onlineEnabled && cashEnabled
                  ? 'Accepts Cash on Meetup & Online (UPI)'
                  : onlineEnabled
                  ? 'Online UPI Only'
                  : 'Cash on Meetup Only'}
              </div>
              <div className="ml-auto text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
                TimeMate Platform Fee: ₹0
              </div>
            </div>
          </div>

          {/* Coverage Map */}
          {companion.latitude && companion.longitude ? (
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                Service Coverage Location
              </h4>
              <InteractiveMap
                centerLat={companion.latitude}
                centerLng={companion.longitude}
                companions={[companion]}
                height="220px"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Directory
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={() => onMessage(companion)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Send Message
            </button>
            <button
              onClick={() => onBook(companion)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              Book {companion.display_name}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
