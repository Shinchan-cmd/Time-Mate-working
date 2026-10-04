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

  const supabase = getSupabaseClient();
  const isCompanion = user?.id === booking?.companion_id;

  useEffect(() => {
    if (!isOpen || !booking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      return;
    }

    const channelName = `live_tracking_${booking.id}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // Listen for peer location broadcasts
    channel
      .on('broadcast', { event: 'location_update' }, ({ payload }) => {
        if (payload?.userId === booking.companion_id) {
          setCompanionCoords({ lat: payload.lat, lng: payload.lng });
          setLastUpdated(new Date().toLocaleTimeString());
          setStatusMessage('Companion signal received in real-time');
        } else if (payload?.userId === booking.customer_id) {
          setCustomerCoords({ lat: payload.lat, lng: payload.lng });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatusMessage('Tracking channel connected. Awaiting GPS broadcasts...');
        }
      });

    // Start GPS broadcast if companion
    if (navigator.geolocation && isCompanion) {
      setIsBroadcasting(true);
      setStatusMessage('Broadcasting your live GPS coordinates to customer...');

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCompanionCoords({ lat, lng });
          setLastUpdated(new Date().toLocaleTimeString());

          // Broadcast through realtime channel
          channel.send({
            type: 'broadcast',
            event: 'location_update',
            payload: {
              userId: user?.id,
              lat,
              lng,
              timestamp: Date.now(),
            },
          });
        },
        () => {
          setStatusMessage('Unable to access device GPS. Please verify location permissions.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    } else if (userLocation) {
      setCustomerCoords({ lat: userLocation.latitude, lng: userLocation.longitude });
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isOpen, booking, user, isCompanion, userLocation]);

  if (!isOpen || !booking) return null;

  const distance =
    companionCoords && customerCoords
      ? calculateDistanceKm(companionCoords.lat, companionCoords.lng)
      : null;

  // Approximate ETA based on typical city movement (20 km/h)
  const etaMinutes = distance !== null ? Math.max(1, Math.round((distance / 20) * 60)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative bg-[#121214] rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-800 my-8 text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-800 cursor-pointer"
          aria-label="Close live tracking"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-[0_0_10px_rgba(255,45,141,0.4)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Active Booking Live Tracking
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Live GPS
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Booking #{booking.id.slice(0, 8)} &bull; Venue: {booking.meeting_location || 'Designated Venue'}
            </p>
          </div>
        </div>

        {/* Status Bar */}
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl mb-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-medium">{statusMessage}</span>
          </div>
          {lastUpdated && (
            <div className="text-[11px] text-zinc-400">
              Last signal: {lastUpdated}
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
            <div className="text-[10px] text-pink-400 font-semibold uppercase tracking-wider">
              Distance
            </div>
            <div className="text-lg font-black text-white mt-0.5">
              {distance !== null ? `${distance} km` : '--'}
            </div>
          </div>

          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
            <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
              Estimated ETA
            </div>
            <div className="text-lg font-black text-emerald-300 mt-0.5">
              {etaMinutes !== null ? `~${etaMinutes} mins` : '--'}
            </div>
          </div>

          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
            <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
              Your Role
            </div>
            <div className="text-xs font-bold text-white mt-1 capitalize">
              {isCompanion ? 'Companion (Broadcasting)' : 'Customer (Tracking)'}
            </div>
          </div>
        </div>

        {/* Real Interactive Map with Pins */}
        <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-inner">
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
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
          <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Strict Privacy &amp; Safety:</strong> Realtime tracking is active exclusively during the duration of your confirmed booking. No random coordinates or simulated routes are generated.
          </div>
        </div>
      </div>
    </div>
  );
};
