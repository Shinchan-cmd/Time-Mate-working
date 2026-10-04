import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient, parseProfileRecord, serializeProfileBio } from '../lib/supabase';
import { Profile, UserRole, CompanionPaymentSettings } from '../types';
import { getAuthRedirectUrl, handleIncomingAuthRedirect } from '../utils/authRedirect';

export interface SignupMetadata {
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  city?: string;
  services?: string[];
  languages?: string[];
  hourlyRate?: number;
  paymentSettings?: CompanionPaymentSettings;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; user: User | null }>;
  signUp: (
    email: string,
    password: string,
    signupData: SignupMetadata
  ) => Promise<{ error: Error | null; user: User | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const supabase = getSupabaseClient();

  const fetchProfileForUser = useCallback(
    async (supabaseUser: User, signupData?: SignupMetadata): Promise<Profile | null> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', supabaseUser.id)
          .maybeSingle();

        if (data) {
          const parsed = parseProfileRecord(data);
          if (
            supabaseUser.email === 'technoworldz40@gmail.com' ||
            supabaseUser.email?.toLowerCase().startsWith('admin@')
          ) {
            parsed.role = 'admin';
          }
          return parsed;
        }

        // Profile record does not exist yet. Create and link to authenticated UUID: profiles.user_id = supabaseUser.id
        const meta = supabaseUser.user_metadata || {};
        const isAdminEmail =
          supabaseUser.email === 'technoworldz40@gmail.com' ||
          supabaseUser.email?.toLowerCase().startsWith('admin@');

        const chosenRole: UserRole =
          signupData?.role ||
          (isAdminEmail
            ? 'admin'
            : meta.role === 'companion'
            ? 'companion'
            : meta.role === 'admin'
            ? 'admin'
            : 'customer');

        const chosenDisplayName =
          signupData?.displayName?.trim() ||
          meta.display_name ||
          supabaseUser.email?.split('@')[0] ||
          'User';

        const companionPaymentConfig: CompanionPaymentSettings = signupData?.paymentSettings || {
          online_enabled: false,
          cash_enabled: true,
        };

        const initialBio =
          chosenRole === 'companion'
            ? serializeProfileBio('Welcome to my profile. Available for friendly companionship and social events.', {
                hourly_rate: signupData?.hourlyRate ?? 600,
                languages: signupData?.languages ?? ['English'],
                services: signupData?.services ?? ['Companionship', 'Event Partner'],
                city: signupData?.city ?? '',
                is_available: true,
                payment_settings: companionPaymentConfig,
                verification_status: 'verified',
              })
            : 'TimeMate member';

        const initialAvatarUrl = signupData?.avatarUrl || meta.avatar_url || null;

        const { data: created, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: supabaseUser.id,
            email: supabaseUser.email,
            display_name: chosenDisplayName,
            role: chosenRole,
            avatar_url: initialAvatarUrl,
            bio: initialBio,
          })
          .select()
          .single();

        if (created) {
          return parseProfileRecord(created);
        }

        // Fallback profile object linked to the authentic user.id
        return {
          id: supabaseUser.id,
          user_id: supabaseUser.id,
          email: supabaseUser.email || '',
          display_name: chosenDisplayName,
          role: chosenRole,
          avatar_url: initialAvatarUrl || undefined,
          bio: initialBio,
          is_available: true,
          hourly_rate: signupData?.hourlyRate ?? 600,
        };
      } catch {
        return null;
      }
    },
    [supabase]
  );

  // Initial session restoration from Supabase Auth
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const incoming = handleIncomingAuthRedirect();
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (isMounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            const prof = await fetchProfileForUser(initialSession.user);
            if (isMounted) setProfile(prof);

            // If arrived via auth redirect params, clean URL bar
            if (incoming.hasAuthParams && typeof window !== 'undefined') {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen to real Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !newSession?.user) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(newSession);
      setUser(newSession.user);
      const prof = await fetchProfileForUser(newSession.user);
      if (isMounted) {
        setProfile(prof);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfileForUser]);

  /**
   * Real Supabase Email + Password Sign In
   */
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null; user: User | null }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { error, user: null };
      }

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        const prof = await fetchProfileForUser(data.user);
        setProfile(prof);
        return { error: null, user: data.user };
      }

      return { error: null, user: data.user };
    } catch (err: any) {
      return { error: err, user: null };
    }
  };

  /**
   * Real Supabase Email + Password Sign Up
   */
  const signUp = async (
    email: string,
    password: string,
    signupData: SignupMetadata
  ): Promise<{ error: Error | null; user: User | null }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            display_name: signupData.displayName.trim(),
            role: signupData.role,
          },
        },
      });

      if (error) {
        return { error, user: null };
      }

      if (data.user) {
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          const prof = await fetchProfileForUser(data.user, signupData);
          setProfile(prof);
        } else {
          // If session was not immediately returned (e.g. Supabase default behavior), sign in directly
          const { data: loginData } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (loginData?.session && loginData?.user) {
            setSession(loginData.session);
            setUser(loginData.user);
            const prof = await fetchProfileForUser(loginData.user, signupData);
            setProfile(prof);
          }
        }
        return { error: null, user: data.user };
      }

      return { error: new Error('Unable to complete account registration.'), user: null };
    } catch (err: any) {
      return { error: err, user: null };
    }
  };

  /**
   * Real Supabase Password Reset Request
   */
  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const redirectUrl = getAuthRedirectUrl('/auth/callback');
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Handled silently
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error: Error | null }> => {
    if (!user || !profile) {
      return { error: new Error('User is not authenticated') };
    }

    try {
      let bioPayload = updates.bio ?? profile.bio ?? '';
      if (
        profile.role === 'companion' ||
        updates.hourly_rate !== undefined ||
        updates.languages !== undefined ||
        updates.services !== undefined ||
        updates.city !== undefined ||
        updates.latitude !== undefined ||
        updates.longitude !== undefined ||
        updates.is_available !== undefined ||
        updates.payment_settings !== undefined
      ) {
        bioPayload = serializeProfileBio(bioPayload, {
          hourly_rate: updates.hourly_rate ?? profile.hourly_rate,
          languages: updates.languages ?? profile.languages,
          services: updates.services ?? profile.services,
          city: updates.city ?? profile.city,
          latitude: updates.latitude ?? profile.latitude,
          longitude: updates.longitude ?? profile.longitude,
          is_available: updates.is_available ?? profile.is_available,
          payment_settings: updates.payment_settings ?? profile.payment_settings,
        });
      }

      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.display_name !== undefined) dbUpdates.display_name = updates.display_name;
      if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
      dbUpdates.bio = bioPayload;

      const { data, error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { error };
      }

      const updated = parseProfileRecord(data);
      setProfile(updated);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfileForUser(user);
      setProfile(prof);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAuthenticated: !!user && !!session,
        signIn,
        signUp,
        resetPassword,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
