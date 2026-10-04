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
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
        <TimeMateLogoIcon size={56} className="mb-4 shadow-[0_0_25px_rgba(255,45,141,0.5)] animate-pulse" />
        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
          Initializing TimeMate Secure Session...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col text-zinc-100 pb-16 md:pb-0 selection:bg-pink-500 selection:text-white">
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
      <footer className="bg-[#0c0c0e] border-t border-zinc-800/80 mt-16 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-zinc-400">
          <div className="flex items-center gap-3">
            <TimeMateLogoIcon size={36} />
            <div>
              <div className="font-black text-white text-sm flex items-center">
                <span>Time</span>
                <span className="bg-gradient-to-r from-pink-500 via-pink-400 to-fuchsia-500 bg-clip-text text-transparent ml-0.5">
                  Mate
                </span>
                <span className="text-zinc-500 font-normal ml-1.5 hidden sm:inline">&bull; Location-Aware Companionship Marketplace</span>
              </div>
              <div className="text-[11px] text-pink-400 font-semibold flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-pink-500" />
                Guaranteed ₹0 Platform Fee on All Bookings
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-zinc-400 font-medium">
            <button
              onClick={() => handleOpenLegal('terms')}
              className="hover:text-pink-400 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span className="text-zinc-600">&bull;</span>
            <button
              onClick={() => handleOpenLegal('privacy')}
              className="hover:text-pink-400 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-zinc-600">&bull;</span>
            <button
              onClick={() => handleOpenLegal('safety')}
              className="hover:text-pink-400 transition-colors cursor-pointer"
            >
              Safety Guidelines
            </button>
            <span className="text-zinc-600">&bull;</span>
            <a
              href="mailto:support.timemate@gmail.com"
              className="hover:text-pink-300 flex items-center gap-1 text-pink-400 font-bold"
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
