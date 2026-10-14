"""Script to enrich existing KV Tours & Travels catalog with verified luxury content.
Preserves all existing customer bookings and database constraints.
"""

from __future__ import annotations

import sys
import os
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import get_session_factory
from app.models.catalog import (
    Destination,
    Package,
    PackageDay,
    Hotel,
    Activity,
    PackageHotel,
    PackageActivity,
    PackageDeparture,
    BestOffer,
)

DESTINATIONS_DATA = {
    "maldives": {
        "highlights": [
            {
                "title": "South Ari Atoll Whale Shark Sanctuary",
                "category": "Marine Wildlife",
                "description": "One of the few places in the world where whale sharks can be spotted year-round swimming along the coral reef drop-offs.",
                "image_url": "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Bioluminescent Beach at Vaadhoo Island",
                "category": "Natural Phenomenon",
                "description": "Witness glowing blue waves as microscopic phytoplankton light up under the night sky along pristine sandbars.",
                "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Private Sandbank Picnic & Snorkeling",
                "category": "Luxury Experience",
                "description": "Spend an afternoon stranded in paradise on a private castaway sandbank with chilled champagne and fresh seafood.",
                "image_url": "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=80",
            },
        ],
        "travel_guide": {
            "best_time_to_visit": "November to April (Dry Northeast Monsoon with crystal clear waters)",
            "seasonal_weather": "Tropical, warm and sunny (28°C to 31°C year-round)",
            "local_language": "Dhivehi (English widely spoken across all luxury private resorts)",
            "currency": "Maldivian Rufiyaa (MVR) / USD widely accepted everywhere",
            "visa_entry": "Free 30-day visa on arrival for Indian citizens with valid passport and hotel confirmation",
            "time_zone": "GMT+5 (Resort islands may operate on Maldives Island Time GMT+6 for longer daylight)",
            "clothing_etiquette": "Resort-casual and swimwear at private island resorts; modest dress required when visiting inhabited local islands",
            "transport_options": "Speedboat transfers and scenic seaplanes operated by Trans Maldivian Airways from Velana International Airport",
            "safety_tips": "Always follow dive master instructions and use reef-safe sunscreen to protect marine life",
            "packing_tips": "UV swim shirts, high-SPF reef-safe sunscreen, waterproof phone pouches, sunglasses, and linen attire",
            "insider_advice": "Book direct seaplane transfers during morning hours for optimal aerial photography of coral atolls.",
        },
        "faqs": [
            {
                "question": "Do Indian passport holders need a pre-arrival visa for the Maldives?",
                "answer": "No. Indian tourists receive a complimentary 30-day tourist visa on arrival at Male Airport upon presenting a valid passport (6 months validity), confirmed resort booking, and return flight tickets.",
            },
            {
                "question": "What is the transfer time from Male Airport to South Ari Atoll?",
                "answer": "Seaplane flights take approximately 25-30 minutes, offering breathtaking panoramic aerial views of the coral rings and turquoise lagoons.",
            },
            {
                "question": "Are private water villas suitable for couples and families?",
                "answer": "Yes. Our partner overwater villas feature private infinity plunge pools, direct lagoon stairs, and child-safe perimeter locks for families.",
            },
        ],
    },
    "lakshadweep": {
        "highlights": [
            {
                "title": "Bangaram Island Lagoon Coral Gardens",
                "category": "Coral Reefs",
                "description": "An uninhabited tear-drop island surrounded by shallow turquoise lagoons renowned for sea turtles and stingrays.",
                "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Thinnakara Castaway Sandspit",
                "category": "Excursion",
                "description": "Just a short boat hop from Bangaram, offering endless untouched white beaches and coconut palm shores.",
                "image_url": "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Agatti Island Airstrip & Marine Drive",
                "category": "Scenic Arrival",
                "description": "One of the world's most spectacular airstrips surrounded completely by crystal turquoise waters.",
                "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
            },
        ],
        "travel_guide": {
            "best_time_to_visit": "October to mid-May (Calm sea conditions and supreme underwater visibility)",
            "seasonal_weather": "Pleasant tropical coastal breeze (26°C to 32°C)",
            "local_language": "Malayalam and Jeseri (English and Hindi widely understood)",
            "currency": "Indian Rupee (INR)",
            "visa_entry": "Mandatory Lakshadweep Entry Permit (KV Tours & Travels handles 100% of e-permit documentation for guests)",
            "time_zone": "Indian Standard Time (IST, GMT+5:30)",
            "clothing_etiquette": "Comfortable breathable cottons and modest beachwear. Respect local island traditions outside resort areas.",
            "transport_options": "Alliance Air flights from Kochi (COK) to Agatti (AGX), followed by government-approved speedboats to Bangaram/Kadmat",
            "safety_tips": "Do not touch live coral heads or collect coral specimens (strictly prohibited under Indian Wildlife Protection Act)",
            "packing_tips": "Snorkel gear, reef shoes, motion sickness tablets for boat rides, cash (limited ATMs on islands)",
            "insider_advice": "Window seats on the right side of flight from Kochi give the most iconic landing views of Agatti Lagoon.",
        },
        "faqs": [
            {
                "question": "How do I get an entry permit for Lakshadweep?",
                "answer": "KV Tours & Travels arranges the official Lakshadweep administration entry permit and police clearance certificate as part of your booking package.",
            },
            {
                "question": "Can I fly directly to Lakshadweep from Coimbatore?",
                "answer": "You can take a short 4-hour drive or train from Coimbatore to Kochi (COK), followed by a 1-hour direct flight to Agatti Island.",
            },
            {
                "question": "Is alcohol permitted in Lakshadweep?",
                "answer": "Alcohol consumption is prohibited across all inhabited islands of Lakshadweep, but is permitted exclusively for tourists at Bangaram Island Resort.",
            },
        ],
    },
    "bali": {
        "highlights": [
            {
                "title": "Ubud Tegallalang Rice Terraces & Jungle Swing",
                "category": "Cultural Heritage",
                "description": "Iconic cascading emerald green rice paddies sculpted over centuries following the UNESCO Subak irrigation system.",
                "image_url": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Nusa Penida Kelingking 'T-Rex' Cliff",
                "category": "Coastal Wonder",
                "description": "A dramatic cliff formation resembling a Tyrannosaurus Rex overlooking secluded white sands and azure waves.",
                "image_url": "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Uluwatu Sunset Temple & Kecak Fire Dance",
                "category": "Sacred Performance",
                "description": "Perched on a 70-meter high cliff over the Indian Ocean, hosting an enchanting sunset choir and fire performance.",
                "image_url": "https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=1200&q=80",
            },
        ],
        "travel_guide": {
            "best_time_to_visit": "April to October (Dry season with sunny skies and low humidity)",
            "seasonal_weather": "Tropical warm climate (26°C to 30°C)",
            "local_language": "Balinese and Bahasa Indonesia (English universally spoken in tourism zones)",
            "currency": "Indonesian Rupiah (IDR)",
            "visa_entry": "30-day Electronic Visa on Arrival (e-VOA) available online or on arrival for Indian passport holders",
            "time_zone": "Central Indonesia Time (WITA, GMT+8 — 2.5 hours ahead of IST)",
            "clothing_etiquette": "Sarongs and sash required when entering all Balinese temples (provided at entrance)",
            "transport_options": "Private chauffeured air-conditioned SUVs included in all KV Tours & Travels Bali packages",
            "safety_tips": "Be cautious with cheeky macaque monkeys at Uluwatu and Ubud Sacred Monkey Forest",
            "packing_tips": "Lightweight breathable fabrics, comfortable walking shoes for temples, sunscreen, and Indonesian power adapter (Type C/F)",
            "insider_advice": "Visit Tegallalang Rice Terraces before 8:00 AM to enjoy serene golden hour mist and avoid tourist crowds.",
        },
        "faqs": [
            {
                "question": "What is the flight connectivity from South India to Bali?",
                "answer": "Direct and 1-stop flights operate regularly from Chennai, Bengaluru, and Kochi to Ngurah Rai International Airport (DPS) in Denpasar.",
            },
            {
                "question": "Is Indian food easily available in Bali?",
                "answer": "Yes. Ubud, Seminyak, Kuta, and Nusa Dua have outstanding pure-vegetarian and South Indian restaurants catering to Indian palates.",
            },
            {
                "question": "Are private pool villas included in your packages?",
                "answer": "Yes. Our packages feature luxury private pool villas in Ubud and beachfront luxury resorts in Seminyak or Nusa Dua.",
            },
        ],
    },
    "manali": {
        "highlights": [
            {
                "title": "Rohtang Pass & Atal Tunnel High Mountain Route",
                "category": "Alpine Adventure",
                "description": "Ascend to 13,058 feet through the Pir Panjal range with panoramic glaciers, snow peaks, and high mountain passes.",
                "image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Solang Valley Adventure Valley",
                "category": "Adventure Sports",
                "description": "Premier hub for paragliding, zorbing, quad biking, and winter skiing surrounded by pine forests.",
                "image_url": "https://images.unsplash.com/photo-1586521995568-39abaa0c2311?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Historic Hadimba Temple in Cedar Woods",
                "category": "Heritage",
                "description": "A 16th-century four-tier wooden pagoda temple nestled inside centuries-old towering deodar pine forests.",
                "image_url": "https://images.unsplash.com/photo-1605649487212-47bdab064df8?auto=format&fit=crop&w=1200&q=80",
            },
        ],
        "travel_guide": {
            "best_time_to_visit": "March to June (Summer bloom & pleasant weather) and December to February (Snow season & skiing)",
            "seasonal_weather": "Summer: 10°C to 25°C; Winter: -5°C to 10°C with heavy snowfall",
            "local_language": "Hindi and Pahari (English widely understood)",
            "currency": "Indian Rupee (INR)",
            "visa_entry": "No permit required for Indian citizens; Green Tax and Rohtang Pass permits are pre-arranged by KV Tours",
            "time_zone": "Indian Standard Time (IST, GMT+5:30)",
            "clothing_etiquette": "Heavy woollens, thermal inners, waterproof gloves and snow boots for Rohtang Pass and winter months",
            "transport_options": "Private 4x4 / AC SUVs from Chandigarh, Delhi, or Bhuntar (Kullu) Airport",
            "safety_tips": "Stay hydrated and ascend gradually to acclimate to Rohtang Pass elevation (3,978 meters)",
            "packing_tips": "Thermals, moisturiser, polar fleece jacket, UV-protected sunglasses for snow glare",
            "insider_advice": "Early morning drive through Atal Tunnel towards Sissu in Lahaul Valley offers dramatic landscapes without valley traffic.",
        },
        "faqs": [
            {
                "question": "What is the best route to reach Manali from Coimbatore?",
                "answer": "Fly from Coimbatore (CJB) to Chandigarh (IXC) or Delhi (DEL), followed by our pre-booked private luxury vehicle to Manali.",
            },
            {
                "question": "Will we see snow in Manali?",
                "answer": "Snow is guaranteed at Rohtang Pass and Sissu throughout April-June, and valley snowfall covers Manali town from late December to February.",
            },
            {
                "question": "Is Rohtang Pass permit included?",
                "answer": "Yes. KV Tours & Travels secures official NGT vehicle permits for Rohtang Pass well in advance for our guests.",
            },
        ],
    },
    "kazakhstan": {
        "highlights": [
            {
                "title": "Charyn Canyon & Valley of Castles",
                "category": "Geological Wonder",
                "description": "Known as the Grand Canyon's Central Asian twin, featuring striking red sandstone towers carved over 12 million years.",
                "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Kolsai & Kaindy Sunken Forest Lakes",
                "category": "Alpine Lake",
                "description": "Turquoise mountain lakes framed by Tian Shan spruces, including Lake Kaindy where birch trunks rise out of icy waters.",
                "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Medeu High-Altitude Rink & Shymbulak Ski Resort",
                "category": "Mountain Panorama",
                "description": "Ascend modern scenic cable cars up to Talgar Pass (3,200m) with sweeping views of Almaty and the Zailiyskiy Alatau.",
                "image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
            },
        ],
        "travel_guide": {
            "best_time_to_visit": "May to October (Scenic alpine hiking) and December to March (Winter wonderland & skiing)",
            "seasonal_weather": "Continental climate: Pleasant summer (20°C to 28°C), crisp alpine winter (-5°C to 5°C)",
            "local_language": "Kazakh and Russian (English spoken in luxury hotels and by KV Tours guides)",
            "currency": "Kazakhstani Tenge (KZT)",
            "visa_entry": "Visa-free entry for Indian citizens for stays up to 14 days",
            "time_zone": "East Kazakhstan Time (GMT+5 — 30 minutes behind IST)",
            "clothing_etiquette": "Comfortable mountain-wear and city chic; modest dress when visiting Central Mosque of Almaty",
            "transport_options": "Direct flights from Delhi to Almaty (ALA) taking just 3.5 hours, followed by our private Mercedes Sprinter / SUV fleet",
            "safety_tips": "Carry layered clothing as mountain weather at Shymbulak and Charyn can change rapidly",
            "packing_tips": "Hiking shoes with good grip, thermal layers, universal travel adapter, currency card",
            "insider_advice": "Try traditional mountain herbal tea with local honey at Kok Tobe hill while watching the sunset over Almaty.",
        },
        "faqs": [
            {
                "question": "Is Kazakhstan really visa-free for Indian travellers?",
                "answer": "Yes! Indian passport holders can enter Kazakhstan visa-free for up to 14 days per visit for tourism and leisure.",
            },
            {
                "question": "How long is the flight to Kazakhstan from India?",
                "answer": "Direct flights from New Delhi to Almaty take only about 3 hours and 30 minutes, making it one of the closest international mountain destinations.",
            },
            {
                "question": "Are vegetarian meals available on the tour?",
                "answer": "Yes. KV Tours & Travels arranges specially curated vegetarian and Indian meal options at our partner restaurants in Almaty.",
            },
        ],
    },
    "japan": {
        "highlights": [
            {
                "title": "Kyoto Arashiyama Bamboo Grove & Tenryu-ji",
                "category": "UNESCO Heritage",
                "description": "Walk beneath towering verdant bamboo stalks swaying in the breeze beside historic Zen Buddhist gardens.",
                "image_url": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Mount Fuji 5th Station & Lake Kawaguchiko",
                "category": "Sacred Mountain",
                "description": "Capture postcard-perfect views of Japan's sacred snow-capped peak reflected across pristine crater lakes.",
                "image_url": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Tokyo Shibuya Crossing & Senso-ji Temple",
                "category": "Modern & Ancient",
                "description": "Experience the contrast of Tokyo's neon heartbeat at Shibuya and the spiritual incense of Asakusa's oldest temple.",
                "image_url": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=80",
            },
        ],
        "travel_guide": {
            "best_time_to_visit": "Late March to May (Cherry blossom season) and October to November (Vibrant autumn foliage)",
            "seasonal_weather": "Temperate four distinct seasons (Spring/Autumn: 15°C to 22°C)",
            "local_language": "Japanese (English signage throughout transit and hospitality hubs)",
            "currency": "Japanese Yen (JPY)",
            "visa_entry": "eVisa for Indian tourists processed smoothly online (KV Tours assists with complete itinerary dossier)",
            "time_zone": "Japan Standard Time (JST, GMT+9 — 3.5 hours ahead of IST)",
            "clothing_etiquette": "Clean shoes that are easy to slip off when entering traditional ryokans, tea rooms, and temples",
            "transport_options": "Shinkansen Bullet Train (included in our Japan packages) reaching speeds of 320 km/h with scenic views",
            "safety_tips": "Japan is consistently ranked among the safest countries in the world for solo and family travellers",
            "packing_tips": "Comfortable slip-on walking shoes, pocket Wi-Fi or eSIM, small trash bag (public bins are rare), coin purse",
            "insider_advice": "Reserve high-speed Shinkansen seats on the right side when travelling from Tokyo to Kyoto to view Mount Fuji.",
        },
        "faqs": [
            {
                "question": "Can Indian tourists apply for a Japan eVisa?",
                "answer": "Yes. Indian passport holders holding ordinary passports can apply for an eVisa for short-term tourism visits through the official portal with our assistance.",
            },
            {
                "question": "Is Shinkansen Bullet Train travel included?",
                "answer": "Yes. All inter-city transfers between Tokyo, Mount Fuji, Kyoto, and Osaka include reserved Shinkansen bullet train passes.",
            },
            {
                "question": "Will we experience a traditional Onsen (hot spring) and Ryokan?",
                "answer": "Yes. Our signature package includes an overnight stay at a luxury hot spring ryokan with traditional Kaiseki dining.",
            },
        ],
    },
    "andaman": {
        "highlights": [
            {
                "title": "Radhanagar Beach at Havelock Island",
                "category": "World-Class Beach",
                "description": "Voted Asia's best beach by Time Magazine, featuring powdery white sands, turquoise waters, and lush rainforest borders.",
                "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Elephant Beach Coral Reef Snorkel & Sea Walk",
                "category": "Marine Adventure",
                "description": "Crystal shallow reefs teeming with vibrant clownfish, sea turtles, and untouched brain coral formations.",
                "image_url": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Historic Cellular Jail & Light and Sound Show",
                "category": "National Memorial",
                "description": "The poignant colonial heritage site in Port Blair honoring India's freedom fighters with an evening light show.",
                "image_url": "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&w=1200&q=80",
            },
        ],
        "travel_guide": {
            "best_time_to_visit": "October to May (Calm seas, low humidity, ideal for scuba diving)",
            "seasonal_weather": "Tropical maritime (24°C to 31°C)",
            "local_language": "Hindi, Bengali, Tamil, Telugu, and English",
            "currency": "Indian Rupee (INR)",
            "visa_entry": "No special permit required for Indian citizens travelling with valid photo ID",
            "time_zone": "Indian Standard Time (IST, GMT+5:30)",
            "clothing_etiquette": "Light beachwear, breathable cottons, sunglasses, and comfortable footwear",
            "transport_options": "Direct flights from Chennai, Bengaluru, and Kochi to Veer Savarkar Airport (IXZ) in Port Blair, followed by private catamarans (Makruzz/Nautika)",
            "safety_tips": "Swim only in designated safe zones and adhere to lifeguards regarding seasonal tide currents",
            "packing_tips": "Sunscreen, polarized sunglasses, underwater camera, light windcheater, insect repellent",
            "insider_advice": "Book the premium Makruzz catamaran lounge for smooth sailing between Port Blair, Havelock, and Neil islands.",
        },
        "faqs": [
            {
                "question": "Can I travel to Andaman directly from Coimbatore?",
                "answer": "Yes. You can take a 1-stop or connecting flight from Coimbatore via Chennai or Bengaluru to Port Blair (IXZ).",
            },
            {
                "question": "Is scuba diving safe for non-swimmers?",
                "answer": "Absolutely. Discover Scuba Diving (DSD) at Havelock includes 1-on-1 certified PADI dive master accompaniment at all times in shallow reefs.",
            },
            {
                "question": "How do we travel between Port Blair and Havelock Island?",
                "answer": "Our packages include reserved luxury high-speed catamaran tickets (Makruzz or Nautika) taking just 90 minutes across the bay.",
            },
        ],
    },
    "varanasi": {
        "highlights": [
            {
                "title": "Dashashwamedh Ghat Grand Ganga Aarti",
                "category": "Spiritual Spectacle",
                "description": "A hypnotic ritual of brass lamps, Vedic chants, and incense smoke performed by priests along the holy riverbanks at dusk.",
                "image_url": "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Subah-e-Banaras Sunrise Boat Cruise",
                "category": "Cultural Immersion",
                "description": "Float along the ancient stone steps as the first morning rays illuminate centuries-old palaces and spiritual seekers.",
                "image_url": "https://images.unsplash.com/photo-1571536802807-30451e3955d8?auto=format&fit=crop&w=1200&q=80",
            },
            {
                "title": "Sarnath Deer Park & Dhamek Stupa",
                "category": "Buddhist Heritage",
                "description": "The sacred park where Lord Buddha preached his first sermon after attaining enlightenment, featuring Emperor Ashoka's pillar.",
                "image_url": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
            },
        ],
        "travel_guide": {
            "best_time_to_visit": "October to March (Pleasant cool winter weather ideal for walking ghats)",
            "seasonal_weather": "Winter: 10°C to 24°C; Summer: 30°C to 42°C",
            "local_language": "Hindi and Bhojpuri (English widely spoken by guides)",
            "currency": "Indian Rupee (INR)",
            "visa_entry": "No permit required for Indian citizens",
            "time_zone": "Indian Standard Time (IST, GMT+5:30)",
            "clothing_etiquette": "Modest traditional or casual clothing covering shoulders and knees when visiting temples and ghats",
            "transport_options": "Direct and connecting flights from South India to Lal Bahadur Shastri Airport (VNS), with private AC vehicle for excursions and hand-rowed wooden boats for ghats",
            "safety_tips": "Keep valuables secure in crowded alleyways and purchase boat rides exclusively through verified operators like KV Tours",
            "packing_tips": "Comfortable walking shoes (lanes are pedestrian only), hand sanitiser, shawl for temple visits",
            "insider_advice": "A pre-dawn boat ride from Assi Ghat to Manikarnika Ghat offers the most serene contemplation of the ancient city's soul.",
        },
        "faqs": [
            {
                "question": "Is VIP Darshan included for Kashi Vishwanath Temple?",
                "answer": "Yes. Our sacred journey package includes priority Sugam Darshan assistance through the newly built Kashi Vishwanath Corridor.",
            },
            {
                "question": "Can elderly travellers comfortably navigate the tour?",
                "answer": "Yes. We arrange private e-rickshaw transfers, wheelchair support where permitted, and private reserved boats with easy-access ramps.",
            },
            {
                "question": "Where is the Ganga Aarti viewed from?",
                "answer": "We reserve exclusive front-row seats on private wooden riverboats directly opposite Dashashwamedh Ghat for unobstructed views away from shore crowds.",
            },
        ],
    },
}

