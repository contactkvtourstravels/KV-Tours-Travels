"""Verify live endpoints for KV Tours & Travels."""
import json
import sys
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000/api/v1"

def fetch(endpoint: str):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    with urllib.request.urlopen(req, timeout=5) as res:
        return res.status, json.loads(res.read().decode("utf-8"))

def test_live_apis():
    print("Testing live backend endpoints...")
    
    # 1. Health
    status, data = fetch("/health")
    assert status == 200, f"Health check failed: {status}"
    print(f"✓ /health -> 200: {data['status']}")

    # 2. Destinations
    status, dests = fetch("/destinations")
    assert status == 200, f"Destinations failed: {status}"
    print(f"✓ /destinations -> 200: {len(dests)} published destinations returned")
    
    # Check South Indian destinations
    slugs = [d["slug"] for d in dests]
    assert "ooty-nilgiris" in slugs, "ooty-nilgiris missing!"
    assert "kodaikanal" in slugs, "kodaikanal missing!"
    assert "munnar-tea-highlands" in slugs, "munnar-tea-highlands missing!"
    assert "wayanad-rainforests" in slugs, "wayanad-rainforests missing!"
    assert "coorg-coffee-country" in slugs, "coorg-coffee-country missing!"
    assert "rameswaram-dhanushkodi" in slugs, "rameswaram-dhanushkodi missing!"
    print("✓ South Indian destinations present in public catalog!")

    # 3. Packages
    status, pkgs = fetch("/packages")
    assert status == 200, f"Packages failed: {status}"
    print(f"✓ /packages -> 200: {len(pkgs)} published packages returned")
    pkg_slugs = [p["slug"] for p in pkgs]
    assert "ooty-tea-gardens-heritage-escape" in pkg_slugs, "Ooty package missing!"
    assert "kodaikanal-misty-cliffs-pine-retreat" in pkg_slugs, "Kodaikanal package missing!"
    assert "munnar-alleppey-hills-and-houseboat" in pkg_slugs, "Munnar package missing!"
    print("✓ South Indian tour packages present in public catalog!")

    # 4. Settings
    status, settings = fetch("/settings")
    assert status == 200, f"Settings failed: {status}"
    print(f"✓ /settings -> 200: agency_name='{settings.get('agency_name')}', city='{settings.get('city')}'")

    # 5. Test Destination Detail
    status, ooty = fetch("/destinations/ooty-nilgiris")
    assert status == 200, f"Ooty detail failed: {status}"
    print(f"✓ /destinations/ooty-nilgiris -> 200: highlights={len(ooty.get('highlights') or [])}, faqs={len(ooty.get('faqs') or [])}")

    # 6. Test Package Detail
    status, ooty_pkg = fetch("/packages/ooty-tea-gardens-heritage-escape")
    assert status == 200, f"Ooty package detail failed: {status}"
    print(f"✓ /packages/ooty-tea-gardens-heritage-escape -> 200: price={ooty_pkg['base_price']} {ooty_pkg['currency']}")

    print("\nALL LIVE BACKEND VERIFICATION CHECKS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_live_apis()
