/**
 * Authentication Redirect & Environment URL Management
 * 
 * Ensures all Supabase authentication flows use real production domain redirects
 * in production and prevents real users on the internet from ever being redirected
 * to localhost.
 */

export const PRODUCTION_SITE_URL =
  'https://ais-pre-ihry3baec4pav4qyns7ilf-502583959534.asia-southeast1.run.app';

export const DEV_SITE_URL =
  'https://ais-dev-ihry3baec4pav4qyns7ilf-502583959534.asia-southeast1.run.app';

/**
 * Returns the environment-specific authentication redirect URL.
 * 
 * Production: https://ais-pre-ihry3baec4pav4qyns7ilf-502583959534.asia-southeast1.run.app/auth/callback
 * Development / Local: http://localhost:3000/auth/callback
 */
export function getAuthRedirectUrl(path: string = '/auth/callback'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // 1. Browser runtime check
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    const hostname = window.location.hostname;

    // If legitimately running in local development server
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${origin}${cleanPath}`;
    }

    // In deployed environment (Google Cloud Run / Custom domain)
    if (origin.startsWith('https://')) {
      return `${origin}${cleanPath}`;
    }
  }

  // 2. Build-time / environment variable fallback
  const configuredUrl =
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.APP_URL ||
    PRODUCTION_SITE_URL;

  const base = configuredUrl.replace(/\/$/, '');
  return `${base}${cleanPath}`;
}

/**
 * Parses and handles incoming auth callback parameters from the URL
 * (e.g. from magic links, confirmation redirects, or token hashes).
 */
export function handleIncomingAuthRedirect(): {
  hasAuthParams: boolean;
  type: string | null;
  errorDescription: string | null;
} {
  if (typeof window === 'undefined') {
    return { hasAuthParams: false, type: null, errorDescription: null };
  }

  const hash = window.location.hash || '';
  const search = window.location.search || '';
  const urlParams = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
  const tokenHash = urlParams.get('token_hash') || hashParams.get('token_hash');
  const code = urlParams.get('code') || hashParams.get('code');
  const type = urlParams.get('type') || hashParams.get('type');
  const errorDescription =
    urlParams.get('error_description') || hashParams.get('error_description');

  const hasAuthParams = !!(accessToken || tokenHash || code || type || errorDescription);

  return {
    hasAuthParams,
    type,
    errorDescription,
  };
}
