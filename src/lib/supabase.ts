import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Booking, Conversation, Message, Profile, Review } from '../types';

// Default configuration specified in project guidelines
const DEFAULT_SUPABASE_URL = 'https://nnuuiektlsouuswxxnod.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_nRtsqgxN_1JmR2jFYFPKdA_GL2uIEJx';

// Active configuration with localStorage override for quick reconnect if project reference changed
export function getActiveSupabaseConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('timemate_custom_supabase_url') : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('timemate_custom_supabase_key') : null;

  return {
    url: customUrl || envUrl || DEFAULT_SUPABASE_URL,
    key: customKey || envKey || DEFAULT_SUPABASE_KEY,
    isCustom: !!(customUrl && customKey),
  };
}

let clientInstance: SupabaseClient | null = null;
let currentClientUrl = '';
let currentClientKey = '';

export function getSupabaseClient(): SupabaseClient {
  const { url, key } = getActiveSupabaseConfig();
  if (!clientInstance || currentClientUrl !== url || currentClientKey !== key) {
    currentClientUrl = url;
    currentClientKey = key;
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

export function setCustomSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('timemate_custom_supabase_url', url.trim());
    localStorage.setItem('timemate_custom_supabase_key', key.trim());
    clientInstance = null; // force recreation
    window.location.reload();
  }
}

export function resetSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('timemate_custom_supabase_url');
    localStorage.removeItem('timemate_custom_supabase_key');
    clientInstance = null;
    window.location.reload();
  }
}

export interface BackendHealthStatus {
  ok: boolean;
  status: 'connected' | 'error' | 'project_removed' | 'offline';
  message: string;
  statusCode?: number;
  url: string;
}

export async function checkSupabaseHealth(): Promise<BackendHealthStatus> {
  const { url, key } = getActiveSupabaseConfig();
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: {
        apikey: key,
      },
    });

    if (res.status === 410) {
      return {
        ok: false,
        status: 'project_removed',
        statusCode: 410,
        message: 'Supabase project returned HTTP 410: Project removed / paused.',
        url,
      };
    }

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        status: 'error',
        statusCode: res.status,
        message: text || `HTTP ${res.status} error from Supabase`,
        url,
      };
    }

    return {
      ok: true,
      status: 'connected',
      statusCode: res.status,
      message: 'Connected to Supabase successfully',
      url,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 'offline',
      message: err?.message || 'Network error connecting to Supabase backend',
      url,
    };
  }
}

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