PACKAGES_DATA = {
    "maldives-luxury-overwater-escape": {
        "inclusions": [
            "4 Nights in Luxury Sunrise Overwater Villa with Private Plunge Pool",
            "Return Scenic Seaplane Transfers from Male International Airport (Velana)",
            "All-Inclusive Gourmet Dining (Breakfast, Lunch, Dinner & Premium Beverages)",
            "Complimentary Sunset Dolphin Cruise & Guided House Reef Snorkeling",
            "1x Complimentary Couple's Balinese Spa Treatment (60 Mins)",
            "All Green Taxes, Service Charges & 24/7 KV Tours Dedicated Concierge",
        ],
        "exclusions": [
            "International Round-trip Flights to/from Male",
            "Motorized Watersports (Jet Ski, Parasailing, Seabob)",
            "Personal Souvenirs and Gratuities",
            "Travel and Medical Insurance (Available as add-on)",
        ],
        "child_price": Decimal("35000.00"),
        "infant_price": Decimal("8500.00"),
        "single_room_supplement": Decimal("32000.00"),
        "booking_cutoff_days": 7,
        "cancellation_policy": "Full refund up to 21 days before departure. 50% refund between 20 to 10 days. Non-refundable within 10 days.",
        "days": [
            {
                "day_number": 1,
                "title": "Arrival in Male & Scenic Seaplane Flight to Overwater Villa",
                "description": "Arrive at Velana International Airport where our luxury resort representative greets you. Transfer to the private seaplane lounge and take off on a breathtaking 25-minute scenic flight over coral atolls. Check in to your private Overwater Villa and unwind with welcome drinks.",
                "accommodation": "Centara Grand Island Resort & Spa Maldives",
                "meals": "Dinner & Sunset Cocktails",
                "transportation": "Scenic Twin-Otter Seaplane Transfer",
            },
            {
                "day_number": 2,
                "title": "Private House Reef Snorkeling & Marine Safari",
                "description": "Wake up to endless turquoise horizon views. After a sumptuous champagne breakfast, join our resident marine biologist for a guided snorkel along the house reef, swimming alongside sea turtles and harmless reef sharks. Afternoon at leisure on your private sun deck.",
                "accommodation": "Centara Grand Island Resort & Spa Maldives",
                "meals": "Breakfast, Lunch & Gourmet Dinner",
                "transportation": "Walking / Resort Buggy",
            },
            {
                "day_number": 3,
                "title": "Private Sunset Dolphin Cruise & Starlight Dining",
                "description": "Morning at leisure enjoying stand-up paddleboarding or an optional scuba dive. In the late afternoon, embark on a private wooden Dhoni boat for a champagne cruise in search of playful spinner dolphins. Conclude with a romantic 5-course beachfront seafood dinner.",
                "accommodation": "Centara Grand Island Resort & Spa Maldives",
                "meals": "Breakfast, Lunch & Beachfront 5-Course Dinner",
                "transportation": "Private Wooden Dhoni Boat",
            },
            {
                "day_number": 4,
                "title": "Overwater Spa Rejuvenation & Sandbank Escape",
                "description": "Indulge in a 60-minute relaxing couple's aromatherapeutic massage at the overwater spa pavilion with glass floor panels viewing corals below. Later, take a speedboat to an uninhabited sandbank for a private castaway picnic.",
                "accommodation": "Centara Grand Island Resort & Spa Maldives",
                "meals": "Breakfast, Gourmet Sandbank Picnic & Dinner",
                "transportation": "Speedboat",
            },
            {
                "day_number": 5,
                "title": "Farewell Lagoon Swim & Seaplane Return to Male",
                "description": "Enjoy a floating breakfast delivered to your private villa plunge pool. Take a final swim in the warm lagoon before boarding the afternoon seaplane back to Male for your onward flight home with lifelong memories.",
                "accommodation": "Checkout",
                "meals": "Floating Breakfast & Light Lunch",
                "transportation": "Return Seaplane to Velana Airport",
            },
        ],
    },
    "lakshadweep-bangaram-expedition": {
        "inclusions": [
            "4 Nights in Beachfront Cottage at Bangaram Island Resort",
            "Return Speedboat Transfers between Agatti Airport and Bangaram Island",
            "Full Board Meals (Daily Breakfast, Lunch, High Tea & Dinner)",
            "All Official Lakshadweep Entry Permits and Police Clearances",
            "Guided Snorkeling Tour at Coral Garden with Snorkel Gear Provided",
            "Excursion to Thinnakara Castaway Island and Sandspit",
        ],
        "exclusions": [
            "Airfare from Mainland (Kochi) to Agatti Island",
            "Scuba Diving sessions (Payable directly at PADI Dive Center)",
            "Personal Expenses and Laundry",
            "Emergency Medical Evacuation Coverage (Available as add-on)",
        ],
        "child_price": Decimal("18000.00"),
        "infant_price": Decimal("5000.00"),
        "single_room_supplement": Decimal("15000.00"),
        "booking_cutoff_days": 14,
        "cancellation_policy": "Full refund up to 30 days prior. 50% refund up to 15 days. Non-refundable within 14 days due to island permit regulations.",
        "days": [
            {
                "day_number": 1,
                "title": "Arrival at Agatti Airport & Speedboat Ride to Bangaram",
                "description": "Land at Agatti Island's stunning ocean runway. Our team assists with permit checks and escorts you to the jetty. Board a high-speed boat cruising through turquoise waters to Bangaram Island. Check in to your beach cottage shaded by swaying palms.",
                "accommodation": "Bangaram Island Resort (Beach Cottage)",
                "meals": "Lunch & Coastal Seafood Dinner",
                "transportation": "High-Speed Boat Transfer",
            },
            {
                "day_number": 2,
                "title": "Bangaram Lagoon Snorkeling & Coral Reef Exploration",
                "description": "After a tropical breakfast, venture into the shallow lagoon where sea turtles graze on seagrass beds. Enjoy guided snorkeling through untouched coral formations teeming with parrotfish, angelfish, and stingrays.",
                "accommodation": "Bangaram Island Resort",
                "meals": "Breakfast, Lunch & Dinner",
                "transportation": "Boat & Walking",
            },
            {
                "day_number": 3,
                "title": "Castaway Day Trip to Thinnakara Island & Sandspit",
                "description": "Board a traditional motorboat to the neighboring uninhabited island of Thinnakara. Walk the endless blindingly white sandspit jutting into the ocean. Enjoy fresh coconut water and an island picnic under casuarina trees.",
                "accommodation": "Bangaram Island Resort",
                "meals": "Breakfast, Picnic Lunch & Dinner",
                "transportation": "Motorboat",
            },
            {
                "day_number": 4,
                "title": "Kayaking, Glass-Bottom Boat & Sunset Bonfire",
                "description": "Spend the morning sea kayaking or observing marine life through a glass-bottom boat. In the evening, gather around a beachfront barbecue with live island acoustic music under a canopy of starlight.",
                "accommodation": "Bangaram Island Resort",
                "meals": "Breakfast, Lunch & Barbecue Dinner",
                "transportation": "Kayaks / Walking",
            },
            {
                "day_number": 5,
                "title": "Speedboat to Agatti & Flight to Kochi",
                "description": "Early morning breakfast overlooking the turquoise lagoon. Transfer by speedboat back to Agatti Airport for your return flight to Kochi, concluding an extraordinary island expedition.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Return Speedboat to Agatti",
            },
        ],
    },
    "bali-cultural-odyssey-nusa-penida": {
        "inclusions": [
            "3 Nights in Luxury Jungle Pool Villa (Ubud) + 2 Nights in 5★ Beach Resort (Seminyak)",
            "Private Air-Conditioned SUV Transportation with English-Speaking Driver/Guide throughout",
            "Full-Day Nusa Penida West Coast Island Excursion with Speedboat and Local 4x4",
            "All Entrance Fees to Tegallalang, Tirta Empul, Uluwatu, and Monkey Forest",
            "Uluwatu Sunset Kecak Fire Dance Reserved Front-Row Tickets",
            "Daily Artisan Breakfasts, 2 Traditional Balinese Dinners & 24/7 KV Concierge",
        ],
        "exclusions": [
            "International Flights to/from Bali (DPS)",
            "Indonesia Electronic Visa on Arrival (e-VOA, ~USD 35)",
            "Bali Tourist Levy (IDR 150,000 / ~USD 10)",
            "Personal Expenses, Spa Treatments & Optional Activities",
        ],
        "child_price": Decimal("22000.00"),
        "infant_price": Decimal("6000.00"),
        "single_room_supplement": Decimal("18000.00"),
        "booking_cutoff_days": 10,
        "cancellation_policy": "Full refund up to 15 days before arrival. 50% refund up to 7 days. Non-refundable within 7 days.",
        "days": [
            {
                "day_number": 1,
                "title": "Arrival in Denpasar & Private Transfer to Ubud Jungle Villa",
                "description": "Warm flower garland greeting at Ngurah Rai International Airport. Travel by private SUV past terraced villages into the heart of Ubud. Check in to your private pool villa overlooking the Ayung River valley.",
                "accommodation": "Maya Ubud Resort & Spa (Pool Villa)",
                "meals": "Welcome Dinner",
                "transportation": "Private AC SUV",
            },
            {
                "day_number": 2,
                "title": "Tegallalang Rice Terraces, Jungle Swing & Tirta Empul Sacred Springs",
                "description": "Start early at Tegallalang Rice Terraces enjoying morning golden hour and the iconic giant jungle swing. Continue to Tirta Empul for a guided cultural walkthrough of the ancient Hindu water purification temple. Visit a local coffee plantation for Luwak coffee tasting.",
                "accommodation": "Maya Ubud Resort & Spa",
                "meals": "Breakfast & Traditional Balinese Lunch",
                "transportation": "Private AC SUV",
            },
            {
                "day_number": 3,
                "title": "Nusa Penida Island Expedition (Kelingking & Broken Beach)",
                "description": "Early morning private transfer to Sanur Harbour. Board a high-speed boat to Nusa Penida. Visit the world-famous Kelingking 'T-Rex' cliff, Angel's Billabong natural infinity pool, and Broken Beach. Swim in the emerald cove of Crystal Bay before returning to Bali.",
                "accommodation": "Maya Ubud Resort & Spa",
                "meals": "Breakfast & Island Lunch",
                "transportation": "Speedboat & Private Island 4x4",
            },
            {
                "day_number": 4,
                "title": "Sacred Monkey Forest & Transfer to Coastal Seminyak",
                "description": "Stroll through the shaded canopy of Ubud Sacred Monkey Forest. Browse the Ubud Traditional Art Market for handcrafted souvenirs. In the afternoon, transfer to vibrant Seminyak and check in to your beachfront resort. Evening at leisure exploring Seminyak's beach clubs.",
                "accommodation": "The Seminyak Beach Resort & Spa",
                "meals": "Breakfast",
                "transportation": "Private AC SUV",
            },
            {
                "day_number": 5,
                "title": "Uluwatu Clifftop Temple & Spectacular Kecak Fire Dance",
                "description": "Relax along Seminyak beach in the morning. Afternoon drive down the Bukit Peninsula to Uluwatu Temple perched 70 meters above crashing waves. At sunset, witness the mesmerizing Kecak Fire Dance performance, followed by an oceanfront seafood dinner at Jimbaran Bay.",
                "accommodation": "The Seminyak Beach Resort & Spa",
                "meals": "Breakfast & Jimbaran Seafood Dinner",
                "transportation": "Private AC SUV",
            },
            {
                "day_number": 6,
                "title": "Souvenir Shopping & Airport Departure",
                "description": "Savor a leisurely breakfast by the ocean. Enjoy last-minute boutique shopping along Seminyak Square before your private airport transfer for your departure flight.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC SUV to DPS Airport",
            },
        ],
    },
    "manali-alpine-haven-rohtang": {
        "inclusions": [
            "4 Nights in Premium Valley-Facing Room at 5★ Himalayan Resort & Spa",
            "Private Dedicated SUV (Innova / Fortuner) from Chandigarh throughout the Tour",
            "Official NGT Rohtang Pass High-Altitude Vehicle Permit",
            "Excursion to Rohtang Pass, Solang Valley, Atal Tunnel & Sissu (Lahaul)",
            "Sightseeing at Hadimba Temple, Vashisht Hot Springs & Old Manali Cafes",
            "Daily Himalayan Buffet Breakfasts & Chef-Curated Dinners",
        ],
        "exclusions": [
            "Flight tickets to/from Chandigarh or Delhi",
            "Adventure sports equipment rental (Skiing, Paragliding, Zorbing)",
            "Personal heating charges or heater rental where applicable",
            "Entry fees for amusement parks or private museum galleries",
        ],
        "child_price": Decimal("11000.00"),
        "infant_price": Decimal("3500.00"),
        "single_room_supplement": Decimal("9500.00"),
        "booking_cutoff_days": 5,
        "cancellation_policy": "Full refund up to 14 days before trip. 50% refund up to 7 days. Non-refundable within 7 days.",
        "days": [
            {
                "day_number": 1,
                "title": "Chandigarh to Manali Scenic Himalayan Drive",
                "description": "Meet our private chauffeur at Chandigarh Airport/Railway station. Drive along the scenic Beas river valley through Mandi and Kullu. Check in to your luxury mountain resort in Manali and relax by the fireplace with a warm apple cider drink.",
                "accommodation": "The Himalayan Resort & Spa Manali",
                "meals": "Dinner",
                "transportation": "Private AC SUV",
            },
            {
                "day_number": 2,
                "title": "Local Manali Heritage & Old Manali Culture",
                "description": "Morning visit to the 450-year-old wooden Hadimba Devi Temple surrounded by cedar forests. Soak your feet in the sacred Vashisht natural sulfur hot springs. Spend the evening wandering cobblestone lanes of Old Manali with charming bakeries and live music.",
                "accommodation": "The Himalayan Resort & Spa Manali",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC SUV",
            },
            {
                "day_number": 3,
                "title": "Rohtang Pass Snow Paradise & Pir Panjal Vistas",
                "description": "Early morning ascent through alpine switchbacks to Rohtang Pass (13,058 ft). Marvel at snow peaks, glaciers, and panoramic mountain vistas. Enjoy snow games, sledging, or hot Maggi noodles at high altitude before returning to the valley.",
                "accommodation": "The Himalayan Resort & Spa Manali",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC SUV (NGT Permit)",
            },
            {
                "day_number": 4,
                "title": "Solang Valley Adventures & Atal Tunnel to Sissu Waterfall",
                "description": "Drive through the engineering marvel of Atal Tunnel (9.02 km) emerging into the rugged wonderland of Lahaul Valley. Visit the cascading Sissu Waterfall. Return to Solang Valley for thrilling paragliding and ropeway rides.",
                "accommodation": "The Himalayan Resort & Spa Manali",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC SUV",
            },
            {
                "day_number": 5,
                "title": "Scenic Return Drive to Chandigarh",
                "description": "Enjoy breakfast admiring misty pine peaks. Descend through the Kullu valley with a brief stop at a renowned shawl weaving cooperative. Arrive at Chandigarh Airport in time for your evening flight.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC SUV to Chandigarh",
            },
        ],
    },
    "kazakhstan-grand-silk-road-almaty": {
        "inclusions": [
            "5 Nights at 5★ The Ritz-Carlton Almaty with Mountain-View Deluxe Rooms",
            "All Ground Transfers in Private Luxury Mercedes Sprinter / 4x4 Fleet",
            "Excursion to Charyn Canyon & The Valley of Castles with Guided Hike",
            "Kolsai Lake Alpine Tour & Kaindy Sunken Forest Lake 4x4 Experience",
            "Medeu High-Altitude Rink & Shymbulak Ski Resort Panoramic Cable Car Pass",
            "Daily International Breakfasts, Traditional Kazakh Lunch & Curated Dinners",
            "English-Speaking Professional Local Guide & 24/7 KV Tours Support",
        ],
        "exclusions": [
            "International Flights to/from Almaty (ALA)",
            "Ski equipment and ski pass rentals at Shymbulak",
            "Alcoholic beverages outside designated dinner menus",
            "Personal expenses, tips and travel insurance",
        ],
        "child_price": Decimal("28000.00"),
        "infant_price": Decimal("7500.00"),
        "single_room_supplement": Decimal("24000.00"),
        "booking_cutoff_days": 10,
        "cancellation_policy": "Full refund up to 21 days before departure. 50% refund up to 10 days. Non-refundable within 10 days.",
        "days": [
            {
                "day_number": 1,
                "title": "Arrival in Almaty & Panoramic Kok Tobe Cable Car",
                "description": "Arrive at Almaty International Airport (ALA) with smooth visa-free entry. Private transfer to The Ritz-Carlton Almaty. Evening cable car ride up to Kok Tobe hill (1,100m) overlooking the glittering lights of Central Asia's garden city. Welcome dinner featuring Kazakh specialties.",
                "accommodation": "The Ritz-Carlton Almaty",
                "meals": "Welcome Dinner",
                "transportation": "Private Luxury Fleet",
            },
            {
                "day_number": 2,
                "title": "Charyn Canyon & Valley of Castles Guided Trek",
                "description": "Full-day journey across the Kazakh steppe to Charyn Canyon, a 12-million-year-old geological wonder. Walk the 2 km trail down through the majestic red sandstone 'Valley of Castles' to the rushing Charyn River. Steppe picnic lunch included.",
                "accommodation": "The Ritz-Carlton Almaty",
                "meals": "Breakfast, Steppe Picnic Lunch & Dinner",
                "transportation": "Private AC Fleet",
            },
            {
                "day_number": 3,
                "title": "Kolsai Alpine Lake & Sunken Forest of Lake Kaindy",
                "description": "Journey into the Tian Shan mountains to Kolsai Lakes, the 'Pearl of Northern Tian Shan'. Take local Soviet-era 4x4 jeeps up to Lake Kaindy, famous for submerged birch tree trunks preserved in freezing turquoise water. Enjoy peaceful mountain hikes.",
                "accommodation": "The Ritz-Carlton Almaty",
                "meals": "Breakfast, Mountain Lunch & Dinner",
                "transportation": "Private Fleet & Local 4x4",
            },
            {
                "day_number": 4,
                "title": "Medeu High-Altitude Gorge & Shymbulak Ski Resort",
                "description": "Ascend to Medeu Gorge (1,691m), home to the world's highest outdoor Olympic speed-skating rink. Ride three interconnected cable cars up to Shymbulak Ski Resort and Talgar Pass (3,200m). Enjoy hot glühwein, snowy peaks, and panoramic mountain photography.",
                "accommodation": "The Ritz-Carlton Almaty",
                "meals": "Breakfast & Alpine Lunch",
                "transportation": "Private Fleet & Gondola Cable Car",
            },
            {
                "day_number": 5,
                "title": "Almaty City Heritage, Green Bazaar & Zenkov Cathedral",
                "description": "Explore Panfilov Park and the exquisite wooden candy-colored Zenkov Cathedral (built entirely without nails). Wander through the vibrant Green Bazaar tasting dried fruits, nuts, and horse cheeses. Visit Rahat chocolate factory store for authentic souvenirs.",
                "accommodation": "The Ritz-Carlton Almaty",
                "meals": "Breakfast & Farewell Dinner",
                "transportation": "Private AC Fleet",
            },
            {
                "day_number": 6,
                "title": "Farewell Almaty & Flight Home",
                "description": "Enjoy a luxurious breakfast with Tian Shan mountain views. Private transfer to Almaty International Airport for your direct flight home.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private Airport Transfer",
            },
        ],
    },
    "japan-imperial-heritage-cherry-blossom": {
        "inclusions": [
            "4 Nights in 5★ The Capitol Hotel Tokyu + 3 Nights in Luxury Kyoto Machiya/Hotel",
            "7-Day Japan Rail (JR) Nationwide Pass for Unlimited Shinkansen Bullet Trains",
            "Guided Tour of Tokyo (Senso-ji, Meiji Shrine, Shibuya Crossing & Akihabara)",
            "Mount Fuji & Lake Kawaguchiko 5th Station Full-Day Guided Excursion",
            "Kyoto Highlights: Kinkaku-ji (Golden Pavilion), Arashiyama Bamboo Grove & Fushimi Inari",
            "Traditional Japanese Tea Ceremony Experience in Gion District",
            "Daily Artisan Breakfasts & 2 Kaiseki Multi-Course Traditional Dinners",
        ],
        "exclusions": [
            "International Round-trip Flights to/from Tokyo (NRT/HND)",
            "Japan Tourist eVisa Processing Fee",
            "Baggage delivery service between Tokyo and Kyoto (Optional)",
            "Personal shopping, optional museum entries & gratuities",
        ],
        "child_price": Decimal("65000.00"),
        "infant_price": Decimal("15000.00"),
        "single_room_supplement": Decimal("48000.00"),
        "booking_cutoff_days": 21,
        "cancellation_policy": "Full refund up to 30 days prior. 50% refund up to 14 days. Non-refundable within 14 days.",
        "days": [
            {
                "day_number": 1,
                "title": "Arrival in Tokyo & Luxury Hotel Check-In",
                "description": "Land at Narita or Haneda International Airport. Meet our airport representative, validate your JR pass, and board the Narita Express / private transfer to The Capitol Hotel Tokyu in central Tokyo. Evening welcome dinner in Ginza.",
                "accommodation": "The Capitol Hotel Tokyu",
                "meals": "Welcome Dinner",
                "transportation": "Narita Express / Private Car",
            },
            {
                "day_number": 2,
                "title": "Tokyo Modern & Traditional: Asakusa, Meiji Shrine & Shibuya",
                "description": "Visit Asakusa's Senso-ji Temple and Nakamise shopping street. Walk through the tranquil wooded grounds of Meiji Jingu Shrine. In the afternoon, dive into the future at Shibuya Crossing and admire city views from Shibuya Sky observatory.",
                "accommodation": "The Capitol Hotel Tokyu",
                "meals": "Breakfast & Lunch",
                "transportation": "Tokyo Metro / Private Coach",
            },
            {
                "day_number": 3,
                "title": "Mount Fuji & Lake Kawaguchiko Alpine Excursion",
                "description": "Full-day scenic trip to Mount Fuji. Drive up to Mt. Fuji 5th Station (2,300m) above the cloud layer. Cruise along Lake Kawaguchiko on a panoramic sightseeing boat with dramatic mountain reflections. Visit Oshino Hakkai spring ponds.",
                "accommodation": "The Capitol Hotel Tokyu",
                "meals": "Breakfast & Japanese Bento Lunch",
                "transportation": "Private AC Coach",
            },
            {
                "day_number": 4,
                "title": "Tokyo Art & Culinary Discoveries: Tsukiji & TeamLab Planets",
                "description": "Sample fresh tamagoyaki and street delicacies at Tsukiji Outer Market. Experience the world-renowned immersive digital art installation at TeamLab Planets. Afternoon at leisure exploring upscale Omotesando or electronics hub Akihabara.",
                "accommodation": "The Capitol Hotel Tokyu",
                "meals": "Breakfast",
                "transportation": "Tokyo Metro",
            },
            {
                "day_number": 5,
                "title": "Shinkansen Bullet Train to Kyoto & Gion Geisha District",
                "description": "Board the Tokaido Shinkansen bullet train reaching speeds of 320 km/h, watching Mount Fuji glide past your window. Arrive in ancient Kyoto. Check in and embark on an evening guided lantern walk through the historic Gion geisha district.",
                "accommodation": "Kyoto Brighton Hotel / Luxury Machiya",
                "meals": "Breakfast & Traditional Kaiseki Dinner",
                "transportation": "Shinkansen Bullet Train (Reserved Seat)",
            },
            {
                "day_number": 6,
                "title": "Arashiyama Bamboo Grove & Kinkaku-ji (Golden Pavilion)",
                "description": "Walk through the soaring bamboo shoots of Arashiyama before the crowds arrive. Visit UNESCO-listed Tenryu-ji Temple gardens. In the afternoon, admire the shimmering gold leaf facade of Kinkaku-ji (Golden Pavilion) mirrored in the reflecting pond.",
                "accommodation": "Kyoto Brighton Hotel",
                "meals": "Breakfast & Lunch",
                "transportation": "Private Coach / Kyoto Transit",
            },
            {
                "day_number": 7,
                "title": "Fushimi Inari 10,000 Torii Gates & Nara Deer Park",
                "description": "Ascend the mountain pathway lined with thousands of vibrant vermilion torii gates at Fushimi Inari Shrine. In the afternoon, take a short train to Nara to feed friendly bow-trained deer and marvel at the colossal bronze Buddha at Todai-ji Temple.",
                "accommodation": "Kyoto Brighton Hotel",
                "meals": "Breakfast & Dinner",
                "transportation": "JR Express Train",
            },
            {
                "day_number": 8,
                "title": "Osaka Departure or Return to Tokyo",
                "description": "Enjoy a final matcha tea ceremony breakfast in Kyoto. Transfer to Kansai International Airport (KIX) in Osaka or take the Shinkansen back to Tokyo for your flight home.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Haruka Express to KIX Airport",
            },
        ],
    },
    "andaman-tropical-escapade-havelock": {
        "inclusions": [
            "3 Nights at 5★ Taj Exotica Havelock + 2 Nights in Sea-Facing Port Blair Hotel",
            "Luxury High-Speed Catamaran (Makruzz / Nautika) Transfers between Port Blair & Havelock",
            "PADI Certified Discover Scuba Diving Session with Underwater Photography",
            "Exclusive Visit to Radhanagar Beach (Asia's Best Beach) & Elephant Beach",
            "Historic Cellular Jail Light & Sound Show with Reserved Premium Seating",
            "Private Air-Conditioned Vehicle for All Road Transfers and Sightseeing",
            "Daily Coastal Breakfasts, 2 Chef-Crafted Dinners & Dedicated KV Concierge",
        ],
        "exclusions": [
            "Airfare to/from Port Blair (IXZ)",
            "Water sports not explicitly listed (Parasailing, Jet Ski)",
            "Personal laundry, phone calls and room service",
            "Travel insurance coverage",
        ],
        "child_price": Decimal("15000.00"),
        "infant_price": Decimal("4000.00"),
        "single_room_supplement": Decimal("12500.00"),
        "booking_cutoff_days": 7,
        "cancellation_policy": "Full refund up to 15 days before arrival. 50% refund up to 7 days. Non-refundable within 7 days.",
        "days": [
            {
                "day_number": 1,
                "title": "Arrival in Port Blair & Historic Cellular Jail Light Show",
                "description": "Arrive at Veer Savarkar International Airport in Port Blair. Private transfer to your luxury hotel. In the afternoon, visit the historic Cellular Jail followed by the stirring evening Sound & Light Show recounting the courage of India's freedom fighters.",
                "accommodation": "Welcomhotel by ITC Hotels, Bay Island, Port Blair",
                "meals": "Dinner",
                "transportation": "Private AC Vehicle",
            },
            {
                "day_number": 2,
                "title": "High-Speed Luxury Catamaran to Havelock & Radhanagar Sunset",
                "description": "Board the luxury air-conditioned catamaran (Makruzz) cruising 90 minutes across azure waters to Havelock Island (Swaraj Dweep). Check in to Taj Exotica Resort & Spa. Spend a magical afternoon walking the pristine sands of Radhanagar Beach watching a fiery sunset.",
                "accommodation": "Taj Exotica Resort & Spa, Andamans",
                "meals": "Breakfast & Dinner",
                "transportation": "Makruzz Catamaran & Private AC Cab",
            },
            {
                "day_number": 3,
                "title": "Elephant Beach Coral Safari & Scuba Diving Discovery",
                "description": "Speedboat ride to Elephant Beach. Put on dive gear for a 1-on-1 guided PADI Discover Scuba Diving session exploring vibrant coral gardens and exotic marine life. Underwater photos and videos provided. Afternoon free for relaxing poolside.",
                "accommodation": "Taj Exotica Resort & Spa, Andamans",
                "meals": "Breakfast",
                "transportation": "Speedboat & AC Vehicle",
            },
            {
                "day_number": 4,
                "title": "Kalapathar Beach Turquoise Drive & Return to Port Blair",
                "description": "Morning drive through dense tropical greenery to picturesque Kalapathar Beach with its black rocks and glowing turquoise waters. Afternoon catamaran return back to Port Blair. Evening shopping for shell handicrafts at Sagarika Emporium.",
                "accommodation": "Welcomhotel by ITC Hotels, Bay Island, Port Blair",
                "meals": "Breakfast & Dinner",
                "transportation": "Makruzz Catamaran & Private AC Cab",
            },
            {
                "day_number": 5,
                "title": "Ross Island Colonial Ruins & Coral Reef North Bay",
                "description": "Take a short boat ride to Ross Island (Netaji Subhash Chandra Bose Dweep), the former British penal headquarters engulfed in banyan roots and friendly spotted deer. Continue to North Bay Island for coral viewing before returning to Port Blair.",
                "accommodation": "Welcomhotel by ITC Hotels, Bay Island, Port Blair",
                "meals": "Breakfast",
                "transportation": "Ferry & Private AC Vehicle",
            },
            {
                "day_number": 6,
                "title": "Port Blair Departure",
                "description": "Savor breakfast with views of the Bay of Bengal. Private airport drop-off for your flight back to the mainland.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private Airport Transfer",
            },
        ],
    },
    "sacred-varanasi-sarnath-heritage": {
        "inclusions": [
            "3 Nights at 5★ Heritage BrijRama Palace Luxury Hotel on Darbhanga Ghat",
            "Exclusive Private Wooden Boat for Subah-e-Banaras Dawn Ganga Cruise",
            "Front-Row Boat Seating for Dashashwamedh Ghat Evening Ganga Aarti",
            "Priority Sugam Darshan Pass at Shri Kashi Vishwanath Jyotirlinga Temple",
            "Full-Day Guided Excursion to Sarnath (Dhamek Stupa & Archaeological Museum)",
            "Private Air-Conditioned SUV for Airport and Sarnath Excursions",
            "Daily Satvik & Indian Gourmet Breakfasts, 2 Heritage Dinners & KV Host",
        ],
        "exclusions": [
            "Airfare to/from Varanasi (VNS)",
            "Special rituals or personalized pooja samagri offerings",
            "Personal tipping to boatmen and temple guides",
            "Camera fees at museums where applicable",
        ],
        "child_price": Decimal("8500.00"),
        "infant_price": Decimal("2500.00"),
        "single_room_supplement": Decimal("7500.00"),
        "booking_cutoff_days": 3,
        "cancellation_policy": "Full refund up to 10 days before arrival. 50% refund up to 5 days. Non-refundable within 5 days.",
        "days": [
            {
                "day_number": 1,
                "title": "Arrival in Varanasi & Evening Ganga Aarti on Private Boat",
                "description": "Arrive at Lal Bahadur Shastri Airport. Private luxury transfer to the riverbank, followed by a royal boat arrival at the heritage BrijRama Palace on Darbhanga Ghat. At dusk, board our private boat stationed directly before Dashashwamedh Ghat for the awe-inspiring Ganga Aarti ritual.",
                "accommodation": "BrijRama Palace Heritage Grand Hotel",
                "meals": "Heritage Welcome Dinner",
                "transportation": "Private AC SUV & Riverboat",
            },
            {
                "day_number": 2,
                "title": "Subah-e-Banaras Sunrise Cruise & Kashi Vishwanath Sugam Darshan",
                "description": "At 5:30 AM, glide across the misty Ganges on a hand-rowed wooden boat as the dawn sun bathes eighty-four ghats in crimson light. Listen to morning ragas and Vedic chants. Return for breakfast, then proceed through the Kashi Vishwanath Corridor for VIP Sugam Darshan.",
                "accommodation": "BrijRama Palace Heritage Grand Hotel",
                "meals": "Breakfast & Lunch",
                "transportation": "Wooden Boat & Walking Corridor",
            },
            {
                "day_number": 3,
                "title": "Sarnath Buddhist Trail & Banarasi Silk Weaving Village",
                "description": "Drive to sacred Sarnath, where Buddha gave his first sermon. Visit Dhamek Stupa, the ancient ruins, and the museum holding the Ashoka Lion Capital (India's national emblem). Later, visit an authentic artisan weaving colony to witness master weavers crafting pure Banarasi silk sarees.",
                "accommodation": "BrijRama Palace Heritage Grand Hotel",
                "meals": "Breakfast & Farewell Heritage Dinner",
                "transportation": "Private AC SUV",
            },
            {
                "day_number": 4,
                "title": "Morning Ghat Walk & Departure",
                "description": "Enjoy a quiet morning stroll through ancient alleyways exploring traditional sweet shops and tasting famous Banarasi Malaiyo. Private airport transfer for your departure flight.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC Airport Transfer",
            },
        ],
    },
}

