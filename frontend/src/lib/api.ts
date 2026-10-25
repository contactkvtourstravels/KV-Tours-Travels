/**
 * Reusable API client for communicating with the FastAPI backend.
 * Handles cookie credentials, CSRF token retrieval, and error parsing.
 */

export interface SafeUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string;
  roles: string[];
  is_email_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: SafeUser;
  message: string;
  access_token?: string | null;
  token_type?: string | null;
}

export interface MessageResponse {
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      location: string[];
      message: string;
      type: string;
    }>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RecentBookingItem {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  package_name: string;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  created_at: string;
}

export interface RecentInquiryItem {
  id: string;
  name: string;
  email: string;
  message_preview: string;
  status: string;
  source: string;
  created_at: string;
}

export interface RecentAuditItem {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_email: string | null;
  created_at: string;
}

export interface AdminDashboardMetrics {
  total_customers: number;
  total_users: number;
  total_destinations: number;
  published_destinations: number;
  total_packages: number;
  published_packages: number;
  active_hotels?: number;
  active_activities?: number;
  upcoming_departures?: number;
  total_revenue?: number;
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  total_inquiries: number;
  unread_inquiries: number;
  recent_bookings: RecentBookingItem[];
  recent_inquiries: RecentInquiryItem[];
  recent_audit_activity: RecentAuditItem[];
}

export interface MediaUploadResponse {
  url: string;
  public_id: string | null;
  storage_type: "cloudinary" | "local";
  filename: string;
}

export interface AdminSiteSettings {
  // Business Identity
  legal_business_name?: string | null;
  agency_name: string;
  public_display_name?: string | null;
  short_name?: string | null;
  admin_panel_name?: string | null;
  admin_portal_subtitle?: string | null;
  tagline: string;
  logo_url?: string | null;
  secondary_logo_url?: string | null;
  favicon_url?: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
  brand_accent_color?: string | null;
  primary_font?: string | null;
  secondary_font?: string | null;
  year_established?: number | null;
  registration_number?: string | null;
  tax_id?: string | null;
  business_description?: string | null;
  registered_office_address?: string | null;
  office_address: string;
  public_office_address?: string | null;
  agency_location?: string;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  time_zone?: string;
  currency: string;

  // Contact Details
  contact_phone: string;
  secondary_phone?: string | null;
  support_whatsapp: string;
  emergency_phone: string;
  contact_email: string;
  customer_support_email?: string | null;
  booking_email?: string | null;
  general_inquiry_email?: string | null;
  reply_to_email?: string | null;

  // Social & Online
  instagram_handle?: string;
  instagram_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  website_url?: string | null;
  google_maps_url?: string | null;

  // Google Maps & Office Location
  google_maps_embed_url?: string | null;
  google_maps_latitude?: number | null;
  google_maps_longitude?: number | null;
  google_maps_zoom?: number | null;
  google_maps_display_enabled?: boolean;
  google_maps_directions_url?: string | null;
  office_location_label?: string | null;

  // SEO & Social Metadata
  seo_website_title?: string | null;
  seo_meta_description?: string | null;
  seo_og_image_url?: string | null;
  seo_social_title?: string | null;
  seo_social_description?: string | null;
  organization_structured_data?: Record<string, unknown> | null;

  // Business Information
  operating_hours: string;
  business_hours?: string | null;
  holiday_notice?: string | null;
  office_contact_instructions?: string | null;

  // WhatsApp Click-to-Chat
  whatsapp_number?: string;
  whatsapp_country_code?: string;
  whatsapp_prefilled_message?: string;
  whatsapp_package_message?: string;
  whatsapp_destination_message?: string;
  whatsapp_custom_trip_message?: string;
  whatsapp_booking_support_message?: string;
  whatsapp_enabled?: boolean;
  whatsapp_show_floating_concierge?: boolean;
  whatsapp_concierge_floating?: boolean;
  whatsapp_show_header_button?: boolean;
  whatsapp_show_on_homepage?: boolean;
  whatsapp_show_on_footer?: boolean;
  whatsapp_show_on_package_pages?: boolean;
  whatsapp_show_on_contact_page?: boolean;

  // WhatsApp Cloud API
  whatsapp_cloud_api_enabled?: boolean;
  whatsapp_phone_number_id?: string | null;
  whatsapp_business_account_id?: string | null;
  whatsapp_api_version?: string;
  whatsapp_access_token?: string | null;
  whatsapp_access_token_configured?: boolean;
  whatsapp_access_token_masked?: string | null;
  whatsapp_verify_token?: string | null;
  whatsapp_verify_token_configured?: boolean;
  whatsapp_verify_token_masked?: string | null;
  whatsapp_app_secret?: string | null;
  whatsapp_app_secret_configured?: boolean;
  whatsapp_app_secret_masked?: string | null;

  // Resend Email Configuration
  email_environment_mode?: "development" | "production" | string;
  email_provider?: string;
  resend_api_key?: string | null;
  resend_api_key_configured?: boolean;
  resend_api_key_masked?: string | null;
  resend_webhook_signing_secret?: string | null;
  resend_webhook_signing_secret_configured?: boolean;
  resend_webhook_signing_secret_masked?: string | null;
  resend_webhook_url?: string | null;
  resend_webhook_tunnel_url?: string | null;
  email_sender_name?: string;
  email_sender_email?: string;
  email_reply_to?: string;
  admin_notification_email?: string | null;
  email_enabled?: boolean;
  email_booking_confirmation_enabled?: boolean;
  email_inquiry_ack_enabled?: boolean;
  email_payment_receipt_enabled?: boolean;
  email_cancellation_updates_enabled?: boolean;
  email_trip_reminders_enabled?: boolean;
  email_subject_booking_confirmation?: string;
  email_subject_payment_receipt?: string;
  email_subject_inquiry_ack?: string;
  email_subject_trip_reminder?: string;

  // Homepage Content & Visibility
  hero_headline?: string;
  hero_subtitle?: string;
  hero_image_url?: string | null;
  contact_cta_text?: string;
  whatsapp_cta_text?: string;
  featured_destination_ids?: string[];
  featured_package_ids?: string[];
  promo_banner_active?: boolean;
  promo_banner_text?: string | null;
  promo_banner_link?: string | null;
  best_offers_enabled?: boolean;

  // Travel Voucher & PDF Customization
  pdf_header_title?: string | null;
  pdf_header_subtitle?: string | null;
  pdf_office_address?: string | null;
  pdf_contact_info?: string | null;
  pdf_checkin_instructions?: string | null;
  pdf_logistics_notice?: string | null;
  pdf_helpline_info?: string | null;
  pdf_footer_declaration?: string | null;
  pdf_badge_label?: string | null;
  pdf_logo_url?: string | null;

  updated_at?: string;
}

export interface EmailTestConnectionResponse {
  success: boolean;
  status: string;
  message: string;
  provider: string;
  api_key_configured: boolean;
  sender_domain?: string | null;
  sender_status?: string | null;
  is_sandbox?: boolean;
  permitted_recipients_note?: string | null;
  dns_records?: Array<{ record: string; name: string; type: string; value: string; status: string; priority?: number }> | null;
  details?: Record<string, unknown> | null;
}

export interface EmailSendTestResponse {
  success: boolean;
  message: string;
  provider: string;
  message_id?: string | null;
  recipient: string;
  timestamp: string;
}

export interface ResendWebhookVerifyRequest {
  signing_secret?: string;
}

export interface ResendWebhookVerifyResponse {
  success: boolean;
  status: string;
  message: string;
  webhook_url: string;
  is_https: boolean;
  local_url?: string | null;
  public_webhook_url?: string | null;
  signing_secret_configured: boolean;
  signing_secret_masked?: string | null;
  secret_saved_and_decryptable?: boolean;
  signature_verification_valid?: boolean;
  public_https_configured?: boolean;
  endpoint_reachable?: boolean | null;
  endpoint_reachable_detail?: string | null;
  resend_registration_status?: string;
  resend_registration_detail?: string | null;
  last_event?: {
    event_type: string;
    email_id?: string;
    recipient?: string;
    received_at: string;
    matched_log_id?: string;
  } | null;
  diagnostics?: Record<string, unknown> | null;
}

export interface ResendWebhookStatsResponse {
  webhook_url: string;
  local_url?: string | null;
  public_tunnel_url?: string | null;
  signing_secret_configured: boolean;
  signing_secret_saved_and_decryptable?: boolean;
  signing_secret_masked?: string | null;
  public_https_configured?: boolean;
  total_events_received: number;
  delivered_count: number;
  bounced_count: number;
  complained_count: number;
  last_event_at?: string | null;
  last_event_type?: string | null;
  last_event?: {
    event_type: string;
    email_id?: string;
    recipient?: string;
    received_at: string;
    matched_log_id?: string;
  } | null;
  recent_events: Array<{
    id: string;
    event_id?: string;
    event_type: string;
    email_id?: string;
    recipient?: string;
    subject?: string;
    timestamp: string;
  }>;
}

