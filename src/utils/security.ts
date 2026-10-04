/**
 * Security & Information Disclosure Hardening Utilities
 * 
 * Ensures all customer-facing messages, errors, and data representations
 * adhere to zero-information-disclosure security guidelines.
 */

/**
 * Mask an email address to protect customer privacy.
 * Example: 'technoworldz40@gmail.com' -> 't*********0@gmail.com'
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return '••••••';

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);

  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domainPart}`;
  }

  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  const maskLength = Math.max(3, Math.min(localPart.length - 2, 8));
  const stars = '*'.repeat(maskLength);

  return `${firstChar}${stars}${lastChar}@${domainPart}`;
}

/**
 * Sanitize any system, Supabase, PostgreSQL, or network error into
 * a safe, friendly, customer-facing message.
 * 
 * NEVER leaks:
 * - Table / column / schema names
 * - SQL statements or constraints
 * - RLS policy details
 * - PostgREST codes or error payloads
 * - Provider rate-limit internals
 * - JWT or auth tokens
 * - Stack traces or internal UUIDs
 */
export function sanitizeErrorMessage(
  error: unknown,
  fallback: string = 'Something went wrong. Please try again.'
): string {
  if (!error) return fallback;

  let raw = '';
  if (typeof error === 'string') {
    raw = error;
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, any>;
    raw = errObj.message || errObj.error_description || errObj.error || '';
  }

  const lower = raw.toLowerCase();

  // Authentication: Invalid login credentials
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid password') ||
    lower.includes('invalid email or password') ||
    lower.includes('wrong password')
  ) {
    return 'Email or password is incorrect.';
  }

  // Authentication: Account already registered
  if (
    lower.includes('already registered') ||
    lower.includes('user already exists') ||
    lower.includes('email already in use') ||
    lower.includes('already been registered')
  ) {
    return 'An account with this email address already exists. Please sign in instead.';
  }

  // Authentication: User not found
  if (
    lower.includes('user not found') ||
    lower.includes('email not found')
  ) {
    return 'No account was found for this email. Please create an account.';
  }

  // Authentication: Password criteria
  if (lower.includes('password') && (lower.includes('least') || lower.includes('short') || lower.includes('length'))) {
    return 'Password must be at least 6 characters.';
  }

  // Rate Limiting
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('429')
  ) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }

  // Authorization / Permissions / RLS
  if (
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('not authorized') ||
    lower.includes('forbidden')
  ) {
    return 'You do not have permission to perform this action.';
  }

  // Network / Connection
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('fetch error') ||
    lower.includes('timeout')
  ) {
    return 'Unable to connect. Please check your internet connection.';
  }

  // Database constraints
  if (
    lower.includes('duplicate key') ||
    lower.includes('unique constraint') ||
    lower.includes('foreign key') ||
    lower.includes('relation') ||
    lower.includes('pgrst') ||
    lower.includes('column') ||
    lower.includes('schema') ||
    lower.includes('sql')
  ) {
    return 'Unable to process your request at this time. Please try again.';
  }

  // Session expiry
  if (lower.includes('jwt') || lower.includes('token') || lower.includes('session expired')) {
    return 'Your session has expired. Please sign in again.';
  }

  // Mask technical payload strings
  if (
    raw.includes('{') ||
    raw.includes('}') ||
    raw.includes('(') ||
    raw.includes(')') ||
    raw.includes('http') ||
    raw.includes('SELECT') ||
    raw.includes('INSERT') ||
    raw.includes('UPDATE')
  ) {
    return fallback;
  }

  if (raw.length < 80 && !lower.includes('supabase') && !lower.includes('postgres')) {
    return raw;
  }

  return fallback;
}
