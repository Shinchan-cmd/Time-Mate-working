import React, { useState } from 'react';
import {
  Bell,
  Calendar,
  Compass,
  CreditCard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, POPULAR_LOCATIONS } from '../context/LocationContext';
import { useNotifications } from '../context/NotificationContext';
import { UserRole } from '../types';
import { TimeMateLogoIcon } from './TimeMateLogo';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: (mode?: 'login' | 'signup', role?: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenAuth }) => {
  const { user, profile, isAuthenticated, signOut } = useAuth();
  const { location, setManualLocation, requestCurrentLocation, permissionState, loading: locationLoading } = useLocation();
  const { unreadCount, permissionStatus, requestPushPermission, activeToast, dismissToast } = useNotifications();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [hidePromptBanner, setHidePromptBanner] = useState(false);

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    await signOut();
    onSelectTab('discover');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSelectTab('discover')}
                className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-hidden"
              >
                <TimeMateLogoIcon size={40} className="shadow-[0_0_12px_rgba(255,45,141,0.35)]" />
                <div>
                  <div className="font-black text-white text-lg leading-tight tracking-tight flex items-center">
                    <span>Time</span>
                    <span className="bg-gradient-to-r from-pink-500 via-pink-400 to-fuchsia-500 bg-clip-text text-transparent ml-0.5">
                      Mate
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-medium hidden sm:block">
                    Real connections. Your time.
                  </div>
                </div>
              </button>

              {/* Location Badge & Selector */}
              <div className="relative ml-2 sm:ml-4">
                <button
                  onClick={() => setLocationPickerOpen(!locationPickerOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors border border-zinc-800 hover:border-pink-500/40 max-w-[150px] sm:max-w-[200px] truncate cursor-pointer shadow-xs"
                  title="Click to change location"
                >
                  <MapPin className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                  <span className="truncate">
                    {location ? location.city : 'Select Location'}
                  </span>
                </button>

                {/* Location Picker Popup */}
                {locationPickerOpen && (
                  <>
                    {/* Mobile Backdrop */}
                    <div
                      className="fixed inset-0 z-40 bg-black/60 sm:hidden"
                      onClick={() => setLocationPickerOpen(false)}
                    />

                    <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 w-auto sm:w-72 max-w-md sm:max-w-none bg-[#121214] rounded-2xl shadow-2xl border border-zinc-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Choose Location
                        </span>
                        <button
                          onClick={() => setLocationPickerOpen(false)}
                          className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          aria-label="Close location picker"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={async () => {
                          await requestCurrentLocation();
                          setLocationPickerOpen(false);
                        }}
                        disabled={locationLoading}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-3 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 text-xs font-semibold rounded-xl border border-pink-500/30 transition-colors cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-pink-500" />
                        {locationLoading ? 'Detecting GPS...' : 'Use My Exact GPS Location'}
                      </button>

                      {permissionState === 'denied' && (
                        <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg mb-2">
                          Location access is unavailable. Select your location manually below:
                        </p>
                      )}

                      <div className="text-[11px] font-semibold text-zinc-400 mb-1.5">
                        Select City:
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {POPULAR_LOCATIONS.map((loc) => (
                          <button
                            key={loc.city}
                            onClick={() => {
                              setManualLocation(loc.city, loc.lat, loc.lng);
                              setLocationPickerOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              location?.city === loc.city
                                ? 'bg-pink-600 text-white font-semibold shadow-[0_0_10px_rgba(255,45,141,0.3)]'
                                : 'hover:bg-zinc-800/80 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <span>{loc.city}</span>
                            <span className={`text-[10px] ${location?.city === loc.city ? 'text-pink-200' : 'text-zinc-500'}`}>
                              {loc.state}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              <button
                onClick={() => onSelectTab('discover')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  currentTab === 'discover'
                    ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30 shadow-[0_0_12px_rgba(255,45,141,0.2)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Compass className="w-4 h-4 text-pink-500" />
                Discover
              </button>

              {isAuthenticated && (
                <>
                  <button
                    onClick={() => onSelectTab('bookings')}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                      currentTab === 'bookings'
                        ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30 shadow-[0_0_12px_rgba(255,45,141,0.2)]'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-pink-500" />
                    Bookings
                  </button>

                  <button
                    onClick={() => onSelectTab('messages')}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                      currentTab === 'messages'
                        ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30 shadow-[0_0_12px_rgba(255,45,141,0.2)]'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-pink-500" />
                    Messages
                  </button>

                  <button
                    onClick={() => onSelectTab('notifications')}
                    className={`relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all cursor-pointer ${
                      currentTab === 'notifications'
                        ? 'bg-pink-500/15 text-pink-400 border border-pink-500/30 shadow-[0_0_12px_rgba(255,45,141,0.2)]'
                        : ''
                    }`}
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5 text-pink-500" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-pink-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_#ff2d8d]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {profile?.role === 'admin' && (
                    <button
                      onClick={() => onSelectTab('admin')}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                        currentTab === 'admin'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-amber-400" />
                      Admin
                    </button>
                  )}
                </>
              )}
            </nav>

            {/* Desktop Auth Controls */}
            <div className="hidden md:flex items-center gap-2.5">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2.5 p-1 pl-3.5 rounded-full border border-zinc-800 hover:border-pink-500/40 bg-zinc-900/90 hover:bg-zinc-800 transition-all focus:outline-hidden cursor-pointer shadow-xs"
                  >
                    <div className="text-right">
                      <div className="text-xs font-bold text-white max-w-[120px] truncate">
                        {profile?.display_name || user?.email?.split('@')[0]}
                      </div>
                      <div className="text-[10px] text-pink-400 font-semibold capitalize">
                        {profile?.role || 'Customer'}
                      </div>
                    </div>
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-pink-500/50"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {profile?.display_name?.slice(0, 1).toUpperCase() || 'U'}
                      </div>
                    )}
                  </button>

                  {/* Profile Dropdown */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-[#121214] rounded-2xl shadow-2xl border border-zinc-800 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50 rounded-t-2xl">
                        <div className="text-xs font-bold text-white truncate">
                          {profile?.display_name}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate font-mono">
                          {user?.email}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onSelectTab('profile');
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-zinc-300 hover:bg-pink-500/10 hover:text-pink-300 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-pink-500" />
                        My Profile
                      </button>

                      {profile?.role === 'companion' && (
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            onSelectTab('payment-settings');
                          }}
                          className="w-full px-4 py-2 text-left text-xs text-zinc-300 hover:bg-pink-500/10 hover:text-pink-300 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-pink-500" />
                          Payment Settings
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onSelectTab('bookings');
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-zinc-300 hover:bg-pink-500/10 hover:text-pink-300 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Calendar className="w-4 h-4 text-pink-500" />
                        Bookings History
                      </button>

                      {profile?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            onSelectTab('admin');
                          }}
                          className="w-full px-4 py-2 text-left text-xs text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 font-bold transition-colors cursor-pointer"
                        >
                          <Shield className="w-4 h-4 text-amber-400" />
                          Admin Dashboard
                        </button>
                      )}

                      <div className="border-t border-zinc-800 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-400" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold text-zinc-300 hover:text-pink-400 rounded-xl hover:bg-zinc-800/60 transition-all cursor-pointer"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => onOpenAuth('signup', 'companion')}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold text-pink-400 bg-pink-500/10 hover:bg-pink-500/20 active:bg-pink-500/30 rounded-xl border border-pink-500/40 hover:border-pink-500 transition-all cursor-pointer shadow-[0_0_10px_rgba(255,45,141,0.15)]"
                  >
                    Become a Companion
                  </button>
                  <button
                    onClick={() => onOpenAuth('signup', 'customer')}
                    className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-pink-600 hover:bg-pink-500 active:opacity-90 rounded-xl shadow-[0_0_15px_rgba(255,45,141,0.4)] transition-all cursor-pointer"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex items-center gap-2 md:hidden">
              {isAuthenticated && unreadCount > 0 && (
                <button
                  onClick={() => onSelectTab('notifications')}
                  className="relative p-2 text-zinc-300"
                >
                  <Bell className="w-5 h-5 text-pink-500" />
                  <span className="absolute top-1 right-1 w-4 h-4 bg-pink-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-[0_0_6px_#ff2d8d]">
                    {unreadCount}
                  </span>
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Slide-down Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-[#0c0c0e] px-4 pt-3 pb-6 space-y-3 shadow-2xl">
            {isAuthenticated ? (
              <div className="p-3 bg-zinc-900 rounded-xl mb-3 flex items-center justify-between border border-zinc-800">
                <div>
                  <div className="font-bold text-sm text-white">{profile?.display_name}</div>
                  <div className="text-xs text-pink-400 capitalize font-medium">{profile?.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg font-semibold"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="py-2.5 text-sm font-semibold text-center border border-zinc-700 hover:border-pink-500/50 rounded-xl text-zinc-200 bg-zinc-900"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup', 'customer');
                  }}
                  className="py-2.5 text-sm font-semibold text-center bg-pink-600 hover:bg-pink-500 text-white rounded-xl shadow-[0_0_15px_rgba(255,45,141,0.35)]"
                >
                  Sign Up
                </button>
              </div>
            )}

            <div className="space-y-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('discover');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  currentTab === 'discover'
                    ? 'bg-pink-500/15 text-pink-400 font-semibold border border-pink-500/30'
                    : 'text-zinc-300'
                }`}
              >
                <Compass className="w-5 h-5 text-pink-500" />
                Discover Companions
              </button>

              {isAuthenticated && (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSelectTab('bookings');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      currentTab === 'bookings'
                        ? 'bg-pink-500/15 text-pink-400 font-semibold border border-pink-500/30'
                        : 'text-zinc-300'
                    }`}
                  >
                    <Calendar className="w-5 h-5 text-pink-500" />
                    Bookings & History
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSelectTab('messages');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      currentTab === 'messages'
                        ? 'bg-pink-500/15 text-pink-400 font-semibold border border-pink-500/30'
                        : 'text-zinc-300'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 text-pink-500" />
                    Messages
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSelectTab('notifications');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                      currentTab === 'notifications'
                        ? 'bg-pink-500/15 text-pink-400 font-semibold border border-pink-500/30'
                        : 'text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-pink-500" />
                      Notifications
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-pink-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-[0_0_6px_#ff2d8d]">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSelectTab('profile');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      currentTab === 'profile'
                        ? 'bg-pink-500/15 text-pink-400 font-semibold border border-pink-500/30'
                        : 'text-zinc-300'
                    }`}
                  >
                    <User className="w-5 h-5 text-pink-500" />
                    Profile & Account
                  </button>

                  {profile?.role === 'companion' && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onSelectTab('payment-settings');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                        currentTab === 'payment-settings'
                          ? 'bg-pink-500/15 text-pink-400 font-semibold border border-pink-500/30'
                          : 'text-zinc-300'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-pink-500" />
                      Payment Settings
                    </button>
                  )}

                  {profile?.role === 'admin' && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onSelectTab('admin');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                        currentTab === 'admin'
                          ? 'bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/40'
                          : 'text-zinc-300'
                      }`}
                    >
                      <Shield className="w-5 h-5 text-amber-400" />
                      Admin Console
                    </button>
                  )}
                </>
              )}

              {!isAuthenticated && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup', 'companion');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-pink-400 bg-pink-500/10 border border-pink-500/30 mt-2"
                >
                  <Users className="w-5 h-5 text-pink-500" />
                  Become a Companion
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Floating In-App Live Notification Toast */}
      {activeToast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-[#121214] rounded-2xl shadow-2xl border border-pink-500/40 p-3.5 animate-in slide-in-from-top-4 fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,45,141,0.4)]">
              {activeToast.type === 'message' ? (
                <MessageSquare className="w-5 h-5" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white truncate">
                  {activeToast.title}
                </span>
                <button
                  onClick={dismissToast}
                  className="text-zinc-400 hover:text-white text-xs p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-zinc-300 mt-0.5 line-clamp-2">
                {activeToast.message}
              </p>
              {activeToast.link && (
                <button
                  onClick={() => {
                    onSelectTab(activeToast.link!);
                    dismissToast();
                  }}
                  className="text-[11px] text-pink-400 hover:text-pink-300 font-bold mt-1.5 inline-flex items-center gap-1 cursor-pointer"
                >
                  View Details &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Permission Request Banner */}
      {isAuthenticated && permissionStatus === 'default' && !hidePromptBanner && (
        <div className="bg-gradient-to-r from-pink-950 via-pink-900 to-purple-950 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-pink-500/30 shadow-xs">
          <div className="flex items-center gap-2 max-w-2xl">
            <Bell className="w-4 h-4 text-pink-400 animate-bounce shrink-0" />
            <span>
              <strong>Never miss a message!</strong> Enable browser push notifications to get instant sound &amp; live alerts on booking requests and chats.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={requestPushPermission}
              className="px-3 py-1 bg-pink-500 hover:bg-pink-400 text-white font-bold rounded-lg transition-colors cursor-pointer text-[11px] shadow-[0_0_10px_rgba(255,45,141,0.4)]"
            >
              Turn On
            </button>
            <button
              onClick={() => setHidePromptBanner(true)}
              className="text-white/80 hover:text-white p-1 cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-md border-t border-zinc-800 px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => onSelectTab('discover')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 ${
            currentTab === 'discover' ? 'text-pink-400 font-bold' : 'text-zinc-500'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Discover</span>
        </button>

        {isAuthenticated ? (
          <>
            <button
              onClick={() => onSelectTab('bookings')}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 ${
                currentTab === 'bookings' ? 'text-pink-400 font-bold' : 'text-zinc-500'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Bookings</span>
            </button>

            <button
              onClick={() => onSelectTab('messages')}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 relative ${
                currentTab === 'messages' ? 'text-pink-400 font-bold' : 'text-zinc-500'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Messages</span>
            </button>

            <button
              onClick={() => onSelectTab('notifications')}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 relative ${
                currentTab === 'notifications' ? 'text-pink-400 font-bold' : 'text-zinc-500'
              }`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-3 w-3.5 h-3.5 bg-pink-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-[0_0_6px_#ff2d8d]">
                  {unreadCount}
                </span>
              )}
              <span className="text-[10px] mt-0.5">Alerts</span>
            </button>

            <button
              onClick={() => onSelectTab('profile')}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 ${
                currentTab === 'profile' ? 'text-pink-400 font-bold' : 'text-zinc-500'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Profile</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => onOpenAuth('login')}
            className="flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 text-pink-400 font-bold"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Sign In</span>
          </button>
        )}
      </nav>
    </>
  );
};