export interface BankAccount {
  id: string;
  account_holder_name: string;
  bank_name: string;
  account_number_masked: string;
  ifsc_code: string;
  branch_name: string;
  account_type: string;
  upi_id?: string | null;
  swift_code?: string | null;
  bank_address?: string | null;
  currency: string;
  status: "active" | "inactive" | "suspended" | string;
  is_default: boolean;
  is_public: boolean;
  transfer_instructions?: string | null;
  branch_cash_instructions?: string | null;
  effective_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccountDetail extends BankAccount {
  account_number?: string | null;
  is_revealed: boolean;
}

export interface BankAccountCreateRequest {
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  confirm_account_number?: string;
  ifsc_code: string;
  branch_name: string;
  account_type?: string;
  upi_id?: string;
  swift_code?: string;
  bank_address?: string;
  currency?: string;
  status?: string;
  is_default?: boolean;
  is_public?: boolean;
  transfer_instructions?: string;
  branch_cash_instructions?: string;
  effective_date?: string;
}

export interface BankAccountUpdateRequest {
  account_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  confirm_account_number?: string;
  ifsc_code?: string;
  branch_name?: string;
  account_type?: string;
  upi_id?: string;
  swift_code?: string;
  bank_address?: string;
  currency?: string;
  status?: string;
  is_default?: boolean;
  is_public?: boolean;
  transfer_instructions?: string;
  branch_cash_instructions?: string;
  effective_date?: string;
}

export interface BankAccountListResponse {
  items: BankAccount[];
  total: number;
  page: number;
  page_size: number;
}

export interface BankAccountRevealResponse {
  id: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  revealed_at: string;
}


export interface WhatsAppTestConnectionResponse {
  success: boolean;
  status: string;
  message: string;
  phone_number_id?: string | null;
  verified_name?: string | null;
  display_phone_number?: string | null;
  quality_rating?: string | null;
  details?: Record<string, unknown> | null;
}

export interface ConfigurationHealthItem {
  name: string;
  status: string;
  score: number;
  description: string;
}

export interface ConfigurationHealthResponse {
  overall_status: "healthy" | "warning" | "action_required";
  overall_score: number;
  status?: "healthy" | "warning" | "action_required" | string;
  health_score?: number;
  agency_profile_status: string;
  agency_profile_completed_percentage: number;
  missing_profile_fields: string[];
  whatsapp_click_to_chat_status: string;
  whatsapp_cloud_api_status: string;
  resend_email_status: string;
  payment_gateway_status: string;
  bank_transfer_status: string;
  items: ConfigurationHealthItem[];
}

export interface AuditLogItem {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  ip_address: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string;
  is_deleted: boolean;
  roles: string[];
  created_at: string;
  updated_at: string;
}

export interface DestinationHighlight {
  title: string;
  description: string;
  category?: string;
  image_url?: string;
  caption?: string;
  display_order?: number;
}

export interface DestinationFaq {
  question: string;
  answer: string;
  display_order?: number;
}

export interface DestinationTravelGuide {
  best_time_to_visit?: string;
  recommended_duration?: string;
  seasonal_weather?: string;
  local_language?: string;
  currency?: string;
  time_zone?: string;
  visa_entry?: string;
  clothing_etiquette?: string;
  transport_options?: string;
  transport_getting_around?: string;
  safety_information?: string;
  safety_tips?: string;
  packing_tips?: string;
  travel_advice?: string;
  insider_advice?: string;
  accessibility_information?: string;
  [key: string]: unknown;
}


export interface Destination {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  country: string;
  region: string | null;
  state_or_city?: string | null;
  category?: string | null;
  travel_type?: string | null;
  cover_image_url?: string | null;
  display_order?: number;
  highlights_json?: DestinationHighlight[] | null;
  travel_guide_json?: DestinationTravelGuide | null;
  faqs_json?: DestinationFaq[] | null;
  social_image_url?: string | null;
  is_featured: boolean;
  is_published: boolean;
  is_active: boolean;
  deleted_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  package_count: number;
}

export interface PackageItem {
  id: string;
  destination_id: string;
  destination_name: string | null;
  destination_is_published?: boolean | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  base_price: number;
  currency: string;
  duration_days: number;
  duration_nights: number;
  minimum_travellers: number;
  maximum_travellers: number | null;
  category?: string | null;
  travel_type?: string | null;
  difficulty_level?: string | null;
  departure_location?: string | null;
  cover_image_url?: string | null;
  inclusions_json?: string[] | null;
  exclusions_json?: string[] | null;
  child_price?: number | null;
  infant_price?: number | null;
  single_room_supplement?: number | null;
  booking_cutoff_days?: number;
  cancellation_policy?: string | null;
  is_featured: boolean;
  is_published: boolean;
  is_active: boolean;
  deleted_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DestinationImage {
  id: string;
  destination_id: string;
  image_url: string;
  cloudinary_public_id: string | null;
  alt_text: string;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
}

export interface PackageImage {
  id: string;
  package_id: string;
  image_url: string;
  cloudinary_public_id: string | null;
  alt_text: string;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
}

export interface Hotel {
  id: string;
  destination_id: string;
  destination_name: string | null;
  name: string;
  description: string | null;
  address: string | null;
  star_rating: number | null;
  website_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  destination_id: string;
  destination_name: string | null;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  status: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackageDayActivityItem {
  id: string;
  package_day_id: string;
  activity_id: string;
  activity_name: string;
  category: string | null;
  duration_minutes: number | null;
  sort_order: number;
}

export interface PackageDay {
  id: string;
  package_id: string;
  day_number: number;
  title: string;
  description: string | null;
  accommodation: string | null;
  meals: string | null;
  transportation: string | null;
  activities: PackageDayActivityItem[];
  created_at: string;
  updated_at: string;
}

export interface PackageHotelBinding {
  id: string;
  package_id: string;
  hotel_id: string;
  hotel_name: string;
  star_rating: number | null;
  address: string | null;
}

export interface PackageActivityBinding {
  id: string;
  package_id: string;
  activity_id: string;
  activity_name: string;
  category: string | null;
  duration_minutes: number | null;
}

export interface PackageDeparture {
  id: string;
  package_id: string;
  package_name: string | null;
  departure_date: string;
  return_date: string | null;
  total_capacity: number;
  available_capacity: number;
  reserved_capacity: number;
  booked_capacity?: number;
  booking_cutoff_date?: string | null;
  status: "draft" | "open" | "closed" | "cancelled" | "sold_out";
  special_price: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface AddOn {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  applicability_scope: "all_packages" | "selected_packages" | "selected_destinations" | "single_package";
  price_type: "per_booking" | "per_traveller" | "per_room_night" | "per_unit";
  min_quantity: number;
  max_quantity: number | null;
  is_mandatory: boolean;
  display_order: number;
  is_active: boolean;
  package_ids?: string[];
  destination_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface SignedUploadResponse {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
  folder: string;
  upload_url: string;
}

export interface PublicImageSummary {
  image_url: string;
  alt_text: string;
  is_featured: boolean;
  sort_order: number;
}

export interface PublicDestinationListItem {
  id: string;
  name: string;
  slug: string;
  country: string;
  region: string | null;
  state_or_city?: string | null;
  category?: string | null;
  travel_type?: string | null;
  cover_image_url?: string | null;
  display_order?: number;
  short_description: string | null;
  featured_image: PublicImageSummary | null;
  package_count: number;
}

export interface PublicDestinationDetail {
  id: string;
  name: string;
  slug: string;
  country: string;
  region: string | null;
  state_or_city?: string | null;
  category?: string | null;
  travel_type?: string | null;
  short_description: string | null;
  description: string | null;
  cover_image_url?: string | null;
  images: PublicImageSummary[];
  highlights?: DestinationHighlight[];
  travel_guide?: DestinationTravelGuide | null;
  faqs?: DestinationFaq[];
  related_packages?: PublicPackageListItem[];
  seo_title: string | null;
  seo_description: string | null;
}

export interface PublicPackageListItem {
  id: string;
  name: string;
  slug: string;
  destination_name: string;
  destination_slug: string;
  category?: string | null;
  travel_type?: string | null;
  cover_image_url?: string | null;
  base_price: number;
  currency: string;
  duration_days: number;
  duration_nights: number;
  minimum_travellers: number;
  maximum_travellers: number | null;
  featured_image: PublicImageSummary | null;
  is_featured: boolean;
}

export interface PublicHotelSummary {
  id: string;
  name: string;
  star_rating: number | null;
  address: string | null;
}

export interface PublicActivitySummary {
  id: string;
  name: string;
  category: string | null;
  duration_minutes: number | null;
}

export interface PublicItineraryDaySummary {
  day_number: number;
  title: string;
  description: string | null;
  accommodation: string | null;
  meals: string | null;
  transportation: string | null;
  activities: PublicActivitySummary[];
}

export interface PublicDepartureSummary {
  id: string;
  departure_date: string;
  return_date: string | null;
  total_capacity: number;
  available_capacity: number;
  special_price: number | null;
  currency: string;
  status: string;
}

export interface PublicAddOnSummary {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  price_type?: string;
  min_quantity?: number;
  max_quantity?: number | null;
  is_mandatory?: boolean;
}

export interface PublicPackageDetail {
  id: string;
  name: string;
  slug: string;
  destination_name: string;
  destination_slug: string;
  short_description: string | null;
  description: string | null;
  base_price: number;
  currency: string;
  duration_days: number;
  duration_nights: number;
  minimum_travellers: number;
  maximum_travellers: number | null;
  category?: string | null;
  travel_type?: string | null;
  difficulty_level?: string | null;
  departure_location?: string | null;
  cover_image_url?: string | null;
  inclusions?: string[];
  exclusions?: string[];
  child_price?: number | null;
  infant_price?: number | null;
  single_room_supplement?: number | null;
  booking_cutoff_days?: number;
  cancellation_policy?: string | null;
  seo_title: string | null;
  seo_description: string | null;
  images: PublicImageSummary[];
  hotels: PublicHotelSummary[];
  activities: PublicActivitySummary[];
  itinerary: PublicItineraryDaySummary[];
  upcoming_departures: PublicDepartureSummary[];
  add_ons?: PublicAddOnSummary[];
}

export interface PublicDepartureListItem {
  id: string;
  departure_date: string;
  return_date: string | null;
  total_capacity: number;
  available_capacity: number;
  special_price: number | null;
  base_price: number;
  currency: string;
  status: string;
  package_id: string;
  package_name: string;
  package_slug: string;
  duration_days: number;
  duration_nights: number;
  destination_name: string;
  destination_slug: string;
  featured_image: PublicImageSummary | null;
}

export interface PublicInquiryCreate {
  name: string;
  email: string;
  phone?: string | null;
  package_id?: string | null;
  destination_id?: string | null;
  message: string;
  source?: "contact_form" | "package" | "destination" | "whatsapp" | "other";
}

export interface PublicInquiryResponse {
  id: string;
  status: string;
  message: string;
}

export interface PublicSiteSettings {
  legal_business_name?: string | null;
  agency_name: string;
  public_display_name?: string | null;
  short_name?: string | null;
  admin_panel_name?: string | null;
  admin_portal_subtitle?: string | null;
  tagline: string;
  logo_url?: string | null;
  secondary_logo_url?: string | null;
  favicon_url?: string | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
  brand_accent_color?: string | null;
  primary_font?: string | null;
  secondary_font?: string | null;
  year_established?: number | null;
  registration_number?: string | null;
  tax_id?: string | null;
  business_description?: string | null;
  registered_office_address?: string | null;
  office_address: string;
  public_office_address?: string | null;
  agency_location: string;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  time_zone?: string;
  currency: string;
  contact_phone: string;
  secondary_phone?: string | null;
  support_whatsapp?: string | null;
  emergency_phone?: string | null;
  contact_email: string;
  customer_support_email?: string | null;
  booking_email?: string | null;
  general_inquiry_email?: string | null;
  instagram_handle: string;
  instagram_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  website_url?: string | null;
  google_maps_url?: string | null;

  // Google Maps & Directions
  google_maps_embed_url?: string | null;
  google_maps_latitude?: number | null;
  google_maps_longitude?: number | null;
  google_maps_zoom?: number | null;
  google_maps_display_enabled?: boolean;
  google_maps_directions_url?: string | null;
  office_location_label?: string | null;

  // SEO & Social Metadata
  seo_website_title?: string | null;
  seo_meta_description?: string | null;
  seo_og_image_url?: string | null;
  seo_social_title?: string | null;
  seo_social_description?: string | null;
  organization_structured_data?: Record<string, unknown> | null;

  operating_hours?: string;
  business_hours?: string | null;
  holiday_notice?: string | null;
  office_contact_instructions?: string | null;
  whatsapp_number: string;
  whatsapp_country_code?: string;
  whatsapp_prefilled_message?: string;
  whatsapp_package_message?: string;
  whatsapp_destination_message?: string;
  whatsapp_custom_trip_message?: string;
  whatsapp_booking_support_message?: string;
  whatsapp_enabled?: boolean;
  whatsapp_show_floating_concierge?: boolean;
  whatsapp_concierge_floating?: boolean;
  whatsapp_show_header_button?: boolean;
  whatsapp_show_on_homepage?: boolean;
  whatsapp_show_on_footer?: boolean;
  whatsapp_show_on_package_pages?: boolean;
  whatsapp_show_on_contact_page?: boolean;
  hero_headline?: string;
  hero_subtitle?: string;
  hero_image_url?: string | null;
  contact_cta_text?: string;
  whatsapp_cta_text?: string;
  promo_banner_active?: boolean;
  promo_banner_text?: string | null;
  promo_banner_link?: string | null;
  featured_destination_ids?: string[];
  featured_package_ids?: string[];
  best_offers_enabled?: boolean;
  online_payments_enabled?: boolean;
  online_payments_maintenance_message?: string;

  // Travel Voucher & PDF Customization
  pdf_header_title?: string | null;
  pdf_header_subtitle?: string | null;
  pdf_office_address?: string | null;
  pdf_contact_info?: string | null;
  pdf_checkin_instructions?: string | null;
  pdf_logistics_notice?: string | null;
  pdf_helpline_info?: string | null;
  pdf_footer_declaration?: string | null;
  pdf_badge_label?: string | null;
  pdf_logo_url?: string | null;
}

// ==============================================================================
// Website Content Schemas (About, Contact Pages)
// ==============================================================================

export interface AboutHeroSection {
  show_section: boolean;
  eyebrow: string;
  heading: string;
  description: string;
  background_image_url?: string | null;
}

export interface AboutStorySection {
  show_section: boolean;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  image_url?: string | null;
  image_position: "left" | "right";
  office_card_title: string;
  office_card_description: string;
}

export interface AboutMissionVisionSection {
  show_section: boolean;
  mission_title: string;
  mission_description: string;
  vision_title: string;
  vision_description: string;
}

export interface AboutPrincipleCard {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface AboutPrinciplesSection {
  show_section: boolean;
  eyebrow: string;
  heading: string;
  description: string;
  cards: AboutPrincipleCard[];
}

export interface AboutStatItem {
  id: string;
  label: string;
  value: string;
  icon: string;
}

export interface AboutStatsSection {
  show_section: boolean;
  heading: string;
  items: AboutStatItem[];
}

export interface AboutTeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo_url?: string | null;
  display_order: number;
}

export interface AboutTeamSection {
  show_section: boolean;
  heading: string;
  description: string;
  members: AboutTeamMember[];
}

export interface AboutTestimonialItem {
  id: string;
  author: string;
  location: string;
  trip_name: string;
  quote: string;
  rating: number;
}

export interface AboutTestimonialsSection {
  show_section: boolean;
  heading: string;
  description: string;
  items: AboutTestimonialItem[];
}

export interface AboutCtaSection {
  show_section: boolean;
  heading: string;
  description: string;
  primary_button_text: string;
  primary_button_link: string;
  secondary_button_text: string;
  secondary_button_link?: string | null;
}

export interface AboutOfficeSection {
  show_section: boolean;
  heading: string;
  address: string;
  hours: string;
  guidance: string;
}

export interface AboutPageContent {
  hero: AboutHeroSection;
  story: AboutStorySection;
  mission_vision: AboutMissionVisionSection;
  principles: AboutPrinciplesSection;
  stats: AboutStatsSection;
  team: AboutTeamSection;
  testimonials: AboutTestimonialsSection;
  cta: AboutCtaSection;
  office: AboutOfficeSection;
  sections_order: string[];
  seo_title?: string | null;
  seo_meta_description?: string | null;
  seo_og_image?: string | null;
}

export interface ContactHeroSection {
  show_section: boolean;
  eyebrow: string;
  heading: string;
  description: string;
  background_image_url?: string | null;
}

export interface ContactCardsSection {
  show_section: boolean;
  office_card_title: string;
  office_card_heading: string;
  office_address: string;
  operating_hours: string;
  phone_card_title: string;
  phone_card_heading: string;
  primary_phone: string;
  secondary_phone?: string | null;
  emergency_phone?: string | null;
  contact_email: string;
  whatsapp_card_title: string;
  whatsapp_card_description: string;
  whatsapp_button_text: string;
}

export interface ContactFormSection {
  show_section: boolean;
  eyebrow: string;
  heading: string;
  description: string;
  topics: string[];
  success_message: string;
}

export interface ContactMapSection {
  show_map: boolean;
  map_title: string;
  office_location_label: string;
  embed_url?: string | null;
  directions_url?: string | null;
  location_url?: string | null;
  zoom: number;
}

export interface ContactPageContent {
  hero: ContactHeroSection;
  cards: ContactCardsSection;
  form: ContactFormSection;
  map: ContactMapSection;
  seo_title?: string | null;
  seo_meta_description?: string | null;
  seo_og_image?: string | null;
}

// ==============================================================================
// Main Website (Homepage) Content Types
// ==============================================================================

export interface HomeHeroSection {
  eyebrow?: string;
  heading: string;
  description: string;
  media_type?: "image" | "video";
  image_url: string;
  video_url?: string | null;
  primary_cta_text: string;
  primary_cta_link: string;
  secondary_cta_text: string;
  secondary_cta_link: string;
  whatsapp_cta_text: string;
  popular_tags?: string[];
}

export interface HomeTrustIndicator {
  icon: string;
  label: string;
}

export interface HomeSectionsVisibility {
  trending_destinations?: boolean;
  best_offers?: boolean;
  featured_packages?: boolean;
  travel_inspirations?: boolean;
  upcoming_departures?: boolean;
  custom_cta?: boolean;
}

export interface HomeFeaturedContent {
  featured_destination_ids?: string[];
  featured_package_ids?: string[];
  promo_banner_active?: boolean;
  promo_banner_text?: string | null;
  promo_banner_link?: string | null;
  best_offers_enabled?: boolean;
}

export interface HomePageContent {
  hero: HomeHeroSection;
  intro_eyebrow?: string;
  intro_heading?: string;
  intro_description?: string;
  trust_indicators?: HomeTrustIndicator[];
  featured_content?: HomeFeaturedContent;
  sections_visibility?: HomeSectionsVisibility;
  sections_order?: string[];
  seo_title?: string | null;
  seo_meta_description?: string | null;
  seo_og_image?: string | null;
  seo_social_title?: string | null;
  seo_social_description?: string | null;
}

// ==============================================================================
// Listing Page Content Types (Destinations, Packages, Group Trips, Custom Trip)
// ==============================================================================

export interface ListingHeroSection {
  eyebrow: string;
  heading: string;
  description: string;
  banner_image_url?: string | null;
}

export interface ListingCtaSection {
  show_cta: boolean;
  primary_button_text: string;
  primary_button_link: string;
  secondary_button_text?: string | null;
  secondary_button_link?: string | null;
}

export interface DestinationsPageContent {
  hero: ListingHeroSection;
  introductory_text?: string;
  cta?: ListingCtaSection;
  seo_title?: string | null;
  seo_meta_description?: string | null;
  seo_og_image?: string | null;
}

export interface PackagesPageContent {
  hero: ListingHeroSection;
  introductory_text?: string;
  cta?: ListingCtaSection;
  seo_title?: string | null;
  seo_meta_description?: string | null;
  seo_og_image?: string | null;
}

export interface GroupTripsPageContent {
  hero: ListingHeroSection;
  introductory_text?: string;
  empty_state_note?: string;
  cta?: ListingCtaSection;
  seo_title?: string | null;
  seo_meta_description?: string | null;
  seo_og_image?: string | null;
}

export interface CustomTripCtaLabels {
  submit_button_label: string;
  whatsapp_button_label: string;
  secondary_cta_text?: string | null;
  secondary_cta_link?: string | null;
  success_title?: string;
  success_message?: string;
}

export interface CustomTripPageContent {
  hero: ListingHeroSection;
  introductory_text?: string;
  cta_labels?: CustomTripCtaLabels;
  seo_title?: string | null;
  seo_meta_description?: string | null;
  seo_og_image?: string | null;
}

export interface AgencyBrandingContext {
  agency_name?: string;
  short_name?: string;
  tagline?: string;
  city?: string;
  state?: string;
  office_address?: string;
  contact_phone?: string;
  secondary_phone?: string | null;
  emergency_phone?: string | null;
  contact_email?: string;
  support_whatsapp?: string;
  whatsapp_number?: string;
  operating_hours?: string;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  brand_accent_color?: string;
  primary_font?: string;
  secondary_font?: string;
  google_maps_embed_url?: string | null;
  google_maps_url?: string | null;
  google_maps_directions_url?: string | null;
  google_maps_zoom?: number;
  google_maps_display_enabled?: boolean;
  office_location_label?: string | null;
  logo_url?: string | null;
  [key: string]: unknown;
}

export interface AdminPageEnvelopeResponse<T = Record<string, unknown>> {
  slug: string;
  title: string;
  draft: T;
  published: T;
  is_published: boolean;
  has_unpublished_changes: boolean;
  draft_saved_at: string | null;
  published_at: string | null;
  agency_context: AgencyBrandingContext;
}

export interface AdminPageUpdateRequest<T = Record<string, unknown>> {
  draft: T;
  publish_immediately?: boolean;
}

export interface PublicPageResponse<T = Record<string, unknown>> {
  slug: string;
  content: T;
  is_preview: boolean;
  published_at: string | null;
  agency_branding: AgencyBrandingContext;
}


const SESSION_TOKEN_KEY = "travel_session_token";

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore restricted localStorage context errors
  }
}

let cachedCsrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return url.replace(/\/+$/, "");
}

/**
 * Fetch and cache the CSRF token from the backend.
 * Checks active document.cookie first to prevent desynchronization with browser cookies.
 */
export async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cookieToken = getCookie("travel_csrf");
    if (cookieToken) {
      cachedCsrfToken = cookieToken;
      return cookieToken;
    }
    if (cachedCsrfToken) {
      return cachedCsrfToken;
    }
  }