HOTELS_DATA = [
    {
        "name": "Centara Grand Island Resort & Spa Maldives",
        "destination_slug": "maldives",
        "star_rating": 5,
        "address": "South Ari Atoll, Republic of Maldives",
        "description": "Premier barefoot 5-star luxury resort featuring private overwater villas, infinity plunge pools, multiple gourmet restaurants, and a world-class house reef.",
    },
    {
        "name": "Bangaram Island Resort",
        "destination_slug": "lakshadweep",
        "star_rating": 4,
        "address": "Bangaram Atoll, Union Territory of Lakshadweep",
        "description": "Iconic eco-luxury beachfront cottages on an uninhabited tropical island encircled by a massive turquoise lagoon and pristine coral gardens.",
    },
    {
        "name": "Maya Ubud Resort & Spa",
        "destination_slug": "bali",
        "star_rating": 5,
        "address": "Jl. Gunung Sari, Peliatan, Kecamatan Ubud, Bali, Indonesia",
        "description": "Award-winning 5-star sanctuary nestled in 10 hectares of lush tropical valley gardens along the Petanu River, featuring private plunge pool villas.",
    },
    {
        "name": "The Himalayan Resort & Spa Manali",
        "destination_slug": "manali",
        "star_rating": 5,
        "address": "Hadimba Road, Manali, Himachal Pradesh 175131",
        "description": "Premier Victorian Gothic style luxury castle resort surrounded by apple orchards and towering deodar forests with heated pool and majestic mountain views.",
    },
    {
        "name": "The Ritz-Carlton Almaty",
        "destination_slug": "kazakhstan",
        "star_rating": 5,
        "address": "Esentai Tower, Al-Farabi Avenue 77/7, Almaty 050040",
        "description": "Five-star contemporary luxury hotel atop Esentai Tower offering panoramic vistas of the snow-capped Tian Shan mountain range, Michelin-inspired dining, and Six Senses spa.",
    },
    {
        "name": "The Capitol Hotel Tokyu",
        "destination_slug": "japan",
        "star_rating": 5,
        "address": "2-10-3 Nagata-cho, Chiyoda-ku, Tokyo 100-0014",
        "description": "Designed by master architect Kengo Kuma, seamlessly blending modern luxury with traditional Japanese aesthetics beside historic Hie Shrine.",
    },
    {
        "name": "Taj Exotica Resort & Spa, Andamans",
        "destination_slug": "andaman",
        "star_rating": 5,
        "address": "Radhanagar Beach, Havelock Island, Andaman and Nicobar Islands 744211",
        "description": "Sprawling across 46 acres of pure coastal jungle on legendary Radhanagar Beach, featuring handcrafted sustainable luxury villas inspired by native Jarawa huts.",
    },
    {
        "name": "BrijRama Palace Heritage Grand Hotel",
        "destination_slug": "varanasi",
        "star_rating": 5,
        "address": "Darbhanga Ghat, Dashashwamedh, Varanasi, Uttar Pradesh 221001",
        "description": "An 18th-century royal palace perched directly on the ghats of the Holy River Ganges, offering regal architecture, live classical music, and fine dining.",
    },
]

