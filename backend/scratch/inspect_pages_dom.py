import urllib.request
import re
from html.parser import HTMLParser

class SimpleHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.h1_text = ""
        self.in_h1 = False
        self.text_content = []

    def handle_starttag(self, tag, attrs):
        if tag == "h1":
            self.in_h1 = True
        if tag == "a":
            for k, v in attrs:
                if k == "href" and v:
                    self.links.append(v)

    def handle_endtag(self, tag):
        if tag == "h1":
            self.in_h1 = False

    def handle_data(self, data):
        if self.in_h1:
            self.h1_text += data
        self.text_content.append(data)

def inspect_page(url, name):
    print(f"\n==================== {name} ({url}) ====================")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode('utf-8')
            parser = SimpleHTMLParser()
            parser.feed(html)
            
            print(f"H1: {parser.h1_text.strip()}")
            full_text = " ".join(parser.text_content).lower()
            
            # Check for empty state strings
            empty_phrases = [
                'no packages found', 'no destinations found', 'itineraries being curated', 
                'new packages being published', 'no upcoming group departures',
                '0 destinations found', '0 packages found'
            ]
            found_empties = [p for p in empty_phrases if p in full_text]
            if found_empties:
                print(f"EMPTY STATE PHRASES: {found_empties}")
                
            pkg_links = [l for l in parser.links if '/packages/' in l]
            dest_links = [l for l in parser.links if '/destinations/' in l]
            print(f"Destination links: {len(dest_links)}, Package links: {len(pkg_links)}")
            print(f"Sample Dest Links: {list(set(dest_links))[:4]}")
            print(f"Sample Package Links: {list(set(pkg_links))[:4]}")
            
            # Check key sections
            for term in ['itinerary', 'inclusions', 'exclusions', 'hotels', 'highlights', 'practical travel guide', 'faqs']:
                print(f"  Contains '{term}': {term in full_text}")
    except Exception as e:
        print(f"Error fetching {url}: {e}")

inspect_page('http://localhost:3000/destinations', 'Destinations Listing')
inspect_page('http://localhost:3000/packages', 'Packages Listing')
inspect_page('http://localhost:3000/group-trips', 'Group Trips')
inspect_page('http://localhost:3000/destinations/maldives', 'Maldives Destination Detail')
inspect_page('http://localhost:3000/destinations/lakshadweep', 'Lakshadweep Destination Detail')
inspect_page('http://localhost:3000/packages/maldives-luxury-overwater-escape', 'Maldives Package Detail')
inspect_page('http://localhost:3000/packages/lakshadweep-bangaram-expedition', 'Lakshadweep Package Detail')
