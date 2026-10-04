import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { TimeMateLogoIcon } from './TimeMateLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  initialRole?: UserRole;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRole = 'customer',
  onSuccess,
}) => {
  const {
    signIn,
    signUp,
    resetPassword,
    resendConfirmationEmail,
    emailConfirmationPending,
    clearEmailConfirmationNotice,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Sync mode with props when opened
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setErrorMessage(null);
      setSuccessMessage(null);
      setUnconfirmedEmail(null);
      setResendSuccess(false);
    }
  }, [isOpen, initialMode, initialRole]);

  if (!isOpen) return null;

  const handleResendConfirmation = async () => {
    const targetEmail = unconfirmedEmail || emailConfirmationPending || email.trim();
    if (!targetEmail) return;

    setResending(true);
    setResendSuccess(false);
    try {
      const { error } = await resendConfirmationEmail(targetEmail);
      if (error) {
        setErrorMessage(error.message || 'Could not resend verification email.');
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 8000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error resending confirmation.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message?.toLowerCase().includes('email not confirmed')) {
            setUnconfirmedEmail(email.trim());
            setErrorMessage(
              'Your email address has not been confirmed yet. Click "Resend Verification Email" below or verify the account in Supabase.'
            );
          } else {
            setErrorMessage(error.message || 'Login failed. Please verify credentials.');
          }
        } else {
          setSuccessMessage('Logged in successfully!');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 400);
        }
      } else if (mode === 'signup') {
        if (!displayName.trim()) {
          setErrorMessage('Please enter your full or display name.');
          setLoading(false);
          return;
        }

        const { error, confirmationRequired } = await signUp(email, password, displayName, role);
        if (error) {
          setErrorMessage(error.message || 'Failed to create account.');
        } else if (confirmationRequired) {
          setUnconfirmedEmail(email.trim());
          setSuccessMessage(
            `Account created! A confirmation email was requested for ${email}.`
          );
        } else {
          setSuccessMessage('Account created and logged in successfully!');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 500);
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) {
          setErrorMessage(error.message || 'Could not send reset link.');
        } else {
          setSuccessMessage('Password reset link sent to your email address.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 md:p-8 shadow-2xl border border-gray-100 my-auto max-h-[92vh] overflow-y-auto">
        {/* Mobile & Desktop Top Bar with Back & Close */}
        <div className="flex items-center justify-between pb-2 mb-4 border-b border-gray-100">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-bold text-xs transition-colors cursor-pointer shadow-xs"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 hover:text-gray-900 transition-colors shadow-xs cursor-pointer"
            aria-label="Close authentication dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <TimeMateLogoIcon size={52} className="shadow-lg" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {mode === 'login' && 'Sign in to Time Mate'}
            {mode === 'signup' && 'Create your Time Mate account'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {mode === 'login' && 'Discover companions, manage bookings, and chat securely.'}
            {mode === 'signup' && 'Join TimeMate as a customer or become a verified companion.'}
            {mode === 'forgot' && 'Enter your email to receive password reset instructions.'}
          </p>
        </div>

        {/* Interactive Email Confirmation Assistant Card */}
        {(emailConfirmationPending || unconfirmedEmail) && (
          <div className="mb-5 p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs space-y-2.5">
            <div className="flex items-start gap-2.5 text-amber-950">
              <Mail className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-amber-900">Email Verification Required</div>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                  Target address: <span className="font-semibold underline">{unconfirmedEmail || emailConfirmationPending}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearEmailConfirmationNotice();
                  setUnconfirmedEmail(null);
                }}
                className="text-amber-400 hover:text-amber-700 p-1"
                aria-label="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resend Action */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/70">
              <button
                type="button"
                disabled={resending}
                onClick={handleResendConfirmation}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Sending Email...' : 'Resend Verification Email'}
              </button>
              {resendSuccess && (
                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sent! Check Spam/Junk
                </span>
              )}
            </div>

            {/* Troubleshooting Guide for Missing Emails */}
            <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200/80 text-[11px] text-gray-700 space-y-1.5">
              <div className="font-bold flex items-center gap-1 text-amber-900">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                Email not arriving? (Supabase Rate Limits)
              </div>
              <p className="text-[10px] text-gray-500 leading-normal">
                Supabase default free mailer allows only 3 emails/hour and often gets delayed or sent to Spam.
              </p>
              <div className="pt-0.5 flex flex-wrap gap-2 text-[10px]">
                <a
                  href="https://supabase.com/dashboard/project/nnuuiektlsouuswxxnod/auth/providers"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-700 font-bold hover:underline"
                >
                  Turn OFF "Confirm email" <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span className="text-gray-300">&bull;</span>
                <a
                  href="https://supabase.com/dashboard/project/nnuuiektlsouuswxxnod/auth/users"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-700 font-bold hover:underline"
                >
                  Confirm User in Supabase <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Signup Role Selection */}
        {mode === 'signup' && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Select Account Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  role === 'customer'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Users className="w-5 h-5 mb-1 text-indigo-600" />
                <span className="text-xs">Customer</span>
                <span className="text-[10px] text-gray-500">I want to book companions</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('companion')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  role === 'companion'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Shield className="w-5 h-5 mb-1 text-indigo-600" />
                <span className="text-xs">Companion</span>
                <span className="text-[10px] text-gray-500">I want to offer companionship</span>
              </button>
            </div>
            {role === 'companion' && (
              <p className="text-[11px] text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                Tip: You can create your companion account immediately without needing to configure online payment upfront.
              </p>
            )}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Display Name / Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Sharma"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              'Sign In'
            ) : mode === 'signup' ? (
              'Create Account'
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Footer Mode Switchers */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-600">
          {mode === 'login' && (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="font-semibold text-indigo-600 hover:underline"
              >
                Sign up
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="font-semibold text-indigo-600 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <p>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="font-semibold text-indigo-600 hover:underline"
              >
                Back to Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
