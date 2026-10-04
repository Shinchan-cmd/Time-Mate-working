import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle,
  Banknote,
  Bell,
  Camera,
  CheckCircle2,
  CreditCard,
  Globe,
  Image as ImageIcon,
  MapPin,
  QrCode,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useNotifications } from '../context/NotificationContext';
import { CompanionPaymentSettings, Profile } from '../types';
import { sanitizeErrorMessage } from '../utils/security';
import { AVATAR_PRESETS, compressAndCropImage } from '../utils/avatarPresets';
import { soundService } from '../utils/sound';

interface ProfileViewProps {
  initialSubTab?: 'general' | 'payments' | 'notifications';
}

export const ProfileView: React.FC<ProfileViewProps> = ({ initialSubTab = 'general' }) => {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const { location, requestCurrentLocation } = useLocation();
  const { permissionStatus, requestPushPermission } = useNotifications();

  const [activeSubTab, setActiveSubTab] = useState<'general' | 'payments' | 'notifications'>(
    initialSubTab
  );

  // Form Fields
  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<number>(600);
  const [city, setCity] = useState<string>('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [languagesText, setLanguagesText] = useState<string>('English');
  const [servicesText, setServicesText] = useState<string>('Companionship, Event Partner');

  // Payment Settings (for companions)
  const [paymentSettings, setPaymentSettings] = useState<CompanionPaymentSettings>({
    online_enabled: false,
    cash_enabled: true,
    upi_id: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
  });

  // Avatar presets modal & upload states
  const [showPresetsModal, setShowPresetsModal] = useState<boolean>(false);
  const [presetCategory, setPresetCategory] = useState<'all' | 'women' | 'men' | 'abstract'>('all');
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status indicators
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCompanion = profile?.role === 'companion';

  // Synchronize state with current profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
      setHourlyRate(profile.hourly_rate || 600);
      setCity(profile.city || location?.city || '');
      setLatitude(profile.latitude ?? location?.latitude);
      setLongitude(profile.longitude ?? location?.longitude);
      setIsAvailable(profile.is_available ?? true);
      setLanguagesText((profile.languages || ['English']).join(', '));
      setServicesText((profile.services || ['Companionship', 'Event Partner']).join(', '));

      if (profile.payment_settings) {
        setPaymentSettings({
          online_enabled: profile.payment_settings.online_enabled ?? false,
          cash_enabled: profile.payment_settings.cash_enabled ?? true,
          upi_id: profile.payment_settings.upi_id || '',
          bank_name: profile.payment_settings.bank_name || '',
          account_number: profile.payment_settings.account_number || '',
          ifsc_code: profile.payment_settings.ifsc_code || '',
        });
      }
    }
  }, [profile, location]);

  /**
   * Handle Photo File Upload with client-side compression
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setErrorMessage(null);

    try {
      const dataUrl = await compressAndCropImage(file, 400, 0.85);
      setAvatarUrl(dataUrl);
      setSuccessMessage('Photo selected! Click "Save Changes" below to apply.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process image file.');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedLanguages = languagesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedServices = servicesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updates: Partial<Profile> = {
      display_name: displayName.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl.trim() || undefined,
      hourly_rate: Number(hourlyRate),
      city: city.trim(),
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      is_available: isAvailable,
      languages: parsedLanguages,
      services: parsedServices,
      payment_settings: paymentSettings,
    };

    const { error } = await updateProfile(updates);

    if (error) {
      setErrorMessage(sanitizeErrorMessage(error, 'Unable to update profile. Please try again.'));
    } else {
      setSuccessMessage('Profile and settings updated successfully!');
      await refreshProfile();
      setTimeout(() => setSuccessMessage(null), 3500);
    }
    setLoading(false);
  };

  const filteredPresets = AVATAR_PRESETS.filter((p) =>
    presetCategory === 'all' ? true : p.category === presetCategory
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-white">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isCompanion ? 'Companion Profile & Configuration' : 'My Account & Profile'}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage your personal profile picture, identity, notification permissions, and preferences.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('general')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'general'
                ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(255,45,141,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Profile &amp; Avatar
          </button>

          {isCompanion && (
            <button
              onClick={() => setActiveSubTab('payments')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'payments'
                  ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(255,45,141,0.3)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payments</span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('notifications')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'notifications'
                ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(255,45,141,0.3)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: GENERAL PROFILE & AVATAR */}
        {activeSubTab === 'general' && (
          <div className="space-y-6">
            {/* AVATAR MANAGEMENT CARD */}
            <div className="bg-[#121214] rounded-3xl border border-zinc-800 p-6 shadow-xs">
              <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-wider mb-4">
                <Camera className="w-4 h-4" />
                Profile Picture / Avatar
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Current Avatar View */}
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile Avatar"
                      className="w-28 h-28 rounded-3xl object-cover ring-4 ring-pink-500/30 shadow-md"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-3xl bg-zinc-900 border border-pink-500/30 text-pink-400 flex items-center justify-center font-black text-3xl shadow-md">
                      {displayName?.slice(0, 1).toUpperCase() || 'U'}
                    </div>
                  )}

                  <span className="absolute -bottom-1.5 -right-1.5 bg-pink-500 text-white p-1.5 rounded-full ring-2 ring-[#121214] shadow-[0_0_8px_#ff2d8d]">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Avatar Action Buttons */}
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Upload or Choose an Avatar
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Personalize your TimeMate account with a photo. Visible to all members in chats and bookings.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Upload File Button */}
                    <button
                      type="button"
                      disabled={avatarUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 text-xs font-bold bg-pink-600 hover:bg-pink-500 active:opacity-90 text-white rounded-xl shadow-[0_0_10px_rgba(255,45,141,0.3)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{avatarUploading ? 'Processing...' : 'Upload Photo'}</span>
                    </button>

                    {/* Choose from Presets Button */}
                    <button
                      type="button"
                      onClick={() => setShowPresetsModal(!showPresetsModal)}
                      className="px-3.5 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                      <span>Choose Avatar Preset</span>
                    </button>

                    {/* Remove Photo */}
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {/* Manual URL entry toggle */}
                  <div className="pt-2">
                    <input
                      type="url"
                      placeholder="Or paste an image URL (e.g. https://...)"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl focus:border-pink-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Collapsible Avatar Presets Selector */}
              {showPresetsModal && (
                <div className="mt-6 pt-5 border-t border-zinc-800 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-zinc-300">
                      Select a Curated Avatar Preset:
                    </span>
                    <div className="flex items-center gap-1 text-[11px]">
                      {(['all', 'women', 'men', 'abstract'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPresetCategory(cat)}
                          className={`px-2 py-0.5 rounded-md font-semibold capitalize cursor-pointer transition-colors ${
                            presetCategory === cat
                              ? 'bg-pink-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {filteredPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setAvatarUrl(preset.url);
                          setShowPresetsModal(false);
                        }}
                        className={`group relative rounded-2xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                          avatarUrl === preset.url
                            ? 'border-pink-500 ring-2 ring-pink-500/40 scale-105'
                            : 'border-zinc-800 hover:border-pink-400 hover:scale-102'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-2xs text-[9px] text-white text-center py-0.5 truncate font-semibold">
                          {preset.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Identity Details */}
            <div className="bg-[#121214] rounded-3xl border border-zinc-800 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-wider">
                <User className="w-4 h-4" />
                Personal Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Display / Public Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Email Address (Verified)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-zinc-800 bg-zinc-900 text-zinc-500 rounded-xl cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  About / Bio
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your interests, personality, and companionship style..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden"
                />
              </div>

              {/* Companion Specific Fields */}
              {isCompanion && (
                <div className="pt-4 border-t border-zinc-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Hourly Rate */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Listed Hourly Rate (INR) &bull; ₹0 Platform Fee
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-xs text-pink-400 font-bold">₹</span>
                        <input
                          type="number"
                          min="200"
                          max="10000"
                          step="50"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(Number(e.target.value))}
                          className="w-full pl-8 pr-3.5 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden font-semibold"
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500">Customers pay this exact rate directly.</span>
                    </div>

                    {/* Availability Switch */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Accepting Bookings Status
                      </label>
                      <label className="flex items-center gap-3 p-2.5 border border-zinc-700 bg-zinc-900 rounded-xl cursor-pointer hover:border-pink-500/40">
                        <input
                          type="checkbox"
                          checked={isAvailable}
                          onChange={(e) => setIsAvailable(e.target.checked)}
                          className="w-4 h-4 text-pink-500 rounded"
                        />
                        <span className="text-xs font-bold text-white">
                          {isAvailable ? 'Available for Bookings' : 'Paused / Unavailable'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Languages Spoken (comma separated)
                      </label>
                      <input
                        type="text"
                        value={languagesText}
                        onChange={(e) => setLanguagesText(e.target.value)}
                        placeholder="e.g. English, Hindi, Kannada"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Services Offered (comma separated)
                      </label>
                      <input
                        type="text"
                        value={servicesText}
                        onChange={(e) => setServicesText(e.target.value)}
                        placeholder="e.g. Event Partner, City Guide, Coffee & Talk"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* City and GPS Location */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Primary Operating City &amp; Geolocation
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Bangalore"
                          className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:outline-hidden"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await requestCurrentLocation();
                          if (location) {
                            setCity(location.city);
                            setLatitude(location.latitude);
                            setLongitude(location.longitude);
                          }
                        }}
                        className="px-3.5 py-2 bg-pink-500/15 text-pink-300 border border-pink-500/30 hover:bg-pink-500/25 rounded-xl font-semibold text-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-pink-400" />
                        Use GPS
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: COMPANION PAYMENT SETTINGS */}
        {activeSubTab === 'payments' && isCompanion && (
          <div className="bg-[#121214] rounded-3xl border border-zinc-800 p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-wider mb-1">
                <CreditCard className="w-4 h-4" />
                Direct Payment Reception Methods
              </div>
              <p className="text-xs text-zinc-400">
                Configure how customers pay you. TimeMate guarantees <strong>₹0 platform commission</strong>.
              </p>
            </div>

            {/* Payment Method Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-zinc-800 rounded-2xl bg-zinc-900 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-xs sm:text-sm text-white">Cash in Person</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={paymentSettings.cash_enabled}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, cash_enabled: e.target.checked })
                    }
                    className="w-4 h-4 text-pink-500 rounded"
                  />
                </label>
                <p className="text-[11px] text-zinc-400">
                  Allow customers to pay you cash directly when meeting.
                </p>
              </div>

              <div className="p-4 border border-zinc-800 rounded-2xl bg-zinc-900 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-pink-400" />
                    <span className="font-bold text-xs sm:text-sm text-white">Direct Online UPI</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={paymentSettings.online_enabled}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, online_enabled: e.target.checked })
                    }
                    className="w-4 h-4 text-pink-500 rounded"
                  />
                </label>
                <p className="text-[11px] text-zinc-400">
                  Allow customers to pay via UPI (GPay, PhonePe, Paytm).
                </p>
              </div>
            </div>

            {/* UPI & Bank Details Form */}
            {paymentSettings.online_enabled && (
              <div className="p-5 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-4 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Your UPI ID <span className="text-pink-500">*</span>
                  </label>
                  <div className="relative">
                    <QrCode className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="e.g. yourname@okhdfcbank or mobile@upi"
                      value={paymentSettings.upi_id || ''}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, upi_id: e.target.value })
                      }
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:outline-hidden font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 block">
                    Customers will see this UPI ID and QR code to pay you directly.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Bank Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank, ICICI Bank"
                      value={paymentSettings.bank_name || ''}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, bank_name: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      IFSC Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={paymentSettings.ifsc_code || ''}
                      onChange={(e) =>
                        setPaymentSettings({
                          ...paymentSettings,
                          ifsc_code: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-800 border border-zinc-700 text-white uppercase rounded-xl focus:border-pink-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Account Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50100234567890"
                    value={paymentSettings.account_number || ''}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, account_number: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-zinc-800 border border-zinc-700 text-white rounded-xl focus:border-pink-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NOTIFICATION ALERTS SETTINGS */}
        {activeSubTab === 'notifications' && (
          <div className="bg-[#121214] rounded-3xl border border-zinc-800 p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Bell className="w-4 h-4" />
                Live Notification &amp; Sound Settings
              </div>
              <p className="text-xs text-zinc-400">
                Configure browser push alerts and audio notifications for booking requests and chats.
              </p>
            </div>

            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Browser Push Notifications</h4>
                  <p className="text-[11px] text-zinc-400">
                    Status:{' '}
                    <strong
                      className={
                        permissionStatus === 'granted'
                          ? 'text-emerald-400 uppercase'
                          : 'text-amber-400 uppercase'
                      }
                    >
                      {permissionStatus}
                    </strong>
                  </p>
                </div>
                {permissionStatus !== 'granted' && (
                  <button
                    type="button"
                    onClick={requestPushPermission}
                    className="px-3.5 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_10px_rgba(255,45,141,0.3)] cursor-pointer"
                  >
                    Enable Push
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Audio Chime Test</h4>
                  <p className="text-[11px] text-zinc-400">
                    Test the incoming message sound using Web Audio API synthesis.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => soundService.playMessageChime()}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Test Sound 🔔
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-pink-600 hover:bg-pink-500 active:opacity-90 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-[0_0_15px_rgba(255,45,141,0.4)] transition-all flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
