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
 * Checks whether an error is a rate limit or cooldown restriction from Supabase Auth.
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  let raw = '';
  if (typeof error === 'string') {
    raw = error;
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, any>;
    raw = errObj.message || errObj.error_description || errObj.error || '';
    if (errObj.status === 429) return true;
  }
  const lower = raw.toLowerCase();
  return (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('security purposes') ||
    lower.includes('cooldown') ||
    lower.includes('429')
  );
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
export function sanitizeErrorMessage(error: unknown, fallback: string = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;

  let raw = '';
  if (typeof error === 'string') {
    raw = error;
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, any>;
    raw = errObj.message || errObj.error_description || errObj.error || '';
  }

  const lower = raw.toLowerCase();

  // Rate Limiting & Cooldowns
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('security purposes') ||
    lower.includes('429')
  ) {
    return 'Too many code requests. Please wait before requesting another code.';
  }

  // Authentication: OTP verification errors
  if (
    lower.includes('token is expired') ||
    lower.includes('token has expired') ||
    lower.includes('otp_expired') ||
    lower.includes('invalid token') ||
    lower.includes('token is invalid') ||
    lower.includes('invalid otp') ||
    lower.includes('token not found')
  ) {
    return 'That code is incorrect or has expired. Please request a new code.';
  }

  // Authentication: Sign in user not found (when shouldCreateUser is false)
  if (
    lower.includes('user not found') ||
    lower.includes('signups not allowed for otp') ||
    lower.includes('email not found')
  ) {
    return 'No account was found for this email. Please switch to Create Account.';
  }

  // Authentication: Invalid credentials
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid password')
  ) {
    return 'The credentials you entered are incorrect.';
  }

  // Authentication: Email confirmation required
  if (lower.includes('email not confirmed') || lower.includes('unconfirmed')) {
    return 'Email verification required. Please check your inbox or request a new link.';
  }

  // Authentication: Account already registered
  if (
    lower.includes('already registered') ||
    lower.includes('user already exists') ||
    lower.includes('email already in use')
  ) {
    return 'An account with this email address already exists. Please sign in instead.';
  }

  // Authentication: Password length
  if (lower.includes('password') && (lower.includes('least') || lower.includes('short'))) {
    return 'Password must be at least 6 characters.';
  }

  // Rate Limiting
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('429')
  ) {
    return 'Too many requests. Please wait a few minutes before trying again.';
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
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  // Database constraints / foreign keys / duplicate records
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

  // If the raw message contains technical identifiers or code, mask it
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

  // If it's a short, human-safe message without tech jargon, it can be passed through safely
  if (raw.length < 80 && !lower.includes('supabase') && !lower.includes('postgres')) {
    return raw;
  }

  return fallback;
}
