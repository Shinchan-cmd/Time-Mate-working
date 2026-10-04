import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
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
import { sanitizeErrorMessage } from '../utils/security';

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
  const platformFee = 0; // ₹0 Guaranteed Platform Fee
  const totalAmount = subtotal + platformFee;

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('You must be logged in to create a booking.');
      return;
    }

    if (user.id === companion.user_id) {
      setErrorMessage('You cannot book your own companion profile.');
      return;
    }

    if (!meetingLocation.trim()) {
      setErrorMessage('Please specify a public meeting location.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseClient();

      const newBooking = {
        customer_id: user.id,
        companion_id: companion.user_id || companion.id,
        date,
        start_time: startTime,
        duration_hours: durationHours,
        total_price: totalAmount,
        meeting_location: meetingLocation.trim(),
        payment_method: paymentMethod,
        payment_status: 'pending',
        booking_status: 'pending',
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert(newBooking)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setSuccess(true);

      // Trigger local in-app notification
      await addNotification({
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
      setErrorMessage(sanitizeErrorMessage(err, 'Unable to submit booking. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative bg-[#121214] rounded-2xl max-w-lg w-full p-4 sm:p-6 md:p-8 shadow-2xl border border-zinc-800 my-auto max-h-[92vh] overflow-y-auto text-white">
        {/* Sticky Mobile Top Header with Back & Cross */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 font-bold text-xs transition-colors cursor-pointer shadow-xs"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <span className="text-xs font-semibold text-zinc-400">Booking Form</span>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400 hover:text-white transition-colors shadow-xs cursor-pointer"
            aria-label="Close booking modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            New Companionship Booking
          </div>
          <h2 className="text-xl font-bold text-white">
            Book {companion.display_name}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Listed Rate: ₹{hourlyRate}/hr &bull; ₹0 Platform Fee
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Booking created successfully! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmitBooking} className="space-y-4">
          {/* Date & Time Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Booking Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-300">
                Duration (Hours)
              </label>
              <span className="text-xs font-bold text-pink-400">
                {durationHours} {durationHours === 1 ? 'hour' : 'hours'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((hours) => (
                <button
                  type="button"
                  key={hours}
                  onClick={() => setDurationHours(hours)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    durationHours === hours
                      ? 'bg-pink-600 text-white border-pink-500 shadow-[0_0_10px_rgba(255,45,141,0.3)]'
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  {hours}h
                </button>
              ))}
            </div>
          </div>

          {/* Meeting Location */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Meeting Location / Public Venue
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Starbucks Indiranagar or Mall Entrance"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              For safety, all first-time companionship meetings should take place in public venues.
            </p>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Cash option */}
              <button
                type="button"
                disabled={!cashAvailable}
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  paymentMethod === 'cash' && cashAvailable
                    ? 'border-pink-500 bg-pink-500/15 text-pink-300 font-semibold shadow-[0_0_10px_rgba(255,45,141,0.2)]'
                    : cashAvailable
                    ? 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-400'
                    : 'border-zinc-800/40 bg-zinc-900/40 text-zinc-600 cursor-not-allowed opacity-50'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1 text-emerald-400" />
                <span className="text-xs font-bold text-white">Cash Direct</span>
                <span className="text-[10px] text-zinc-400">Pay at meeting</span>
              </button>

              {/* Online option */}
              <button
                type="button"
                disabled={!onlineAvailable}
                onClick={() => setPaymentMethod('online')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  paymentMethod === 'online' && onlineAvailable
                    ? 'border-pink-500 bg-pink-500/15 text-pink-300 font-semibold shadow-[0_0_10px_rgba(255,45,141,0.2)]'
                    : onlineAvailable
                    ? 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-400'
                    : 'border-zinc-800/40 bg-zinc-900/40 text-zinc-600 cursor-not-allowed opacity-50'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1 text-pink-400" />
                <span className="text-xs font-bold text-white">Online Transfer</span>
                <span className="text-[10px] text-zinc-400">
                  {onlineAvailable ? 'UPI / Direct Bank' : 'Unavailable'}
                </span>
              </button>
            </div>
          </div>

          {/* Online Payment Details Callout */}
          {paymentMethod === 'online' && onlineAvailable && (
            <div className="p-3 bg-zinc-900 rounded-xl border border-pink-500/30 text-xs text-zinc-300 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-pink-400">
                <QrCode className="w-4 h-4" />
                <span>Companion Direct Payment Details</span>
              </div>
              {companion.payment_settings?.upi_id && (
                <div className="flex justify-between font-mono bg-zinc-800/80 p-2 rounded-lg border border-zinc-700">
                  <span className="text-zinc-400 text-[11px]">UPI ID:</span>
                  <span className="font-bold text-white text-[11px]">
                    {companion.payment_settings.upi_id}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pricing Breakdown Card */}
          <div className="p-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 text-xs space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Rate ({durationHours} hours @ ₹{hourlyRate}/hr)</span>
              <span className="font-semibold text-zinc-200">₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-pink-400 font-medium">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Platform Booking Fee
              </span>
              <span className="font-bold">₹0 Free</span>
            </div>
            <div className="border-t border-zinc-800 pt-2 flex justify-between text-sm font-extrabold text-white">
              <span>Total Payable to Companion</span>
              <span className="text-pink-400 font-mono">₹{totalAmount}</span>
            </div>
          </div>

          {/* Submit CTA Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-pink-600 hover:bg-pink-500 active:opacity-90 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_15px_rgba(255,45,141,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>Submitting Request...</span>
            ) : (
              <span>Confirm &amp; Request Booking</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
