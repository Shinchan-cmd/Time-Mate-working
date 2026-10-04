import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient, parseProfileRecord, serializeProfileBio } from '../lib/supabase';
import { Profile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  emailConfirmationPending: string | null;
  clearEmailConfirmationNotice: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role: UserRole
  ) => Promise<{ error: Error | null; confirmationRequired: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [emailConfirmationPending, setEmailConfirmationPending] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  const fetchProfileForUser = useCallback(async (supabaseUser: User): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile from Supabase:', error.message);
        return null;
      }

      if (data) {
        return parseProfileRecord(data);
      }

      // If user is authenticated in Supabase Auth but public.profiles record is missing,
      // create it automatically to ensure profiles.user_id = auth.users.id
      const meta = supabaseUser.user_metadata || {};
      const newRole: UserRole = meta.role === 'companion' ? 'companion' : meta.role === 'admin' ? 'admin' : 'customer';
      const displayName = meta.display_name || supabaseUser.email?.split('@')[0] || 'User';

      const initialBio = newRole === 'companion'
        ? serializeProfileBio('Welcome to my profile. Available for friendly companionship and social events.', {
            hourly_rate: 600,
            languages: ['English'],
            services: ['Social Companion', 'Event Partner'],
            is_available: true,
            payment_settings: { online_enabled: false, cash_enabled: true },
          })
        : 'TimeMate member';

      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: supabaseUser.id,
          email: supabaseUser.email,
          display_name: displayName,
          role: newRole,
          bio: initialBio,
        })
        .select()
        .single();

      if (insertError) {
        console.warn('Could not auto-create profile record:', insertError.message);
        // Return a local representation linked to user.id so app can function
        return {
          id: supabaseUser.id,
          user_id: supabaseUser.id,
          email: supabaseUser.email || '',
          display_name: displayName,
          role: newRole,
          bio: initialBio,
          is_available: true,
          hourly_rate: 600,
        };
      }

      return parseProfileRecord(created);
    } catch (err) {
      console.error('Unexpected error in fetchProfileForUser:', err);
      return null;
    }
  }, [supabase]);

  // Initial session restoration
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession error:', error.message);
        }

        if (isMounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            const prof = await fetchProfileForUser(initialSession.user);
            if (isMounted) setProfile(prof);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen to real Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          const prof = await fetchProfileForUser(newSession.user);
          if (isMounted) {
            setProfile(prof);
            setLoading(false);
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfileForUser]);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error };
      }

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        const prof = await fetchProfileForUser(data.user);
        setProfile(prof);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole
  ): Promise<{ error: Error | null; confirmationRequired: boolean }> => {
    try {
      const initialBio = role === 'companion'
        ? serializeProfileBio('', {
            hourly_rate: 600,
            languages: ['English'],
            services: ['Companionship'],
            city: '',
            is_available: true,
            payment_settings: {
              online_enabled: false,
              cash_enabled: true,
            },
          })
        : 'TimeMate member';

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            role,
          },
        },
      });

      if (error) {
        return { error, confirmationRequired: false };
      }

      // Check if session was created or if email confirmation is required
      if (data.session && data.user) {
        // Direct session created! Create profile record immediately
        setSession(data.session);
        setUser(data.user);

        const { data: createdProf, error: pErr } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            email: data.user.email,
            display_name: displayName.trim(),
            role,
            bio: initialBio,
          })
          .select()
          .single();

        if (pErr) {
          console.warn('Could not insert profile right after signup:', pErr.message);
        }

        if (createdProf) {
          setProfile(parseProfileRecord(createdProf));
        } else {
          setProfile({
            id: data.user.id,
            user_id: data.user.id,
            email: data.user.email || '',
            display_name: displayName.trim(),
            role,
            bio: initialBio,
            is_available: true,
            hourly_rate: 600,
          });
        }

        return { error: null, confirmationRequired: false };
      }

      // If user created but no session, confirmation link was sent
      if (data.user && !data.session) {
        setEmailConfirmationPending(email.trim());
        return { error: null, confirmationRequired: true };
      }

      return { error: null, confirmationRequired: false };
    } catch (err: any) {
      return { error: err, confirmationRequired: false };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setEmailConfirmationPending(null);
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<{ error: Error | null }> => {
    if (!user || !profile) {
      return { error: new Error('User is not authenticated') };
    }

    try {
      // Serialize bio if extended attributes are being updated
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

  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const resendConfirmationEmail = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const clearEmailConfirmationNotice = () => {
    setEmailConfirmationPending(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAuthenticated: !!user && !!session,
        emailConfirmationPending,
        clearEmailConfirmationNotice,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
        resetPassword,
        resendConfirmationEmail,
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
