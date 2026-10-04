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
  const { unreadCount } = useNotifications();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    await signOut();
    onSelectTab('discover');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSelectTab('discover')}
                className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-hidden"
              >
                <TimeMateLogoIcon size={40} className="shadow-md" />
                <div>
                  <div className="font-black text-gray-900 text-lg leading-tight tracking-tight flex items-center">
                    <span>Time</span>
                    <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent ml-0.5">
                      Mate
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium hidden sm:block">
                    Real connections. Your time.
                  </div>
                </div>
              </button>

              {/* Location Badge & Selector */}
              <div className="relative ml-2 sm:ml-4">
                <button
                  onClick={() => setLocationPickerOpen(!locationPickerOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors border border-gray-200 max-w-[150px] sm:max-w-[200px] truncate"
                  title="Click to change location"
                >
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    {location ? location.city : 'Select Location'}
                  </span>
                </button>

                {/* Location Picker Popup */}
                {locationPickerOpen && (
                  <>
                    {/* Mobile Backdrop */}
                    <div
                      className="fixed inset-0 z-40 bg-black/20 sm:hidden"
                      onClick={() => setLocationPickerOpen(false)}
                    />

                    <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 w-auto sm:w-72 max-w-md sm:max-w-none bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Choose Location
                        </span>
                        <button
                          onClick={() => setLocationPickerOpen(false)}
                          className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
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
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 mb-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      {locationLoading ? 'Detecting GPS...' : 'Use My Exact GPS Location'}
                    </button>

                    {permissionState === 'denied' && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg mb-2">
                        Location access is unavailable. Select your location manually below:
                      </p>
                    )}

                    <div className="text-[11px] font-semibold text-gray-500 mb-1.5">
                      Select City:
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {POPULAR_LOCATIONS.map((loc) => (
                        <button
                          key={loc.city}
                          onClick={() => {
                            setManualLocation(loc.city, loc.lat, loc.lng);
                            setLocationPickerOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            location?.city === loc.city
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span>{loc.city}</span>
                          <span className={`text-[10px] ${location?.city === loc.city ? 'text-indigo-100' : 'text-gray-400'}`}>
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
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                  currentTab === 'discover'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Compass className="w-4 h-4" />
                Discover
              </button>

              {isAuthenticated && (
                <>
                  <button
                    onClick={() => onSelectTab('bookings')}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                      currentTab === 'bookings'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    Bookings
                  </button>

                  <button
                    onClick={() => onSelectTab('messages')}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                      currentTab === 'messages'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Messages
                  </button>

                  <button
                    onClick={() => onSelectTab('notifications')}
                    className={`relative p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors ${
                      currentTab === 'notifications' ? 'bg-indigo-50 text-indigo-700' : ''
                    }`}
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {profile?.role === 'admin' && (
                    <button
                      onClick={() => onSelectTab('admin')}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                        currentTab === 'admin'
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-amber-600" />
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
                    className="flex items-center gap-2.5 p-1.5 pl-3.5 rounded-full border border-gray-200 hover:border-indigo-200 hover:bg-gray-50/80 transition-all focus:outline-hidden cursor-pointer shadow-2xs"
                  >
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-900 max-w-[120px] truncate">
                        {profile?.display_name || user?.email?.split('@')[0]}
                      </div>
                      <div className="text-[10px] text-indigo-600 font-semibold capitalize">
                        {profile?.role || 'Customer'}
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {profile?.display_name?.slice(0, 1).toUpperCase() || 'U'}
                    </div>
                  </button>

                  {/* Profile Dropdown */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                        <div className="text-xs font-bold text-gray-900 truncate">
                          {profile?.display_name}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate font-mono">
                          {user?.email}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onSelectTab('profile');
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        My Profile
                      </button>

                      {profile?.role === 'companion' && (
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            onSelectTab('payment-settings');
                          }}
                          className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          Payment Settings
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onSelectTab('bookings');
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Calendar className="w-4 h-4 text-gray-400" />
                        Bookings History
                      </button>

                      <div className="border-t border-gray-100 my-1" />

                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold text-gray-700 hover:text-indigo-600 rounded-xl hover:bg-gray-100/80 transition-all cursor-pointer"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => onOpenAuth('signup', 'companion')}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100/80 active:bg-indigo-200/80 rounded-xl border border-indigo-200/80 transition-all cursor-pointer shadow-2xs"
                  >
                    Become a Companion
                  </button>
                  <button
                    onClick={() => onOpenAuth('signup', 'customer')}
                    className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:opacity-90 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
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
                  className="relative p-2 text-gray-700"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Slide-down Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl">
            {isAuthenticated ? (
              <div className="p-3 bg-gray-50 rounded-xl mb-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-gray-900">{profile?.display_name}</div>
                  <div className="text-xs text-indigo-600 capitalize font-medium">{profile?.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded-lg font-semibold"
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
                  className="py-2.5 text-sm font-semibold text-center border border-gray-300 rounded-xl text-gray-700"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup', 'customer');
                  }}
                  className="py-2.5 text-sm font-semibold text-center bg-indigo-600 text-white rounded-xl shadow-xs"
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
                  currentTab === 'discover' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                }`}
              >
                <Compass className="w-5 h-5 text-indigo-600" />
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
                      currentTab === 'bookings' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Bookings & History
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSelectTab('messages');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      currentTab === 'messages' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    Messages
                  </button>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSelectTab('notifications');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                      currentTab === 'notifications' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-indigo-600" />
                      Notifications
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
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
                      currentTab === 'profile' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <User className="w-5 h-5 text-indigo-600" />
                    Profile & Account
                  </button>

                  {profile?.role === 'companion' && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onSelectTab('payment-settings');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                        currentTab === 'payment-settings' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-indigo-600" />
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
                        currentTab === 'admin' ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      <Shield className="w-5 h-5 text-amber-600" />
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 mt-2"
                >
                  <Users className="w-5 h-5" />
                  Become a Companion
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => onSelectTab('discover')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 ${
            currentTab === 'discover' ? 'text-indigo-600 font-bold' : 'text-gray-500'
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
                currentTab === 'bookings' ? 'text-indigo-600 font-bold' : 'text-gray-500'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Bookings</span>
            </button>

            <button
              onClick={() => onSelectTab('messages')}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 relative ${
                currentTab === 'messages' ? 'text-indigo-600 font-bold' : 'text-gray-500'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Messages</span>
            </button>

            <button
              onClick={() => onSelectTab('notifications')}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 relative ${
                currentTab === 'notifications' ? 'text-indigo-600 font-bold' : 'text-gray-500'
              }`}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-3 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
              <span className="text-[10px] mt-0.5">Alerts</span>
            </button>

            <button
              onClick={() => onSelectTab('profile')}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 ${
                currentTab === 'profile' ? 'text-indigo-600 font-bold' : 'text-gray-500'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Profile</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => onOpenAuth('login')}
            className="flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 text-indigo-600 font-bold"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Sign In</span>
          </button>
        )}
      </nav>
    </>
  );
};
