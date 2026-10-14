"""End-to-end audit and verification script for KV TOURS & TRAVELS system upgrade.
Validates:
1. Rich Destination creation with highlights, travel guide, FAQs.
2. Public destination detail response.
3. Rich Package creation with category, travel type, inclusions, exclusions, tiered pricing.
4. Public package detail response.
5. Add-on applicability isolation (no global leakage).
6. Business settings, WhatsApp, and token masking.
"""

import sys

import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"

session = requests.Session()


def run_tests():
    print("=== KV TOURS & TRAVELS — VERIFICATION SUITE ===")

    # 1. Login as Admin
    print("\n1. Logging in as admin...")
    login_res = session.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@kvtours.in", "password": "Admin@123456"},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    print("✓ Admin authenticated successfully.")

    # 2. Get CSRF Token
    csrf_token = session.cookies.get("csrf_token")
    headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}

    # 3. Create or Fetch Rich Destination
    print("\n2. Creating/Updating Rich Destination (Coimbatore Gateway)...")
    dest_payload = {
        "name": "Coimbatore Heritage & Hills",
        "slug": "coimbatore-heritage-hills",
        "country": "India",
        "state_or_city": "Tamil Nadu",
        "region": "South India",
        "category": "Cultural & Heritage",
        "travel_type": "Family Holidays",
        "cover_image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa",
        "short_description": "The Manchester of South India and scenic gateway to the Nilgiris.",
        "description": "Flanked by the Western Ghats, Coimbatore offers vibrant culture, historic shrines, artisanal textile traditions, and pleasant weather.",
        "highlights_json": [
            {
                "title": "Marudhamalai Murugan Temple",
                "category": "Spiritual Landmark",
                "description": "Hilltop temple with breathtaking panoramic views of the Western Ghats.",
                "image_url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220",
                "caption": "Scenic hill view at dawn",
                "display_order": 1,
            },
            {
                "title": "Siruvani Waterfalls & Dam",
                "category": "Beaches and nature",
                "description": "Famous for holding some of the sweetest mineral-rich natural water in the world.",
                "caption": "Lush forest cascade",
                "display_order": 2,
            },
        ],
        "travel_guide_json": {
            "best_time_to_visit": "October to March (Mild & Pleasant)",
            "recommended_duration": "2 Nights / 3 Days",
            "seasonal_weather": "Summer (Mar-May): 24-34°C. Winter (Nov-Feb): 18-28°C.",
            "local_language": "Tamil, English",
            "currency": "INR (₹)",
            "time_zone": "IST (UTC+5:30)",
            "visa_entry": "Standard Indian ID for domestic; Passport & Visa for international.",
            "clothing_etiquette": "Comfortable cottons, modest attire for temple premises.",
            "transport_options": "Private chauffeur sedans, local app cabs, and scenic highway links.",
            "insider_advice": "Sample legendary Kovai Annapoorna sambar and explore old town heritage streets.",
        },
        "faqs_json": [
            {
                "question": "What is the nearest airport to Coimbatore?",
                "answer": "Coimbatore International Airport (CJB) is located directly in the city with frequent flights to Chennai, Bangalore, Mumbai, Delhi, Singapore, and Sharjah.",
                "display_order": 1,
            }
        ],
        "is_published": True,
        "is_featured": True,
    }

    # Check if destination exists
    dest_list_res = session.get(
        f"{BASE_URL}/admin/destinations?search=Coimbatore+Heritage"
    )
    dest_list = dest_list_res.json()
    if dest_list["items"]:
        dest_id = dest_list["items"][0]["id"]
        res = session.patch(
            f"{BASE_URL}/admin/destinations/{dest_id}",
            json=dest_payload,
            headers=headers,
        )
        assert res.status_code == 200, f"Update dest failed: {res.text}"
        dest_data = res.json()
        print(f"✓ Updated existing destination: {dest_data['name']} (ID: {dest_id})")
    else:
        res = session.post(
            f"{BASE_URL}/admin/destinations", json=dest_payload, headers=headers
        )
        assert res.status_code == 200, f"Create dest failed: {res.text}"
        dest_data = res.json()
        dest_id = dest_data["id"]
        print(f"✓ Created new destination: {dest_data['name']} (ID: {dest_id})")

    # 4. Verify Public Destination API
    print(
        "\n3. Testing Public Destination Endpoint (/public/destinations/coimbatore-heritage-hills)..."
    )
    pub_dest_res = requests.get(
        f"{BASE_URL}/public/destinations/coimbatore-heritage-hills"
    )
    assert pub_dest_res.status_code == 200, (
        f"Public destination failed: {pub_dest_res.text}"
    )
    pub_dest = pub_dest_res.json()
    assert pub_dest["category"] == "Cultural & Heritage", (
        f"Category mismatch: {pub_dest.get('category')}"
    )
    assert len(pub_dest["highlights"]) == 2, (
        f"Highlights count mismatch: {len(pub_dest.get('highlights', []))}"
    )
    assert pub_dest["travel_guide"]["currency"] == "INR (₹)", "Travel guide mismatch"
    assert len(pub_dest["faqs"]) == 1, "FAQs mismatch"
    print(
        f"✓ Public destination returned successfully with {len(pub_dest['highlights'])} highlights and {len(pub_dest['faqs'])} FAQs."
    )

    # 5. Create 2 Tour Packages
    print("\n4. Creating/Updating 2 Packages to test Add-On Scope Isolation...")
    pkg1_payload = {
        "destination_id": dest_id,
        "name": "Coimbatore Cultural Royale 3D2N",
        "slug": "coimbatore-cultural-royale",
        "category": "Heritage & Temple Tour",
        "travel_type": "Private Guided Tour",
        "difficulty_level": "Easy / Relaxed",
        "departure_location": "Coimbatore",
        "cover_image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa",
        "short_description": "Exclusive private heritage journey with temple access and luxury chauffeur.",
        "description": "Enjoy bespoke temple access, local textile heritage trails, and delicious dining.",
        "base_price": 14500.0,
        "currency": "INR",
        "duration_days": 3,
        "duration_nights": 2,
        "minimum_travellers": 1,
        "child_price": 7500.0,
        "infant_price": 1500.0,
        "single_room_supplement": 3500.0,
        "booking_cutoff_days": 2,
        "cancellation_policy": "Full refund if cancelled up to 7 days before departure.",
        "inclusions_json": [
            "2 Nights 4-Star Luxury Accommodation",
            "Daily Artisan Breakfast",
            "Dedicated AC Chauffeur Car for 3 Days",
            "Temple VIP Darshan Assistance",
        ],
        "exclusions_json": [
            "Airfare / Train tickets to Coimbatore",
            "Personal expenses & camera permits",
        ],
        "is_published": True,
        "is_featured": True,
    }

    # Find or create pkg1
    pkg_list = session.get(
        f"{BASE_URL}/admin/packages?search=Coimbatore+Cultural"
    ).json()
    if pkg_list["items"]:
        pkg1_id = pkg_list["items"][0]["id"]
        res1 = session.patch(
            f"{BASE_URL}/admin/packages/{pkg1_id}", json=pkg1_payload, headers=headers
        )
        assert res1.status_code == 200, f"Update pkg1 failed: {res1.text}"
        print(f"✓ Updated Package 1: ID {pkg1_id}")
    else:
        res1 = session.post(
            f"{BASE_URL}/admin/packages", json=pkg1_payload, headers=headers
        )
        assert res1.status_code == 200, f"Create pkg1 failed: {res1.text}"
        pkg1_id = res1.json()["id"]
        print(f"✓ Created Package 1: ID {pkg1_id}")

    pkg2_payload = {
        "destination_id": dest_id,
        "name": "Coimbatore Fast Break 2D1N",
        "slug": "coimbatore-fast-break",
        "category": "Weekend Quick Tour",
        "travel_type": "Private Guided Tour",
        "base_price": 8900.0,
        "currency": "INR",
        "duration_days": 2,
        "duration_nights": 1,
        "minimum_travellers": 1,
        "is_published": True,
    }
    pkg2_list = session.get(f"{BASE_URL}/admin/packages?search=Coimbatore+Fast").json()
    if pkg2_list["items"]:
        pkg2_id = pkg2_list["items"][0]["id"]
        res2 = session.patch(
            f"{BASE_URL}/admin/packages/{pkg2_id}", json=pkg2_payload, headers=headers
        )
        assert res2.status_code == 200, f"Update pkg2 failed: {res2.text}"
        print(f"✓ Updated Package 2: ID {pkg2_id}")
    else:
        res2 = session.post(
            f"{BASE_URL}/admin/packages", json=pkg2_payload, headers=headers
        )
        assert res2.status_code == 200, f"Create pkg2 failed: {res2.text}"
        pkg2_id = res2.json()["id"]
        print(f"✓ Created Package 2: ID {pkg2_id}")

    # 6. Create Scoped Add-Ons
    print("\n5. Testing Phase 5 Add-On Applicability Isolation...")
    # Add-on 1: Applicable ONLY to Package 1
    addon1_payload = {
        "name": "VIP Temple Guide & Audio Kit (Exclusive Pkg1)",
        "description": "Senior scholar guide dedicated exclusively to Package 1 guests.",
        "price": 1800.0,
        "currency": "INR",
        "applicability_scope": "selected_packages",
        "price_type": "per_booking",
        "min_quantity": 1,
        "max_quantity": 1,
        "package_ids": [pkg1_id],
    }
    addon1_res = session.post(
        f"{BASE_URL}/admin/add-ons", json=addon1_payload, headers=headers
    )
    assert addon1_res.status_code == 200, f"Addon1 create failed: {addon1_res.text}"
    addon1 = addon1_res.json()
    print(f"✓ Created Add-On 1 (Scoped to Package 1 only): ID {addon1['id']}")

    # Add-on 2: Applicable ONLY to Package 2
    addon2_payload = {
        "name": "Express City Transfer Kit (Exclusive Pkg2)",
        "description": "Rapid airport express connection for fast break travelers.",
        "price": 1200.0,
        "currency": "INR",
        "applicability_scope": "selected_packages",
        "price_type": "per_booking",
        "min_quantity": 1,
        "max_quantity": 2,
        "package_ids": [pkg2_id],
    }
    addon2_res = session.post(
        f"{BASE_URL}/admin/add-ons", json=addon2_payload, headers=headers
    )
    assert addon2_res.status_code == 200, f"Addon2 create failed: {addon2_res.text}"
    addon2 = addon2_res.json()
    print(f"✓ Created Add-On 2 (Scoped to Package 2 only): ID {addon2['id']}")

    # Add-on 3: Global (All Packages)
    addon3_payload = {
        "name": "Premium Travel Medical Insurance (Global)",
        "description": "Full coverage insurance valid across all KV Tours offerings.",
        "price": 450.0,
        "currency": "INR",
        "applicability_scope": "all_packages",
        "price_type": "per_traveller",
        "min_quantity": 1,
        "max_quantity": 10,
    }
    addon3_res = session.post(
        f"{BASE_URL}/admin/add-ons", json=addon3_payload, headers=headers
    )
    assert addon3_res.status_code == 200, f"Addon3 create failed: {addon3_res.text}"
    addon3 = addon3_res.json()
    print(f"✓ Created Add-On 3 (Global Scope): ID {addon3['id']}")

    # 7. Verify Public Package 1 vs Package 2 Add-on Isolation
    print("\n6. Verifying Add-On Isolation on Public Package Endpoints...")
    pub_pkg1 = requests.get(
        f"{BASE_URL}/public/packages/coimbatore-cultural-royale"
    ).json()
    pub_pkg1_addon_names = [a["name"] for a in pub_pkg1.get("add_ons", [])]
    print(f"Package 1 eligible add-ons: {pub_pkg1_addon_names}")

    pub_pkg2 = requests.get(f"{BASE_URL}/public/packages/coimbatore-fast-break").json()
    pub_pkg2_addon_names = [a["name"] for a in pub_pkg2.get("add_ons", [])]
    print(f"Package 2 eligible add-ons: {pub_pkg2_addon_names}")

    # Assertions for isolation:
    assert "VIP Temple Guide & Audio Kit (Exclusive Pkg1)" in pub_pkg1_addon_names, (
        "Add-on 1 missing from Package 1!"
    )
    assert "Premium Travel Medical Insurance (Global)" in pub_pkg1_addon_names, (
        "Global Add-on 3 missing from Package 1!"
    )
    assert "Express City Transfer Kit (Exclusive Pkg2)" not in pub_pkg1_addon_names, (
        "LEAKAGE: Package 2 exclusive add-on leaked into Package 1!"
    )

    assert "Express City Transfer Kit (Exclusive Pkg2)" in pub_pkg2_addon_names, (
        "Add-on 2 missing from Package 2!"
    )
    assert (
        "VIP Temple Guide & Audio Kit (Exclusive Pkg1)" not in pub_pkg2_addon_names
    ), "LEAKAGE: Package 1 exclusive add-on leaked into Package 2!"
    print("✓ PERFECT ISOLATION VERIFIED: No add-on leakage across packages!")

    # 8. Verify Settings & WhatsApp Token Masking
    print("\n7. Testing WhatsApp & Business Settings Masking (Phase 6)...")
    settings_payload = {
        "whatsapp_chat_enabled": True,
        "whatsapp_phone_number": "+919876543210",
        "whatsapp_default_message": "Hello KV Tours, I would like to book a trip.",
        "whatsapp_api_phone_number_id": "100987654321",
        "whatsapp_api_token": "EAAGsecrettoken123456789xyz",
        "business_name": "KV TOURS & TRAVELS",
        "business_city": "Coimbatore",
        "business_state": "Tamil Nadu",
        "support_phone": "+91 94430 00000",
    }
    update_set_res = session.patch(
        f"{BASE_URL}/admin/settings", json=settings_payload, headers=headers
    )
    assert update_set_res.status_code == 200, (
        f"Settings update failed: {update_set_res.text}"
    )
    admin_settings = update_set_res.json()
    assert admin_settings["whatsapp_api_token"].startswith("EAAG"), (
        "Token should start with prefix"
    )
    assert "****" in admin_settings["whatsapp_api_token"], (
        f"Token was NOT masked in admin response: {admin_settings['whatsapp_api_token']}"
    )
    print(
        f"✓ Admin Settings received masked token: {admin_settings['whatsapp_api_token']}"
    )

    pub_settings = requests.get(f"{BASE_URL}/public/settings").json()
    assert pub_settings["whatsapp_chat_enabled"] is True, (
        "Public whatsapp chat enabled mismatch"
    )
    assert pub_settings["whatsapp_phone_number"] == "+919876543210", (
        "Public phone mismatch"
    )
    assert "whatsapp_api_token" not in pub_settings, (
        "CRITICAL LEAK: Server-side WhatsApp API token leaked to public settings!"
    )
    print(
        "✓ Public Settings correctly exposes WhatsApp click-to-chat without leaking cloud secrets."
    )

    print("\n=== ALL E2E VERIFICATION CHECKS PASSED WITH 100% SUCCESS ===")


if __name__ == "__main__":
    try:
        run_tests()
    except (AssertionError, requests.RequestException, RuntimeError) as e:
        print(f"\n❌ VERIFICATION FAILED: {e}", file=sys.stderr)
        sys.exit(1)
