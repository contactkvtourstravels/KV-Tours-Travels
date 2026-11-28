/**
 * Centralized business contact and branding constants for KV Tours & Travels.
 * Supports environment variable overrides for multi-environment deployments.
 */

export const AGENCY_NAME = process.env.NEXT_PUBLIC_AGENCY_NAME || "KV Tours & Travels";
export const AGENCY_SHORT_NAME = process.env.NEXT_PUBLIC_AGENCY_SHORT_NAME || "KV Tours";
export const AGENCY_LOCATION = process.env.NEXT_PUBLIC_AGENCY_LOCATION || "Coimbatore, Tamil Nadu, India";
export const AGENCY_OFFICE_ADDRESS =
  process.env.NEXT_PUBLIC_AGENCY_OFFICE_ADDRESS ||
  "Uffizi Building, Vserve building, 2 nd floor, Above yamaha showroom 338, Avinashi Rd, Peelamedu, HUDCO Colony, Coimbatore, Tamil Nadu 641004";
export const DEFAULT_WEBSITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://kvtourstravels.in";

export const DEFAULT_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact.kvtourstravels@gmail.com";
export const DEFAULT_BUSINESS_PHONE =
  process.env.NEXT_PUBLIC_BUSINESS_PHONE || "";
export const DEFAULT_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";

/**
 * Safely normalizes phone number to E.164 digits without leading '+'.
 * Prevents duplicated country codes, strips whitespace, leading zeros, and invalid characters.
 */
export function normalizeWhatsAppNumber(
  rawPhone?: string | null,
  rawCountryCode: string = "+91"
): string {
  const target = (rawPhone || "").trim();
  if (!target) return "";
  const isExplicitIntl = target.startsWith("+");
  const cleanCode = (rawCountryCode || "+91").replace(/\D/g, "");
  let digits = target.replace(/\D/g, "");

  if (!digits) return "";

  if (isExplicitIntl) {
    return digits;
  }

  // Strip leading 0 trunk prefix
  digits = digits.replace(/^0+/, "");
  if (!digits) return "";

  if (cleanCode) {
    // If digits already starts with cleanCode and length indicates full intl number (e.g. 11+ digits)
    if (digits.startsWith(cleanCode) && digits.length > cleanCode.length && digits.length >= 11) {
      return digits;
    }
    return `${cleanCode}${digits}`;
  }
  return digits;
}

/**
 * Returns digits-only telephone string suitable for WhatsApp wa.me links.
 * Returns empty string if no valid number or if placeholder dummy digits are detected.
 */
export function getCleanWhatsAppNumber(
  rawPhone?: string | null,
  rawCountryCode: string = "+91"
): string {
  const normalized = normalizeWhatsAppNumber(rawPhone, rawCountryCode);
  if (!normalized || normalized.includes("9442000000") || /^0+$/.test(normalized)) {
    return "";
  }
  return normalized;
}

/**
 * Constructs a click-to-chat WhatsApp URL with optional message and country code.
 * Returns empty string if no valid phone number is configured.
 */
export function getWhatsAppClickToChatUrl(
  phone?: string | null,
  message?: string,
  countryCode: string = "+91"
): string {
  const clean = getCleanWhatsAppNumber(phone, countryCode);
  if (!clean) return "";
  const encodedMsg = message ? encodeURIComponent(message) : "";
  return `https://wa.me/${clean}${encodedMsg ? `?text=${encodedMsg}` : ""}`;
}
