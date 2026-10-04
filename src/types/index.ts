export type UserRole = 'customer' | 'companion' | 'admin';

export type PaymentMethod = 'cash' | 'online';

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'declined';

export interface CompanionPaymentSettings {
  online_enabled: boolean;
  cash_enabled: boolean;
  upi_id?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  notes?: string;
}

export interface CompanionMetadata {
  hourly_rate: number;
  languages: string[];
  services: string[];
  city: string;
  latitude: number;
  longitude: number;
  is_available: boolean;
  payment_settings: CompanionPaymentSettings;
  verification_status?: 'verified' | 'pending' | 'unverified';
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  avatar_url?: string | null;
  bio?: string | null;
  created_at?: string;
  updated_at?: string;
  // Extended fields parsed safely from bio envelope or custom metadata
  hourly_rate?: number;
  languages?: string[];
  services?: string[];
  city?: string;
  latitude?: number;
  longitude?: number;
  is_available?: boolean;
  rating?: number;
  reviews_count?: number;
  payment_settings?: CompanionPaymentSettings;
  verification_status?: 'verified' | 'pending' | 'unverified';
}

export interface Booking {
  id: string;
  created_at: string;
  updated_at?: string;
  customer_id: string;
  companion_id: string;
  date?: string;
  start_time: string;
  duration_hours: number;
  total_price: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  booking_status: BookingStatus;
  meeting_location?: string;
  // Populated relationships
  customer_profile?: Profile;
  companion_profile?: Profile;
}

export interface Conversation {
  id: string;
  created_at: string;
  last_message?: string | null;
  last_message_at?: string | null;
  participant_ids?: string[] | null;
  // UI joins
  other_participant?: Profile;
  booking_id?: string;
}

export interface Message {
  id: string;
  created_at: string;
  conversation_id: string;
  sender_id: string;
  content: string;
}

export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  companion_id: string;
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
  customer_name?: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'message' | 'system';
  is_read: boolean;
  created_at: string;
  link?: string;
}

export interface UserLocation {
  city: string;
  latitude: number;
  longitude: number;
  source: 'gps' | 'manual';
  accuracy?: number;
}
