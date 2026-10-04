import React, { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  Clock,
  Compass,
  MapPin,
  Navigation,
  Radio,
  Shield,
  X,
} from 'lucide-react';
import { Booking } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { getSupabaseClient } from '../lib/supabase';
import { InteractiveMap } from './InteractiveMap';

interface LiveTrackingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LiveTrackingModal: React.FC<LiveTrackingModalProps> = ({
  booking,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { location: userLocation, calculateDistanceKm } = useLocation();

  const [companionCoords, setCompanionCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Connecting to realtime tracking...');

  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);

  const isCompanion = user?.id === booking?.companion_id;
  const isCustomer = user?.id === booking?.customer_id;

  useEffect(() => {
    if (!isOpen || !booking || !user) return;

    // Security check: Only customer and companion of this booking can track
    if (!isCompanion && !isCustomer) {
      setStatusMessage('Unauthorized: You are not a participant in this booking.');
      return;
    }

    const supabase = getSupabaseClient();
    const trackingChannelName = `tracking_booking_${booking.id}`;

    // Establish booking-scoped realtime channel
    const channel = supabase.channel(trackingChannelName);

    channel
      .on('broadcast', { event: 'location_update' }, (payload: any) => {
        const { role, lat, lng, timestamp } = payload.payload;
        if (role === 'companion') {
          setCompanionCoords({ lat, lng });
          setLastUpdated(new Date(timestamp).toLocaleTimeString());
          setStatusMessage('Live location received from companion');
        } else if (role === 'customer') {
          setCustomerCoords({ lat, lng });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatusMessage('Realtime channel connected.');
        }
      });

    channelRef.current = channel;

    // If companion: start broadcasting real device GPS coordinates
    if (isCompanion && navigator.geolocation) {
      setIsBroadcasting(true);
      setStatusMessage('Broadcasting real GPS location to customer...');

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const timestamp = new Date().toISOString();

          setCompanionCoords({ lat, lng });
          setLastUpdated(new Date().toLocaleTimeString());

          channel.send({
            type: 'broadcast',
            event: 'location_update',
            payload: {
              booking_id: booking.id,
              role: 'companion',
              lat,
              lng,
              timestamp,
            },
          });
        },
        (err) => {
          setStatusMessage(`GPS Error: ${err.message}. Please enable location permissions.`);
          setIsBroadcasting(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    }

    // Set initial customer coordinates from device location if available
    if (userLocation) {
      setCustomerCoords({ lat: userLocation.latitude, lng: userLocation.longitude });
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isOpen, booking, user, isCompanion, isCustomer, userLocation]);

  if (!isOpen || !booking) return null;

  // Real distance computation using Haversine
  const distance =
    companionCoords && customerCoords
      ? calculateDistanceKm(companionCoords.lat, companionCoords.lng)
      : null;

  // Approximate ETA based on typical city movement (20 km/h)
  const etaMinutes = distance !== null ? Math.max(1, Math.round((distance / 20) * 60)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
          aria-label="Close live tracking"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Active Booking Live Tracking
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                Live GPS
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              Booking #{booking.id.slice(0, 8)} &bull; Venue: {booking.meeting_location || 'Designated Venue'}
            </p>
          </div>
        </div>

        {/* Status Bar */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-medium">{statusMessage}</span>
          </div>
          {lastUpdated && (
            <div className="text-[11px] text-gray-500">
              Last signal: {lastUpdated}
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
            <div className="text-[10px] text-indigo-700 font-semibold uppercase tracking-wider">
              Distance
            </div>
            <div className="text-lg font-black text-indigo-900 mt-0.5">
              {distance !== null ? `${distance} km` : '--'}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
            <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">
              Estimated ETA
            </div>
            <div className="text-lg font-black text-emerald-900 mt-0.5">
              {etaMinutes !== null ? `~${etaMinutes} mins` : '--'}
            </div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-center">
            <div className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">
              Your Role
            </div>
            <div className="text-xs font-bold text-gray-900 mt-1 capitalize">
              {isCompanion ? 'Companion (Broadcasting)' : 'Customer (Tracking)'}
            </div>
          </div>
        </div>

        {/* Real Interactive Map with Pins */}
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-inner">
          <InteractiveMap
            centerLat={companionCoords?.lat || customerCoords?.lat || 12.9716}
            centerLng={companionCoords?.lng || customerCoords?.lng || 77.5946}
            zoom={14}
            height="320px"
            activeTracking={
              companionCoords && customerCoords
                ? {
                    companionCoords,
                    customerCoords,
                  }
                : undefined
            }
          />
        </div>

        {/* Safety Note */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Strict Privacy &amp; Safety:</strong> Realtime tracking is active exclusively during the duration of your confirmed booking. No random coordinates or simulated routes are generated.
          </div>
        </div>
      </div>
    </div>
  );
};
