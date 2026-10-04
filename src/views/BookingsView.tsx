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

  const updateBookingState = async (
    bookingId: string,
    newStatus: BookingStatus,
    paymentStatusUpdate?: string
  ) => {
    try {
      const supabase = getSupabaseClient();
      const updates: Record<string, any> = {
        booking_status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (paymentStatusUpdate) {
        updates.payment_status = paymentStatusUpdate;
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId);

      if (error) {
        setErrorMessage(sanitizeErrorMessage(error, 'Unable to update booking status. Please try again.'));
        return;
      }

      // Update local state
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, ...updates } : b))
      );
    } catch (err: any) {
      setErrorMessage(sanitizeErrorMessage(err, 'Unable to update booking status. Please try again.'));
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus === 'all') return true;
    return b.booking_status === filterStatus;
  });

  const isCompanion = profile?.role === 'companion';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isCompanion ? 'Companion Bookings & Schedule' : 'My Bookings & History'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isCompanion
              ? 'Manage inbound companionship requests, accept meetups, and broadcast live location.'
              : 'Review your requested sessions, verify meetup details, and live-track active companions.'}
          </p>
        </div>

        <button
          onClick={fetchBookings}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
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
            className={`px-3.5 py-1.5 rounded-xl capitalize transition-colors shrink-0 ${
              filterStatus === status
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-red-900">Database Error</h4>
            <p className="text-red-700 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={fetchBookings}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs text-gray-500">Querying real booking records...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Proper Empty State: NEVER FAKE BOOKINGS */
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center max-w-md mx-auto shadow-xs">
          <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-gray-900 text-base">No bookings found.</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
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
                className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 p-5 shadow-xs transition-all"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {partner?.display_name?.slice(0, 2).toUpperCase() || 'TM'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">
                          {partner?.display_name || (isCompanion ? 'Customer' : 'Companion')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.booking_status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : b.booking_status === 'confirmed'
                              ? 'bg-blue-100 text-blue-800'
                              : b.booking_status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                              : b.booking_status === 'completed'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {b.booking_status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{b.date || 'Scheduled'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {b.start_time} ({b.duration_hours}h)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financials & Platform Fee ₹0 indicator */}
                  <div className="sm:text-right">
                    <div className="text-base font-extrabold text-indigo-700">
                      ₹{b.total_price}
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1 sm:justify-end mt-0.5">
                      <span>Method: <strong className="capitalize">{b.payment_method}</strong></span>
                      &bull;
                      <span className={b.payment_status === 'paid' ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                        {b.payment_status}
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-700 font-medium">
                      Platform Fee: ₹0
                    </div>
                  </div>
                </div>

                {/* Booking Venue & Action Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>Venue: <strong>{b.meeting_location || 'Not specified'}</strong></span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Messaging CTA */}
                    <button
                      onClick={() => onOpenMessageWithUserId?.(isCompanion ? b.customer_id : b.companion_id)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      Chat
                    </button>

                    {/* Companion Decision Actions */}
                    {isCompanion && b.booking_status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateBookingState(b.id, 'confirmed')}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                        >
                          Accept Booking
                        </button>
                        <button
                          onClick={() => updateBookingState(b.id, 'declined')}
                          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {/* Companion Start Active Meetup */}
                    {isCompanion && b.booking_status === 'confirmed' && (
                      <button
                        onClick={() => updateBookingState(b.id, 'active')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        Start Active Meetup
                      </button>
                    )}

                    {/* Live Tracking for Active Bookings */}
                    {b.booking_status === 'active' && (
                      <button
                        onClick={() => setTrackingBooking(b)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs animate-pulse"
                      >
                        <Radio className="w-3.5 h-3.5 text-amber-300" />
                        Live GPS Tracking
                      </button>
                    )}

                    {/* Complete Booking (Companion action) */}
                    {isCompanion && b.booking_status === 'active' && (
                      <button
                        onClick={() => updateBookingState(b.id, 'completed', b.payment_method === 'cash' ? 'paid' : undefined)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                      >
                        Finish &amp; Complete
                      </button>
                    )}

                    {/* Customer Review completed booking */}
                    {!isCompanion && b.booking_status === 'completed' && (
                      <button
                        onClick={() => setReviewBooking(b)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <Star className="w-3.5 h-3.5 fill-white" />
                        Rate Companion
                      </button>
                    )}

                    {/* Cancel action if still pending or confirmed */}
                    {(b.booking_status === 'pending' || b.booking_status === 'confirmed') && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this booking?')) {
                            updateBookingState(b.id, 'cancelled');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl text-gray-500 hover:text-red-600 text-xs font-medium"
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
