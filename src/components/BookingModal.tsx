import React, { useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  QrCode,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Booking, PaymentMethod, Profile } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useNotifications } from '../context/NotificationContext';
import { getSupabaseClient } from '../lib/supabase';

interface BookingModalProps {
  companion: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated?: (booking: Booking) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  companion,
  isOpen,
  onClose,
  onBookingCreated,
}) => {
  const { user, profile } = useAuth();
  const { location } = useLocation();
  const { addNotification } = useNotifications();

  // Booking form state
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(today);
  const [startTime, setStartTime] = useState<string>('15:00');
  const [durationHours, setDurationHours] = useState<number>(2);
  const [meetingLocation, setMeetingLocation] = useState<string>(location?.city ? `${location.city}, Central Landmark` : '');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Companion payment capabilities
  const onlineAvailable = !!companion?.payment_settings?.online_enabled && !!companion?.payment_settings?.upi_id;
  const cashAvailable = companion?.payment_settings?.cash_enabled ?? true;

  // Initial payment method based on companion settings
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    onlineAvailable ? 'online' : 'cash'
  );

  React.useEffect(() => {
    if (companion) {
      const isOnline = !!companion.payment_settings?.online_enabled && !!companion.payment_settings.upi_id;
      const isCash = companion.payment_settings?.cash_enabled ?? true;
      if (!isOnline && isCash) {
        setPaymentMethod('cash');
      } else if (isOnline && !isCash) {
        setPaymentMethod('online');
      } else {
        setPaymentMethod(isOnline ? 'online' : 'cash');
      }
    }
  }, [companion]);

  if (!isOpen || !companion) return null;

  const hourlyRate = companion.hourly_rate || 500;
  const subtotal = hourlyRate * durationHours;
  const platformFee = 0; // Strictly ₹0 per TimeMate Master Specification
  const totalPrice = subtotal + platformFee;

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('You must be logged in to create a booking.');
      return;
    }

    if (user.id === companion.user_id) {
      setErrorMessage('You cannot book yourself as a companion.');
      return;
    }

    if (!meetingLocation.trim()) {
      setErrorMessage('Please specify a meeting location or public venue.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseClient();

      const bookingRecord = {
        customer_id: user.id,
        companion_id: companion.user_id || companion.id,
        date: date,
        start_time: startTime,
        duration_hours: durationHours,
        total_price: totalPrice,
        payment_method: paymentMethod,
        payment_status: 'pending', // Selecting online does NOT mean paid
        booking_status: 'pending',
        meeting_location: meetingLocation.trim(),
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingRecord)
        .select()
        .single();

      if (error) {
        // If remote database is unavailable or rejected insert, report exact real error
        throw new Error(error.message);
      }

      setSuccess(true);

      // Trigger real notification
      addNotification({
        user_id: user.id,
        title: 'Booking Request Submitted',
        message: `Your booking request with ${companion.display_name} for ${date} at ${startTime} has been sent.`,
        type: 'booking',
        link: '/bookings',
      });

      if (data) {
        onBookingCreated?.(data as Booking);
      }

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit booking to database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-100 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
          aria-label="Close booking modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            New Companionship Booking
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            Book {companion.display_name}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Listed Rate: ₹{hourlyRate}/hr &bull; ₹0 Platform Fee
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>Booking created successfully! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmitBooking} className="space-y-4">
          {/* Date & Time Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Booking Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">
                Duration (Hours)
              </label>
              <span className="text-xs font-bold text-indigo-600">
                {durationHours} {durationHours === 1 ? 'hour' : 'hours'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((hours) => (
                <button
                  type="button"
                  key={hours}
                  onClick={() => setDurationHours(hours)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    durationHours === hours
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {hours}h
                </button>
              ))}
            </div>
          </div>

          {/* Meeting Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Meeting Location / Public Venue
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Starbucks Indiranagar or Mall Entrance"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              For safety, all first-time companionship meetings should take place in public venues.
            </p>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Cash option */}
              <button
                type="button"
                disabled={!cashAvailable}
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  paymentMethod === 'cash' && cashAvailable
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                    : !cashAvailable
                    ? 'opacity-40 border-gray-200 cursor-not-allowed text-gray-400'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1 text-emerald-600" />
                <span className="text-xs">Cash on Meetup</span>
                <span className="text-[10px] text-gray-500">Pay directly at event</span>
              </button>

              {/* Online option */}
              <button
                type="button"
                disabled={!onlineAvailable}
                onClick={() => setPaymentMethod('online')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  paymentMethod === 'online' && onlineAvailable
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold'
                    : !onlineAvailable
                    ? 'opacity-40 border-gray-200 cursor-not-allowed text-gray-400'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1 text-indigo-600" />
                <span className="text-xs">Online UPI / Bank</span>
                <span className="text-[10px] text-gray-500">
                  {onlineAvailable ? 'Companion verified UPI' : 'Not configured by companion'}
                </span>
              </button>
            </div>

            {/* Online payment note */}
            {paymentMethod === 'online' && onlineAvailable && (
              <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  Companion UPI VPA: {companion.payment_settings?.upi_id}
                </div>
                <div className="text-blue-700 text-[10px]">
                  Note: Payment status remains <strong>Pending</strong> until verified by backend/companion.
                </div>
              </div>
            )}
          </div>

          {/* Pricing Breakdown Card: Zero Platform Fee Guarantee */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                Companion rate (₹{hourlyRate} &times; {durationHours}h)
              </span>
              <span className="font-medium text-gray-900">₹{subtotal}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                TimeMate Platform Fee
              </span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">
                ₹0 (Free)
              </span>
            </div>

            <div className="border-t border-gray-200 pt-2 flex items-center justify-between font-bold text-sm text-gray-900">
              <span>Customer Total</span>
              <span className="text-indigo-700 text-base">₹{totalPrice}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              `Confirm & Request Booking (₹${totalPrice})`
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
