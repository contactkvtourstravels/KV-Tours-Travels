/**
 * Centralized business contact and branding constants for Wild Root.
 * Supports environment variable overrides for multi-environment deployments.
 */

export const AGENCY_NAME = process.env.NEXT_PUBLIC_AGENCY_NAME || "Travel Agency";
export const AGENCY_LOCATION = process.env.NEXT_PUBLIC_AGENCY_LOCATION || "India";
export const AGENCY_OFFICE_ADDRESS = process.env.NEXT_PUBLIC_AGENCY_OFFICE_ADDRESS || "Headquarters";

export const DEFAULT_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@travelagency.com";
export const DEFAULT_BUSINESS_PHONE =
  process.env.NEXT_PUBLIC_BUSINESS_PHONE || "+91 94420 00000";
export const DEFAULT_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+919442000000";

/**
 * Returns digits-only telephone string suitable for WhatsApp wa.me links.
 */
export function getCleanWhatsAppNumber(rawPhone?: string | null): string {
  const target = rawPhone || DEFAULT_WHATSAPP_NUMBER;
  const digits = target.replace(/[^0-9]/g, "");
  return digits || "919442000000";
}

/**
 * Constructs a click-to-chat WhatsApp URL with optional message.
 */
export function getWhatsAppClickToChatUrl(
  phone?: string | null,
  message?: string
): string {
  const clean = getCleanWhatsAppNumber(phone);
  const encodedMsg = message ? encodeURIComponent(message) : "";
  return `https://wa.me/${clean}${encodedMsg ? `?text=${encodedMsg}` : ""}`;
}
