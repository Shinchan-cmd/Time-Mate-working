import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Eye,
  EyeOff,
  HeartHandshake,
  Image as ImageIcon,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth, SignupMetadata } from '../context/AuthContext';
import { UserRole, CompanionPaymentSettings } from '../types';
import { TimeMateLogoIcon } from './TimeMateLogo';
import { sanitizeErrorMessage } from '../utils/security';
import { AVATAR_PRESETS, compressAndCropImage } from '../utils/avatarPresets';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot_password';
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
  const { signIn, signUp, resetPassword } = useAuth();

  // Mode state: 'login' | 'signup' | 'forgot_password'
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>(initialMode);

  // Form input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [role, setRole] = useState<UserRole>(initialRole);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [city, setCity] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(600);

  // Avatar presets and upload states
  const [showPresetsModal, setShowPresetsModal] = useState<boolean>(false);
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optional Companion Payment Details
  const [showPaymentSetup, setShowPaymentSetup] = useState<boolean>(false);
  const [upiId, setUpiId] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');

  // In-flight guard
  const isSubmittingRef = useRef<boolean>(false);

  // Async feedback states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setPassword('');
      setConfirmPassword('');
      setAvatarUrl('');
      setShowPresetsModal(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setErrorMessage(null);
      setSuccessMessage(null);
      setLoading(false);
      setShowPaymentSetup(false);
      isSubmittingRef.current = false;
    }
  }, [isOpen, initialMode, initialRole]);

  if (!isOpen) return null;

  const buildCompanionPaymentSettings = (): CompanionPaymentSettings | undefined => {
    if (role !== 'companion') return undefined;

    const hasOnlineInfo = !!(upiId.trim() || bankName.trim() || accountNumber.trim());
    return {
      online_enabled: hasOnlineInfo,
      cash_enabled: true,
      upi_id: upiId.trim() || undefined,
      bank_name: bankName.trim() || undefined,
      account_number: accountNumber.trim() || undefined,
      ifsc_code: ifscCode.trim().toUpperCase() || undefined,
    };
  };

  /**
   * Handle Photo File Upload with client-side compression
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setErrorMessage(null);

    try {
      const dataUrl = await compressAndCropImage(file, 320, 0.85);
      setAvatarUrl(dataUrl);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process image file.');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * Handle Email + Password Login
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error, user } = await signIn(cleanEmail, password);

      if (error || !user) {
        setErrorMessage(
          sanitizeErrorMessage(error, 'Email or password is incorrect.')
        );
      } else {
        setSuccessMessage('Signed in successfully!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 400);
      }
    } catch (err: any) {
      setErrorMessage(sanitizeErrorMessage(err, 'Unable to sign in. Please try again.'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  /**
   * Handle Email + Password Signup
   */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!displayName.trim()) {
      setErrorMessage('Please enter your full name or display name.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const signupMetadata: SignupMetadata = {
      displayName: displayName.trim(),
      role,
      avatarUrl: avatarUrl.trim() || undefined,
      city: city.trim() || undefined,
      hourlyRate: role === 'companion' ? hourlyRate : undefined,
      paymentSettings: buildCompanionPaymentSettings(),
    };

    try {
      const { error, user } = await signUp(cleanEmail, password, signupMetadata);

      if (error || !user) {
        setErrorMessage(
          sanitizeErrorMessage(
            error,
            'Unable to create your account. Please check your details and try again.'
          )
        );
      } else {
        setSuccessMessage('Account created successfully!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(
        sanitizeErrorMessage(
          err,
          'Unable to create your account. Please check your details and try again.'
        )
      );
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  /**
   * Handle Password Reset Request
   */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await resetPassword(cleanEmail);

      if (error) {
        setErrorMessage(
          sanitizeErrorMessage(
            error,
            'Unable to process password reset request. Please try again.'
          )
        );
      } else {
        setSuccessMessage('Password recovery instructions sent to your email address.');
      }
    } catch (err: any) {
      setErrorMessage(
        sanitizeErrorMessage(
          err,
          'Unable to process password reset request. Please try again.'
        )
      );
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-[#121214] rounded-3xl max-w-md w-full p-5 sm:p-6 md:p-8 shadow-2xl border border-zinc-800 my-auto max-h-[94vh] overflow-y-auto text-white">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
          {mode === 'forgot_password' ? (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>TimeMate Authentication</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400 hover:text-white transition-colors shadow-xs cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Brand Logo & Header */}
        <div className="text-center mb-5">
          <div className="flex justify-center mb-3">
            <TimeMateLogoIcon size={52} className="shadow-[0_0_20px_rgba(255,45,141,0.4)]" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'login'
              ? 'Sign in to Time Mate'
              : mode === 'signup'
              ? 'Create your Time Mate account'
              : 'Reset your password'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {mode === 'login'
              ? 'Enter your email and password to access your account.'
              : mode === 'signup'
              ? 'Join the location-aware companionship marketplace with zero platform fees.'
              : 'Enter your account email to receive secure password recovery instructions.'}
          </p>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{successMessage}</span>
          </div>
        )}

        {/* Mode Switcher (Sign In vs Create Account) */}
        {mode !== 'forgot_password' && (
          <div className="flex bg-zinc-900 p-1 rounded-2xl mb-4 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(255,45,141,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(255,45,141,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Email Address <span className="text-pink-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-300">
                  Password <span className="text-pink-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] font-semibold text-pink-400 hover:text-pink-300 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-pink-600 hover:bg-pink-500 active:opacity-90 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_15px_rgba(255,45,141,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-zinc-400">Don't have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs font-bold text-pink-400 hover:text-pink-300 cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* 2. CREATE ACCOUNT FORM (FOR BOTH CUSTOMER & COMPANION) */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Account Type Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300">I want to join as</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    role === 'customer'
                      ? 'border-pink-500 bg-pink-500/15 text-white shadow-[0_0_10px_rgba(255,45,141,0.2)]'
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-pink-400" />
                    <span className="font-bold text-xs text-white">Customer</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    Book verified companions near you
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('companion')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    role === 'companion'
                      ? 'border-pink-500 bg-pink-500/15 text-white shadow-[0_0_10px_rgba(255,45,141,0.2)]'
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <HeartHandshake className="w-4 h-4 text-pink-400" />
                    <span className="font-bold text-xs text-white">Companion</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    Offer companionship &amp; earn directly
                  </p>
                </button>
              </div>
            </div>

            {/* Profile Picture Section */}
            <div className="p-3 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-pink-400" />
                  <span>Profile Picture</span>
                  <span className="text-[10px] text-zinc-500 font-normal">(Optional)</span>
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-[10px] font-semibold text-red-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Avatar Preview */}
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar Preview"
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-pink-500 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 text-pink-400 flex items-center justify-center font-bold text-base shadow-xs">
                      {displayName?.slice(0, 1).toUpperCase() || (role === 'companion' ? 'C' : 'U')}
                    </div>
                  )}
                </div>

                {/* Upload & Preset Action Buttons */}
                <div className="flex-1 flex flex-wrap gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={avatarUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3 h-3 text-pink-400" />
                    <span>{avatarUploading ? 'Uploading...' : 'Upload Photo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPresetsModal(!showPresetsModal)}
                    className="px-2.5 py-1.5 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ImageIcon className="w-3 h-3 text-pink-400" />
                    <span>Choose Avatar</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Avatar Preset Grid */}
              {showPresetsModal && (
                <div className="pt-2 border-t border-zinc-800 animate-in fade-in duration-150">
                  <p className="text-[10px] font-bold text-zinc-400 mb-1.5">Click to choose a preset portrait:</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {AVATAR_PRESETS.slice(0, 6).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setAvatarUrl(preset.url);
                          setShowPresetsModal(false);
                        }}
                        className={`rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                          avatarUrl === preset.url
                            ? 'border-pink-500 scale-105 ring-2 ring-pink-500/40'
                            : 'border-transparent hover:border-pink-400'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Full Name / Display Name <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Maya Sharma"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Email Address <span className="text-pink-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Password <span className="text-pink-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Confirm Password <span className="text-pink-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Companion specific profile helpers */}
            {role === 'companion' && (
              <>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Primary City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="e.g. Bangalore"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-2 text-xs bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Hourly Rate (₹)
                    </label>
                    <input
                      type="number"
                      min={200}
                      step={50}
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden font-semibold"
                    />
                  </div>
                </div>

                {/* Optional Online Payment Details Section */}
                <div className="pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowPaymentSetup(!showPaymentSetup)}
                    className="w-full flex items-center justify-between p-2.5 bg-zinc-900/80 hover:bg-zinc-800 rounded-xl border border-zinc-800 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-pink-400" />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Online Payment Details</span>
                          <span className="text-[10px] bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold px-1.5 py-0.5 rounded-full">
                            Optional
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          {showPaymentSetup
                            ? 'Configure UPI or bank details now'
                            : 'Set up now or add anytime later in Profile'}
                        </p>
                      </div>
                    </div>
                    {showPaymentSetup ? (
                      <ChevronUp className="w-4 h-4 text-pink-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-pink-400" />
                    )}
                  </button>

                  {/* Expandable Payment Form */}
                  {showPaymentSetup && (
                    <div className="mt-2.5 p-3.5 bg-zinc-900/95 border border-zinc-800 rounded-2xl space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2 text-[11px] text-pink-300 bg-pink-500/10 p-2 rounded-xl border border-pink-500/20">
                        <ShieldCheck className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                        <span>
                          Customers pay directly to you. TimeMate takes <strong>₹0 commission</strong>. Cash is enabled by default.
                        </span>
                      </div>

                      {/* UPI ID */}
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                          UPI ID (e.g. Google Pay, PhonePe, Paytm)
                        </label>
                        <div className="relative">
                          <QrCode className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                          <input
                            type="text"
                            placeholder="yourname@upi or mobile@okhdfcbank"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            className="w-full pl-8 pr-2.5 py-2 text-xs bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden font-mono"
                          />
                        </div>
                      </div>

                      {/* Bank Details (Optional) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 mb-0.5">
                            Bank Name (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. HDFC Bank"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 mb-0.5">
                            IFSC Code (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. HDFC0001234"
                            value={ifscCode}
                            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden uppercase font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 mb-0.5">
                          Account Number (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Bank account number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Submit Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-pink-600 hover:bg-pink-500 active:opacity-90 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_15px_rgba(255,45,141,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-xs text-zinc-400">Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs font-bold text-pink-400 hover:text-pink-300 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Your Account Email Address <span className="text-pink-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-pink-600 hover:bg-pink-500 active:opacity-90 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_15px_rgba(255,45,141,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Instructions...</span>
                </>
              ) : (
                <span>Send Password Reset Link</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
