import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  MessageSquare,
  Navigation,
  Radio,
  RefreshCw,
  Star,
  XCircle,
} from 'lucide-react';
import { Booking, BookingStatus, Profile } from '../types';
import { useAuth } from '../context/AuthContext';
import { getSupabaseClient, parseProfileRecord } from '../lib/supabase';
import { LiveTrackingModal } from '../components/LiveTrackingModal';
import { ReviewModal } from '../components/ReviewModal';
import { sanitizeErrorMessage } from '../utils/security';

interface BookingsViewProps {
  onOpenMessageWithUserId?: (userId: string) => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({ onOpenMessageWithUserId }) => {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseClient();
      const isCompanion = profile?.role === 'companion';

      // Query bookings involving current user
      const query = isCompanion
        ? supabase.from('bookings').select('*').eq('companion_id', user.id)
        : supabase.from('bookings').select('*').eq('customer_id', user.id);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        if (
          error.message?.includes('schema cache') ||
          error.message?.includes('does not exist') ||
          error.code === 'PGRST116' ||
          error.code === '42P01'
        ) {
          setBookings([]);
          setErrorMessage(null);
        } else {
          setErrorMessage(sanitizeErrorMessage(error, 'Unable to load bookings at this time.'));
          setBookings([]);
        }
      } else {
        // Fetch participant profiles for display
        const bookingsData = data || [];
        const enrichedBookings: Booking[] = await Promise.all(
          bookingsData.map(async (b: any) => {
            const partnerId = isCompanion ? b.customer_id : b.companion_id;
            let partnerProfile: Profile | undefined;
            if (partnerId) {
              const { data: pData } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', partnerId)
                .maybeSingle();
              if (pData) {
                partnerProfile = parseProfileRecord(pData);
              }
            }

            return {
              ...b,
              customer_profile: !isCompanion ? profile || undefined : partnerProfile,
              companion_profile: isCompanion ? profile || undefined : partnerProfile,
            };
          })
        );

        setBookings(enrichedBookings);
      }
    } catch (err: any) {
      setErrorMessage(sanitizeErrorMessage(err, 'Unable to load bookings.'));
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user, profile]);

  const updateBookingState = async (bookingId: string, status: BookingStatus, paymentStatus?: 'pending' | 'paid' | 'refunded') => {
    try {
      const supabase = getSupabaseClient();
      const payload: any = { booking_status: status };
      if (paymentStatus) {
        payload.payment_status = paymentStatus;
      }

      const { error } = await supabase
        .from('bookings')
        .update(payload)
        .eq('id', bookingId);

      if (error) throw error;

      await fetchBookings();
    } catch (err: any) {
      alert(sanitizeErrorMessage(err, 'Could not update booking.'));
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus === 'all') return true;
    return b.booking_status === filterStatus;
  });

  const isCompanion = profile?.role === 'companion';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isCompanion ? 'Companion Bookings & Schedule' : 'My Bookings & History'}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {isCompanion
              ? 'Manage inbound companionship requests, accept meetups, and broadcast live location.'
              : 'Review your requested sessions, verify meetup details, and live-track active companions.'}
          </p>
        </div>

        <button
          onClick={fetchBookings}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl border border-zinc-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 text-xs font-semibold scrollbar-none">
        {['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3.5 py-1.5 rounded-xl capitalize transition-all shrink-0 cursor-pointer ${
              filterStatus === status
                ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(255,45,141,0.3)]'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-white">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-red-300">Database Notice</h4>
            <p className="text-red-400 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={fetchBookings}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs text-zinc-400">Querying real booking records...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-[#121214] rounded-3xl border border-zinc-800 p-12 text-center max-w-md mx-auto shadow-xs">
          <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-white text-base">No bookings found.</h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {filterStatus === 'all'
              ? 'You do not have any recorded bookings in the database yet.'
              : `No bookings found with status '${filterStatus}'.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const partner = isCompanion ? b.customer_profile : b.companion_profile;

            return (
              <div
                key={b.id}
                className="bg-[#121214] rounded-2xl border border-zinc-800 hover:border-pink-500/40 p-5 shadow-xs transition-all"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    {partner?.avatar_url ? (
                      <img
                        src={partner.avatar_url}
                        alt="Avatar"
                        className="w-12 h-12 rounded-xl object-cover ring-1 ring-zinc-700 shadow-xs"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-pink-500/30 text-pink-400 flex items-center justify-center font-bold text-sm shadow-xs">
                        {partner?.display_name?.slice(0, 2).toUpperCase() || 'TM'}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {partner?.display_name || (isCompanion ? 'Customer' : 'Companion')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            b.booking_status === 'pending'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : b.booking_status === 'confirmed'
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                              : b.booking_status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                              : b.booking_status === 'completed'
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}
                        >
                          {b.booking_status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{b.date || 'Scheduled'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>
                            {b.start_time} ({b.duration_hours}h)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financials & Platform Fee ₹0 indicator */}
                  <div className="sm:text-right">
                    <div className="text-base font-extrabold text-pink-400">
                      ₹{b.total_price}
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1 sm:justify-end mt-0.5">
                      <span>Method: <strong className="capitalize text-zinc-300">{b.payment_method}</strong></span>
                      &bull;
                      <span className={b.payment_status === 'paid' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {b.payment_status}
                      </span>
                    </div>
                    <div className="text-[10px] text-pink-400/80 font-medium">
                      Platform Fee: ₹0
                    </div>
                  </div>
                </div>

                {/* Booking Venue & Action Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>Venue: <strong className="text-zinc-200">{b.meeting_location || 'Not specified'}</strong></span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Messaging CTA */}
                    <button
                      onClick={() => onOpenMessageWithUserId?.(isCompanion ? b.customer_id : b.companion_id)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                      Chat
                    </button>

                    {/* Companion Decision Actions */}
                    {isCompanion && b.booking_status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateBookingState(b.id, 'confirmed')}
                          className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-[0_0_10px_rgba(255,45,141,0.3)] cursor-pointer"
                        >
                          Accept Booking
                        </button>
                        <button
                          onClick={() => updateBookingState(b.id, 'declined')}
                          className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold cursor-pointer"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {/* Companion Start Active Meetup */}
                    {isCompanion && b.booking_status === 'confirmed' && (
                      <button
                        onClick={() => updateBookingState(b.id, 'active')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        Start Active Meetup
                      </button>
                    )}

                    {/* Live Tracking for Active Bookings */}
                    {b.booking_status === 'active' && (
                      <button
                        onClick={() => setTrackingBooking(b)}
                        className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,45,141,0.4)] animate-pulse cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5 text-pink-200" />
                        Live GPS Tracking
                      </button>
                    )}

                    {/* Complete Booking */}
                    {isCompanion && b.booking_status === 'active' && (
                      <button
                        onClick={() => updateBookingState(b.id, 'completed', b.payment_method === 'cash' ? 'paid' : undefined)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Finish &amp; Complete
                      </button>
                    )}

                    {/* Customer Review completed booking */}
                    {!isCompanion && b.booking_status === 'completed' && (
                      <button
                        onClick={() => setReviewBooking(b)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-white" />
                        Rate Companion
                      </button>
                    )}

                    {/* Cancel action */}
                    {(b.booking_status === 'pending' || b.booking_status === 'confirmed') && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this booking?')) {
                            updateBookingState(b.id, 'cancelled');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl text-zinc-500 hover:text-red-400 text-xs font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live GPS Tracking Modal */}
      <LiveTrackingModal
        booking={trackingBooking}
        isOpen={!!trackingBooking}
        onClose={() => setTrackingBooking(null)}
      />

      {/* Review Modal */}
      <ReviewModal
        booking={reviewBooking}
        isOpen={!!reviewBooking}
        onClose={() => setReviewBooking(null)}
        onReviewSubmitted={() => fetchBookings()}
      />
    </div>
  );
};
