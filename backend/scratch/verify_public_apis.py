import urllib.request
import json

BASE = "http://127.0.0.1:8000/api/v1"

def test_api(endpoint):
    url = BASE + endpoint
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"GET {endpoint} -> {resp.status} (Type: {type(data).__name__})")
        return data

dests = test_api("/destinations")
print(f"  Published destinations count: {len(dests)}")
for d in dests:
    print(f"    - {d['name']} ({d['country']})")

dest_detail = test_api("/destinations/bali")
print(f"  Bali highlights count: {len(dest_detail['highlights'])}")
print(f"  Bali guide keys: {list(dest_detail['travel_guide'].keys())}")
print(f"  Bali faqs count: {len(dest_detail['faqs'])}")

pkgs = test_api("/packages")
print(f"  Published packages count: {len(pkgs)}")
for p in pkgs:
    print(f"    - {p['name']} ({p['destination_name']})")

pkg_detail = test_api("/packages/bali-cultural-odyssey-nusa-penida")
print(f"  Bali pkg itinerary days: {len(pkg_detail['itinerary'])}")
print(f"  Bali pkg inclusions: {len(pkg_detail['inclusions'])}")
print(f"  Bali pkg exclusions: {len(pkg_detail['exclusions'])}")
print(f"  Bali pkg hotels: {[h['name'] for h in pkg_detail['hotels']]}")
print(f"  Bali pkg activities: {[a['name'] for a in pkg_detail['activities']]}")
print(f"  Bali pkg upcoming departures: {len(pkg_detail['upcoming_departures'])}")

deps = test_api("/departures")
print(f"  All group departures count: {len(deps)}")
for dep in deps:
    print(f"    - {dep['package_name']} | Status: {dep['status']} | Cap: {dep['available_capacity']}/{dep['total_capacity']}")

offers = test_api("/offers")
print(f"  Offers count: {len(offers['items'])}")
for o in offers["items"]:
    print(f"    - {o['package_name']} | Badge: {o['discount_badge']} | Img: {o.get('cover_image_url')[:45] if o.get('cover_image_url') else None}")

