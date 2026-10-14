# Public Website Architecture & Implementation

**Project:** KV Tours & Travels (Coimbatore)  
**Phase:** Phase 7 — Premium Public Website  
**Status:** Implemented & Verified  

---

## 1. Executive Summary

Phase 7 establishes the luxury public-facing website for **KV Tours & Travels**, an experiential travel agency founded and operated out of Coimbatore, Tamil Nadu. Designed to evoke the prestige and aesthetic sophistication of high-end editorial publications (reminiscent of Condé Nast Traveler and Aman Resorts), the website serves as the primary digital flagship for international tours, domestic circuits, group departures, and bespoke custom journeys.

The architecture emphasizes:
1. **Dynamic Data-Driven Delivery:** Every destination, package, itinerary day, hotel, activity, departure date, and seat meter is pulled directly from live backend APIs.
2. **Contextual WhatsApp & Database Inquiries:** High-converting contextual inquiry pipelines connect travelers instantly to the agency's concierge team via WhatsApp or persistent database-backed inquiry records (`POST /api/v1/inquiries`).
3. **Radical Honesty & Authenticity:** Absolute rejection of synthetic metrics, fictitious reviews, fake years in business, or unverified awards. Trust is built upon transparent itineraries, verified office details in Coimbatore, and genuine social proof.
4. **Editorial Luxury Design System:** Built on Obsidian Black (`#080808` / `#0d0d0d`), Metallic Gold gradients (`#f59e0b` / `#d97706` / `#fbbf24`), and crisp white typography, coupled with smooth glassmorphism and micro-animations.

---

## 2. Visual Brand System & Design Language

### Color Palette
- **Obsidian Dark Foundation:**
  - Canvas Primary: `#080808`
  - Card & Surface Elevated: `#0e0e0e` / `#141414`
  - Subtle Borders & Dividers: `#1f1f1f` / `#262626`
- **Metallic Gold Accents:**
  - Gold Primary: `#d4af37` / `#f59e0b`
  - Gold Bright: `#fbbf24`
  - Gold Glow / Ambient: `rgba(245, 158, 11, 0.12)`
- **Typography & Highlights:**
  - High-Contrast Headlines: `#ffffff`
  - Body & Muted Metadata: `#a3a3a3` / `#d4d4d4`
  - Verified Badges & Accents: Emerald (`#10b981`), Amber (`#f59e0b`)

### Typography Hierarchy
- **Headings & Display:** Elegant serif accents (`font-serif`, Cormorant / Playfair vibe) paired with refined tracking for editorial gravitas.
- **Body & Controls:** Clean, high-legibility sans-serif (`Inter`, `system-ui`) optimized for dense itinerary details, hotel star ratings, and departure schedules.

---

## 3. Public Route Hierarchy

| Route | Type | Description | Primary Data Dependencies |
| :--- | :--- | :--- | :--- |
| `/` | Static | Cinematic flagship homepage with hero banner, live destinations ticker, curated packages showcase, live departures meter, custom trip teaser, and authentic Coimbatore trust pillars. | `GET /api/v1/destinations`, `GET /api/v1/packages`, `GET /api/v1/departures` |
| `/destinations` | Static | Comprehensive world destination directory with instant search, country filtering, and card hover reveals. | `GET /api/v1/destinations` |
| `/destinations/[slug]` | Dynamic (SSR) | In-depth destination showcase with hero gallery, climate/culture summaries, regional guides, and related packages. | `GET /api/v1/destinations/{slug}`, `GET /api/v1/packages?destination_id=...` |
| `/packages` | Static | Filterable catalog of bespoke journeys by destination, travel style, and duration, featuring fixed-decimal pricing and duration badges. | `GET /api/v1/packages`, `GET /api/v1/destinations` |
| `/packages/[slug]` | Dynamic (SSR) | Master package showcase featuring day-by-day itinerary accordions, hotel partners with star ratings, included vs. optional activities, departure date selection with capacity meters, add-ons list, and Schema.org `Product` JSON-LD. | `GET /api/v1/packages/{slug}`, `GET /api/v1/departures/package/{id}` |
| `/group-trips` | Static | Scheduled fixed-departure expeditions (e.g. Kazakhstan, Maldives, Manali) featuring live capacity status ("Guaranteed Departure", "Filling Fast", "Sold Out"). | `GET /api/v1/departures` |
| `/custom-trip` | Static (CSR Form) | Multi-step bespoke trip planner with travel style selector, destination preference, dates, budget ranges, and direct inquiry submission wrapped in `<Suspense>`. | `POST /api/v1/inquiries` |
| `/about` | Static | Transparent Coimbatore brand story, personal concierge philosophy, and verified team standards. | Static brand assets |
| `/contact` | Static | Verified Coimbatore headquarters address, direct phone/email, business hours, and general inquiry form. | `POST /api/v1/inquiries`, `GET /api/v1/settings` |
| `/_not-found` | Static | Luxury 404 error experience guiding visitors back to curated journeys. | Static |
| `/robots.txt` | Static | Automated search crawler policy (`robots.ts`). | Static |
| `/sitemap.xml` | Static | Automated search sitemap generator (`sitemap.ts`). | Dynamic API crawl fallback |

