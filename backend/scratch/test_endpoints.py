import urllib.request
import json

base = 'http://127.0.0.1:8000/api/v1'
endpoints = [
    '/destinations',
    '/destinations/maldives',
    '/packages',
    '/packages/maldives-luxury-overwater-escape',
    '/departures',
    '/offers',
    '/content/pages/home',
    '/settings'
]

for ep in endpoints:
    url = base + ep
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            status = resp.status
            body = resp.read().decode('utf-8')
            print(f"{ep}: status={status}")
            data = json.loads(body)
            if isinstance(data, list):
                print(f"  List count: {len(data)}")
                if len(data) > 0 and isinstance(data[0], dict):
                    print(f"  First item: {data[0].get('name') or data[0].get('title') or data[0].get('id')}")
            elif isinstance(data, dict):
                print(f"  Dict keys: {list(data.keys())[:6]}")
                if "items" in data:
                    print(f"  data['items'] count: {len(data['items'])}")
                if "destinations" in data:
                    print(f"  data['destinations'] count: {len(data['destinations'])}")
                if "packages" in data:
                    print(f"  data['packages'] count: {len(data['packages'])}")
                if "content" in data:
                    c = data["content"]
                    print(f"  content keys: {list(c.keys())[:5] if isinstance(c, dict) else type(c)}")
    except urllib.error.HTTPError as e:
        print(f"{ep}: HTTPError {e.code}: {e.read().decode('utf-8')[:200]}")
    except Exception as e:
        print(f"{ep}: Exception: {e}")