ACTIVITIES_DATA = [
    {
        "name": "Private Sunset Dolphin Cruise & Reef Snorkel",
        "destination_slug": "maldives",
        "category": "Marine Safari",
        "duration_minutes": 180,
        "price": Decimal("4500.00"),
        "currency": "INR",
        "description": "Cruise into the golden Maldivian sunset on a private Dhoni watching pods of spinner dolphins perform aerial acrobatics.",
    },
    {
        "name": "Lagoon Scuba Diving & Sea Turtle Encounter",
        "destination_slug": "lakshadweep",
        "category": "Scuba Diving",
        "duration_minutes": 120,
        "price": Decimal("3500.00"),
        "currency": "INR",
        "description": "PADI instructor-guided dive into crystal lagoon waters with green sea turtles, stingrays, and vibrant coral formations.",
    },
    {
        "name": "Nusa Penida Kelingking 'T-Rex' & Broken Beach Excursion",
        "destination_slug": "bali",
        "category": "Island Expedition",
        "duration_minutes": 480,
        "price": Decimal("5200.00"),
        "currency": "INR",
        "description": "High-speed boat and private 4x4 guided trip across Nusa Penida's most dramatic coastal cliffs and turquoise bays.",
    },
    {
        "name": "Rohtang Pass Snow Gliding & High Mountain Safari",
        "destination_slug": "manali",
        "category": "Alpine Adventure",
        "duration_minutes": 360,
        "price": Decimal("2800.00"),
        "currency": "INR",
        "description": "Ascend to 13,058 ft via Atal Tunnel and Solang to experience snow activities and high-altitude Himalayan views.",
    },
    {
        "name": "Charyn Canyon & Valley of Castles Guided Trek",
        "destination_slug": "kazakhstan",
        "category": "Geological Trek",
        "duration_minutes": 420,
        "price": Decimal("4800.00"),
        "currency": "INR",
        "description": "Explore Central Asia's breathtaking red sandstone canyon carved over millions of years by the Charyn River.",
    },
    {
        "name": "Kyoto Arashiyama Bamboo Grove & Gion Heritage Walk",
        "destination_slug": "japan",
        "category": "Cultural Heritage",
        "duration_minutes": 300,
        "price": Decimal("6500.00"),
        "currency": "INR",
        "description": "Private guided walking tour through soaring bamboo forest and lantern-lit stone alleyways of ancient Kyoto.",
    },
    {
        "name": "Discover Scuba Diving & Underwater Photography",
        "destination_slug": "andaman",
        "category": "Scuba Diving",
        "duration_minutes": 150,
        "price": Decimal("4200.00"),
        "currency": "INR",
        "description": "1-on-1 certified PADI scuba dive at Elephant Beach reef with high-definition underwater photography and video footage.",
    },
    {
        "name": "Subah-e-Banaras Dawn Ganga Cruise & Aarti VIP Seating",
        "destination_slug": "varanasi",
        "category": "Spiritual Cruise",
        "duration_minutes": 180,
        "price": Decimal("2200.00"),
        "currency": "INR",
        "description": "Private hand-rowed wooden boat cruise at sunrise along ancient ghats, followed by evening VIP boat seating for Ganga Aarti.",
    },
]