  if (csrfPromise) {
    return csrfPromise;
  }

  csrfPromise = (async () => {
    const baseUrl = getApiBaseUrl();
    try {
      const response = await fetch(`${baseUrl}/auth/csrf${forceRefresh ? "?refresh=true" : ""}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to initialize CSRF token.");
      }

      const data = (await response.json()) as { csrf_token: string };
      cachedCsrfToken = data.csrf_token;
      return data.csrf_token;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === "TypeError" || error.message?.toLowerCase().includes("fetch")) {
        throw new Error(
          "Unable to connect to the backend server. Please verify the API service is running."
        );
      }
      throw error;
    } finally {
      csrfPromise = null;
    }
  })();

  return csrfPromise;
}

export function clearCachedCsrfToken(): void {
  cachedCsrfToken = null;
  csrfPromise = null;
}

/**
 * Generic request wrapper ensuring credentials: 'include', CSRF header attachment,
 * and seamless retry on CSRF token desynchronization.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  isCsrfRetry = false,
  overrideCsrf?: string
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const method = (options.method || "GET").toUpperCase();

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const sessionToken = getSessionToken();
  if (sessionToken && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }

  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // State-changing methods require CSRF token
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    try {
      const csrf = overrideCsrf || (await getCsrfToken());
      headers["X-CSRF-Token"] = csrf;
    } catch {
      // Allow fallback if unauthenticated init
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      ...options,
      method,
      headers,
      credentials: "include",
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name === "TypeError" || error.message?.toLowerCase().includes("fetch")) {
      const endpointPath = path.startsWith("/") ? path : `/${path}`;
      throw new Error(
        `Unable to connect to backend server at ${baseUrl} (endpoint: ${endpointPath}). ` +
        `Please verify that the FastAPI service is running and that CORS configuration permits requests from this origin.`
      );
    }
    throw error;
  }

  if (!response.ok) {
    // Automatic retry for 403 CSRF validation errors (re-fetch fresh token and retry once)
    if (
      response.status === 403 &&
      !isCsrfRetry &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(method)
    ) {
      try {
        const errorJson = (await response.clone().json()) as ApiErrorResponse;
        if (
          errorJson.error?.code === "CSRF_TOKEN_INVALID" ||
          errorJson.error?.code === "CSRF_TOKEN_MISSING"
        ) {
          clearCachedCsrfToken();
          const freshCsrf = await getCsrfToken(true);
          return await apiRequest<T>(path, options, true, freshCsrf);
        }
      } catch {
        // Fall through to standard error handling
      }
    }

    let errorMessage = `Request failed with status ${response.status}`;
    if (response.status === 401) {
      errorMessage = "Session expired or unauthenticated. Please sign in to perform administrative actions.";
    } else if (response.status === 403) {
      errorMessage = "Access forbidden. Your account does not possess sufficient privileges for this operation.";
    }
    let errorDetails: Array<{ location: string[]; message: string; type: string }> | undefined = undefined;
    try {
      const errorJson = (await response.json()) as ApiErrorResponse;
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
        if (errorJson.error.details && errorJson.error.details.length > 0) {
          errorDetails = errorJson.error.details;
          const detailStrings = errorJson.error.details.map((d) => {
            const field = d.location && d.location.length > 0 ? d.location[d.location.length - 1] : "field";
            return `${field}: ${d.message}`;
          });
          errorMessage = `${errorJson.error.message} (${detailStrings.join("; ")})`;
        }
      }
    } catch {
      // Non-JSON response
    }
    const err = new Error(errorMessage) as Error & {
      status: number;
      details?: Array<{ location: string[]; message: string; type: string }>;
    };
    err.status = response.status;
    err.details = errorDetails;
    throw err;
  }

  return (await response.json()) as T;
}

/**
 * Authentication service operations.
 */
export const authApi = {
  register: async (payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }): Promise<AuthResponse> => {
    const res = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.access_token) {
      setSessionToken(res.access_token);
    }
    clearCachedCsrfToken();
    return res;
  },

  login: async (payload: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    const res = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.access_token) {
      setSessionToken(res.access_token);
    }
    clearCachedCsrfToken();
    return res;
  },

  socialLogin: async (payload: {
    id_token: string;
    provider: string;
    first_name?: string;
    last_name?: string;
  }): Promise<AuthResponse> => {
    const res = await apiRequest<AuthResponse>("/auth/social-login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.access_token) {
      setSessionToken(res.access_token);
    }
    clearCachedCsrfToken();
    return res;
  },

  logout: async (): Promise<MessageResponse> => {
    try {
      const res = await apiRequest<MessageResponse>("/auth/logout", {
        method: "POST",
      });
      return res;
    } finally {
      setSessionToken(null);
      clearCachedCsrfToken();
    }
  },

  getMe: async (): Promise<SafeUser> => {
    return await apiRequest<SafeUser>("/auth/me", {
      method: "GET",
    });
  },

  forgotPassword: async (email: string): Promise<MessageResponse> => {
    return await apiRequest<MessageResponse>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (payload: {
    token: string;
    new_password: string;
  }): Promise<MessageResponse> => {
    return await apiRequest<MessageResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

/**
 * Administration platform service operations.
 */
export const adminApi = {
  getMetrics: async (): Promise<AdminDashboardMetrics> => {
    return await apiRequest<AdminDashboardMetrics>("/admin/dashboard/metrics");
  },

  getAuditLogs: async (params?: {
    page?: number;
    page_size?: number;
    action?: string;
    entity_type?: string;
  }): Promise<PaginatedResponse<AuditLogItem>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.action) query.set("action", params.action);
    if (params?.entity_type) query.set("entity_type", params.entity_type);
    const qs = query.toString();
    return await apiRequest<PaginatedResponse<AuditLogItem>>(`/admin/audit-logs${qs ? `?${qs}` : ""}`);
  },

  getUsers: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<PaginatedResponse<AdminUser>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.search) query.set("search", params.search);
    if (params?.role) query.set("role", params.role);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return await apiRequest<PaginatedResponse<AdminUser>>(`/admin/users${qs ? `?${qs}` : ""}`);
  },

  updateUserStatus: async (
    userId: string,
    payload: { status: string; reason?: string }
  ): Promise<AdminUser> => {
    return await apiRequest<AdminUser>(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  updateUserRoles: async (
    userId: string,
    payload: { roles: string[] }
  ): Promise<AdminUser> => {
    return await apiRequest<AdminUser>(`/admin/users/${userId}/roles`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  getDestinations: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_published?: boolean;
    is_featured?: boolean;
    is_active?: boolean;
  }): Promise<PaginatedResponse<Destination>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.search) query.set("search", params.search);
    if (params?.is_published !== undefined) query.set("is_published", String(params.is_published));
    if (params?.is_featured !== undefined) query.set("is_featured", String(params.is_featured));
    if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
    const qs = query.toString();
    return await apiRequest<PaginatedResponse<Destination>>(`/admin/destinations${qs ? `?${qs}` : ""}`);
  },

  getDestination: async (id: string): Promise<Destination> => {
    return await apiRequest<Destination>(`/admin/destinations/${id}`);
  },

  createDestination: async (payload: {
    name: string;
    slug?: string;
    short_description?: string;
    description?: string;
    country: string;
    region?: string;
    state_or_city?: string;
    category?: string;
    travel_type?: string;
    cover_image_url?: string;
    display_order?: number;
    highlights_json?: DestinationHighlight[];
    travel_guide_json?: DestinationTravelGuide;
    faqs_json?: DestinationFaq[];
    social_image_url?: string;
    is_featured?: boolean;
    is_published?: boolean;
    seo_title?: string;
    seo_description?: string;
  }): Promise<Destination> => {
    return await apiRequest<Destination>("/admin/destinations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateDestination: async (
    id: string,
    payload: {
      name?: string;
      slug?: string;
      short_description?: string;
      description?: string;
      country?: string;
      region?: string;
      state_or_city?: string;
      category?: string;
      travel_type?: string;
      cover_image_url?: string;
      display_order?: number;
      highlights_json?: DestinationHighlight[];
      travel_guide_json?: DestinationTravelGuide;
      faqs_json?: DestinationFaq[];
      social_image_url?: string;
      is_featured?: boolean;
      is_published?: boolean;
      is_active?: boolean;
      seo_title?: string;
      seo_description?: string;
    }
  ): Promise<Destination> => {
    return await apiRequest<Destination>(`/admin/destinations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteDestination: async (id: string): Promise<Destination> => {
    return await apiRequest<Destination>(`/admin/destinations/${id}`, {
      method: "DELETE",
    });
  },

  getPackages: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    destination_id?: string;
    is_published?: boolean;
    is_featured?: boolean;
    is_active?: boolean;
  }): Promise<PaginatedResponse<PackageItem>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.search) query.set("search", params.search);
    if (params?.destination_id) query.set("destination_id", params.destination_id);
    if (params?.is_published !== undefined) query.set("is_published", String(params.is_published));
    if (params?.is_featured !== undefined) query.set("is_featured", String(params.is_featured));
    if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
    const qs = query.toString();
    return await apiRequest<PaginatedResponse<PackageItem>>(`/admin/packages${qs ? `?${qs}` : ""}`);
  },

  getPackage: async (id: string): Promise<PackageItem> => {
    return await apiRequest<PackageItem>(`/admin/packages/${id}`);
  },

