export interface Stadium {
  id: number;
  owner_id?: number;
  name: string;
  slug: string;
  description?: string;
  address: string;
  region?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string | null;
  yandex_maps_url?: string | null;
  phone: string;
  phone2?: string;
  telegram?: string;
  price_per_hour: number;
  price_weekend?: number;
  price_night?: number;
  width?: number;
  length?: number;
  surface?: string;
  has_lighting: boolean;
  has_changing_room: boolean;
  has_shower: boolean;
  has_parking: boolean;
  has_cafe: boolean;
  has_tribunes: boolean;
  open_time: string;
  close_time: string;
  working_days: number[];
  cover_image?: string;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  rating: number;
  total_bookings: number;
  distance_km?: number | null;
  created_at: string;
}

export interface Booking {
  id: number;
  booking_code: string;
  stadium_id: number;
  stadium_name: string;
  user_id: number;
  user_name: string;
  user_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_price: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  note?: string;
  admin_note?: string;
  created_at: string;
}

export interface User {
  id: number;
  full_name: string;
  phone?: string;
  owner_login?: string;
  role: "guest" | "user" | "owner" | "moderator" | "superadmin";
  is_active: boolean;
  must_change_password: boolean;
  telegram_id?: string;
  avatar_url?: string;
  created_at: string;
}

export interface OwnerStats {
  today_bookings: number;
  pending_bookings: number;
  monthly_revenue: number;
  active_stadiums: number;
  pending_moderation: number;
}

export interface StadiumDraft extends Omit<Stadium, "id" | "slug" | "is_active" | "is_featured" | "rating" | "total_bookings" | "created_at"> {
  id: number;
  owner_id: number;
  stadium_id?: number;
  draft_type: "create" | "update";
  status: "draft" | "pending" | "approved" | "rejected";
  reviewed_by?: number;
  review_note?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;
}

export interface ImageDraft {
  id: number;
  owner_id: number;
  stadium_id: number;
  action: "add" | "delete" | "set_cover";
  image_url: string;
  status: "pending" | "approved" | "rejected";
  review_note?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface BookingCancelRequest {
  id: number;
  booking_id: number;
  owner_id: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  review_note?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface Training {
  id: number;
  owner_id?: number;
  stadium_id?: number;
  title: string;
  slug: string;
  sport: string;
  description?: string;
  coach_name?: string;
  schedule_text?: string;
  price_text?: string;
  age_group?: string;
  address: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  telegram?: string;
  instagram?: string;
  cover_image?: string;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  stadium_name?: string;
  stadium_slug?: string;
}

export interface TrainingDraft {
  id: number;
  owner_id: number;
  training_id?: number;
  stadium_id?: number;
  draft_type: "create" | "update";
  status: "draft" | "pending" | "approved" | "rejected";
  title: string;
  sport: string;
  description?: string;
  coach_name?: string;
  schedule_text?: string;
  price_text?: string;
  age_group?: string;
  address?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  telegram?: string;
  instagram?: string;
  cover_image?: string;
  images: string[];
  reviewed_by?: number;
  review_note?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;
}

export interface AdminStatistics {
  revenue: Record<string, number>;
  booking_statuses: Record<string, number>;
  total_bookings: number;
  average_booking_price: number;
  bot_events: Record<string, number>;
  unique_telegram_users: number;
  new_users: Record<string, number>;
  conversion: Record<string, number>;
  top_by_bookings: Array<{ stadium_id: number; name: string; bookings: number }>;
  top_by_revenue: Array<{ stadium_id: number; name: string; revenue: number }>;
  pending_moderation: Record<string, number>;
  daily_revenue: Array<{ date: string; revenue: number }>;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  booking_id?: number;
}

export interface AvailabilityResponse {
  date: string;
  stadium_id: number;
  slots: TimeSlot[];
}
