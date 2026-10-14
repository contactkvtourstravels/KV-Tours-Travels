/**
 * Centralized business contact and branding constants for KV Tours & Travels.
 * Supports environment variable overrides for multi-environment deployments.
 */

export const AGENCY_NAME = "KV Tours & Travels";
export const AGENCY_LOCATION = "Coimbatore, Tamil Nadu, India";
export const AGENCY_OFFICE_ADDRESS = "Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012";

export const DEFAULT_CONTACT_EMAIL = "contact@kvtours.in";
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