  createPackage: async (payload: {
    destination_id: string;
    name: string;
    slug?: string;
    short_description?: string;
    description?: string;
    base_price: number;
    currency?: string;
    duration_days: number;
    duration_nights: number;
    minimum_travellers?: number;
    maximum_travellers?: number;
    category?: string;
    travel_type?: string;
    difficulty_level?: string;
    departure_location?: string;
    cover_image_url?: string;
    inclusions_json?: string[];
    exclusions_json?: string[];
    child_price?: number;
    infant_price?: number;
    single_room_supplement?: number;
    booking_cutoff_days?: number;
    cancellation_policy?: string;
    is_featured?: boolean;
    is_published?: boolean;
    seo_title?: string;
    seo_description?: string;
  }): Promise<PackageItem> => {
    return await apiRequest<PackageItem>("/admin/packages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updatePackage: async (
    id: string,
    payload: {
      destination_id?: string;
      name?: string;
      slug?: string;
      short_description?: string;
      description?: string;
      base_price?: number;
      currency?: string;
      duration_days?: number;
      duration_nights?: number;
      minimum_travellers?: number;
      maximum_travellers?: number;
      category?: string;
      travel_type?: string;
      difficulty_level?: string;
      departure_location?: string;
      cover_image_url?: string;
      inclusions_json?: string[];
      exclusions_json?: string[];
      child_price?: number;
      infant_price?: number;
      single_room_supplement?: number;
      booking_cutoff_days?: number;
      cancellation_policy?: string;
      is_featured?: boolean;
      is_published?: boolean;
      is_active?: boolean;
      seo_title?: string;
      seo_description?: string;
    }
  ): Promise<PackageItem> => {
    return await apiRequest<PackageItem>(`/admin/packages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deletePackage: async (id: string): Promise<PackageItem> => {
    return await apiRequest<PackageItem>(`/admin/packages/${id}`, {
      method: "DELETE",
    });
  },

  // Destination Images
  listDestinationImages: async (destId: string): Promise<DestinationImage[]> => {
    return await apiRequest<DestinationImage[]>(`/admin/destinations/${destId}/images`);
  },

  addDestinationImage: async (
    destId: string,
    payload: {
      image_url: string;
      cloudinary_public_id?: string;
      alt_text: string;
      sort_order?: number;
      is_featured?: boolean;
    }
  ): Promise<DestinationImage> => {
    return await apiRequest<DestinationImage>(`/admin/destinations/${destId}/images`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateDestinationImage: async (
    destId: string,
    imageId: string,
    payload: {
      image_url?: string;
      cloudinary_public_id?: string;
      alt_text?: string;
      sort_order?: number;
      is_featured?: boolean;
    }
  ): Promise<DestinationImage> => {
    return await apiRequest<DestinationImage>(`/admin/destinations/${destId}/images/${imageId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteDestinationImage: async (destId: string, imageId: string): Promise<void> => {
    await apiRequest<void>(`/admin/destinations/${destId}/images/${imageId}`, {
      method: "DELETE",
    });
  },

  // Package Images
  listPackageImages: async (packageId: string): Promise<PackageImage[]> => {
    return await apiRequest<PackageImage[]>(`/admin/packages/${packageId}/images`);
  },

  addPackageImage: async (
    packageId: string,
    payload: {
      image_url: string;
      cloudinary_public_id?: string;
      alt_text: string;
      sort_order?: number;
      is_featured?: boolean;
    }
  ): Promise<PackageImage> => {
    return await apiRequest<PackageImage>(`/admin/packages/${packageId}/images`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updatePackageImage: async (
    packageId: string,
    imageId: string,
    payload: {
      image_url?: string;
      cloudinary_public_id?: string;
      alt_text?: string;
      sort_order?: number;
      is_featured?: boolean;
    }
  ): Promise<PackageImage> => {
    return await apiRequest<PackageImage>(`/admin/packages/${packageId}/images/${imageId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deletePackageImage: async (packageId: string, imageId: string): Promise<void> => {
    await apiRequest<void>(`/admin/packages/${packageId}/images/${imageId}`, {
      method: "DELETE",
    });
  },

  // Itinerary
  listPackageItinerary: async (packageId: string): Promise<PackageDay[]> => {
    return await apiRequest<PackageDay[]>(`/admin/packages/${packageId}/itinerary`);
  },

  getPackageDay: async (packageId: string, dayId: string): Promise<PackageDay> => {
    return await apiRequest<PackageDay>(`/admin/packages/${packageId}/itinerary/${dayId}`);
  },

  createPackageDay: async (
    packageId: string,
    payload: {
      day_number: number;
      title: string;
      description?: string;
      accommodation?: string;
      meals?: string;
      transportation?: string;
    }
  ): Promise<PackageDay> => {
    return await apiRequest<PackageDay>(`/admin/packages/${packageId}/itinerary`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updatePackageDay: async (
    packageId: string,
    dayId: string,
    payload: {
      day_number?: number;
      title?: string;
      description?: string;
      accommodation?: string;
      meals?: string;
      transportation?: string;
    }
  ): Promise<PackageDay> => {
    return await apiRequest<PackageDay>(`/admin/packages/${packageId}/itinerary/${dayId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deletePackageDay: async (packageId: string, dayId: string): Promise<void> => {
    await apiRequest<void>(`/admin/packages/${packageId}/itinerary/${dayId}`, {
      method: "DELETE",
    });
  },

  reorderPackageDays: async (packageId: string, dayIds: string[]): Promise<PackageDay[]> => {
    return await apiRequest<PackageDay[]>(`/admin/packages/${packageId}/itinerary/reorder`, {
      method: "POST",
      body: JSON.stringify({ day_ids: dayIds }),
    });
  },


  addDayActivity: async (
    packageId: string,
    dayId: string,
    payload: { activity_id: string; sort_order?: number }
  ): Promise<PackageDay> => {
    return await apiRequest<PackageDay>(`/admin/packages/${packageId}/itinerary/${dayId}/activities`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  removeDayActivity: async (
    packageId: string,
    dayId: string,
    activityId: string
  ): Promise<PackageDay> => {
    return await apiRequest<PackageDay>(
      `/admin/packages/${packageId}/itinerary/${dayId}/activities/${activityId}`,
      {
        method: "DELETE",
      }
    );
  },

  // Package Hotels
  listPackageHotels: async (packageId: string): Promise<PackageHotelBinding[]> => {
    return await apiRequest<PackageHotelBinding[]>(`/admin/packages/${packageId}/hotels`);
  },

  linkPackageHotel: async (packageId: string, hotelId: string): Promise<PackageHotelBinding> => {
    return await apiRequest<PackageHotelBinding>(`/admin/packages/${packageId}/hotels`, {
      method: "POST",
      body: JSON.stringify({ hotel_id: hotelId }),
    });
  },

  unlinkPackageHotel: async (packageId: string, hotelId: string): Promise<void> => {
    await apiRequest<void>(`/admin/packages/${packageId}/hotels/${hotelId}`, {
      method: "DELETE",
    });
  },

  // Package Activities
  listPackageActivities: async (packageId: string): Promise<PackageActivityBinding[]> => {
    return await apiRequest<PackageActivityBinding[]>(`/admin/packages/${packageId}/activities`);
  },

  linkPackageActivity: async (packageId: string, activityId: string): Promise<PackageActivityBinding> => {
    return await apiRequest<PackageActivityBinding>(`/admin/packages/${packageId}/activities`, {
      method: "POST",
      body: JSON.stringify({ activity_id: activityId }),
    });
  },

  unlinkPackageActivity: async (packageId: string, activityId: string): Promise<void> => {
    await apiRequest<void>(`/admin/packages/${packageId}/activities/${activityId}`, {
      method: "DELETE",
    });
  },

  // Hotels CRUD
  listHotels: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    destination_id?: string;
    is_active?: boolean;
  }): Promise<PaginatedResponse<Hotel>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.search) query.set("search", params.search);
    if (params?.destination_id) query.set("destination_id", params.destination_id);
    if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
    const qs = query.toString();
    return await apiRequest<PaginatedResponse<Hotel>>(`/admin/hotels${qs ? `?${qs}` : ""}`);
  },

  getHotel: async (id: string): Promise<Hotel> => {
    return await apiRequest<Hotel>(`/admin/hotels/${id}`);
  },

  createHotel: async (payload: {
    destination_id: string;
    name: string;
    description?: string;
    address?: string;
    star_rating?: number;
    website_url?: string;
    contact_phone?: string;
    contact_email?: string;
    is_active?: boolean;
  }): Promise<Hotel> => {
    return await apiRequest<Hotel>("/admin/hotels", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateHotel: async (
    id: string,
    payload: Partial<{
      destination_id: string;
      name: string;
      description?: string;
      address?: string;
      star_rating?: number;
      website_url?: string;
      contact_phone?: string;
      contact_email?: string;
      is_active?: boolean;
    }>
  ): Promise<Hotel> => {
    return await apiRequest<Hotel>(`/admin/hotels/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteHotel: async (id: string): Promise<Hotel> => {
    return await apiRequest<Hotel>(`/admin/hotels/${id}`, {
      method: "DELETE",
    });
  },

  // Activities CRUD
  listActivities: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    destination_id?: string;
    category?: string;
    status?: string;
  }): Promise<PaginatedResponse<Activity>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.search) query.set("search", params.search);
    if (params?.destination_id) query.set("destination_id", params.destination_id);
    if (params?.category) query.set("category", params.category);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return await apiRequest<PaginatedResponse<Activity>>(`/admin/activities${qs ? `?${qs}` : ""}`);
  },

  getActivity: async (id: string): Promise<Activity> => {
    return await apiRequest<Activity>(`/admin/activities/${id}`);
  },

  createActivity: async (payload: {
    destination_id: string;
    name: string;
    description?: string;
    duration_minutes?: number;
    category?: string;
    price?: number;
    currency?: string;
    status?: string;
  }): Promise<Activity> => {
    return await apiRequest<Activity>("/admin/activities", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateActivity: async (
    id: string,
    payload: Partial<{
      destination_id: string;
      name: string;
      description?: string;
      duration_minutes?: number;
      category?: string;
      price?: number;
      currency?: string;
      status?: string;
    }>
  ): Promise<Activity> => {
    return await apiRequest<Activity>(`/admin/activities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteActivity: async (id: string): Promise<Activity> => {
    return await apiRequest<Activity>(`/admin/activities/${id}`, {
      method: "DELETE",
    });
  },

  // Departures CRUD
  listDepartures: async (params?: {
    page?: number;
    page_size?: number;
    package_id?: string;
    status?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<PaginatedResponse<PackageDeparture>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.package_id) query.set("package_id", params.package_id);
    if (params?.status) query.set("status", params.status);
    if (params?.from_date) query.set("from_date", params.from_date);
    if (params?.to_date) query.set("to_date", params.to_date);
    const qs = query.toString();
    return await apiRequest<PaginatedResponse<PackageDeparture>>(`/admin/departures${qs ? `?${qs}` : ""}`);
  },

  listPackageDepartures: async (packageId: string): Promise<PackageDeparture[]> => {
    return await apiRequest<PackageDeparture[]>(`/admin/packages/${packageId}/departures`);
  },

  getDeparture: async (id: string): Promise<PackageDeparture> => {
    return await apiRequest<PackageDeparture>(`/admin/departures/${id}`);
  },

  createDeparture: async (payload: {
    package_id?: string;
    departure_date: string;
    return_date?: string;
    booking_cutoff_date?: string;
    total_capacity: number;
    special_price?: number;
    currency?: string;
    status?: string;
  }): Promise<PackageDeparture> => {
    return await apiRequest<PackageDeparture>("/admin/departures", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateDeparture: async (
    id: string,
    payload: Partial<{
      departure_date: string;
      return_date?: string;
      booking_cutoff_date?: string;
      total_capacity: number;
      reserved_capacity: number;
      special_price?: number;
      currency?: string;
      status?: string;
    }>
  ): Promise<PackageDeparture> => {
    return await apiRequest<PackageDeparture>(`/admin/departures/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  cancelOrDeleteDeparture: async (id: string): Promise<PackageDeparture> => {
    return await apiRequest<PackageDeparture>(`/admin/departures/${id}`, {
      method: "DELETE",
    });
  },

  // Add-Ons CRUD
  listAddOns: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
  }): Promise<PaginatedResponse<AddOn>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.search) query.set("search", params.search);
    if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
    const qs = query.toString();
    return await apiRequest<PaginatedResponse<AddOn>>(`/admin/add-ons${qs ? `?${qs}` : ""}`);
  },

  getAddOn: async (id: string): Promise<AddOn> => {
    return await apiRequest<AddOn>(`/admin/add-ons/${id}`);
  },

  createAddOn: async (payload: {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    applicability_scope?: "all_packages" | "selected_packages" | "selected_destinations" | "single_package";
    price_type?: "per_booking" | "per_traveller" | "per_room_night" | "per_unit";
    min_quantity?: number;
    max_quantity?: number;
    is_mandatory?: boolean;
    display_order?: number;
    is_active?: boolean;
    package_ids?: string[];
    destination_ids?: string[];
  }): Promise<AddOn> => {
    return await apiRequest<AddOn>("/admin/add-ons", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateAddOn: async (
    id: string,
    payload: Partial<{
      name: string;
      description?: string;
      price: number;
      currency?: string;
      applicability_scope: "all_packages" | "selected_packages" | "selected_destinations" | "single_package";
      price_type: "per_booking" | "per_traveller" | "per_room_night" | "per_unit";
      min_quantity: number;
      max_quantity: number | null;
      is_mandatory: boolean;
      display_order: number;
      is_active: boolean;
      package_ids: string[];
      destination_ids: string[];
    }>
  ): Promise<AddOn> => {
    return await apiRequest<AddOn>(`/admin/add-ons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteAddOn: async (id: string): Promise<AddOn> => {
    return await apiRequest<AddOn>(`/admin/add-ons/${id}`, {
      method: "DELETE",
    });
  },

  // Media Signed Upload & Direct Base64 Upload
  signUpload: async (payload?: { folder?: string; resource_type?: string }): Promise<SignedUploadResponse> => {
    return await apiRequest<SignedUploadResponse>("/admin/media/sign-upload", {
      method: "POST",
      body: JSON.stringify(payload || { folder: "travelagency/catalog" }),
    });
  },

  uploadMedia: async (file: File, folder: string = "travelagency/catalog"): Promise<MediaUploadResponse> => {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    return await apiRequest<MediaUploadResponse>("/admin/media/upload", {
      method: "POST",
      body: JSON.stringify({
        file_data: base64Data,
        data_url: base64Data,
        filename: file.name,
        content_type: file.type || "image/jpeg",
        folder,
      }),
    });
  },

  // Site Settings
  getSettings: async (): Promise<AdminSiteSettings> => {
    return await apiRequest<AdminSiteSettings>("/admin/settings");
  },

  updateSettings: async (payload: Partial<AdminSiteSettings>): Promise<AdminSiteSettings> => {
    return await apiRequest<AdminSiteSettings>("/admin/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  testEmailConnection: async (): Promise<EmailTestConnectionResponse> => {
    return await apiRequest<EmailTestConnectionResponse>("/admin/settings/email/test-connection", {
      method: "POST",
    });
  },

  verifyEmailSender: async (): Promise<EmailTestConnectionResponse> => {
    return await apiRequest<EmailTestConnectionResponse>("/admin/settings/email/verify-sender", {
      method: "POST",
    });
  },

  sendTestEmail: async (
    payload: string | { recipient_email?: string; recipient?: string; subject?: string; notes?: string }
  ): Promise<EmailSendTestResponse> => {
    const body = typeof payload === "string" ? { recipient_email: payload } : payload;
    return await apiRequest<EmailSendTestResponse>("/admin/settings/email/send-test", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  testWhatsAppConnection: async (): Promise<WhatsAppTestConnectionResponse> => {
    return await apiRequest<WhatsAppTestConnectionResponse>("/admin/settings/whatsapp/test-connection", {
      method: "POST",
    });
  },

  verifyEmailWebhook: async (payload?: { signing_secret?: string }): Promise<ResendWebhookVerifyResponse> => {
    return await apiRequest<ResendWebhookVerifyResponse>("/admin/settings/email/verify-webhook", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  getEmailWebhookStats: async (): Promise<ResendWebhookStatsResponse> => {
    return await apiRequest<ResendWebhookStatsResponse>("/admin/settings/email/webhook-stats");
  },

  getConfigurationHealth: async (): Promise<ConfigurationHealthResponse> => {
    return await apiRequest<ConfigurationHealthResponse>("/admin/settings/health");
  },

  // Quick Status Toggles
  toggleDestinationPublish: async (id: string, current: boolean): Promise<Destination> => {
    return await apiRequest<Destination>(`/admin/destinations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_published: !current }),
    });
  },

  toggleDestinationActive: async (id: string, current: boolean): Promise<Destination> => {
    return await apiRequest<Destination>(`/admin/destinations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !current }),
    });
  },

  togglePackagePublish: async (id: string, current: boolean): Promise<PackageItem> => {
    return await apiRequest<PackageItem>(`/admin/packages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_published: !current }),
    });
  },

  togglePackageActive: async (id: string, current: boolean): Promise<PackageItem> => {
    return await apiRequest<PackageItem>(`/admin/packages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !current }),
    });
  },

  toggleHotelActive: async (id: string, current: boolean): Promise<Hotel> => {
    return await apiRequest<Hotel>(`/admin/hotels/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !current }),
    });
  },

  toggleActivityStatus: async (id: string, current: string): Promise<Activity> => {
    return await apiRequest<Activity>(`/admin/activities/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: current === "active" ? "inactive" : "active" }),
    });
  },

  toggleAddOnActive: async (id: string, current: boolean): Promise<AddOn> => {
    return await apiRequest<AddOn>(`/admin/add-ons/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !current }),
    });
  },

  // Website Content Management (About & Contact Pages)
  getPageEnvelope: async <T = Record<string, unknown>>(slug: string): Promise<AdminPageEnvelopeResponse<T>> => {
    return await apiRequest<AdminPageEnvelopeResponse<T>>(`/admin/content/pages/${slug}`);
  },

  updatePageDraft: async <T = Record<string, unknown>>(
    slug: string,
    payload: AdminPageUpdateRequest<T>
  ): Promise<AdminPageEnvelopeResponse<T>> => {
    return await apiRequest<AdminPageEnvelopeResponse<T>>(`/admin/content/pages/${slug}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  publishPage: async <T = Record<string, unknown>>(slug: string): Promise<AdminPageEnvelopeResponse<T>> => {
    return await apiRequest<AdminPageEnvelopeResponse<T>>(`/admin/content/pages/${slug}/publish`, {
      method: "POST",
    });
  },

  discardPageDraft: async <T = Record<string, unknown>>(slug: string): Promise<AdminPageEnvelopeResponse<T>> => {
    return await apiRequest<AdminPageEnvelopeResponse<T>>(`/admin/content/pages/${slug}/discard`, {
      method: "POST",
    });
  },
};

/**
 * Dedicated Bank Account management operations under Finance & Reports.
 */
export const adminBankAccountApi = {
  listBankAccounts: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<BankAccountListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return await apiRequest<BankAccountListResponse>(`/admin/bank-accounts${qs ? `?${qs}` : ""}`);
  },

  getBankAccount: async (id: string): Promise<BankAccountDetail> => {
    return await apiRequest<BankAccountDetail>(`/admin/bank-accounts/${id}`);
  },

  createBankAccount: async (payload: BankAccountCreateRequest): Promise<BankAccount> => {
    return await apiRequest<BankAccount>("/admin/bank-accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateBankAccount: async (id: string, payload: BankAccountUpdateRequest): Promise<BankAccount> => {
    return await apiRequest<BankAccount>(`/admin/bank-accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  setDefault: async (id: string): Promise<BankAccount> => {
    return await apiRequest<BankAccount>(`/admin/bank-accounts/${id}/set-default`, {
      method: "POST",
    });
  },

  revealAccount: async (id: string): Promise<BankAccountRevealResponse> => {
    return await apiRequest<BankAccountRevealResponse>(`/admin/bank-accounts/${id}/reveal`, {
      method: "POST",
    });
  },

  deleteBankAccount: async (id: string): Promise<{ success: boolean; message: string }> => {
    return await apiRequest<{ success: boolean; message: string }>(`/admin/bank-accounts/${id}`, {
      method: "DELETE",
    });
  },

  exportCsvUrl: (params?: { search?: string; status?: string }): string => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    return `${apiUrl}/admin/bank-accounts/export${qs ? `?${qs}` : ""}`;
  },
};

/**
 * Public catalog API client (read-only customer exploration endpoints).
 */
export const publicCatalogApi = {
  getDestinations: async (params?: {
    country?: string;
    travel_type?: string;
    is_featured?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PublicDestinationListItem[]> => {
    const query = new URLSearchParams();
    if (params?.country) query.set("country", params.country);
    if (params?.travel_type) query.set("travel_type", params.travel_type);
    if (params?.is_featured !== undefined) query.set("is_featured", String(params.is_featured));
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    return await apiRequest<PublicDestinationListItem[]>(`/destinations${qs ? `?${qs}` : ""}`);
  },

  getDestination: async (slug: string): Promise<PublicDestinationDetail> => {
    return await apiRequest<PublicDestinationDetail>(`/destinations/${slug}`);
  },

  getPackages: async (params?: {
    destination_slug?: string;
    travel_type?: string;
    category?: string;
    is_featured?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PublicPackageListItem[]> => {
    const query = new URLSearchParams();
    if (params?.destination_slug) query.set("destination_slug", params.destination_slug);
    if (params?.travel_type) query.set("travel_type", params.travel_type);
    if (params?.category) query.set("category", params.category);
    if (params?.is_featured !== undefined) query.set("is_featured", String(params.is_featured));
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    return await apiRequest<PublicPackageListItem[]>(`/packages${qs ? `?${qs}` : ""}`);
  },

  getPackage: async (slug: string): Promise<PublicPackageDetail> => {
    return await apiRequest<PublicPackageDetail>(`/packages/${slug}`);
  },

  getPackageItinerary: async (slug: string): Promise<PublicItineraryDaySummary[]> => {
    return await apiRequest<PublicItineraryDaySummary[]>(`/packages/${slug}/itinerary`);
  },

  getPackageDepartures: async (slug: string): Promise<PublicDepartureSummary[]> => {
    return await apiRequest<PublicDepartureSummary[]>(`/packages/${slug}/departures`);
  },

  getAllDepartures: async (): Promise<PublicDepartureListItem[]> => {
    return await apiRequest<PublicDepartureListItem[]>("/departures");
  },

  getSettings: async (): Promise<PublicSiteSettings> => {
    return await apiRequest<PublicSiteSettings>("/settings");
  },

  submitInquiry: async (payload: PublicInquiryCreate): Promise<PublicInquiryResponse> => {
    return await apiRequest<PublicInquiryResponse>("/inquiries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getAddOns: async (params?: {
    package_id?: string;
    destination_id?: string;
  }): Promise<PublicAddOnSummary[]> => {
    const query = new URLSearchParams();
    if (params?.package_id) query.set("package_id", params.package_id);
    if (params?.destination_id) query.set("destination_id", params.destination_id);
    const qs = query.toString();
    return await apiRequest<PublicAddOnSummary[]>(`/add-ons${qs ? `?${qs}` : ""}`);
  },

  getPageContent: async <T = Record<string, unknown>>(
    slug: string,
    preview: boolean = false
  ): Promise<PublicPageResponse<T>> => {
    return await apiRequest<PublicPageResponse<T>>(
      `/content/pages/${slug}${preview ? "?preview=true" : ""}`
    );
  },
};

// ==============================================================================
// Booking Engine Types & API
// ==============================================================================

export interface BookingTravellerCreate {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  is_primary?: boolean;
  passport_number?: string | null;
  passport_expiry?: string | null;
  passport_issuing_country?: string | null;
}

export interface BookingTravellerResponse {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_primary: boolean;
  passport_number: string | null;
  passport_expiry: string | null;
  passport_issuing_country: string | null;
}

export interface BookingAddOnSelect {
  add_on_id: string;
  quantity: number;
}

export interface BookingAddOnResponse {
  id: string;
  add_on_id: string;
  name_snapshot: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  currency: string;
}

export interface PriceCalculationRequest {
  package_id: string;
  departure_id: string;
  number_of_travellers: number;
  add_ons?: BookingAddOnSelect[];
  coupon_code?: string | null;
  offer_id?: string | null;
}

export interface AddOnCalculationDetail {
  add_on_id: string;
  name: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  currency: string;
}

export interface PriceCalculationResponse {
  package_id: string;
  departure_id: string;
  number_of_travellers: number;
  base_price_per_traveller: number | string;
  package_subtotal: number | string;
  add_ons_subtotal: number | string;
  add_ons_details: AddOnCalculationDetail[];
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  currency: string;
  coupon_code: string | null;
  coupon_valid: boolean | null;
  coupon_message: string | null;
  offer_id?: string | null;
  offer_title?: string | null;
  offer_discount_per_traveller?: number | string | null;
}

export interface BookingCreateRequest {
  package_id: string;
  departure_id: string;
  number_of_travellers: number;
  travellers: BookingTravellerCreate[];
  add_ons?: BookingAddOnSelect[];
  coupon_code?: string | null;
  offer_id?: string | null;
  customer_notes?: string | null;
  idempotency_key?: string | null;
}

export interface BookingSummaryResponse {
  id: string;
  booking_reference: string;
  package_id: string;
  package_title: string;
  package_slug: string;
  destination_name: string;
  departure_id: string;
  departure_date: string;
  return_date: string | null;
  status: string;
  payment_status: string;
  number_of_travellers: number;
  total: number | string;
  currency: string;
  created_at: string;
  hold_expires_at: string | null;
}

export interface BookingDetailResponse {
  id: string;
  booking_reference: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  package_id: string;
  package_title: string;
  package_slug: string;
  destination_name: string;
  departure_id: string;
  departure_date: string;
  return_date: string | null;
  status: string;
  payment_status: string;
  number_of_travellers: number;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  currency: string;
  customer_notes: string | null;
  price_breakdown: Record<string, unknown> | null;
  travellers: BookingTravellerResponse[];
  add_ons: BookingAddOnResponse[];
  payments?: PaymentDetailResponse[];
  total_paid?: number | string;
  outstanding_balance?: number | string;
  deposit_amount?: number | string;
  is_fully_paid?: boolean;
  cancellation_request?: CancellationRequest | null;
  created_at: string;
  updated_at: string;
  hold_expires_at: string | null;
}

export interface BookingListResponse {
  items: BookingSummaryResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface PaymentRefundResponse {
  id: string;
  payment_id: string;
  provider_refund_id: string;
  amount: number | string;
  currency: string;
  status: string;
  reason: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface PaymentDetailResponse {
  id: string;
  booking_id: string;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount: number | string;
  currency: string;
  status: string;
  payment_method: string | null;
  failure_code: string | null;
  failure_message: string | null;
  captured_at: string | null;
  created_at: string;
  refunds: PaymentRefundResponse[];
}

export interface RazorpayOrderResponse {
  payment_id: string;
  booking_id: string;
  order_id: string;
  amount: number;
  amount_decimal: number | string;
  currency: string;
  key_id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  hold_expires_at?: string | null;
}

export interface RazorpayVerifyRequest {
  booking_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayVerifyResponse {
  success: boolean;
  booking_id: string;
  booking_reference: string;
  payment_id: string;
  provider_payment_id: string;
  amount: number | string;
  currency: string;
  booking_status: string;
  payment_status: string;
  message: string;
}

export interface RazorpayFailureRequest {
  booking_id: string;
  razorpay_order_id?: string;
  error_code?: string;
  error_description?: string;
}

export interface PaymentRefundRequest {
  amount?: number;
  reason?: string;
  record_offline?: boolean;
}

export interface PaymentHoldExpirySummary {
  expired_count: number;
  released_seats: number;
  cancelled_booking_ids: string[];
}

export const bookingApi = {
  calculatePrice: async (data: PriceCalculationRequest): Promise<PriceCalculationResponse> => {
    return await apiRequest<PriceCalculationResponse>("/bookings/calculate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  createBooking: async (
    data: BookingCreateRequest,
    idempotencyKey?: string,
  ): Promise<BookingDetailResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey;
    }
    return await apiRequest<BookingDetailResponse>("/bookings", {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
  },

  getMyBookings: async (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<BookingListResponse> => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    return await apiRequest<BookingListResponse>(`/bookings/my${qs ? `?${qs}` : ""}`);
  },

  getBooking: async (id: string): Promise<BookingDetailResponse> => {
    return await apiRequest<BookingDetailResponse>(`/bookings/${id}`);
  },

  cancelBooking: async (id: string): Promise<BookingDetailResponse> => {
    return await apiRequest<BookingDetailResponse>(`/bookings/${id}/cancel`, {
      method: "POST",
    });
  },
};

export const paymentApi = {
  createOrder: async (
    bookingId: string,
    idempotencyKey?: string,
    amount?: number | string,
    paymentType?: "full" | "deposit" | string,
  ): Promise<RazorpayOrderResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey;
    }
    return await apiRequest<RazorpayOrderResponse>("/payments/razorpay/order", {
      method: "POST",
      headers,
      body: JSON.stringify({
        booking_id: bookingId,
        idempotency_key: idempotencyKey,
        amount: amount !== undefined ? Number(amount) : undefined,
        payment_type: paymentType || "full",
      }),
    });
  },

  verifyPayment: async (data: RazorpayVerifyRequest): Promise<RazorpayVerifyResponse> => {
    return await apiRequest<RazorpayVerifyResponse>("/payments/razorpay/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  recordFailure: async (data: RazorpayFailureRequest): Promise<{ status: string }> => {
    return await apiRequest<{ status: string }>("/payments/razorpay/failure", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getBankDetails: async (bookingId?: string): Promise<BankSettingsPublicResponse> => {
    const query = bookingId ? `?booking_id=${encodeURIComponent(bookingId)}` : "";
    return await apiRequest<BankSettingsPublicResponse>(`/payments/bank-details${query}`);
  },

  submitBankTransfer: async (
    data: BankTransferSubmitRequest,
  ): Promise<BankTransferSubmitResponse> => {
    return await apiRequest<BankTransferSubmitResponse>("/payments/bank-transfer", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

export interface BankSettingsPublicResponse {
  bank_transfer_enabled: boolean;
  branch_payment_enabled: boolean;
  account_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  account_type: string;
  upi_id?: string | null;
  payment_instructions: string;
  required_reference_format: string;
  payment_contact_phone: string;
  payment_contact_email: string;
  max_online_single_payment_limit: number | string;
  split_payments_enabled: boolean;
  default_deposit_percentage: number | string;
  min_deposit_amount: number | string;
}

export interface BankSettingsAdminResponse {
  bank_transfer_enabled: boolean;
  branch_payment_enabled: boolean;
  account_name?: string;
  account_holder_name?: string;
  bank_name?: string;
  account_number_masked?: string;
  account_number_configured?: boolean;
  account_number?: string;
  ifsc_code?: string;
  branch_name?: string;
  account_type?: string;
  upi_id?: string | null;
  payment_instructions?: string;
  required_reference_format?: string;
  proof_upload_setting?: string;
  proof_upload_required?: boolean;
  payment_contact_phone?: string;
  payment_assistance_phone?: string;
  payment_contact_email?: string;
  payment_assistance_email?: string;
  scope?: string;
  package_availability?: string;
  is_ownership_verified?: boolean;
  selected_package_ids?: string[];
  max_online_single_payment_limit?: number | string;
  split_payments_enabled?: boolean;
  split_payment_enabled?: boolean;
  default_deposit_percentage?: number | string;
  min_deposit_amount?: number | string;
  updated_at?: string | null;
}

export interface BankSettingsUpdateRequest {
  bank_transfer_enabled?: boolean;
  branch_payment_enabled?: boolean;
  account_name?: string;
  account_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  confirm_account_number?: string;
  ifsc_code?: string;
  branch_name?: string;
  account_type?: string;
  upi_id?: string | null;
  payment_instructions?: string;
  required_reference_format?: string;
  proof_upload_setting?: string;
  proof_upload_required?: boolean;
  payment_contact_phone?: string;
  payment_assistance_phone?: string;
  payment_contact_email?: string;
  payment_assistance_email?: string;
  scope?: string;
  package_availability?: string;
  selected_package_ids?: string[];
  max_online_single_payment_limit?: number | string;
  split_payments_enabled?: boolean;
  split_payment_enabled?: boolean;
  default_deposit_percentage?: number | string;
  min_deposit_amount?: number | string;
}

export interface BankTransferSubmitRequest {
  booking_id: string;
  transfer_reference: string;
  amount?: number | string;
  payment_method?: "bank_transfer" | "branch_cash" | string;
  proof_url?: string | null;
  notes?: string | null;
}

export interface BankTransferSubmitResponse {
  success: boolean;
  payment_id: string;
  booking_id: string;
  booking_reference: string;
  transfer_reference: string;
  amount: number | string;
  currency: string;
  status: string;
  message: string;
}

export interface BankTransferVerificationRequest {
  verified_amount?: number | string;
  notes?: string;
  reconciliation_notes?: string;
}

export interface BankTransferRejectionRequest {
  reason?: string;
  rejection_reason?: string;
  notes?: string;
}

export interface PaymentGatewayConfig {
  id: string;
  name: string;
  enabled: boolean;
  status: "active" | "disabled" | "coming_soon" | string;
  environment: "test" | "live" | string;
  display_order: number;
  supported_currencies: string[];
  min_amount: number | string;
  max_amount: number | string;
  customer_instructions: string;
  is_configured: boolean;
}

export interface EnvironmentCredentialSummary {
  environment: "test" | "live" | string;
  key_id?: string | null;
  key_id_masked: string;
  key_secret_configured: boolean;
  webhook_secret_configured: boolean;
  is_configured: boolean;
  last_test_status: "valid" | "invalid" | "untested" | string;
  last_tested_at?: string | null;
  last_test_message?: string | null;
}

export interface PaymentSettingsResponse {
  online_payments_enabled: boolean;
  maintenance_message: string | null;
  pending_transactions_count: number;
  gateways: PaymentGatewayConfig[];
  razorpay_key_id_masked: string;
  razorpay_environment: "test" | "live" | string;
  razorpay_enabled: boolean;
  webhook_url: string;
  webhook_secret_configured: boolean;
  key_secret_configured?: boolean;
  has_custom_credentials?: boolean;
  last_diagnostic_at: string | null;
  last_diagnostic_status: string | null;
  live_readiness_checklist: Record<string, boolean>;
  encryption_configured?: boolean;
  test_credentials?: EnvironmentCredentialSummary | null;
  live_credentials?: EnvironmentCredentialSummary | null;
  webhook_last_received_at?: string | null;
  webhook_last_event?: string | null;
  webhook_last_processed_at?: string | null;
  webhook_recent_errors_count?: number;
  max_online_single_payment_limit?: number | string;
  split_payment_enabled?: boolean;
  default_deposit_percentage?: number | string;
}

export interface PaymentSettingsUpdateRequest {
  online_payments_enabled?: boolean;
  maintenance_message?: string | null;
  razorpay_enabled?: boolean;
  razorpay_environment?: "test" | "live";
  target_environment?: "test" | "live";
  confirm_live_mode?: boolean;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  razorpay_webhook_secret?: string;
  reset_credentials_to_env?: boolean;
  max_online_single_payment_limit?: number | string;
  split_payment_enabled?: boolean;
  default_deposit_percentage?: number | string;
}


export interface PaymentOverviewMetricsResponse {
  total_volume: number | string;
  total_transactions: number;
  captured_count: number;
  captured_volume: number | string;
  pending_count: number;
  pending_volume: number | string;
  refunded_count: number;
  refunded_volume: number | string;
  failed_count: number;
  online_payments_enabled: boolean;
  maintenance_message: string | null;
  active_gateways: string[];
  gateway_health: string;
}

export interface PaymentTransactionListItem {
  id: string;
  booking_id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount: number | string;
  currency: string;
  status: string;
  payment_method: string | null;
  captured_at: string | null;
  created_at: string;
  refund_count: number;
  total_refunded: number | string;
  reconciliation_status: string;
  outstanding_balance?: number | string | null;
  booking_total?: number | string | null;
  booking_payment_status?: string | null;
  verification_notes?: string | null;
  failure_message?: string | null;
  transfer_reference?: string | null;
  payment_deadline?: string | null;
}

export interface PaymentTransactionsListResponse {
  items: PaymentTransactionListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaymentWebhookEventItem {
  id: string;
  provider: string;
  event_type: string;
  event_id: string | null;
  entity_id: string | null;
  booking_id: string | null;
  status: string;
  received_at: string;
  actor_user_id: string | null;
  metadata_json: Record<string, unknown> | null;
}

export interface PaymentWebhookListResponse {
  items: PaymentWebhookEventItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RazorpayDiagnosticResponse {
  success: boolean;
  environment: string;
  key_id_masked: string;
  test_order_id: string | null;
  diagnostic_message: string;
  tested_at: string;
  auth_status?: string | null;
  api_reachable?: boolean;
  webhook_configured?: boolean;
}

export interface RazorpayWebhookVerificationResponse {
  configured: boolean;
  environment: string;
  webhook_url: string;
  signature_verification_active: boolean;
  last_webhook_received_at: string | null;
  last_webhook_event: string | null;
  last_processed_at: string | null;
  last_processed_event: string | null;
  recent_errors_count: number;
  recent_errors: Array<{
    action: string;
    created_at: string;
    details: string;
  }>;
  verification_message: string;
  tested_at: string;
}

export const adminPaymentApi = {
  getOverview: async (): Promise<PaymentOverviewMetricsResponse> => {
    return await apiRequest<PaymentOverviewMetricsResponse>("/admin/payments/overview");
  },

  getSettings: async (): Promise<PaymentSettingsResponse> => {
    return await apiRequest<PaymentSettingsResponse>("/admin/payments/settings");
  },

  updateSettings: async (data: PaymentSettingsUpdateRequest): Promise<PaymentSettingsResponse> => {
    return await apiRequest<PaymentSettingsResponse>("/admin/payments/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  getTransactions: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    provider?: string;
  }): Promise<PaymentTransactionsListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.provider) query.set("provider", params.provider);
    const qs = query.toString();
    return await apiRequest<PaymentTransactionsListResponse>(`/admin/payments/transactions${qs ? `?${qs}` : ""}`);
  },

  listRefunds: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaymentRefundResponse[]> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    return await apiRequest<PaymentRefundResponse[]>(`/admin/payments/refunds${qs ? `?${qs}` : ""}`);
  },

  listWebhooks: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<PaymentWebhookListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    return await apiRequest<PaymentWebhookListResponse>(`/admin/payments/webhooks${qs ? `?${qs}` : ""}`);
  },

  retryWebhook: async (auditId: string): Promise<{ status: string; message: string; detail?: unknown }> => {
    return await apiRequest<{ status: string; message: string; detail?: unknown }>(
      `/admin/payments/webhooks/${auditId}/retry`,
      {
        method: "POST",
      }
    );
  },

  runDiagnostic: async (environment?: "test" | "live"): Promise<RazorpayDiagnosticResponse> => {
    return await apiRequest<RazorpayDiagnosticResponse>("/admin/payments/razorpay/diagnostic", {
      method: "POST",
      body: JSON.stringify({ environment }),
    });
  },

  verifyWebhook: async (environment?: "test" | "live"): Promise<RazorpayWebhookVerificationResponse> => {
    return await apiRequest<RazorpayWebhookVerificationResponse>("/admin/payments/razorpay/webhook/verify", {
      method: "POST",
      body: JSON.stringify({ environment }),
    });
  },

  getPayment: async (paymentId: string): Promise<PaymentDetailResponse> => {
    return await apiRequest<PaymentDetailResponse>(`/admin/payments/${paymentId}`);
  },


  processRefund: async (
    paymentId: string,
    data: PaymentRefundRequest,
  ): Promise<PaymentRefundResponse> => {
    return await apiRequest<PaymentRefundResponse>(`/admin/payments/${paymentId}/refund`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  expireHolds: async (): Promise<PaymentHoldExpirySummary> => {
    return await apiRequest<PaymentHoldExpirySummary>("/admin/payments/expire-holds", {
      method: "POST",
    });
  },

  getBankSettings: async (): Promise<BankSettingsAdminResponse> => {
    return await apiRequest<BankSettingsAdminResponse>("/admin/payments/bank-settings");
  },

  updateBankSettings: async (data: BankSettingsUpdateRequest): Promise<BankSettingsAdminResponse> => {
    return await apiRequest<BankSettingsAdminResponse>("/admin/payments/bank-settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  verifyBankTransfer: async (
    paymentId: string,
    data: BankTransferVerificationRequest
  ): Promise<PaymentDetailResponse> => {
    return await apiRequest<PaymentDetailResponse>(`/admin/payments/${paymentId}/verify-bank-transfer`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  rejectBankTransfer: async (
    paymentId: string,
    data: BankTransferRejectionRequest
  ): Promise<PaymentDetailResponse> => {
    return await apiRequest<PaymentDetailResponse>(`/admin/payments/${paymentId}/reject-bank-transfer`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

export const healthApi = {
  checkHealth: async (): Promise<{ status: string }> => {
    return await apiRequest<{ status: string }>("/health");
  },
  checkReadiness: async (): Promise<{ status: string; database: string }> => {
    return await apiRequest<{ status: string; database: string }>("/health/ready");
  },
};

export const adminBookingApi = {
  listBookings: async (params?: {
    status?: string;
    payment_status?: string;
    package_id?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<BookingListResponse> => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.payment_status) query.set("payment_status", params.payment_status);
    if (params?.package_id) query.set("package_id", params.package_id);
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    return await apiRequest<BookingListResponse>(`/admin/bookings${qs ? `?${qs}` : ""}`);
  },

  getBooking: async (id: string): Promise<BookingDetailResponse> => {
    return await apiRequest<BookingDetailResponse>(`/admin/bookings/${id}`);
  },

  updateStatus: async (
    id: string,
    status: string,
    reason?: string,
  ): Promise<BookingDetailResponse> => {
    return await apiRequest<BookingDetailResponse>(`/admin/bookings/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
    });
  },
};

// -------------------------------------------------------------
// Phase 10: Customer Portal & Communication Interfaces
// -------------------------------------------------------------

export interface SavedTraveller {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  relationship_label: string | null;
  is_primary: boolean;
  passport_number: string | null;
  passport_expiry: string | null;
  passport_issuing_country: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedTravellerCreate {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  relationship_label?: string | null;
  is_primary?: boolean;
  passport_number?: string | null;
  passport_expiry?: string | null;
  passport_issuing_country?: string | null;
}

export interface CustomerProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string;
  created_at: string;
  email_immutability_notice: string;
}

export interface CustomerProfileUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface WhatsAppConciergeAction {
  action_type: string;
  label: string;
  prefilled_message: string;
  click_to_chat_url: string;
  display_phone: string;
}

export type BookingItem = BookingSummaryResponse;

export interface CustomerDashboardSummary {
  user_name: string;
  user_email: string;
  total_bookings: number;
  active_bookings_count: number;
  completed_trips_count: number;
  upcoming_trips: BookingSummaryResponse[];
  recent_bookings: BookingSummaryResponse[];
  saved_travellers_count: number;
  whatsapp_concierge: WhatsAppConciergeAction;
}

export interface CancellationRequest {
  id: string;
  booking_id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CancellationRequestDetail extends CancellationRequest {
  booking_reference: string;
  package_title: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  currency: string;
}

export interface TravelVoucherData {
  agency_name: string;
  agency_location: string;
  agency_phone: string;
  agency_email: string;
  whatsapp_number: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  package_title: string;
  destination_name: string;
  departure_date: string;
  return_date: string | null;
  number_of_travellers: number;
  travellers: Array<{
    name: string;
    gender: string;
    is_primary: boolean;
    contact_phone?: string;
    contact_email?: string;
  }>;
  itinerary_days: Array<{
    day_number: number;
    title: string;
    description: string;
    activities?: string[];
  }>;
  hotel_information?: Array<{
    hotel_id?: string;
    name?: string;
    city?: string;
    room_type?: string;
    nights?: number;
  }>;
  activities?: Array<{
    name: string;
    description?: string;
  }>;
  booking_status: string;
  payment_status: string;
  special_notes: string | null;
  issued_at: string;
  // PDF Customizations
  pdf_header_title?: string | null;
  pdf_header_subtitle?: string | null;
  pdf_office_address?: string | null;
  pdf_contact_info?: string | null;
  pdf_checkin_instructions?: string | null;
  pdf_logistics_notice?: string | null;
  pdf_helpline_info?: string | null;
  pdf_footer_declaration?: string | null;
  pdf_badge_label?: string | null;
  pdf_logo_url?: string | null;
}

export interface PaymentReceiptData {
  receipt_number: string;
  agency_name: string;
  agency_location: string;
  agency_phone: string;
  agency_email: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  package_title: string;
  destination_name: string;
  travel_dates: string;
  payment_provider: string;
  payment_id: string;
  razorpay_order_id: string | null;
  payment_date: string;
  payment_status: string;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  amount_paid: number;
  receipt_issued_at: string;
}

export interface NotificationLog {
  id: string;
  channel: string;
  notification_type: string;
  recipient: string;
  recipient_user_id: string | null;
  booking_id: string | null;
  subject: string | null;
  provider: string;
  provider_message_id: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  retry_count: number;
  template_name?: string | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationLogList {
  items: NotificationLog[];
  total: number;
  page: number;
  page_size: number;
}

// -------------------------------------------------------------
// Phase 10 API Clients
// -------------------------------------------------------------

export const customerApi = {
  getDashboard: async (): Promise<CustomerDashboardSummary> => {
    return await apiRequest<CustomerDashboardSummary>("/customer/dashboard");
  },

  getProfile: async (): Promise<CustomerProfile> => {
    return await apiRequest<CustomerProfile>("/customer/profile");
  },

  updateProfile: async (data: CustomerProfileUpdate): Promise<CustomerProfile> => {
    return await apiRequest<CustomerProfile>("/customer/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  listSavedTravellers: async (): Promise<SavedTraveller[]> => {
    return await apiRequest<SavedTraveller[]>("/customer/travellers");
  },

  getTravellers: async (): Promise<SavedTraveller[]> => {
    return await apiRequest<SavedTraveller[]>("/customer/travellers");
  },

  createSavedTraveller: async (data: SavedTravellerCreate): Promise<SavedTraveller> => {
    return await apiRequest<SavedTraveller>("/customer/travellers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  createTraveller: async (data: SavedTravellerCreate): Promise<SavedTraveller> => {
    return await apiRequest<SavedTraveller>("/customer/travellers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateSavedTraveller: async (
    id: string,
    data: Partial<SavedTravellerCreate>,
  ): Promise<SavedTraveller> => {
    return await apiRequest<SavedTraveller>(`/customer/travellers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  updateTraveller: async (
    id: string,
    data: Partial<SavedTravellerCreate>,
  ): Promise<SavedTraveller> => {
    return await apiRequest<SavedTraveller>(`/customer/travellers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteSavedTraveller: async (id: string): Promise<void> => {
    await apiRequest<void>(`/customer/travellers/${id}`, {
      method: "DELETE",
    });
  },

  deleteTraveller: async (id: string): Promise<void> => {
    await apiRequest<void>(`/customer/travellers/${id}`, {
      method: "DELETE",
    });
  },

  getWhatsAppConcierge: async (): Promise<WhatsAppConciergeAction[]> => {
    return await apiRequest<WhatsAppConciergeAction[]>("/customer/whatsapp-concierge");
  },
};

export const customerBookingApi = {
  getMyBookings: async (params?: {
    status?: string;
    page?: number;
    per_page?: number;
    page_size?: number;
    search?: string;
  }): Promise<BookingListResponse> => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    const size = params?.page_size || params?.per_page;
    if (size) query.set("page_size", String(size));
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return await apiRequest<BookingListResponse>(`/bookings/my${qs ? `?${qs}` : ""}`);
  },

  getBooking: async (referenceOrId: string): Promise<BookingDetailResponse> => {
    return await apiRequest<BookingDetailResponse>(`/bookings/${referenceOrId}`);
  },

  getBookingDetail: async (referenceOrId: string): Promise<BookingDetailResponse> => {
    return await apiRequest<BookingDetailResponse>(`/bookings/${referenceOrId}`);
  },

  submitCancellation: async (
    bookingId: string,
    reason: string,
  ): Promise<CancellationRequest> => {
    return await apiRequest<CancellationRequest>(`/bookings/${bookingId}/cancellation-request`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  requestCancellation: async (
    bookingId: string,
    reason: string,
  ): Promise<{ success: boolean; message: string; request: CancellationRequest }> => {
    const res = await apiRequest<CancellationRequest>(`/bookings/${bookingId}/cancellation-request`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    return {
      success: true,
      message: "Cancellation request submitted. Our team will review your request.",
      request: res,
    };
  },

  getTravelVoucher: async (reference: string): Promise<TravelVoucherData> => {
    return await apiRequest<TravelVoucherData>(`/bookings/${reference}/voucher`);
  },

  getVoucher: async (reference: string): Promise<TravelVoucherData> => {
    return await apiRequest<TravelVoucherData>(`/bookings/${reference}/voucher`);
  },

  getPaymentReceipt: async (reference: string): Promise<PaymentReceiptData> => {
    return await apiRequest<PaymentReceiptData>(`/bookings/${reference}/receipt`);
  },

  getReceipt: async (reference: string): Promise<PaymentReceiptData> => {
    return await apiRequest<PaymentReceiptData>(`/bookings/${reference}/receipt`);
  },
};

export const adminCancellationApi = {
  listCancellations: async (
    statusOrParams?: string | { status?: string; page?: number; page_size?: number },
  ): Promise<CancellationRequestDetail[]> => {
    const query = new URLSearchParams();
    if (typeof statusOrParams === "string") {
      if (statusOrParams) query.set("status", statusOrParams);
    } else if (statusOrParams) {
      if (statusOrParams.status) query.set("status", statusOrParams.status);
      if (statusOrParams.page) query.set("page", String(statusOrParams.page));
      if (statusOrParams.page_size) query.set("page_size", String(statusOrParams.page_size));
    }
    const qs = query.toString();
    return await apiRequest<CancellationRequestDetail[]>(`/admin/cancellations${qs ? `?${qs}` : ""}`);
  },

  reviewCancellation: async (
    id: string,
    data: { status?: "approved" | "rejected"; action?: "approve" | "reject"; admin_notes?: string; review_notes?: string },
  ): Promise<CancellationRequestDetail> => {
    const statusVal = data.status || (data.action === "approve" ? "approved" : "rejected");
    const notesVal = data.admin_notes || data.review_notes;
    return await apiRequest<CancellationRequestDetail>(`/admin/cancellations/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ status: statusVal, admin_notes: notesVal }),
    });
  },
};

export const adminNotificationApi = {
  listNotifications: async (params?: {
    channel?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<NotificationLogList> => {
    const query = new URLSearchParams();
    if (params?.channel) query.set("channel", params.channel);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    const qs = query.toString();
    return await apiRequest<NotificationLogList>(`/admin/notifications${qs ? `?${qs}` : ""}`);
  },

  retryNotification: async (id: string): Promise<NotificationLog> => {
    return await apiRequest<NotificationLog>(`/admin/notifications/${id}/retry`, {
      method: "POST",
    });
  },
};

// ==============================================================================
// STEP 11: Final Admin Operations, Analytics & Management Types & APIs
// ==============================================================================

export interface OperationsDashboardMetrics {
  today_bookings: number;
  pending_payments: number;
  confirmed_bookings: number;
  upcoming_departures: number;
  cancellation_requests: number;
  pending_inquiries: number;
  total_revenue: string;
  outstanding_payments: string;
  recent_bookings: RecentBookingItem[];
  recent_inquiries: RecentInquiryItem[];
  recent_audit_activity: RecentAuditItem[];
}

export interface RevenueTimeSeriesItem {
  date: string;
  paid_revenue: string;
  refunded_amount: string;
  net_revenue: string;
  bookings_count: number;
}

export interface RevenueAnalyticsResponse {
  total_revenue: string;
  paid_revenue: string;
  pending_payments: string;
  refunded_amount: string;
  net_revenue: string;
  period: string;
  start_date: string;
  end_date: string;
  time_series: RevenueTimeSeriesItem[];
}

export interface BookingStatusCountItem {
  status: string;
  count: number;
}

export interface BookingTimeSeriesItem {
  date: string;
  count: number;
  gross_value: string;
}

export interface BookingAnalyticsResponse {
  total_bookings: number;
  confirmed_count: number;
  pending_count: number;
  cancelled_count: number;
  completed_count: number;
  conversion_rate: number;
  average_booking_value: string;
  average_travellers_per_booking: number;
  by_status: BookingStatusCountItem[];
  time_series: BookingTimeSeriesItem[];
}

export interface CustomerAnalyticsResponse {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  customers_with_upcoming_trips: number;
  customers_with_completed_trips: number;
}

export interface PackagePerformanceItem {
  package_id: string;
  package_name: string;
  destination_name: string;
  bookings_count: number;
  travellers_count: number;
  gross_booking_value: string;
  confirmed_revenue: string;
  cancellations_count: number;
  conversion_rate: number;
}

export interface PackagePerformanceResponse {
  items: PackagePerformanceItem[];
}

export interface DestinationPerformanceItem {
  destination_id: string;
  destination_name: string;
  packages_count: number;
  bookings_count: number;
  travellers_count: number;
  revenue: string;
}

export interface DestinationPerformanceResponse {
  items: DestinationPerformanceItem[];
}

export interface InternalNoteResponse {
  id: string;
  entity_type: string;
  entity_id: string;
  author_id: string;
  author_name: string;
  author_email: string;
  note: string;
  created_at: string;
}

export interface DepartureOperationalItem {
  id: string;
  package_id: string;
  package_name: string;
  destination_name: string;
  departure_date: string;
  return_date: string | null;
  total_capacity: number;
  reserved_capacity: number;
  available_capacity: number;
  status: string;
  special_price: string | null;
  currency: string;
  days_until_departure: number;
  operational_status: "upcoming" | "departing_today" | "departed" | "cancelled";
  occupancy_rate: number;
}

export interface DepartureManifestTraveller {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  passport_number_masked: string | null;
  is_primary: boolean;
}

export interface DepartureManifestBooking {
  booking_id: string;
  booking_reference: string;
  lead_traveller_name: string;
  lead_traveller_phone: string | null;
  lead_traveller_email: string | null;
  traveller_count: number;
  payment_status: string;
  customer_notes: string | null;
  travellers: DepartureManifestTraveller[];
}

export interface DepartureManifestResponse {
  departure_id: string;
  departure_date: string;
  return_date: string | null;
  package_name: string;
  destination_name: string;
  total_capacity: number;
  reserved_capacity: number;
  available_capacity: number;
  status: string;
  bookings: DepartureManifestBooking[];
  internal_notes: InternalNoteResponse[];
}

export interface CustomerListItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  total_bookings: number;
  upcoming_trips: number;
  completed_trips: number;
  cancelled_trips: number;
  total_paid: string;
  currency: string;
  created_at: string;
}

export interface CustomerPaymentHistoryItem {
  id: string;
  booking_id: string;
  booking_reference: string;
  amount: string;
  currency: string;
  status: string;
  provider: string;
  payment_method: string | null;
  created_at: string;
  captured_at: string | null;
}

export interface CustomerCancellationHistoryItem {
  id: string;
  booking_id: string;
  booking_reference: string;
  reason: string;
  status: string;
  resolved_at: string | null;
  created_at: string;
}

export interface CustomerInquiryHistoryItem {
  id: string;
  message: string;
  status: string;
  created_at: string;
}

export interface CustomerDetailResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  saved_traveller_count: number;
  bookings: RecentBookingItem[];
  payments: CustomerPaymentHistoryItem[];
  cancellations: CustomerCancellationHistoryItem[];
  inquiries: CustomerInquiryHistoryItem[];
  internal_notes: InternalNoteResponse[];
}

export interface InquiryListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  destination_name: string | null;
  package_name: string | null;
  message: string;
  status: string;
  priority: string;
  source: string;
  assigned_to_name: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InquiryDetailResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  destination_name: string | null;
  destination_id: string | null;
  package_name: string | null;
  package_id: string | null;
  message: string;
  status: string;
  priority: string;
  source: string;
  assigned_to_name: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
  internal_notes: InternalNoteResponse[];
}

export interface InquiryUpdateRequest {
  status?: string;
  priority?: string;
  assigned_to_user_id?: string | null;
}

export interface PaymentReconciliationItem {
  payment_id: string;
  booking_id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount: string;
  currency: string;
  payment_status: string;
  booking_status: string;
  booking_payment_status: string;
  created_at: string;
  captured_at: string | null;
  mismatch_types: string[];
}

export interface PaymentReconciliationResponse {
  items: PaymentReconciliationItem[];
  mismatch_summary: Record<string, number>;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ContactCustomerEmailRequest {
  booking_id?: string;
  inquiry_id?: string;
  subject: string;
  body: string;
}

export interface ContactCustomerEmailResponse {
  status: string;
  message: string;
  recipient: string;
}

export interface ContactCustomerWhatsAppResponse {
  click_to_chat_url: string;
  recipient_phone: string;
  message: string;
}

export const adminOperationsApi = {
  getDashboard: async (): Promise<OperationsDashboardMetrics> => {
    return await apiRequest<OperationsDashboardMetrics>("/admin/operations/dashboard");
  },

  listDepartures: async (params?: {
    package_id?: string;
    status?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<DepartureOperationalItem[]> => {
    const query = new URLSearchParams();
    if (params?.package_id) query.set("package_id", params.package_id);
    if (params?.status) query.set("status", params.status);
    if (params?.from_date) query.set("from_date", params.from_date);
    if (params?.to_date) query.set("to_date", params.to_date);
    const qs = query.toString();
    return await apiRequest<DepartureOperationalItem[]>(`/admin/operations/departures${qs ? `?${qs}` : ""}`);
  },

  getManifest: async (departureId: string): Promise<DepartureManifestResponse> => {
    return await apiRequest<DepartureManifestResponse>(`/admin/operations/departures/${departureId}/manifest`);
  },

  getReconciliation: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    mismatch_type?: string;
    search?: string;
  }): Promise<PaymentReconciliationResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.status) query.set("status", params.status);
    if (params?.mismatch_type) query.set("mismatch_type", params.mismatch_type);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return await apiRequest<PaymentReconciliationResponse>(`/admin/operations/reconciliation${qs ? `?${qs}` : ""}`);
  },

  contactCustomerEmail: async (data: ContactCustomerEmailRequest): Promise<ContactCustomerEmailResponse> => {
    return await apiRequest<ContactCustomerEmailResponse>("/admin/operations/contact/email", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getWhatsAppContactUrl: async (params: {
    booking_id?: string;
    inquiry_id?: string;
  }): Promise<ContactCustomerWhatsAppResponse> => {
    const query = new URLSearchParams();
    if (params.booking_id) query.set("booking_id", params.booking_id);
    if (params.inquiry_id) query.set("inquiry_id", params.inquiry_id);
    const qs = query.toString();
    return await apiRequest<ContactCustomerWhatsAppResponse>(`/admin/operations/contact/whatsapp${qs ? `?${qs}` : ""}`);
  },
};

export const adminAnalyticsApi = {
  getRevenue: async (params?: {
    period?: string;
    custom_start?: string;
    custom_end?: string;
  }): Promise<RevenueAnalyticsResponse> => {
    const query = new URLSearchParams();
    if (params?.period) query.set("period", params.period);
    if (params?.custom_start) query.set("custom_start", params.custom_start);
    if (params?.custom_end) query.set("custom_end", params.custom_end);
    const qs = query.toString();
    return await apiRequest<RevenueAnalyticsResponse>(`/admin/analytics/revenue${qs ? `?${qs}` : ""}`);
  },

  getBookings: async (params?: {
    period?: string;
    destination_id?: string;
    package_id?: string;
    departure_id?: string;
    status?: string;
    custom_start?: string;
    custom_end?: string;
  }): Promise<BookingAnalyticsResponse> => {
    const query = new URLSearchParams();
    if (params?.period) query.set("period", params.period);
    if (params?.destination_id) query.set("destination_id", params.destination_id);
    if (params?.package_id) query.set("package_id", params.package_id);
    if (params?.departure_id) query.set("departure_id", params.departure_id);
    if (params?.status) query.set("status", params.status);
    if (params?.custom_start) query.set("custom_start", params.custom_start);
    if (params?.custom_end) query.set("custom_end", params.custom_end);
    const qs = query.toString();
    return await apiRequest<BookingAnalyticsResponse>(`/admin/analytics/bookings${qs ? `?${qs}` : ""}`);
  },

  getCustomers: async (): Promise<CustomerAnalyticsResponse> => {
    return await apiRequest<CustomerAnalyticsResponse>("/admin/analytics/customers");
  },

  getPackages: async (params?: { sort_by?: string }): Promise<PackagePerformanceResponse> => {
    const query = new URLSearchParams();
    if (params?.sort_by) query.set("sort_by", params.sort_by);
    const qs = query.toString();
    return await apiRequest<PackagePerformanceResponse>(`/admin/analytics/packages${qs ? `?${qs}` : ""}`);
  },

  getDestinations: async (): Promise<DestinationPerformanceResponse> => {
    return await apiRequest<DestinationPerformanceResponse>("/admin/analytics/destinations");
  },
};

export const adminCustomersApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<PaginatedResponse<CustomerListItem>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return await apiRequest<PaginatedResponse<CustomerListItem>>(`/admin/customers${qs ? `?${qs}` : ""}`);
  },

  get: async (id: string): Promise<CustomerDetailResponse> => {
    return await apiRequest<CustomerDetailResponse>(`/admin/customers/${id}`);
  },
};

export const adminInquiriesApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    priority?: string;
    destination_id?: string;
    package_id?: string;
    search?: string;
  }): Promise<PaginatedResponse<InquiryListItem>> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.status) query.set("status", params.status);
    if (params?.priority) query.set("priority", params.priority);
    if (params?.destination_id) query.set("destination_id", params.destination_id);
    if (params?.package_id) query.set("package_id", params.package_id);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return await apiRequest<PaginatedResponse<InquiryListItem>>(`/admin/inquiries${qs ? `?${qs}` : ""}`);
  },

  get: async (id: string): Promise<InquiryDetailResponse> => {
    return await apiRequest<InquiryDetailResponse>(`/admin/inquiries/${id}`);
  },

  update: async (id: string, data: InquiryUpdateRequest): Promise<InquiryDetailResponse> => {
    return await apiRequest<InquiryDetailResponse>(`/admin/inquiries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

export const adminNotesApi = {
  list: async (entityType: string, entityId: string): Promise<InternalNoteResponse[]> => {
    return await apiRequest<InternalNoteResponse[]>(`/admin/notes/${entityType}/${entityId}`);
  },

  create: async (entityType: string, entityId: string, note: string): Promise<InternalNoteResponse> => {
    return await apiRequest<InternalNoteResponse>(`/admin/notes/${entityType}/${entityId}`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },
};

export const adminExportsApi = {
  getBookingsUrl: (): string => `/api/v1/admin/exports/bookings`,
  getCustomersUrl: (): string => `/api/v1/admin/exports/customers`,
  getDeparturesUrl: (): string => `/api/v1/admin/exports/departures`,
  getInquiriesUrl: (): string => `/api/v1/admin/exports/inquiries`,
  getManifestUrl: (departureId: string): string => `/api/v1/admin/exports/manifest/${departureId}`,
  getPaymentsUrl: (): string => `/api/v1/admin/exports/payments`,
  getRevenueUrl: (period: string = "30d"): string => `/api/v1/admin/exports/revenue?period=${period}`,
};

// ==============================================================================
// Best Offers Types and API
// ==============================================================================

export interface PublicOfferListItem {
  id: string;
  package_id: string;
  package_name: string;
  package_slug: string;
  destination_name: string;
  destination_slug: string;
  duration_days: number;
  duration_nights: number;
  cover_image_url: string | null;
  original_price: number | string;
  discount_type: "percentage" | "fixed_amount" | "fixed";
  discount_value: number | string;
  discount_amount: number | string;
  discounted_price: number | string;
  savings: number | string;
  discount_badge: string;
  offer_label: string | null;
  is_featured: boolean;
  start_at: string | null;
  end_at: string | null;
  currency: string;
}

export interface PublicOffersResponse {
  section_enabled: boolean;
  offers: PublicOfferListItem[];
}

export interface AdminOfferItem {
  id: string;
  package_id: string;
  package_name: string;
  package_slug: string;
  destination_name: string;
  duration_days: number;
  duration_nights: number;
  cover_image_url: string | null;
  package_is_published: boolean;
  current_package_price: number | string;
  original_price_snapshot: number | string | null;
  price_changed_warning: boolean;
  title: string;
  short_description: string | null;
  discount_type: "percentage" | "fixed_amount" | "fixed";
  discount_value: number | string;
  calculated_discount_amount: number | string;
  calculated_discounted_price: number | string;
  savings: number | string;
  discount_badge: string;
  minimum_booking_amount: number | string | null;
  maximum_discount_amount: number | string | null;
  offer_label: string | null;
  badge_text: string | null;
  is_featured: boolean;
  status: "draft" | "active" | "published" | "disabled" | "archived";
  is_expired: boolean;
  start_at: string | null;
  end_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AdminOfferCreate {
  package_id: string;
  title: string;
  short_description?: string | null;
  discount_type: "percentage" | "fixed_amount" | "fixed";
  discount_value: number;
  minimum_booking_amount?: number | null;
  maximum_discount_amount?: number | null;
  offer_label?: string | null;
  badge_text?: string | null;
  is_featured?: boolean;
  status?: "draft" | "active" | "published" | "disabled" | "archived";
  start_at?: string | null;
  end_at?: string | null;
  display_order?: number;
}

export interface AdminOfferUpdate {
  package_id?: string;
  title?: string;
  short_description?: string | null;
  discount_type?: "percentage" | "fixed_amount" | "fixed";
  discount_value?: number;
  minimum_booking_amount?: number | null;
  maximum_discount_amount?: number | null;
  offer_label?: string | null;
  badge_text?: string | null;
  is_featured?: boolean;
  status?: "draft" | "active" | "published" | "disabled" | "archived";
  start_at?: string | null;
  end_at?: string | null;
  display_order?: number;
}

export interface AdminOfferListResponse {
  items: AdminOfferItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  section_enabled: boolean;
}

export interface MasterToggleResponse {
  enabled: boolean;
  message: string;
}

export const publicOffersApi = {
  getPublicOffers: async (): Promise<PublicOffersResponse> => {
    return await apiRequest<PublicOffersResponse>("/offers");
  },
};

export const adminOffersApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
  }): Promise<AdminOfferListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.page_size) query.set("page_size", String(params.page_size));
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    return await apiRequest<AdminOfferListResponse>(`/admin/offers${qs ? `?${qs}` : ""}`);
  },

  getMasterToggle: async (): Promise<MasterToggleResponse> => {
    return await apiRequest<MasterToggleResponse>("/admin/offers/master-toggle");
  },

  updateMasterToggle: async (enabled: boolean): Promise<MasterToggleResponse> => {
    return await apiRequest<MasterToggleResponse>("/admin/offers/master-toggle", {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
  },

  create: async (data: AdminOfferCreate): Promise<AdminOfferItem> => {
    return await apiRequest<AdminOfferItem>("/admin/offers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: AdminOfferUpdate): Promise<AdminOfferItem> => {
    return await apiRequest<AdminOfferItem>(`/admin/offers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest<void>(`/admin/offers/${id}`, {
      method: "DELETE",
    });
  },
};

export interface CatalogCategoriesResponse {
  destination_categories: string[];
  destination_travel_types: string[];
  package_categories: string[];
  package_travel_types: string[];
  package_difficulty_levels: string[];
  activity_categories: string[];
}

export const adminOptionsApi = {
  getCategories: async (): Promise<CatalogCategoriesResponse> => {
    return await apiRequest<CatalogCategoriesResponse>("/admin/options/categories");
  },
  registerCategory: async (
    field:
      | "destination_categories"
      | "destination_travel_types"
      | "package_categories"
      | "package_travel_types"
      | "package_difficulty_levels"
      | "activity_categories",
    value: string
  ): Promise<CatalogCategoriesResponse> => {
    return await apiRequest<CatalogCategoriesResponse>("/admin/options/categories", {
      method: "POST",
      body: JSON.stringify({ field, value }),
    });
  },
};



