import React, { useState, useRef } from 'react';
import {
  AlertCircle,
  Banknote,
  Bell,
  BellRing,
  Camera,
  CheckCircle2,
  CreditCard,
  Globe,
  Image as ImageIcon,
  MapPin,
  QrCode,
  Save,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  User,
  Volume2,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, POPULAR_LOCATIONS } from '../context/LocationContext';
import { useNotifications } from '../context/NotificationContext';
import { CompanionPaymentSettings } from '../types';
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

  const [activeSubTab, setActiveSubTab] = useState<'general' | 'payments' | 'notifications'>(initialSubTab);

  // Form states
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [hourlyRate, setHourlyRate] = useState<number>(profile?.hourly_rate || 600);
  const [city, setCity] = useState(profile?.city || location?.city || '');
  const [latitude, setLatitude] = useState<number>(profile?.latitude || location?.latitude || 12.9716);
  const [longitude, setLongitude] = useState<number>(profile?.longitude || location?.longitude || 77.5946);
  const [isAvailable, setIsAvailable] = useState<boolean>(profile?.is_available ?? true);

  // Services & Languages
  const [languagesText, setLanguagesText] = useState((profile?.languages || ['English']).join(', '));
  const [servicesText, setServicesText] = useState((profile?.services || ['Companionship', 'Event Partner']).join(', '));

  // Avatar presets gallery toggle
  const [showPresetsModal, setShowPresetsModal] = useState<boolean>(false);
  const [presetCategory, setPresetCategory] = useState<'all' | 'women' | 'men' | 'abstract'>('all');
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Companion Payment Settings
  const [paymentSettings, setPaymentSettings] = useState<CompanionPaymentSettings>({
    online_enabled: profile?.payment_settings?.online_enabled ?? false,
    cash_enabled: profile?.payment_settings?.cash_enabled ?? true,
    upi_id: profile?.payment_settings?.upi_id || '',
    bank_name: profile?.payment_settings?.bank_name || '',
    account_number: profile?.payment_settings?.account_number || '',
    ifsc_code: profile?.payment_settings?.ifsc_code || '',
  });

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCompanion = profile?.role === 'companion';

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
      setSuccessMessage('Profile picture loaded! Click "Save Changes" below to update.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to process image file.');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const parsedLanguages = languagesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedServices = servicesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updates: any = {
      display_name: displayName.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl.trim() || null,
      hourly_rate: Number(hourlyRate),
      city: city.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isCompanion ? 'Companion Profile & Configuration' : 'My Account & Profile'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your personal profile picture, identity, notification permissions, and preferences.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('general')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'general' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Profile &amp; Avatar
          </button>

          {isCompanion && (
            <button
              onClick={() => setActiveSubTab('payments')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'payments' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              <span>Payments</span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('notifications')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'notifications' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
            <span>Alerts</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: GENERAL PROFILE & AVATAR */}
        {activeSubTab === 'general' && (
          <div className="space-y-6">
            {/* AVATAR MANAGEMENT CARD (FOR BOTH COMPANIONS & CUSTOMERS) */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-4">
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
                      className="w-28 h-28 rounded-3xl object-cover ring-4 ring-indigo-50 shadow-md"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-3xl shadow-md">
                      {displayName?.slice(0, 1).toUpperCase() || 'U'}
                    </div>
                  )}

                  <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1.5 rounded-full ring-2 ring-white shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Avatar Action Buttons */}
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Upload or Choose an Avatar
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
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
                      className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{avatarUploading ? 'Processing...' : 'Upload Photo'}</span>
                    </button>

                    {/* Choose from Presets Button */}
                    <button
                      type="button"
                      onClick={() => setShowPresetsModal(!showPresetsModal)}
                      className="px-3.5 py-2 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Choose Avatar Preset</span>
                    </button>

                    {/* Remove Photo */}
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
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
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Collapsible Avatar Presets Selector */}
              {showPresetsModal && (
                <div className="mt-6 pt-5 border-t border-gray-100 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-800">
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
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                            ? 'border-indigo-600 ring-2 ring-indigo-500/40 scale-105'
                            : 'border-transparent hover:border-indigo-300 hover:scale-102'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-2xs text-[9px] text-white text-center py-0.5 truncate font-semibold">
                          {preset.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Identity Details */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                <User className="w-4 h-4" />
                Personal Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Display / Public Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address (Verified)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  About / Bio
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your interests, personality, and companionship style..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Companion Specific Fields */}
              {isCompanion && (
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Hourly Rate */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Listed Hourly Rate (INR) &bull; ₹0 Platform Fee
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 text-xs text-gray-500 font-bold">₹</span>
                        <input
                          type="number"
                          min="200"
                          max="10000"
                          step="50"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(Number(e.target.value))}
                          className="w-full pl-8 pr-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold"
                        />
                      </div>
                      <span className="text-[10px] text-gray-500">Customers pay this exact rate directly.</span>
                    </div>

                    {/* Availability Switch */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Accepting Bookings Status
                      </label>
                      <label className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={isAvailable}
                          onChange={(e) => setIsAvailable(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-xs font-bold text-gray-800">
                          {isAvailable ? 'Available for Bookings' : 'Paused / Unavailable'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Languages Spoken (comma separated)
                      </label>
                      <input
                        type="text"
                        value={languagesText}
                        onChange={(e) => setLanguagesText(e.target.value)}
                        placeholder="e.g. English, Hindi, Kannada"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Services Offered (comma separated)
                      </label>
                      <input
                        type="text"
                        value={servicesText}
                        onChange={(e) => setServicesText(e.target.value)}
                        placeholder="e.g. Event Partner, City Guide, Coffee & Talk"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* City and GPS Location */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Primary Operating City &amp; Geolocation
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Bangalore"
                          className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
                        className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-semibold text-xs transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
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
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                <CreditCard className="w-4 h-4" />
                Direct Payment Reception Methods
              </div>
              <p className="text-xs text-gray-500">
                Configure how customers pay you. TimeMate guarantees <strong>₹0 platform commission</strong>.
              </p>
            </div>

            {/* Payment Method Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50/50 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-xs sm:text-sm text-gray-900">Cash in Person</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={paymentSettings.cash_enabled}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, cash_enabled: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>
                <p className="text-[11px] text-gray-500">
                  Allow customers to pay you cash directly when meeting.
                </p>
              </div>

              <div className="p-4 border border-gray-200 rounded-2xl bg-gray-50/50 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-xs sm:text-sm text-gray-900">Direct Online UPI</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={paymentSettings.online_enabled}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, online_enabled: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </label>
                <p className="text-[11px] text-gray-500">
                  Allow customers to pay via UPI (GPay, PhonePe, Paytm).
                </p>
              </div>
            </div>

            {/* UPI & Bank Details Form */}
            {paymentSettings.online_enabled && (
              <div className="p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-4 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Your UPI ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <QrCode className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. yourname@okhdfcbank or mobile@upi"
                      value={paymentSettings.upi_id || ''}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, upi_id: e.target.value })
                      }
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Customers will see this UPI ID and QR code to pay you directly.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Bank Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={paymentSettings.bank_name || ''}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, bank_name: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      IFSC Code (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={paymentSettings.ifsc_code || ''}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, ifsc_code: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden uppercase font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Account Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50100234567890"
                    value={paymentSettings.account_number || ''}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, account_number: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APP NOTIFICATIONS & SOUND ACCESS */}
        {activeSubTab === 'notifications' && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                <BellRing className="w-4 h-4" />
                Notification &amp; Sound Alerts Access
              </div>
              <p className="text-xs text-gray-500">
                Receive instant sound chimes and browser push notifications for real-time messages and booking updates.
              </p>
            </div>

            {/* Permission Status Box */}
            <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    permissionStatus === 'granted'
                      ? 'bg-emerald-100 text-emerald-700'
                      : permissionStatus === 'denied'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    <span>Browser Push Notifications</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        permissionStatus === 'granted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : permissionStatus === 'denied'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {permissionStatus === 'granted'
                        ? 'Active & Allowed'
                        : permissionStatus === 'denied'
                        ? 'Blocked in Browser'
                        : 'Action Needed'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {permissionStatus === 'granted'
                      ? 'You are receiving real-time alerts for chats and booking updates even when the tab is in the background.'
                      : 'Grant permission so TimeMate can notify you instantly when a user messages you or sends a booking.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {permissionStatus !== 'granted' ? (
                  <button
                    type="button"
                    onClick={requestPushPermission}
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Enable Notifications
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playMessageChime();
                      setSuccessMessage('Test chime played successfully!');
                      setTimeout(() => setSuccessMessage(null), 3000);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    <span>Test Sound Chime</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form Action Save Button */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:opacity-90 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
