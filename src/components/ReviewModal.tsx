import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Star, X } from 'lucide-react';
import { Booking, Review } from '../types';
import { useAuth } from '../context/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { sanitizeErrorMessage } from '../utils/security';

interface ReviewModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: (review: Review) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  booking,
  isOpen,
  onClose,
  onReviewSubmitted,
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen || !booking) return null;

  // Validation: Only completed bookings can be reviewed
  if (booking.booking_status !== 'completed') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="bg-[#121214] border border-zinc-800 rounded-2xl max-w-md w-full p-6 text-center text-white">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="font-bold text-white text-base">Booking Incomplete</h3>
          <p className="text-xs text-zinc-400 mt-2 mb-4">
            Reviews can only be submitted once the companionship booking has been marked as completed.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('You must be logged in to leave a review.');
      return;
    }

    if (!comment.trim()) {
      setErrorMessage('Please write a brief feedback comment.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseClient();

      const newReview: Review = {
        id: 'rev-' + Date.now(),
        booking_id: booking.id,
        customer_id: user.id,
        companion_id: booking.companion_id,
        rating,
        comment: comment.trim(),
        created_at: new Date().toISOString(),
        customer_name: user.email?.split('@')[0] || 'Customer',
      };

      // Save to reviews table
      await supabase.from('reviews').insert({
        booking_id: booking.id,
        customer_id: user.id,
        companion_id: booking.companion_id,
        rating,
        comment: comment.trim(),
      });

      setSuccess(true);
      onReviewSubmitted?.(newReview);

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(sanitizeErrorMessage(err, 'Unable to submit review. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative bg-[#121214] rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-zinc-800 my-8 text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Rate Your Companionship Experience
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Booking #{booking.id.slice(0, 8)} &bull; Date: {booking.date || 'Completed'}
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
            <span>Thank you! Your verified review has been submitted.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating Selector */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 cursor-pointer transform hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-zinc-700'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-zinc-400 mt-2">
              {rating === 5 && 'Excellent experience'}
              {rating === 4 && 'Very good companion'}
              {rating === 3 && 'Average meetup'}
              {rating === 2 && 'Needs improvement'}
              {rating === 1 && 'Unsatisfactory'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Your Feedback
            </label>
            <textarea
              rows={4}
              required
              placeholder="Share details about punctuality, friendliness, conversation, and general meetup experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl focus:border-pink-500 focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 px-4 bg-pink-600 hover:bg-pink-500 active:opacity-90 text-white font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(255,45,141,0.35)] disabled:opacity-60 transition-all cursor-pointer"
          >
            {loading ? 'Submitting Review...' : 'Submit Verified Review'}
          </button>
        </form>
      </div>
    </div>
  );
};
