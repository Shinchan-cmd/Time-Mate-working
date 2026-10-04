import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, Mail, Shield, User, Users, X } from 'lucide-react';
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
  const { signIn, signUp, resetPassword, emailConfirmationPending, clearEmailConfirmationNotice } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync mode with props when opened
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialMode, initialRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMessage(error.message || 'Login failed. Please verify credentials.');
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
          setSuccessMessage(
            `Account created! Please check your email (${email}) and click the verification link to confirm your account.`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-gray-100 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close authentication dialog"
        >
          <X className="w-5 h-5" />
        </button>

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

        {/* Notice for pending email confirmation */}
        {emailConfirmationPending && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Confirmation link sent:</span> A verification link was sent to {emailConfirmationPending}. Please verify to sign in.
            </div>
            <button
              onClick={clearEmailConfirmationNotice}
              className="text-blue-500 hover:text-blue-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
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
