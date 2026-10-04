import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  HeartHandshake,
  Mail,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth, SignupMetadata } from '../context/AuthContext';
import { UserRole, CompanionPaymentSettings } from '../types';
import { TimeMateLogoIcon } from './TimeMateLogo';
import { maskEmail, sanitizeErrorMessage, isRateLimitError } from '../utils/security';

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
  const { sendOtp, verifyOtp } = useAuth();

  // Mode & step states
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [step, setStep] = useState<'details' | 'otp'>('details');

  // Form input states
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(600);

  // Optional Companion Payment Details
  const [showPaymentSetup, setShowPaymentSetup] = useState<boolean>(false);
  const [upiId, setUpiId] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');

  // OTP 6-digit state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // In-flight operation guards to strictly prevent duplicate parallel requests
  const isSendingOtpRef = useRef<boolean>(false);
  const isVerifyingRef = useRef<boolean>(false);

  // Async & feedback states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cooldown countdown for resending OTP
  const [cooldown, setCooldown] = useState<number>(0);
  const [resending, setResending] = useState(false);

  // Sync mode & reset states whenever modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setStep('details');
      setOtpDigits(['', '', '', '', '', '']);
      setErrorMessage(null);
      setSuccessMessage(null);
      setLoading(false);
      setResending(false);
      setShowPaymentSetup(false);
      isSendingOtpRef.current = false;
      isVerifyingRef.current = false;
    }
  }, [isOpen, initialMode, initialRole]);

  // Clean cooldown interval timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Focus first OTP input when switching to OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

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
   * Single Canonical Send Verification Handler with Strict In-Flight Locking
   */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard against duplicate / rapid concurrent invocations
    if (isSendingOtpRef.current || loading) return;

    if (cooldown > 0) {
      setErrorMessage(`Please wait ${cooldown} seconds before requesting another code.`);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      setErrorMessage('Please enter your full name or display name.');
      return;
    }

    // Lock submission
    isSendingOtpRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const signupMetadata: SignupMetadata | undefined =
      mode === 'signup'
        ? {
            displayName: displayName.trim(),
            role,
            city: city.trim() || undefined,
            hourlyRate: role === 'companion' ? hourlyRate : undefined,
            paymentSettings: buildCompanionPaymentSettings(),
          }
        : undefined;

    try {
      const { error } = await sendOtp(cleanEmail, mode === 'signup', signupMetadata);

      if (error) {
        if (isRateLimitError(error)) {
          setCooldown(60);
          setErrorMessage('Too many code requests. Please wait before requesting another code.');
        } else {
          setErrorMessage(
            sanitizeErrorMessage(
              error,
              mode === 'login'
                ? 'No account was found for this email. Please switch to Create Account.'
                : 'Unable to send confirmation email. Please try again.'
            )
          );
        }
      } else {
        setStep('otp');
        setOtpDigits(['', '', '', '', '', '']);
        setCooldown(60);
        setSuccessMessage(`Confirmation email sent to ${maskEmail(cleanEmail)}.`);
      }
    } catch (err) {
      if (isRateLimitError(err)) {
        setCooldown(60);
        setErrorMessage('Too many code requests. Please wait before requesting another code.');
      } else {
        setErrorMessage(sanitizeErrorMessage(err, 'Unable to send confirmation email. Please try again.'));
      }
    } finally {
      setLoading(false);
      isSendingOtpRef.current = false;
    }
  };

  /**
   * Resend Handler with Synchronous Locking and Rate-Limit Detection
   */
  const handleResendOtp = async () => {
    if (isSendingOtpRef.current || resending || cooldown > 0) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    isSendingOtpRef.current = true;
    setResending(true);
    setErrorMessage(null);

    const signupMetadata: SignupMetadata | undefined =
      mode === 'signup'
        ? {
            displayName: displayName.trim(),
            role,
            city: city.trim() || undefined,
            hourlyRate: role === 'companion' ? hourlyRate : undefined,
            paymentSettings: buildCompanionPaymentSettings(),
          }
        : undefined;

    try {
      const { error } = await sendOtp(cleanEmail, mode === 'signup', signupMetadata);

      if (error) {
        if (isRateLimitError(error)) {
          setCooldown(60);
          setErrorMessage('Too many code requests. Please wait before requesting another code.');
        } else {
          setErrorMessage(
            sanitizeErrorMessage(
              error,
              'Too many verification requests. Please wait a moment before trying again.'
            )
          );
        }
      } else {
        setCooldown(60);
        setSuccessMessage(`A fresh confirmation email was sent to ${maskEmail(cleanEmail)}.`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      if (isRateLimitError(err)) {
        setCooldown(60);
        setErrorMessage('Too many code requests. Please wait before requesting another code.');
      } else {
        setErrorMessage(
          sanitizeErrorMessage(
            err,
            'Too many verification requests. Please wait a moment before trying again.'
          )
        );
      }
    } finally {
      setResending(false);
      isSendingOtpRef.current = false;
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const digitsOnly = val.replace(/\D/g, '');

    // Handle full 6-digit paste
    if (digitsOnly.length > 1) {
      const splitDigits = digitsOnly.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      splitDigits.forEach((d, i) => {
        newDigits[i] = d;
      });
      setOtpDigits(newDigits);

      const nextIndex = Math.min(splitDigits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();

      if (splitDigits.length === 6) {
        triggerVerify(newDigits.join(''));
      }
      return;
    }

    const singleDigit = digitsOnly.slice(-1);
    const updated = [...otpDigits];
    updated[index] = singleDigit;
    setOtpDigits(updated);

    if (singleDigit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (updated.every((d) => d !== '')) {
      triggerVerify(updated.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const triggerVerify = async (fullToken: string) => {
    if (isVerifyingRef.current || loading) return;

    if (fullToken.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    isVerifyingRef.current = true;
    setErrorMessage(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const signupMetadata: SignupMetadata | undefined =
      mode === 'signup'
        ? {
            displayName: displayName.trim(),
            role,
            city: city.trim() || undefined,
            hourlyRate: role === 'companion' ? hourlyRate : undefined,
            paymentSettings: buildCompanionPaymentSettings(),
          }
        : undefined;

    try {
      const { error, user } = await verifyOtp(cleanEmail, fullToken, signupMetadata);

      if (error || !user) {
        setErrorMessage(
          sanitizeErrorMessage(
            error,
            'That verification code is incorrect or has expired. Please try again.'
          )
        );
      } else {
        setSuccessMessage('Successfully verified! Redirecting...');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 600);
      }
    } catch (err) {
      setErrorMessage(
        sanitizeErrorMessage(
          err,
          'That verification code is incorrect or has expired. Please try again.'
        )
      );
    } finally {
      setLoading(false);
      isVerifyingRef.current = false;
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerVerify(otpDigits.join(''));
  };

  const handleChangeEmail = () => {
    setStep('details');
    setOtpDigits(['', '', '', '', '', '']);
    setErrorMessage(null);
    setSuccessMessage(null);
    isSendingOtpRef.current = false;
    isVerifyingRef.current = false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 md:p-8 shadow-2xl border border-gray-100 my-auto max-h-[94vh] overflow-y-auto">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
          {step === 'otp' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleChangeEmail}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                aria-label="Change email address"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email</span>
              </button>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Confirmation email sent</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Secure Email Verification</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 hover:text-gray-900 transition-colors shadow-xs cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Brand Logo & Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <TimeMateLogoIcon size={52} className="shadow-lg" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {step === 'otp'
              ? 'Confirmation email sent'
              : mode === 'login'
              ? 'Sign in to Time Mate'
              : 'Create your Time Mate account'}
          </h2>
          <p className="text-xs text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
            {step === 'otp' ? (
              <>
                We sent a secure verification code to{' '}
                <span className="font-semibold text-gray-800 font-mono">
                  {maskEmail(email)}
                </span>
                . Enter the 6-digit code below to continue.
              </>
            ) : mode === 'login' ? (
              'Enter your email to receive a secure one-time verification code.'
            ) : (
              'Join the location-aware companionship marketplace with zero platform fees.'
            )}
          </p>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{successMessage}</span>
          </div>
        )}

        {/* STEP 1: Details & Email Entry */}
        {step === 'details' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  isSendingOtpRef.current = false;
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
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
                  isSendingOtpRef.current = false;
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Account Type Selection (Only for SignUp) */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">I want to join as</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      role === 'customer'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs ring-1 ring-indigo-500/30'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-xs">Customer</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-snug">
                      Book verified companions near you
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('companion')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      role === 'companion'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs ring-1 ring-indigo-500/30'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <HeartHandshake className="w-4 h-4 text-pink-600" />
                      <span className="font-bold text-xs">Companion</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-snug">
                      Offer companionship &amp; earn directly
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Name Input (SignUp only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name / Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Sharma"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Companion specific profile helpers */}
            {mode === 'signup' && role === 'companion' && (
              <>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Primary City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="e.g. Bangalore"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Hourly Rate (₹)
                    </label>
                    <input
                      type="number"
                      min={200}
                      step={50}
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold"
                    />
                  </div>
                </div>

                {/* Optional Online Payment Details Section */}
                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowPaymentSetup(!showPaymentSetup)}
                    className="w-full flex items-center justify-between p-2.5 bg-indigo-50/60 hover:bg-indigo-50 rounded-xl border border-indigo-100 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                          <span>Online Payment Details</span>
                          <span className="text-[10px] bg-indigo-200/80 text-indigo-800 font-semibold px-1.5 py-0.5 rounded-full">
                            Optional
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          {showPaymentSetup
                            ? 'Configure UPI or bank details now'
                            : 'Set up now or add anytime later in Profile'}
                        </p>
                      </div>
                    </div>
                    {showPaymentSetup ? (
                      <ChevronUp className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-indigo-600" />
                    )}
                  </button>

                  {/* Expandable Payment Form */}
                  {showPaymentSetup && (
                    <div className="mt-2.5 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2 text-[11px] text-emerald-800 bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Customers pay directly to you. TimeMate takes <strong>₹0 commission</strong>. Cash is enabled by default.
                        </span>
                      </div>

                      {/* UPI ID */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          UPI ID (e.g. Google Pay, PhonePe, Paytm)
                        </label>
                        <div className="relative">
                          <QrCode className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="yourname@upi or mobile@okhdfcbank"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            className="w-full pl-8 pr-2.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                          />
                        </div>
                      </div>

                      {/* Bank Details (Optional) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                            Bank Name (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. HDFC Bank"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                            IFSC Code (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. HDFC0001234"
                            value={ifscCode}
                            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden uppercase font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                          Account Number (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Bank account number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Submit Send Verification Code Button */}
            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:opacity-90 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Confirmation Email...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Request available in {cooldown}s</span>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send Confirmation Code</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: 6-Digit Code Verification Screen */}
        {step === 'otp' && (
          <form onSubmit={handleVerifySubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 text-center">
                Enter the 6-digit code sent to your email
              </label>

              {/* 6 Individual Numeric Boxes */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono rounded-2xl border transition-all focus:outline-hidden ${
                      digit
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-2 ring-indigo-500/30'
                        : 'border-gray-300 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                    aria-label={`Digit ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Verify Code Button */}
            <button
              type="submit"
              disabled={loading || otpDigits.some((d) => !d)}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:opacity-90 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Code &amp; Continue</span>
                </>
              )}
            </button>

            {/* Resend & Change Email Actions */}
            <div className="pt-2 border-t border-gray-100 flex flex-col items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-gray-500">
                <span>Didn't receive a code?</span>
                {cooldown > 0 ? (
                  <span className="font-semibold text-gray-700">
                    Resend in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={resending}
                    onClick={handleResendOtp}
                    className="font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {resending ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleChangeEmail}
                className="text-[11px] text-gray-500 hover:text-gray-800 underline transition-colors cursor-pointer"
              >
                Entered incorrect email? Change email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
