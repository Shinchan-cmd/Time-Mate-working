import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Profile } from '../types';

// Default configuration specified in project guidelines
const DEFAULT_SUPABASE_URL = 'https://nnuuiektlsouuswxxnod.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_nRtsqgxN_1JmR2jFYFPKdA_GL2uIEJx';

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  if (!clientInstance) {
    clientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

export const supabase = getSupabaseClient();

// Metadata helper for rich companion profile properties
// Stores extra structured metadata inside the bio column safely as an envelope if needed
export function serializeProfileBio(
  plainBio: string,
  extra: {
    hourly_rate?: number;
    languages?: string[];
    services?: string[];
    city?: string;
    latitude?: number;
    longitude?: number;
    is_available?: boolean;
    payment_settings?: Profile['payment_settings'];
    verification_status?: 'verified' | 'pending' | 'unverified';
  }
): string {
  const envelope = {
    __timemate_meta: true,
    bio: plainBio || '',
    hourly_rate: extra.hourly_rate ?? 500,
    languages: extra.languages ?? ['English'],
    services: extra.services ?? ['Companionship'],
    city: extra.city ?? '',
    latitude: extra.latitude ?? 0,
    longitude: extra.longitude ?? 0,
    is_available: extra.is_available ?? true,
    payment_settings: extra.payment_settings ?? {
      online_enabled: false,
      cash_enabled: true,
    },
    verification_status: extra.verification_status ?? 'verified',
  };
  return JSON.stringify(envelope);
}

export function parseProfileRecord(row: any): Profile {
  if (!row) return row;
  let parsedBio = row.bio || '';
  let hourly_rate = row.hourly_rate ?? 500;
  let languages = row.languages ?? ['English'];
  let services = row.services ?? ['Companionship'];
  let city = row.city ?? '';
  let latitude = row.latitude ?? 0;
  let longitude = row.longitude ?? 0;
  let is_available = row.is_available ?? true;
  let payment_settings = row.payment_settings ?? {
    online_enabled: false,
    cash_enabled: true,
  };
  let verification_status = row.verification_status ?? 'verified';

  if (typeof row.bio === 'string' && row.bio.trim().startsWith('{"__timemate_meta":')) {
    try {
      const data = JSON.parse(row.bio);
      parsedBio = data.bio || '';
      if (data.hourly_rate !== undefined) hourly_rate = Number(data.hourly_rate);
      if (Array.isArray(data.languages)) languages = data.languages;
      if (Array.isArray(data.services)) services = data.services;
      if (data.city) city = data.city;
      if (data.latitude !== undefined) latitude = Number(data.latitude);
      if (data.longitude !== undefined) longitude = Number(data.longitude);
      if (data.is_available !== undefined) is_available = Boolean(data.is_available);
      if (data.payment_settings) payment_settings = data.payment_settings;
      if (data.verification_status) verification_status = data.verification_status;
    } catch {
      parsedBio = row.bio;
    }
  }

  return {
    ...row,
    bio: parsedBio,
    hourly_rate,
    languages,
    services,
    city,
    latitude,
    longitude,
    is_available,
    payment_settings,
    verification_status,
  };
}
