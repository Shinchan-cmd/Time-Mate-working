import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { LegalModal } from './components/LegalModal';
import { DiscoverView } from './views/DiscoverView';
import { BookingsView } from './views/BookingsView';
import { MessagesView } from './views/MessagesView';
import { NotificationsView } from './views/NotificationsView';
import { ProfileView } from './views/ProfileView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { Profile, UserRole } from './types';
import { Heart, Mail, ShieldCheck } from 'lucide-react';
import { TimeMateLogoIcon } from './components/TimeMateLogo';

const MainApp: React.FC = () => {
  const { user, profile, loading: authLoading, isAuthenticated } = useAuth();

  const [currentTab, setCurrentTab] = useState<string>('discover');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('customer');
  const [pendingTabAfterAuth, setPendingTabAfterAuth] = useState<string | null>(null);

  // Target user for direct messaging
  const [targetMessageUserId, setTargetMessageUserId] = useState<string | null>(null);

  // Legal modal state
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [legalSection, setLegalSection] = useState<'terms' | 'privacy' | 'safety'>('terms');

  const handleOpenAuth = (mode: 'login' | 'signup' = 'login', role: UserRole = 'customer') => {
    setAuthInitialMode(mode);
    setAuthInitialRole(role);
    setAuthModalOpen(true);
  };

  const handleSelectTab = (tab: string) => {
    const protectedTabs = ['bookings', 'messages', 'notifications', 'profile', 'payment-settings', 'admin'];

    if (protectedTabs.includes(tab) && !isAuthenticated) {
      setPendingTabAfterAuth(tab);
      handleOpenAuth('login');
      return;
    }

    if (tab === 'admin' && profile?.role !== 'admin') {
      setCurrentTab('discover');
      return;
    }

    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenMessageWith = (companion: Profile) => {
    if (!isAuthenticated) {
      handleOpenAuth('login');
      return;
    }
    setTargetMessageUserId(companion.user_id || companion.id);
    setCurrentTab('messages');
  };

  const handleOpenLegal = (section: 'terms' | 'privacy' | 'safety') => {
    setLegalSection(section);
    setLegalModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <TimeMateLogoIcon size={56} className="mb-4 shadow-xl animate-pulse" />
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
          Initializing TimeMate Secure Session...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60 flex flex-col text-gray-900 pb-16 md:pb-0">
      {/* Main Responsive Header Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentTab === 'discover' && (
          <DiscoverView
            onOpenAuth={handleOpenAuth}
            onOpenMessageWith={handleOpenMessageWith}
          />
        )}

        {currentTab === 'bookings' && (
          <BookingsView
            onOpenMessageWithUserId={(uid) => {
              setTargetMessageUserId(uid);
              setCurrentTab('messages');
            }}
          />
        )}

        {currentTab === 'messages' && (
          <MessagesView initialTargetUserId={targetMessageUserId} />
        )}

        {currentTab === 'notifications' && (
          <NotificationsView onNavigateTab={handleSelectTab} />
        )}

        {currentTab === 'profile' && <ProfileView initialSubTab="general" />}

        {currentTab === 'payment-settings' && <ProfileView initialSubTab="payments" />}

        {currentTab === 'admin' && profile?.role === 'admin' && <AdminDashboardView />}
      </main>

      {/* Production Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <TimeMateLogoIcon size={36} />
            <div>
              <div className="font-black text-gray-900 text-sm flex items-center">
                <span>Time</span>
                <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent ml-0.5">
                  Mate
                </span>
                <span className="text-gray-400 font-normal ml-1.5">&bull; Location-Aware Companionship Marketplace</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Guaranteed ₹0 Platform Fee on All Bookings
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-gray-600 font-medium">
            <button
              onClick={() => handleOpenLegal('terms')}
              className="hover:text-indigo-600 transition-colors"
            >
              Terms of Service
            </button>
            &bull;
            <button
              onClick={() => handleOpenLegal('privacy')}
              className="hover:text-indigo-600 transition-colors"
            >
              Privacy Policy
            </button>
            &bull;
            <button
              onClick={() => handleOpenLegal('safety')}
              className="hover:text-indigo-600 transition-colors"
            >
              Safety Guidelines
            </button>
            &bull;
            <a
              href="mailto:support.timemate@gmail.com"
              className="hover:text-indigo-600 flex items-center gap-1 text-indigo-600 font-bold"
            >
              <Mail className="w-3.5 h-3.5" />
              support.timemate@gmail.com
            </a>
          </div>
        </div>
      </footer>

      {/* Central Single Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authInitialMode}
        initialRole={authInitialRole}
        onSuccess={() => {
          if (pendingTabAfterAuth) {
            setCurrentTab(pendingTabAfterAuth);
            setPendingTabAfterAuth(null);
          }
        }}
      />

      {/* Legal & Safety Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialSection={legalSection}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
