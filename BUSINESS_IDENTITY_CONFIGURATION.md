# KV Tours & Travels: Business Identity Configuration Guide

This guide describes how to configure, customize, and verify the official business identity, contact details, branding colors, and communication channels for **KV Tours & Travels**.

---

## 1. Centralized Architecture Overview

The application utilizes a hierarchical, single-source-of-truth configuration architecture:

```
┌────────────────────────────────────────────────────────┐
│      1. Authoritative Backend Database (SiteSettings)  │
│      Stores agency name, emails, phone, addresses,      │
│      social accounts, brand palettes, and SEO metadata │
└──────────────────────────┬─────────────────────────────┘
                           │ Public API (/api/v1/public/settings)
                           ▼
┌────────────────────────────────────────────────────────┐
│      2. Frontend BrandingContext (React Context)        │
│      Caches settings, computes initials, injects CSS   │
│      variables (--smoke-primary, --brand-secondary)    │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌──────────────────────────┐┌────────────────────────────┐
│ 3. Public User Interface ││ 4. Operational Documents   │
│ Navbar, Hero, Contact,   ││ PDF Vouchers, Invoices,    │
│ Footer, Floating WhatsApp││ WhatsApp Click-to-Chat, SEO│
└──────────────────────────┘└────────────────────────────┘
```

If the database is unpopulated or unreachable, the application automatically falls back to safe defaults defined in `frontend/src/lib/constants.ts` and `backend/app/core/config.py`.

---

## 2. Managing Identity via the Admin Portal

Super Admins and authorized Administrators can manage all identity parameters directly from the browser without code changes:

1. Sign in to the Admin Dashboard at `/admin/login` using your authorized credentials (`contact.kvtourstravels@gmail.com`).
2. Navigate to **Settings & Integrations** in the left sidebar or visit `/admin/settings?tab=identity`.
3. Select the **Business Identity** tab.

### Available Identity Sub-Tabs:

### A. Identity & Branding
- **Full Agency Name:** The master business name displayed on headers, receipts, and hero sections (Default: `KV Tours & Travels`).
- **Short Business Name:** Compact title used for mobile navbars and badges (Default: `KV Tours`).
- **Brand Tagline:** Displayed beneath the brand name (e.g. `Luxury & Bespoke Holiday Journeys`).
- **Legal Business Name:** Official registered company name for GST invoices and footer disclaimers (e.g. `KV Tours & Travels`).
- **Year Established:** Displayed on trust badges (e.g. `2024`).
- **Theme Color Palette:** Choose between:
  - *Royal Charcoal & Warm Gold (Default Heritage):* `#24292F` (Primary), `#C5A880` (Secondary), `#D4AF37` (Accent).
  - *Imperial Emerald & Champagne (Eco & Safaris):* `#0D3B2E`, `#C5A880`, `#E5BA73`.
  - *Aegean Azure & Bronze (Coastal & Island):* `#0F2C59`, `#C5A880`, `#38B6FF`.
- **Custom Logo URL:** Upload or paste the URL of the official KV Tours logo.

### B. Contact Information & Office Details
- **Primary Business Phone:** Displayed on the website header, contact cards, and vouchers.
- **Secondary / Emergency Hotline:** Additional phone for after-hours customer care.
- **WhatsApp Support Number:** The active mobile number receiving WhatsApp chats (Must include country code, e.g. `+919842212345`).
- **Customer Support Email:** Primary inbox for customer inquiries (`contact.kvtourstravels@gmail.com`).
- **Booking & Reservations Email:** Recipient for automated booking alerts.
- **Physical Office Address:** Street address, building number, landmark.
- **City, State, Country, Postal Code:** Segmented address fields for local business SEO.
- **Operating Hours:** Business hours displayed on contact page (e.g. `Mon – Sat: 9:00 AM – 7:30 PM IST`).

### C. Social Media & Presence
- **Instagram URL:** Direct link to your official Instagram profile (e.g. `https://instagram.com/kvtourstravels`).
- **Facebook Page URL:** Direct link to your official Facebook page.
- **YouTube Channel URL:** Optional link to travel videos / channel.
- **Google Maps Place URL & Embed:** Link or iframe embed for interactive office map on `/contact`.

### D. Search Engine Optimization (SEO) & Sharing
- **Default Page Title:** Browser tab title suffix (e.g. `KV Tours & Travels | Luxury Journeys & Bespoke Holidays`).
- **Meta Description:** 150-160 character description indexed by Google and Bing.
- **Social Sharing Image (OG Banner):** 1200x630px image displayed when site links are pasted on WhatsApp, Facebook, or LinkedIn.

---

## 3. Managing Identity via Backend REST API

Automated scripts or administrative microservices can read and update identity parameters via the REST API.

### Read Current Public Settings (No Auth Required)
```http
GET /api/v1/public/settings HTTP/1.1
Host: travel-agency-kdrs.onrender.com
Accept: application/json
```

### Update Authoritative Settings (Super Admin Only)
```http
PATCH /api/v1/admin/settings HTTP/1.1
Host: travel-agency-kdrs.onrender.com
Authorization: Bearer <SUPER_ADMIN_JWT_OR_SESSION_COOKIE>
Content-Type: application/json

{
  "agency_name": "KV Tours & Travels",
  "public_display_name": "KV Tours & Travels",
  "short_name": "KV Tours",
  "tagline": "Crafting Extraordinary Journeys",
  "contact_email": "contact.kvtourstravels@gmail.com",
  "contact_phone": "+91 98422 12345",
  "whatsapp_number": "9842212345",
  "whatsapp_country_code": "+91",
  "address": "KV Tours & Travels, Corporate Office, India",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "country": "India",
  "instagram_url": "https://instagram.com/kvtourstravels",
  "facebook_url": "https://facebook.com/kvtourstravels"
}
```

---

## 4. Default Values & Fallbacks

When no custom value is entered in the database, the system applies these defaults:

| Property | Default Value | Fallback Source |
| :--- | :--- | :--- |
| **Agency Display Name** | `KV Tours & Travels` | `frontend/src/lib/constants.ts` |
| **Short Agency Name** | `KV Tours` | `frontend/src/lib/constants.ts` |
| **Super Admin Email** | `contact.kvtourstravels@gmail.com` | `backend/app/core/permissions.py` |
| **Concierge Email** | `contact.kvtourstravels@gmail.com` | `frontend/src/lib/constants.ts` |
| **WhatsApp Message** | `Namaste KV Tours & Travels, please assist me with holiday packages.` | `site_settings.whatsapp_prefilled_message` |
| **Theme Primary** | `#24292F` (Deep Charcoal) | `frontend/src/context/BrandingContext.tsx` |
| **Theme Secondary** | `#C5A880` (Warm Heritage Gold) | `frontend/src/context/BrandingContext.tsx` |
| **Theme Accent** | `#D4AF37` (Royal Gold) | `frontend/src/context/BrandingContext.tsx` |
| **Placeholder Logo** | `/images/kv-logo-placeholder.svg` | `frontend/public/images/` |

---

## 5. Input Validation Rules

The administration portal enforces strict validation to protect brand reputation:
1. **Email Format:** Must match standard email pattern (`name@domain.tld`). Invalid formats are rejected before saving.
2. **WhatsApp Numbers:** Automatically stripped of spaces, hyphens, and brackets. Generated URLs strictly format as `https://wa.me/<country_code><digits>`.
3. **Hex Colors:** Must be valid 3, 6, or 8-character hex color codes beginning with `#`.
4. **Social URLs:** Must be well-formed HTTPS URLs.