---

## 4. Reusable Public Components

1. **`Navbar` (`components/public/Navbar.tsx`):**
   - Sticky navigation with scroll-reactive backdrop blur and border shading.
   - Gold brand monogram and logo linking to home.
   - Desktop navigation links (`Destinations`, `Packages`, `Group Trips`, `Custom Trips`, `About`, `Contact`).
   - Contextual WhatsApp quick-dial button and "Plan Your Trip" primary CTA.
   - Accessible animated slide-out mobile drawer with full navigation hierarchy.

2. **`Footer` (`components/public/Footer.tsx`):**
   - High-end multi-column footer displaying verified Coimbatore office address, contact channels, and official Instagram handle (`@kv_tours_travels`).
   - Curated links for legal transparency (Terms, Privacy, Cancellation Guidelines).
   - Direct link to Admin Portal for agency operators.

3. **`FloatingWhatsApp` (`components/public/FloatingWhatsApp.tsx`):**
   - Persistent bottom-right floating pill with metallic green glow and active concierge availability indicator.
   - Automatically queries site settings or uses internationalized Coimbatore agency WhatsApp number.
   - Generates contextual click-to-chat greeting.

4. **`QuickInquiryModal` (`components/public/QuickInquiryModal.tsx`):**
   - Contextual modal dialog opening from any package or destination card.
   - Captures traveler name, email, phone, travel dates, passenger counts, and special notes.
   - Submits directly to `POST /api/v1/inquiries` with optimistic loading states and confirmation feedback.

5. **`PackageDetailClientActions` (`app/packages/[slug]/PackageDetailClientActions.tsx`):**
   - Client interactive sidebar for package pages.
   - Real-time departure selector dynamically recalculating total estimates, displaying available vs. reserved capacity meters, and triggering either direct inquiry modal or instant WhatsApp reservation.

---

## 5. Backend Public API Integration

The public website interacts exclusively with unauthenticated, rate-limited public endpoints:

- `GET /api/v1/destinations` — Fetches active, non-deleted travel destinations.
- `GET /api/v1/destinations/{slug}` — Retrieves specific destination metadata and gallery images.
- `GET /api/v1/packages` — Fetches active packages with base pricing, duration, and cover images.
- `GET /api/v1/packages/{slug}` — Returns complete package hierarchy: day-by-day itineraries, associated hotel properties, activities, and add-on amenities.
- `GET /api/v1/departures` — Fetches scheduled group departures with real-time seat availability.
- `GET /api/v1/departures/package/{package_id}` — Lists active departure dates for a specific package.
- `POST /api/v1/inquiries` — Creates a verified customer inquiry record in PostgreSQL, automatically recording metadata (lead source, package association, passenger counts).
- `GET /api/v1/settings` — Provides public agency configuration (agency name, phone, email, WhatsApp number, office address).

---

## 6. Trust, Safety & Transparency Policies

- **Zero Artificial Metrics:** No synthetic counters ("50,000+ Happy Travelers"), fictitious 5-star badges, or fabricated years of existence.
- **Zero Placeholder Customer Testimonials:** Testimonial sections are withheld until verified client feedback is captured through the admin moderation system.
- **Genuine Regional Grounding:** Proudly highlights Coimbatore operations, direct concierge WhatsApp access, and verified social channels.
- **Strict Stop Boundaries:** In accordance with Phase 7 specifications, payment processing (Razorpay), online cart/checkout, customer authenticated accounts, and WhatsApp Business webhooks are strictly deferred to subsequent phases.
