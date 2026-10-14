import urllib.request
import re

frontend_base = 'http://localhost:3000'
pages = [
    '/',
    '/destinations',
    '/destinations/maldives',
    '/packages',
    '/packages/maldives-luxury-overwater-escape',
    '/group-trips'
]

for p in pages:
    url = frontend_base + p
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            html = resp.read().decode('utf-8')
            print(f"PAGE {p}: HTTP {status}, len={len(html)}")
            
            # Check for catalog items in the rendered HTML
            if p == '/':
                has_maldives = 'Maldives' in html
                has_lakshadweep = 'Lakshadweep' in html
                has_offers = 'Best Offers' in html or 'Limited-Time' in html
                print(f"  Home check: Maldives in HTML? {has_maldives}, Lakshadweep in HTML? {has_lakshadweep}")
            elif '/destinations/' in p:
                print(f"  Destination detail: 'Maldives' in HTML? {'Maldives' in html}, 'Highlights' in HTML? {'Highlights' in html}")
            elif p == '/destinations':
                print(f"  Destinations listing: 'Maldives' in HTML? {'Maldives' in html}, 'Lakshadweep' in HTML? {'Lakshadweep' in html}")
            elif '/packages/' in p:
                print(f"  Package detail: 'Maldives' in HTML? {'Maldives' in html}, 'Itinerary' in HTML? {'Itinerary' in html}")
            elif p == '/packages':
                print(f"  Packages listing: 'Maldives' in HTML? {'Maldives' in html}")
            elif p == '/group-trips':
                print(f"  Group trips: 'Kazakhstan' in HTML? {'Kazakhstan' in html}")
    except urllib.error.HTTPError as e:
        print(f"PAGE {p}: HTTPError {e.code}")
    except Exception as e:
        print(f"PAGE {p}: Exception: {e}")
