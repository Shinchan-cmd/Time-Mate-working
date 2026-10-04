import React, { useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Globe,
  MapPin,
  QrCode,
  Save,
  Shield,
  User,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, POPULAR_LOCATIONS } from '../context/LocationContext';
import { CompanionPaymentSettings } from '../types';
import { sanitizeErrorMessage } from '../utils/security';

interface ProfileViewProps {
  initialSubTab?: 'general' | 'payments';
}

export const ProfileView: React.FC<ProfileViewProps> = ({ initialSubTab = 'general' }) => {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const { location, requestCurrentLocation } = useLocation();

  const [activeSubTab, setActiveSubTab] = useState<'general' | 'payments'>(initialSubTab);

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
      setSuccessMessage('Profile and payment settings saved successfully!');
      await refreshProfile();
      setTimeout(() => setSuccessMessage(null), 3500);
    }
    setLoading(false);
  };

  // Preview helper for customer view
  const previewOnline = paymentSettings.online_enabled && !!paymentSettings.upi_id;
  const previewCash = paymentSettings.cash_enabled;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isCompanion ? 'Companion Profile & Configuration' : 'My Account & Profile'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your personal profile, services, and preferences.
          </p>
        </div>

        {/* Sub-tab pills for companions */}
        {isCompanion && (
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('general')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === 'general' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600'
              }`}
            >
              Profile &amp; Services
            </button>
            <button
              onClick={() => setActiveSubTab('payments')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'payments' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              Payment Settings
            </button>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: GENERAL PROFILE */}
        {activeSubTab === 'general' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <User className="w-4 h-4" />
              Personal &amp; Service Information
            </div>

            {/* Profile Identity Details */}
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
                  className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address (Verified Account)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Avatar / Photo URL
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                About / Bio
              </label>
              <textarea
                rows={3}
                placeholder="Describe your background, personality, interests, and companionship style..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
                      <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-bold">₹</span>
                      <input
                        type="number"
                        min="200"
                        max="10000"
                        step="50"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 text-xs md:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">Customers pay this exact rate directly.</span>
                  </div>

                  {/* Availability Switch */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Accepting Bookings Status
                    </label>
                    <label className="flex items-center gap-3 p-2 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
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

                {/* Location & GPS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Primary City / Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {/* Services & Languages */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Services (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={servicesText}
                      onChange={(e) => setServicesText(e.target.value)}
                      placeholder="Dinner Company, Social Events, City Walk"
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Languages (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={languagesText}
                      onChange={(e) => setLanguagesText(e.target.value)}
                      placeholder="English, Hindi, Kannada"
                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COMPANION PAYMENT SETTINGS (SECTION 18) */}
        {activeSubTab === 'payments' && isCompanion && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <CreditCard className="w-4 h-4" />
              Companion Payment Method Configuration
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
              Companions can configure online payment at any time. Online payment setup is entirely <strong>optional</strong>. If no valid online payment method is configured, customers will simply see <strong>"Cash on Meetup only"</strong>. TimeMate charges <strong>₹0 platform fee</strong>.
            </p>

            {/* Live Customer Preview */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                What Customers See on Your Profile:
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-bold text-sm text-gray-900">
                  {previewOnline && previewCash
                    ? 'Online (UPI) & Cash on Meetup'
                    : previewOnline
                    ? 'Online Only'
                    : previewCash
                    ? 'Cash Only'
                    : 'No payment methods enabled'}
                </span>
              </div>
            </div>

            {/* Toggle: Cash on Meetup */}
            <div className="p-4 border border-gray-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  Accept Cash on Meetup
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Allow customers to pay you cash directly in person at the scheduled event.
                </p>
              </div>
              <input
                type="checkbox"
                checked={paymentSettings.cash_enabled}
                onChange={(e) =>
                  setPaymentSettings((prev) => ({ ...prev, cash_enabled: e.target.checked }))
                }
                className="w-5 h-5 text-indigo-600 rounded"
              />
            </div>

            {/* Toggle: Online UPI */}
            <div className="p-4 border border-gray-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    Accept Online UPI Payments
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Enable direct bank/UPI payments from customers.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={paymentSettings.online_enabled}
                  onChange={(e) =>
                    setPaymentSettings((prev) => ({ ...prev, online_enabled: e.target.checked }))
                  }
                  className="w-5 h-5 text-indigo-600 rounded"
                />
              </div>

              {paymentSettings.online_enabled && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Your UPI ID / VPA <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. companion@okaxis or yourname@paytm"
                      value={paymentSettings.upi_id || ''}
                      onChange={(e) =>
                        setPaymentSettings((prev) => ({ ...prev, upi_id: e.target.value.trim() }))
                      }
                      className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-gray-500">
                      Must be your genuine verified UPI ID to receive online payments.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Bank Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC Bank"
                        value={paymentSettings.bank_name || ''}
                        onChange={(e) =>
                          setPaymentSettings((prev) => ({ ...prev, bank_name: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl"
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
                          setPaymentSettings((prev) => ({ ...prev, ifsc_code: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