def run_enrichment():
    factory = get_session_factory()
    with factory() as db:
        print("1. Unpublishing scratch/test destinations & packages...")
        test_dests = db.query(Destination).filter(Destination.slug.in_(["f3r", "cdax"])).all()
        for td in test_dests:
            td.is_published = False
            print(f"  Unpublished destination: {td.name} ({td.slug})")

        test_pkgs = db.query(Package).filter(Package.slug.in_(["fee", "bhjb"])).all()
        for tp in test_pkgs:
            tp.is_published = False
            print(f"  Unpublished package: {tp.name} ({tp.slug})")

        print("\n2. Updating Best Offers...")
        offer = db.query(BestOffer).filter(BestOffer.id == UUID("b5459ec3-aef9-4580-8b5d-26135e78afeb")).first()
        if offer:
            offer.title = "Early Bird Luxury Escape: 15% Off Overwater Villas"
            offer.offer_label = "Exclusive Maldives Deal"
            offer.badge_text = "15% OFF"
            offer.short_description = "Book your dream overwater villa in the Maldives and save 15% on direct bookings with KV Tours & Travels."
            offer.status = "active"
            offer.is_featured = True
            print(f"  Updated BestOffer: {offer.title}")

        # Check if we should add another offer for Bali or Kazakhstan
        bali_pkg = db.query(Package).filter(Package.slug == "bali-cultural-odyssey-nusa-penida").first()
        if bali_pkg:
            existing_bali_offer = db.query(BestOffer).filter(BestOffer.package_id == bali_pkg.id).first()
            if not existing_bali_offer:
                new_offer = BestOffer(
                    package_id=bali_pkg.id,
                    title="Bali Paradise Special: 10% Off Private Pool Villas",
                    offer_label="Limited Season Special",
                    badge_text="10% OFF",
                    discount_type="percentage",
                    discount_value=Decimal("10.00"),
                    short_description="Experience Ubud luxury villas and Nusa Penida island tours with exclusive 10% direct savings.",
                    is_featured=True,
                    status="active",
                    display_order=1,
                )
                db.add(new_offer)
                print("  Added BestOffer for Bali package")

        kz_pkg = db.query(Package).filter(Package.slug == "kazakhstan-grand-silk-road-almaty").first()
        if kz_pkg:
            existing_kz_offer = db.query(BestOffer).filter(BestOffer.package_id == kz_pkg.id).first()
            if not existing_kz_offer:
                new_offer = BestOffer(
                    package_id=kz_pkg.id,
                    title="Visa-Free Silk Road Adventure: Flat ₹5,000 Off",
                    offer_label="Autumn & Winter Special",
                    badge_text="Save ₹5,000",
                    discount_type="fixed",
                    discount_value=Decimal("5000.00"),
                    short_description="Explore Charyn Canyon and Tian Shan mountain peaks with flat ₹5,000 savings per couple.",
                    is_featured=True,
                    status="active",
                    display_order=2,
                )
                db.add(new_offer)
                print("  Added BestOffer for Kazakhstan package")

        print("\n3. Enriching 8 destinations with highlights, travel guide, and FAQs...")
        dest_map = {}
        for slug, data in DESTINATIONS_DATA.items():
            dest = db.query(Destination).filter(Destination.slug == slug).first()
            if dest:
                dest.highlights_json = data["highlights"]
                dest.travel_guide_json = data["travel_guide"]
                dest.faqs_json = data["faqs"]
                dest.is_published = True
                dest.is_featured = True
                dest_map[slug] = dest
                print(f"  Enriched destination: {dest.name} ({dest.slug})")

        print("\n4. Creating/Updating Hotels & Activities...")
        hotel_map = {}
        # First update existing 'klm' hotel if present
        existing_klm = db.query(Hotel).filter(Hotel.name == "klm").first()
        if existing_klm:
            existing_klm.name = "Centara Grand Island Resort & Spa Maldives"
            existing_klm.star_rating = 5
            existing_klm.address = "South Ari Atoll, Republic of Maldives"
            existing_klm.description = "Premier barefoot 5-star luxury resort featuring private overwater villas, infinity plunge pools, and a house reef."
            existing_klm.is_active = True
            hotel_map["maldives"] = existing_klm
            print("  Updated existing 'klm' hotel to Centara Grand Island Resort")

        for hdata in HOTELS_DATA:
            dslug = hdata["destination_slug"]
            if dslug == "maldives" and existing_klm:
                continue
            dest = dest_map.get(dslug)
            if not dest:
                continue
            h = db.query(Hotel).filter(Hotel.name == hdata["name"]).first()
            if not h:
                h = Hotel(
                    destination_id=dest.id,
                    name=hdata["name"],
                    star_rating=hdata["star_rating"],
                    address=hdata["address"],
                    description=hdata["description"],
                    is_active=True,
                )
                db.add(h)
                db.flush()
                print(f"  Created hotel: {h.name} for {dslug}")
            hotel_map[dslug] = h

        activity_map = {}
        # Update existing 'ff' activity if present
        existing_ff = db.query(Activity).filter(Activity.name == "ff").first()
        if existing_ff:
            existing_ff.name = "Private Sunset Dolphin Cruise & Reef Snorkel"
            existing_ff.category = "Marine Safari"
            existing_ff.duration_minutes = 180
            existing_ff.price = Decimal("4500.00")
            existing_ff.status = "active"
            existing_ff.description = "Cruise into the golden Maldivian sunset on a private Dhoni watching pods of spinner dolphins."
            activity_map["maldives"] = existing_ff
            print("  Updated existing 'ff' activity to Private Sunset Dolphin Cruise")

        for adata in ACTIVITIES_DATA:
            dslug = adata["destination_slug"]
            if dslug == "maldives" and existing_ff:
                continue
            dest = dest_map.get(dslug)
            if not dest:
                continue
            act = db.query(Activity).filter(Activity.name == adata["name"]).first()
            if not act:
                act = Activity(
                    destination_id=dest.id,
                    name=adata["name"],
                    category=adata["category"],
                    duration_minutes=adata["duration_minutes"],
                    price=adata["price"],
                    currency=adata["currency"],
                    status="active",
                    description=adata["description"],
                )
                db.add(act)
                db.flush()
                print(f"  Created activity: {act.name} for {dslug}")
            activity_map[dslug] = act

        print("\n5. Enriching 8 packages with itineraries, inclusions, exclusions, and hotels...")
        for pslug, pdata in PACKAGES_DATA.items():
            pkg = db.query(Package).filter(Package.slug == pslug).first()
            if not pkg:
                print(f"  Warning: package {pslug} not found")
                continue

            pkg.inclusions_json = pdata["inclusions"]
            pkg.exclusions_json = pdata["exclusions"]
            pkg.child_price = pdata["child_price"]
            pkg.infant_price = pdata["infant_price"]
            pkg.single_room_supplement = pdata["single_room_supplement"]
            pkg.booking_cutoff_days = pdata["booking_cutoff_days"]
            pkg.cancellation_policy = pdata["cancellation_policy"]
            pkg.is_published = True
            pkg.is_featured = True

            # Clear any old/test days and replace with authentic days
            # Notice: delete-orphan cascade on days
            db.query(PackageDay).filter(PackageDay.package_id == pkg.id).delete()
            db.flush()

            for d in pdata["days"]:
                day_obj = PackageDay(
                    package_id=pkg.id,
                    day_number=d["day_number"],
                    title=d["title"],
                    description=d["description"],
                    accommodation=d["accommodation"],
                    meals=d["meals"],
                    transportation=d["transportation"],
                )
                db.add(day_obj)

            # Link partner hotel
            dslug = pkg.destination.slug if pkg.destination else None
            if dslug and dslug in hotel_map:
                h = hotel_map[dslug]
                existing_ph = db.query(PackageHotel).filter(
                    PackageHotel.package_id == pkg.id,
                    PackageHotel.hotel_id == h.id
                ).first()
                if not existing_ph:
                    ph = PackageHotel(package_id=pkg.id, hotel_id=h.id)
                    db.add(ph)

            # Link activity
            if dslug and dslug in activity_map:
                act = activity_map[dslug]
                existing_pa = db.query(PackageActivity).filter(
                    PackageActivity.package_id == pkg.id,
                    PackageActivity.activity_id == act.id
                ).first()
                if not existing_pa:
                    pa = PackageActivity(package_id=pkg.id, activity_id=act.id)
                    db.add(pa)

            print(f"  Enriched package: {pkg.name} ({len(pdata['days'])} days, {len(pdata['inclusions'])} incs)")

        print("\n6. Ensuring group departures coverage...")
        # Check departures for Bali and Japan
        if bali_pkg:
            existing_dep = db.query(PackageDeparture).filter(PackageDeparture.package_id == bali_pkg.id).first()
            if not existing_dep:
                dep_bali = PackageDeparture(
                    package_id=bali_pkg.id,
                    departure_date=date(2026, 11, 20),
                    return_date=date(2026, 11, 26),
                    total_capacity=14,
                    available_capacity=6,
                    special_price=Decimal("45000.00"),
                    currency="INR",
                    status="open",
                )
                db.add(dep_bali)
                print("  Added open departure batch for Bali Cultural Odyssey")

        japan_pkg = db.query(Package).filter(Package.slug == "japan-imperial-heritage-cherry-blossom").first()
        if japan_pkg:
            existing_dep = db.query(PackageDeparture).filter(PackageDeparture.package_id == japan_pkg.id).first()
            if not existing_dep:
                dep_japan = PackageDeparture(
                    package_id=japan_pkg.id,
                    departure_date=date(2026, 12, 5),
                    return_date=date(2026, 12, 13),
                    total_capacity=12,
                    available_capacity=4,
                    special_price=Decimal("138000.00"),
                    currency="INR",
                    status="open",
                )
                db.add(dep_japan)
                print("  Added open departure batch for Japan Imperial Heritage")

        db.commit()
        print("\n=== ENRICHMENT COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_enrichment()
