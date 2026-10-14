"""Comprehensive database seeding script for KV Tours & Travels (Coimbatore).
Populates:
1. Standard user roles and super_admin (admin@kvtours.in).
2. South Indian Hill Stations & Spiritual Circuits Destinations (Ooty, Kodaikanal, Munnar, Wayanad, Coorg, Chikmagalur, Rameshwaram, Madurai, Kanyakumari, Mysore, Alleppey, Hampi, Pondicherry).
3. Rich Tour Packages with day-by-day itineraries, inclusions, exclusions, and pricing.
4. Hotels and Activities linked to packages.
5. Group Departures (dates in 2026/2027) with seat quotas.
6. Best Offers / promotional badges.
7. Fleet Services catalog & outstation cab tariffs in SiteSettings.
8. Chauffeur Cab add-on extras.
"""

from __future__ import annotations

import os
import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

# Ensure stdout uses UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure app is discoverable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.cli.bootstrap_admin import bootstrap_super_admin, seed_standard_roles
from app.db.session import get_session_factory
from app.models.catalog import (
    Activity,
    BestOffer,
    Destination,
    Hotel,
    Package,
    PackageActivity,
    PackageDeparture,
    PackageHotel,
    PackageDay,
)
from app.models.commerce import AddOn
from app.models.content import SiteSetting
from app.catalog_import.destinations_data import DESTINATIONS_DATA
from app.catalog_import.dest_part1 import DESTINATIONS_PART1

SOUTH_INDIAN_PACKAGES = [
    {
        "name": "Ooty & Nilgiris Heritage Tea Estate & Toy Train Escape",
        "slug": "ooty-tea-gardens-heritage-escape",
        "destination_slug": "ooty-nilgiris",
        "short_description": "Ascend from Coimbatore through 36 hairpin bends to colonial tea bungalows, Doddabetta Peak, and the UNESCO Mountain Railway.",
        "description": (
            "Experience the timeless grandeur of the Nilgiris with KV Tours & Travels. Starting with private chauffeur pickup directly from Coimbatore Airport or Railway Station, "
            "you will wind up scenic mountain roads to private colonial tea estate bungalows in Coonoor and Ooty. Ride the historic UNESCO Nilgiri Mountain Railway Toy Train, savor private tea tastings at century-old factories, "
            "and take serene rowboat rides on Pykara Lake."
        ),
        "base_price": Decimal("14500.00"),
        "currency": "INR",
        "duration_days": 3,
        "duration_nights": 2,
        "minimum_travellers": 1,
        "maximum_travellers": 16,
        "category": "Hill Stations",
        "travel_type": "Family & Honeymoon",
        "difficulty_level": "Easy",
        "departure_location": "Coimbatore Airport (CJB) / Railway Station",
        "cover_image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
        "inclusions": [
            "2 Nights in Heritage Tea Plantation Bungalow / 5★ Resort in Ooty",
            "Dedicated Private AC Chauffeur Cab (Coimbatore to Coimbatore)",
            "Pre-booked First Class Tickets on UNESCO Nilgiri Mountain Railway (Toy Train)",
            "Guided Artisanal White & Green Tea Tasting at Glendale Tea Factory",
            "Sightseeing at Doddabetta Peak, Botanical Garden, Rose Garden & Pykara Lake",
            "Daily Plantation Buffet Breakfasts & Chef-Curated Dinners",
        ],
        "exclusions": [
            "Flight or Train tickets to/from Coimbatore",
            "Speedboating charges at Pykara Lake",
            "Personal laundry, telephone calls and tips",
        ],
        "child_price": Decimal("7500.00"),
        "infant_price": Decimal("2500.00"),
        "single_room_supplement": Decimal("5500.00"),
        "booking_cutoff_days": 2,
        "cancellation_policy": "Full refund up to 7 days before journey. 50% refund up to 3 days. Non-refundable within 72 hours.",
        "seo_title": "Ooty Tour Package from Coimbatore with Toy Train | KV Tours",
        "seo_description": "Book a 3D/2N luxury tea estate tour to Ooty from Coimbatore featuring UNESCO Toy Train tickets, private chauffeur cab, and resort stay.",
        "days": [
            {
                "day_number": 1,
                "title": "Coimbatore to Ooty Ghat Drive & Tea Estate Welcome",
                "description": "Chauffeur pickup from Coimbatore Airport (CJB) or Coimbatore Junction. Drive past Mettupalayam and ascend the Nilgiri ghats. Check in to your colonial tea estate bungalow. Afternoon stroll through the Government Botanical Garden and boating on Ooty Lake.",
                "accommodation": "Savoy - IHCL SeleQtions / Tea Nest Heritage",
                "meals": "Dinner",
                "transportation": "Private AC Chauffeur Cab",
            },
            {
                "day_number": 2,
                "title": "Nilgiri Toy Train Journey & Doddabetta Mountain Summit",
                "description": "Board the world-famous UNESCO Nilgiri Mountain Railway toy train from Ooty to Coonoor crossing tunnels and viaducts. Visit Sim's Park and Dolphin's Nose viewpoint. Ascend to Doddabetta Peak (2,637m) for panoramic 360-degree views of the Mysore plateau and Coimbatore plains.",
                "accommodation": "Savoy - IHCL SeleQtions / Tea Nest Heritage",
                "meals": "Breakfast & Dinner",
                "transportation": "Toy Train & Private Cab",
            },
            {
                "day_number": 3,
                "title": "Pykara Waterfalls, Pine Forest Walk & Coimbatore Drop",
                "description": "After breakfast, drive through scenic shola forests to Pykara Waterfalls and Lake. Walk amidst towering deodar pine trees at the Shooting Point. Descend smoothly down the ghat road with drop-off at Coimbatore Airport or Railway Station.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC Chauffeur Cab to Coimbatore",
            },
        ],
        "departures": [
            {"start_date": date(2026, 11, 6), "end_date": date(2026, 11, 8), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 11, 20), "end_date": date(2026, 11, 22), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 12, 4), "end_date": date(2026, 12, 6), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 12, 24), "end_date": date(2026, 12, 26), "capacity": 16, "status": "open"},
            {"start_date": date(2027, 1, 15), "end_date": date(2027, 1, 17), "capacity": 16, "status": "open"},
        ],
    },
    {
        "name": "Kodaikanal Misty Cliffs, Lake Boating & Pine Valley Retreat",
        "slug": "kodaikanal-misty-cliffs-pine-retreat",
        "destination_slug": "kodaikanal",
        "short_description": "Escape to the Princess of Hill Stations with Coaker's Walk, Pillar Rocks, scenic star lake boating, and pine woods.",
        "description": (
            "Perched in the Palani Hills 170 km from Coimbatore, Kodaikanal is Tamil Nadu's tranquil haven of mist, pine scents, and cascading waterfalls. "
            "Our private itinerary includes chauffeur pickup from Coimbatore, valley-view luxury suites, horse riding along the star-shaped Kodai Lake, "
            "and peaceful walks along Coaker's Walk overlooking the plains."
        ),
        "base_price": Decimal("13800.00"),
        "currency": "INR",
        "duration_days": 3,
        "duration_nights": 2,
        "minimum_travellers": 1,
        "maximum_travellers": 16,
        "category": "Hill Stations",
        "travel_type": "Honeymoon & Leisure",
        "difficulty_level": "Easy",
        "departure_location": "Coimbatore Airport / Railway Station",
        "cover_image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        "inclusions": [
            "2 Nights in Luxury Valley View Resort (The Tamara Kodai / Carlton)",
            "Chauffeured Private AC Vehicle throughout from Coimbatore",
            "Coaker's Walk, Pillar Rocks, Guna Caves & Green Valley View Excursion",
            "Shikara Boating & Cycling experience around Star-shaped Kodai Lake",
            "Daily Breakfasts and Candlelight Dinner for Couples",
        ],
        "exclusions": ["Air/Train fares to Coimbatore", "Horse riding and personal camera tickets"],
        "child_price": Decimal("6800.00"),
        "infant_price": Decimal("2000.00"),
        "single_room_supplement": Decimal("5000.00"),
        "booking_cutoff_days": 2,
        "cancellation_policy": "Full refund up to 7 days before trip. 50% refund up to 3 days. Non-refundable within 72 hours.",
        "seo_title": "Kodaikanal Tour Packages from Coimbatore | KV Tours",
        "seo_description": "Plan your Kodaikanal holiday from Coimbatore with luxury resort stay, private cab, and scenic sightseeing.",
        "days": [
            {
                "day_number": 1,
                "title": "Coimbatore to Kodaikanal Ghat Drive & Evening Lakeside Stroll",
                "description": "Chauffeur pickup in Coimbatore. Drive past Dharapuram and Palani hills ascending to Kodaikanal. Check in to your resort. Enjoy an evening bicycle ride or Shikara boating around the star-shaped Kodai Lake.",
                "accommodation": "The Tamara Kodai / The Carlton",
                "meals": "Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 2,
                "title": "Pillar Rocks, Coaker's Walk & Misty Pine Woods",
                "description": "Morning cliffside stroll along Coaker's Walk with views reaching the temple plains below. Visit the dramatic Pillar Rocks granite cliffs, Green Valley View, and the eerie pine forest groves featured in movies.",
                "accommodation": "The Tamara Kodai / The Carlton",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 3,
                "title": "Silver Cascade Waterfalls & Return to Coimbatore",
                "description": "Visit Bryant Park's rose terraces and take a final stop at Silver Cascade Waterfalls before descending the Palani Ghat road for your evening drop in Coimbatore.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC Cab to Coimbatore",
            },
        ],
        "departures": [
            {"start_date": date(2026, 11, 13), "end_date": date(2026, 11, 15), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 11, 27), "end_date": date(2026, 11, 29), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 12, 11), "end_date": date(2026, 12, 13), "capacity": 16, "status": "open"},
        ],
    },
    {
        "name": "Munnar & Alleppey — Tea Highlands to Backwater Houseboat Odyssey",
        "slug": "munnar-alleppey-hills-and-houseboat",
        "destination_slug": "munnar-tea-highlands",
        "short_description": "The quintessential God's Own Country circuit combining misty tea carpet hills of Munnar with a private luxury houseboat in Alleppey.",
        "description": (
            "Explore the twin jewels of Kerala. Start from Coimbatore or Kochi with private chauffeur transport, ascending through Cardamom Hills to Munnar's rolling tea plantations. "
            "Spot the endangered Nilgiri Tahr at Eravikulam National Park, then journey down to the palm-fringed backwaters of Alleppey for an overnight cruise aboard a private air-conditioned luxury houseboat."
        ),
        "base_price": Decimal("26500.00"),
        "currency": "INR",
        "duration_days": 5,
        "duration_nights": 4,
        "minimum_travellers": 1,
        "maximum_travellers": 14,
        "category": "Hill & Backwaters",
        "travel_type": "Romantic & Family",
        "difficulty_level": "Easy",
        "departure_location": "Coimbatore / Kochi",
        "cover_image_url": "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80",
        "inclusions": [
            "2 Nights at 5★ Windermere Estate / Fragrant Nature Munnar",
            "1 Night at Spice Village Thekkady / Periyar Wildlife Reserve",
            "1 Night in Private Luxury AC Houseboat on Alleppey Vembanad Lake",
            "Private Dedicated AC SUV (Innova / Ertiga) throughout the entire circuit",
            "All Meals on Houseboat (Traditional Kerala Karimeen Fry & Sadya)",
            "Eravikulam National Park Safari & Periyar Lake Boat Cruise",
        ],
        "exclusions": ["Airfare/Train tickets", "Ayurvedic massage therapies", "Personal expenses"],
        "child_price": Decimal("13500.00"),
        "infant_price": Decimal("4000.00"),
        "single_room_supplement": Decimal("9500.00"),
        "booking_cutoff_days": 3,
        "cancellation_policy": "Full refund up to 10 days before journey. 50% refund up to 5 days. Non-refundable within 5 days.",
        "seo_title": "Munnar & Alleppey Tour Package from Coimbatore | KV Tours",
        "seo_description": "Book a 5D/4N luxury Kerala holiday from Coimbatore: Munnar tea estates, Thekkady wildlife, and private Alleppey houseboat.",
        "days": [
            {
                "day_number": 1,
                "title": "Coimbatore to Munnar Scenic Ghat Drive via Marayoor",
                "description": "Chauffeur pickup from Coimbatore. Drive via Pollachi, Udumalpet, and the ancient sandalwood forests of Marayoor with scenic Cheeyappara and Valara waterfalls. Check in to luxury plantation estate in Munnar.",
                "accommodation": "Windermere Estate / Fragrant Nature Munnar",
                "meals": "Dinner",
                "transportation": "Private AC SUV",
            },
            {
                "day_number": 2,
                "title": "Eravikulam National Park, Tea Museum & Mattupetty Dam",
                "description": "Morning safari at Eravikulam National Park (Rajamalai) amidst blooming kurinji shrubs and mountain goats. Visit Tata Tea Museum, Echo Point, and take a motorboat ride on Mattupetty Dam reservoir.",
                "accommodation": "Windermere Estate / Fragrant Nature Munnar",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC SUV",
            },
            {
                "day_number": 3,
                "title": "Munnar to Thekkady Periyar Wildlife Reserve",
                "description": "Drive through the Cardamom Hills to Thekkady. Take a guided spice plantation walk discovering cardamom, pepper, and cinnamon. Evening Periyar Lake wildlife cruise watching wild elephants and bison herds.",
                "accommodation": "Spice Village / Elephant Court Thekkady",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC SUV",
            },
            {
                "day_number": 4,
                "title": "Transfer to Alleppey & Private Luxury Houseboat Cruise",
                "description": "Descend to Alleppey (Alappuzha) and board your private luxury Kettuvallam houseboat. Cruise through scenic canals, past paddy fields and village church towers. Enjoy freshly prepared Kerala feast on board.",
                "accommodation": "Private AC Luxury Houseboat",
                "meals": "Breakfast, Traditional Kerala Lunch, Evening Tea & Dinner",
                "transportation": "Private AC SUV & Houseboat",
            },
            {
                "day_number": 5,
                "title": "Morning Village Sunrise Cruise & Departure Drop",
                "description": "Savor sunrise over tranquil backwaters with hot appam and stew. Disembark at 9:30 AM with private chauffeur transfer to Kochi Airport (COK) or return to Coimbatore.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC SUV to Airport",
            },
        ],
        "departures": [
            {"start_date": date(2026, 11, 10), "end_date": date(2026, 11, 14), "capacity": 14, "status": "open"},
            {"start_date": date(2026, 11, 24), "end_date": date(2026, 11, 28), "capacity": 14, "status": "open"},
            {"start_date": date(2026, 12, 8), "end_date": date(2026, 12, 12), "capacity": 14, "status": "open"},
            {"start_date": date(2026, 12, 22), "end_date": date(2026, 12, 26), "capacity": 14, "status": "open"},
        ],
    },
    {
        "name": "Wayanad Rainforests, Chembra Peak & Treehouse Wilderness",
        "slug": "wayanad-rainforest-treehouse-trek",
        "destination_slug": "wayanad-rainforests",
        "short_description": "Immerse in the misty rainforests of Wayanad with treehouse stays, heart-shaped Chembra Lake trek, and Edakkal prehistoric caves.",
        "description": (
            "Explore the pristine biodiversity of Wayanad nestled in the Western Ghats just 180 km from Coimbatore. Stay in a luxury treehouse nestled inside lush coffee and cardamom canopy, "
            "trek up to the legendary heart-shaped lake on Chembra Peak, explore 6,000-year-old Neolithic petroglyphs inside Edakkal Caves, and ride bamboo rafts across Kuruva Island."
        ),
        "base_price": Decimal("15500.00"),
        "currency": "INR",
        "duration_days": 3,
        "duration_nights": 2,
        "minimum_travellers": 1,
        "maximum_travellers": 16,
        "category": "Rainforest & Adventure",
        "travel_type": "Nature & Adventure",
        "difficulty_level": "Moderate",
        "departure_location": "Coimbatore / Kozhikode",
        "cover_image_url": "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=80",
        "inclusions": [
            "2 Nights in Luxury Rainforest Treehouse / Plantation Villa at Vythiri Resort",
            "Dedicated Private AC Chauffeur Cab (Coimbatore to Wayanad and return)",
            "Chembra Peak Guided Trek Permit and Heart Lake Hike",
            "Edakkal Caves Entry & Prehistoric Rock Petroglyph Tour",
            "Banasura Sagar Earth Dam Speedboat Excursion",
            "Daily Breakfasts and Traditional Kerala Plantation Dinners",
        ],
        "exclusions": ["Airfare/Train tickets", "Personal trekking gear", "Zip line and adventure activity charges"],
        "child_price": Decimal("7800.00"),
        "infant_price": Decimal("2500.00"),
        "single_room_supplement": Decimal("5800.00"),
        "booking_cutoff_days": 2,
        "cancellation_policy": "Full refund up to 7 days before trip. 50% refund up to 3 days. Non-refundable within 72 hours.",
        "seo_title": "Wayanad Tour Packages from Coimbatore | KV Tours",
        "seo_description": "Experience luxury treehouse stays, Chembra peak treks, and Edakkal caves in Wayanad with KV Tours & Travels Coimbatore.",
        "days": [
            {
                "day_number": 1,
                "title": "Coimbatore to Wayanad via Palakkad & Rainforest Check-in",
                "description": "Chauffeur pickup in Coimbatore. Drive through Palakkad gap and ascend the 9 hairpin curves of Thamarassery Churam with mist-covered valley views. Check into your luxury treehouse. Evening guided plantation walk.",
                "accommodation": "Vythiri Resort / Windflower Resort Wayanad",
                "meals": "Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 2,
                "title": "Chembra Peak Trek & Edakkal Prehistoric Caves",
                "description": "Early morning trek through tea gardens up to the natural heart-shaped lake ('Hridaya Saras') on Chembra Peak. Afternoon visit to Edakkal Caves to admire Stone Age rock carvings dating back to 6,000 BCE.",
                "accommodation": "Vythiri Resort / Windflower Resort Wayanad",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 3,
                "title": "Banasura Sagar Dam Speedboating & Return to Coimbatore",
                "description": "Visit India's largest earth dam, Banasura Sagar, set against misty mountain islands with thrilling speedboating. Return smoothly across the Western Ghats to Coimbatore Airport or Railway Station.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC Cab to Coimbatore",
            },
        ],
        "departures": [
            {"start_date": date(2026, 11, 7), "end_date": date(2026, 11, 9), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 11, 21), "end_date": date(2026, 11, 23), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 12, 5), "end_date": date(2026, 12, 7), "capacity": 16, "status": "open"},
        ],
    },
    {
        "name": "Coorg & Mysore — Royal Heritage & Scottish Highlands Coffee Trail",
        "slug": "coorg-mysore-royal-coffee-trail",
        "destination_slug": "coorg-coffee-country",
        "short_description": "Explore the City of Palaces and the Scotland of India with illuminated Mysore Palace, Dubare Elephant Camp, and coffee estates.",
        "description": (
            "A seamless 4-day royal and highland journey connecting the royal Wadiyar heritage of Mysore with the rolling coffee estates of Coorg (Kodagu). "
            "Witness the golden illumination of Mysore Palace with 100,000 light bulbs, bathe elephants in the Kaveri River at Dubare, "
            "visit the Namdroling Golden Temple in Bylakuppe, and stay on working private Arabica coffee plantations."
        ),
        "base_price": Decimal("21000.00"),
        "currency": "INR",
        "duration_days": 4,
        "duration_nights": 3,
        "minimum_travellers": 1,
        "maximum_travellers": 16,
        "category": "Heritage & Coffee",
        "travel_type": "Family & Leisure",
        "difficulty_level": "Easy",
        "departure_location": "Coimbatore / Mysore",
        "cover_image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
        "inclusions": [
            "1 Night at Lalitha Mahal Palace Hotel Mysore",
            "2 Nights at Heritage Coffee Plantation Resort in Madikeri / Virajpet (Evolve Back / Tamara)",
            "Chauffeured Dedicated AC Vehicle (Coimbatore - Mysore - Coorg - Coimbatore)",
            "VIP Guided Tour of Mysore Palace & Chamundeshwari Temple",
            "Dubare Elephant Camp interaction & Kaveri River Rafting",
            "Private Coffee Cupping and Processing Masterclass",
            "Daily Buffet Breakfasts & Gourmet Plantation Dinners",
        ],
        "exclusions": ["Airfare/Train tickets", "Alcoholic drinks", "Camera tickets inside palace"],
        "child_price": Decimal("10500.00"),
        "infant_price": Decimal("3500.00"),
        "single_room_supplement": Decimal("7500.00"),
        "booking_cutoff_days": 3,
        "cancellation_policy": "Full refund up to 7 days before journey. 50% refund up to 3 days. Non-refundable within 72 hours.",
        "seo_title": "Coorg & Mysore Tour Package from Coimbatore | KV Tours",
        "seo_description": "Explore Mysore Palace and Coorg coffee estates with private cab and luxury heritage resort stays from KV Tours Coimbatore.",
        "days": [
            {
                "day_number": 1,
                "title": "Coimbatore to Mysore via Sathyamangalam & Palace Illumination",
                "description": "Chauffeur pickup in Coimbatore. Drive through the verdant Sathyamangalam tiger corridor ghat road to Mysore. Visit Chamundeshwari Temple on Chamundi Hills. Evening visit to Mysore Palace to witness its dazzling illumination by 100,000 golden bulbs.",
                "accommodation": "Lalitha Mahal Palace / Radisson Blu Mysore",
                "meals": "Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 2,
                "title": "Bylakuppe Tibetan Golden Temple & Coorg Coffee Check-in",
                "description": "Explore the royal interiors of Mysore Palace before driving into Kodagu district. Stop at Bylakuppe, the largest Tibetan settlement in South India, to admire the towering golden Buddha statues at Namdroling Monastery. Check into your luxury coffee plantation sanctuary.",
                "accommodation": "Evolve Back Coorg / The Tamara Coorg",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 3,
                "title": "Dubare Elephant Camp & Abbey Waterfalls",
                "description": "Cross the Kaveri River to Dubare Elephant Camp for elephant bathing and feeding. Later, explore the cascading Abbey Falls surrounded by wild spice creepers and watch the sunset from Raja's Seat in Madikeri.",
                "accommodation": "Evolve Back Coorg / The Tamara Coorg",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 4,
                "title": "Coffee Cupping Workshop & Return to Coimbatore",
                "description": "Join the estate naturalist for an artisanal coffee cupping session tasting single-origin Arabica and Robusta brews. Enjoy a relaxed drive back through Gundlupet and Sathyamangalam to Coimbatore.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC Cab to Coimbatore",
            },
        ],
        "departures": [
            {"start_date": date(2026, 11, 12), "end_date": date(2026, 11, 15), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 11, 26), "end_date": date(2026, 11, 29), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 12, 17), "end_date": date(2026, 12, 20), "capacity": 16, "status": "open"},
        ],
    },
    {
        "name": "Rameshwaram & Madurai — Sacred Teertham & Temple Grandeur Circuit",
        "slug": "rameswaram-madurai-sacred-temples",
        "destination_slug": "rameswaram-dhanushkodi",
        "short_description": "A profound pilgrimage and heritage journey featuring Meenakshi Amman Temple, Pamban Sea Bridge, 22 teertham wells, and Dhanushkodi.",
        "description": (
            "Experience Tamil Nadu's spiritual soul with KV Tours & Travels. Traveling in private air-conditioned comfort from Coimbatore, "
            "marvel at the multi-colored towering gopurams of Meenakshi Amman Temple in Madurai. Cross the breathtaking Pamban Sea Bridge to Rameswaram Island, "
            "experience VIP guided darshan across the 22 sacred teertham wells in Ramanathaswamy Temple, and explore Dhanushkodi ghost town at India's southern tip."
        ),
        "base_price": Decimal("18500.00"),
        "currency": "INR",
        "duration_days": 4,
        "duration_nights": 3,
        "minimum_travellers": 1,
        "maximum_travellers": 16,
        "category": "Spiritual Circuit",
        "travel_type": "Pilgrimage & Heritage",
        "difficulty_level": "Easy",
        "departure_location": "Coimbatore Junction / Airport",
        "cover_image_url": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
        "inclusions": [
            "1 Night at Heritage Madurai / Courtyard by Marriott Madurai",
            "2 Nights at Daiwik Hotels Rameswaram",
            "Dedicated Chauffeur Driven AC Cab (Coimbatore to Coimbatore)",
            "VIP Darshan assistance at Meenakshi Amman Temple & Ramanathaswamy Temple",
            "Escorted 22 Sacred Teertham Bathing Ritual in Rameswaram",
            "Dhanushkodi Land's End & Arichal Munai Private Safari",
            "Daily Breakfasts and Traditional South Indian Vegetarian Dinners",
        ],
        "exclusions": ["Airfare/Train tickets", "Personal pooja materials", "Camera permits outside temples"],
        "child_price": Decimal("8500.00"),
        "infant_price": Decimal("2500.00"),
        "single_room_supplement": Decimal("6500.00"),
        "booking_cutoff_days": 2,
        "cancellation_policy": "Full refund up to 7 days before trip. 50% refund up to 3 days. Non-refundable within 72 hours.",
        "seo_title": "Madurai & Rameshwaram Tour Package from Coimbatore | KV Tours",
        "seo_description": "Complete spiritual pilgrimage to Madurai Meenakshi Temple and Rameshwaram 22 Teerthams from Coimbatore with KV Tours & Travels.",
        "days": [
            {
                "day_number": 1,
                "title": "Coimbatore to Madurai Highway Drive & Thirumalai Nayakkar Palace",
                "description": "Chauffeur pickup in Coimbatore. Drive along smooth 4-lane highway to the ancient city of Madurai. Visit the 17th-century Thirumalai Nayakkar Mahal with its massive white pillars. Evening visit to witness the 9:00 PM silver palanquin procession inside Meenakshi Temple.",
                "accommodation": "Heritage Madurai / Courtyard by Marriott",
                "meals": "Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 2,
                "title": "Meenakshi Amman VIP Darshan & Pamban Sea Bridge to Rameshwaram",
                "description": "Early morning VIP darshan at the sanctum of Meenakshi Amman and Sundareswarar. Admire the Thousand Pillar Hall. Afternoon drive to Rameswaram crossing the engineering marvel of Pamban Bridge over turquoise waters.",
                "accommodation": "Daiwik Hotels Rameswaram",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 3,
                "title": "22 Sacred Teerthams, Ramanathaswamy Temple & Dhanushkodi Land's End",
                "description": "Dawn bathing ritual across the 22 holy water wells inside Ramanathaswamy Temple, followed by Shiva darshan and a walk down the world's longest sculpted pillared corridors. Afternoon excursion to Dhanushkodi ghost town, ruined churches, and Arichal Munai where two oceans meet.",
                "accommodation": "Daiwik Hotels Rameswaram",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 4,
                "title": "Dr. APJ Abdul Kalam Memorial & Return to Coimbatore",
                "description": "Visit the inspiring national memorial of former President Dr. APJ Abdul Kalam. Enjoy traditional Chettinad/Madurai lunch on the return highway drive back to Coimbatore Airport or Railway Station.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC Cab to Coimbatore",
            },
        ],
        "departures": [
            {"start_date": date(2026, 11, 5), "end_date": date(2026, 11, 8), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 11, 19), "end_date": date(2026, 11, 22), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 12, 10), "end_date": date(2026, 12, 13), "capacity": 16, "status": "open"},
            {"start_date": date(2027, 1, 14), "end_date": date(2027, 1, 17), "capacity": 16, "status": "open"},
        ],
    },
    {
        "name": "Kanyakumari, Madurai & Rameshwaram — Grand Tamil Nadu Spiritual Odyssey",
        "slug": "kanyakumari-madurai-rameswaram-grand-circuit",
        "destination_slug": "kanyakumari-cape-comorin",
        "short_description": "The complete spiritual and coastal circuit covering Madurai Meenakshi Temple, Rameshwaram, and the three-sea confluence at Cape Comorin.",
        "description": (
            "Journey from Coimbatore to the southernmost tip of mainland India. Pay homage at Meenakshi Amman Temple in Madurai, "
            "bathe in the sacred wells of Rameshwaram, and travel to Kanyakumari where the Bay of Bengal, Arabian Sea, and Indian Ocean meet. "
            "Take the ocean ferry to Vivekananda Rock Memorial and watch spectacular sunrises and sunsets over the endless ocean horizon."
        ),
        "base_price": Decimal("24000.00"),
        "currency": "INR",
        "duration_days": 5,
        "duration_nights": 4,
        "minimum_travellers": 1,
        "maximum_travellers": 16,
        "category": "Spiritual Circuit",
        "travel_type": "Heritage & Coastal",
        "difficulty_level": "Easy",
        "departure_location": "Coimbatore / Madurai",
        "cover_image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        "inclusions": [
            "1 Night at Heritage Madurai",
            "2 Nights at Daiwik Hotels Rameswaram",
            "1 Night at Sparsa Resort / Annai Resorts Kanyakumari",
            "Dedicated AC Chauffeur Vehicle throughout from Coimbatore",
            "VIP Darshan in Madurai Meenakshi Temple and Rameshwaram",
            "Vivekananda Rock Memorial Mid-Sea Ferry Tickets",
            "Daily Breakfasts and Traditional Multi-Course Dinners",
        ],
        "exclusions": ["Airfare/Train tickets", "Personal tips and ritual fees"],
        "child_price": Decimal("11500.00"),
        "infant_price": Decimal("3500.00"),
        "single_room_supplement": Decimal("8500.00"),
        "booking_cutoff_days": 3,
        "cancellation_policy": "Full refund up to 10 days before trip. 50% refund up to 5 days. Non-refundable within 5 days.",
        "seo_title": "Madurai Rameshwaram Kanyakumari Tour Package from Coimbatore | KV Tours",
        "seo_description": "Comprehensive 5D/4N Tamil Nadu pilgrimage covering Madurai, Rameshwaram, and Kanyakumari with private chauffeur cab from Coimbatore.",
        "days": [
            {
                "day_number": 1,
                "title": "Coimbatore to Madurai Highway & Meenakshi Darshan",
                "description": "Morning pickup in Coimbatore. Drive to Madurai. Check in to heritage hotel. Evening VIP darshan at Meenakshi Amman Temple admiring the soaring gopurams and golden lotus pond.",
                "accommodation": "Heritage Madurai",
                "meals": "Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 2,
                "title": "Madurai to Rameshwaram via Pamban Sea Bridge",
                "description": "Drive across southern Tamil Nadu to Pamban Island. Stop at Pamban rail-sea bridge. Check into hotel and attend evening pooja inside Ramanathaswamy Temple.",
                "accommodation": "Daiwik Hotels Rameswaram",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 3,
                "title": "22 Teerthams, Dhanushkodi & Coastal Drive to Kanyakumari",
                "description": "Morning 22 sacred teertham bathing ritual and temple darshan. Excursion to Dhanushkodi ghost town. Afternoon drive south along the coastal road to Kanyakumari, reaching in time for the dramatic ocean sunset.",
                "accommodation": "Sparsa Resort Kanyakumari",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 4,
                "title": "Triveni Sangam Sunrise & Vivekananda Rock Memorial",
                "description": "Witness the spectacular sunrise over the confluence of three oceans at Triveni Sangam. Take the state ferry to Vivekananda Rock Memorial and admire the 133-foot Thiruvalluvar Statue. Visit Kanyakumari Bhagavathi Amman Temple and Gandhi Memorial.",
                "accommodation": "Sparsa Resort Kanyakumari",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC Cab & Ferry",
            },
            {
                "day_number": 5,
                "title": "Suchindram Temple & Return Highway Drive to Coimbatore",
                "description": "Visit the magnificent 17th-century Suchindram Thanumalayan Temple with its 18-foot monolithic Hanuman and musical stone pillars. Return smoothly along NH44 to Coimbatore Airport or Railway Station.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC Cab to Coimbatore",
            },
        ],
        "departures": [
            {"start_date": date(2026, 11, 8), "end_date": date(2026, 11, 12), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 11, 22), "end_date": date(2026, 11, 26), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 12, 13), "end_date": date(2026, 12, 17), "capacity": 16, "status": "open"},
        ],
    },
    {
        "name": "Chikmagalur Peak Trek & Colonial Coffee Estate Getaway",
        "slug": "chikmagalur-mullayanagiri-estate-stay",
        "destination_slug": "chikmagalur-western-ghats",
        "short_description": "Ascend Karnataka's highest peak Mullayanagiri, trek to Hebbe waterfalls, and unwind on historic 17th-century coffee estates.",
        "description": (
            "Discover the birthplace of Indian coffee nestled in the Baba Budan Giri hills of the Western Ghats. "
            "Climb the 500 stone steps to Mullayanagiri summit (1,930m) for cloud inversions, take thrilling 4x4 open jeep trails to Hebbe Falls, "
            "and sleep inside heritage wood-and-stone bungalows on secluded coffee plantations."
        ),
        "base_price": Decimal("14000.00"),
        "currency": "INR",
        "duration_days": 3,
        "duration_nights": 2,
        "minimum_travellers": 1,
        "maximum_travellers": 14,
        "category": "Hill Stations",
        "travel_type": "Trekking & Coffee",
        "difficulty_level": "Moderate",
        "departure_location": "Coimbatore / Bengaluru",
        "cover_image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
        "inclusions": [
            "2 Nights at The Serai Chikmagalur / Java Rain Luxury Coffee Resort",
            "Dedicated AC Chauffeur Cab (Coimbatore to Chikmagalur and return)",
            "4x4 Jeep Excursion to Jhari / Hebbe Buttermilk Waterfalls",
            "Guided Trek to Mullayanagiri & Baba Budangiri Ridges",
            "Estate Coffee Cupping & Plantation History Walk",
            "Daily Plantation Breakfasts & Malnad Specialty Dinners",
        ],
        "exclusions": ["Airfare/Train tickets", "Personal trekking shoes/poles"],
        "child_price": Decimal("7000.00"),
        "infant_price": Decimal("2200.00"),
        "single_room_supplement": Decimal("5200.00"),
        "booking_cutoff_days": 2,
        "cancellation_policy": "Full refund up to 7 days before journey. 50% refund up to 3 days. Non-refundable within 72 hours.",
        "seo_title": "Chikmagalur Tour Package from Coimbatore | KV Tours",
        "seo_description": "Trek Mullayanagiri and stay in luxury coffee estates in Chikmagalur with private chauffeur from KV Tours Coimbatore.",
        "days": [
            {
                "day_number": 1,
                "title": "Coimbatore to Chikmagalur via Hassan Highway & Coffee Estate Welcome",
                "description": "Chauffeur pickup in Coimbatore. Drive past Hassan and Belur into the lush coffee hills of Chikmagalur. Check in to luxury plantation estate. Evening walk amidst flowering coffee shrubs and bonfire dinner.",
                "accommodation": "The Serai Chikmagalur / Java Rain Resort",
                "meals": "Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 2,
                "title": "Mullayanagiri Peak Trek & 4x4 Jeep Safari to Jhari Falls",
                "description": "Early morning drive and trek to the summit of Mullayanagiri (1,930m) to witness ocean-like clouds rolling over the valley. Afternoon 4x4 open jeep ride down bumpy forest tracks to the cascading Jhari (Buttermilk) Falls.",
                "accommodation": "The Serai Chikmagalur / Java Rain Resort",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC Cab & 4x4 Jeep",
            },
            {
                "day_number": 3,
                "title": "Coffee Yatra Museum & Scenic Return Drive to Coimbatore",
                "description": "Visit the Coffee Yatra Museum to learn about roasting, curing, and cupping. Enjoy traditional Malnad lunch on the highway return drive to Coimbatore.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC Cab to Coimbatore",
            },
        ],
        "departures": [
            {"start_date": date(2026, 11, 14), "end_date": date(2026, 11, 16), "capacity": 14, "status": "open"},
            {"start_date": date(2026, 12, 12), "end_date": date(2026, 12, 14), "capacity": 14, "status": "open"},
        ],
    },
    {
        "name": "Pondicherry French Quarter & Auroville Coastal Retreat",
        "slug": "pondicherry-auroville-french-riviera-coastal",
        "destination_slug": "pondicherry-french-quarter",
        "short_description": "Stroll cobblestone boulevards of White Town, meditate at the golden Matrimandir in Auroville, and relax along seaside promenades.",
        "description": (
            "Experience the unique Indo-French coastal heritage of Pondicherry with KV Tours & Travels. Stroll through the charming colonial French Quarter "
            "with mustard-yellow villas, bougainvillea blossoms, and chic Parisian cafes. Visit the spiritual community of Auroville with its iconic golden sphere Matrimandir, "
            "and take a private boat to the pristine secluded sands of Paradise Beach."
        ),
        "base_price": Decimal("14200.00"),
        "currency": "INR",
        "duration_days": 3,
        "duration_nights": 2,
        "minimum_travellers": 1,
        "maximum_travellers": 16,
        "category": "Coastal & Heritage",
        "travel_type": "Leisure & Wellness",
        "difficulty_level": "Easy",
        "departure_location": "Coimbatore Junction / Airport",
        "cover_image_url": "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1200&q=80",
        "inclusions": [
            "2 Nights in Heritage French Boutique Hotel in White Town (Palais de Mahe / Dune de L'Orient)",
            "Dedicated AC Chauffeur Driven Cab (Coimbatore to Pondicherry and return)",
            "Auroville Guided Tour & Inner Peace Visitor Pass",
            "Heritage Walking Tour of French & Tamil Quarters",
            "Paradise Beach Speedboat Transfer Tickets",
            "Daily French Bakery Breakfasts & Creole Dinners",
        ],
        "exclusions": ["Airfare/Train tickets", "Scuba diving / surfing sessions at Serenity Beach"],
        "child_price": Decimal("7200.00"),
        "infant_price": Decimal("2200.00"),
        "single_room_supplement": Decimal("5200.00"),
        "booking_cutoff_days": 2,
        "cancellation_policy": "Full refund up to 7 days before trip. 50% refund up to 3 days. Non-refundable within 72 hours.",
        "seo_title": "Pondicherry Tour Package from Coimbatore | KV Tours",
        "seo_description": "Explore White Town and Auroville with luxury boutique hotel stay and private cab from KV Tours Coimbatore.",
        "days": [
            {
                "day_number": 1,
                "title": "Coimbatore to Pondicherry Drive & Promenade Beach Walk",
                "description": "Morning pickup in Coimbatore. Drive via Salem and Villupuram to Pondicherry. Check in to your boutique French villa. Evening stroll along Goubert Avenue (Promenade Beach) watching gentle waves against black volcanic rock seawalls.",
                "accommodation": "Palais de Mahe / Dune de L'Orient White Town",
                "meals": "Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 2,
                "title": "French Quarter Heritage Walk & Auroville Matrimandir",
                "description": "Morning guided heritage walk admiring arched doorways, colonial verandas, and Sri Aurobindo Ashram. Drive to Auroville international township to view the magnificent golden globe Matrimandir.",
                "accommodation": "Palais de Mahe / Dune de L'Orient White Town",
                "meals": "Breakfast & Dinner",
                "transportation": "Private AC Cab",
            },
            {
                "day_number": 3,
                "title": "Paradise Beach Boat Excursion & Return Drive to Coimbatore",
                "description": "Take a scenic boat ride through Chunnambar backwaters to the golden sands of Paradise Beach. Enjoy fresh wood-fired pizza and crepes before your highway drive back to Coimbatore.",
                "accommodation": "Checkout",
                "meals": "Breakfast",
                "transportation": "Private AC Cab to Coimbatore",
            },
        ],
        "departures": [
            {"start_date": date(2026, 11, 20), "end_date": date(2026, 11, 22), "capacity": 16, "status": "open"},
            {"start_date": date(2026, 12, 18), "end_date": date(2026, 12, 20), "capacity": 16, "status": "open"},
        ],
    },
]

HOTELS_TO_SEED = [
    {
        "destination_slug": "ooty-nilgiris",
        "name": "Savoy - IHCL SeleQtions Ooty",
        "star_rating": 5,
        "address": "77 Sylks Road, Ooty, Tamil Nadu 643001",
        "description": "Historic 19th-century colonial heritage hotel set amidst 6 acres of landscaped gardens with fireplace rooms and afternoon high tea.",
    },
    {
        "destination_slug": "kodaikanal",
        "name": "The Tamara Kodai",
        "star_rating": 5,
        "address": "St. Mary's Road, Kodaikanal, Tamil Nadu 624101",
        "description": "Luxury heritage resort in the Palani hills featuring heated outdoor pool, French-inspired architecture, and panoramic valley views.",
    },
    {
        "destination_slug": "munnar-tea-highlands",
        "name": "Windermere Estate Munnar",
        "star_rating": 5,
        "address": "Pothamedu, Munnar, Kerala 685612",
        "description": "Boutique coffee and cardamom plantation retreat set on high cliff slopes overlooking endless tea valleys.",
    },
    {
        "destination_slug": "wayanad-rainforests",
        "name": "Vythiri Village Resort Wayanad",
        "star_rating": 5,
        "address": "NH-212, Vythiri, Wayanad, Kerala 673576",
        "description": "Eco-luxury sanctuary set deep inside Wayanad rainforests featuring authentic treehouses, natural streams, and Ayurvedic wellness.",
    },
    {
        "destination_slug": "coorg-coffee-country",
        "name": "Evolve Back Coorg",
        "star_rating": 5,
        "address": "Karadigodu Post, Siddapur, Coorg, Karnataka 571253",
        "description": "Premier 300-acre working coffee and spice plantation resort with private pool villas inspired by Kodava architecture.",
    },
    {
        "destination_slug": "chikmagalur-western-ghats",
        "name": "The Serai Chikmagalur",
        "star_rating": 5,
        "address": "Mugthihalli Post, KM Road, Chikmagalur, Karnataka 577133",
        "description": "Ultra-luxury coffee plantation retreat featuring private pool villas nestled inside shaded Arabica bean orchards.",
    },
    {
        "destination_slug": "rameswaram-dhanushkodi",
        "name": "Daiwik Hotels Rameswaram",
        "star_rating": 4,
        "address": "NH 49, Near Railway Station, Rameswaram, Tamil Nadu 623526",
        "description": "Pilgrim hospitality hotel providing specialized pooja assistance, pure vegetarian dining, and guided teertham tours.",
    },
    {
        "destination_slug": "madurai-temple-city",
        "name": "Heritage Madurai",
        "star_rating": 5,
        "address": "11 Kochadai, Melakkal Main Road, Madurai, Tamil Nadu 625016",
        "description": "Colonial resort designed by legendary architect Geoffrey Bawa featuring private plunge pool villas and 100-year-old banyan trees.",
    },
    {
        "destination_slug": "kanyakumari-cape-comorin",
        "name": "Sparsa Resort Kanyakumari",
        "star_rating": 4,
        "address": "6/112B Beach Road, Kanyakumari, Tamil Nadu 629702",
        "description": "Oceanfront luxury eco-resort overlooking the meeting of three seas with private sunrise viewpoints.",
    },
    {
        "destination_slug": "mysore-royal-heritage",
        "name": "Lalitha Mahal Palace Hotel Mysore",
        "star_rating": 5,
        "address": "Lalitha Mahal Nagar, Mysore, Karnataka 570011",
        "description": "Majestic Italianate palace built in 1921 by Maharaja of Mysore featuring crystal chandeliers, ballroom, and royal suites.",
    },
    {
        "destination_slug": "pondicherry-french-quarter",
        "name": "Palais de Mahe - CGH Earth Pondicherry",
        "star_rating": 5,
        "address": "Bussy Street, White Town, Puducherry 605001",
        "description": "French colonial boutique hotel in the heart of White Town with sun-drenched courtyards, deep verandas, and high ceilings.",
    },
]

ACTIVITIES_TO_SEED = [
    {
        "destination_slug": "ooty-nilgiris",
        "name": "Nilgiri Mountain Railway First-Class Toy Train Ride",
        "category": "UNESCO Heritage",
        "duration_minutes": 150,
        "price": Decimal("850.00"),
        "currency": "INR",
        "description": "Historic steam-hauled metre-gauge train journey crossing deep valleys and waterfalls between Ooty and Coonoor.",
    },
    {
        "destination_slug": "kodaikanal",
        "name": "Kodai Star Lake Shikara Boating & Coaker's Walk Tour",
        "category": "Scenic Excursion",
        "duration_minutes": 120,
        "price": Decimal("650.00"),
        "currency": "INR",
        "description": "Relaxing boat cruise on Kodaikanal's star-shaped lake followed by cliffside walk with views of the southern plains.",
    },
    {
        "destination_slug": "munnar-tea-highlands",
        "name": "Eravikulam National Park Nilgiri Tahr Safari",
        "category": "Wildlife Safari",
        "duration_minutes": 180,
        "price": Decimal("1200.00"),
        "currency": "INR",
        "description": "High-altitude safari in Rajamalai to observe the endangered mountain goat and panoramic views of Anamudi peak.",
    },
    {
        "destination_slug": "wayanad-rainforests",
        "name": "Chembra Peak Heart-Shaped Lake Trek",
        "category": "Mountain Trekking",
        "duration_minutes": 240,
        "price": Decimal("1100.00"),
        "currency": "INR",
        "description": "Guided mountain hike up Chembra Peak to the perennial heart-shaped lake surrounded by shola grasslands.",
    },
    {
        "destination_slug": "coorg-coffee-country",
        "name": "Dubare Elephant Camp River Bathing & Interaction",
        "category": "Wildlife Encounter",
        "duration_minutes": 120,
        "price": Decimal("900.00"),
        "currency": "INR",
        "description": "Cross the Kaveri River by boat and participate in morning bathing and feeding of trained forest elephants.",
    },
    {
        "destination_slug": "chikmagalur-western-ghats",
        "name": "Mullayanagiri Peak & Jhari Falls 4x4 Jeep Safari",
        "category": "Off-Road Adventure",
        "duration_minutes": 210,
        "price": Decimal("1500.00"),
        "currency": "INR",
        "description": "Climb Karnataka's highest peak followed by thrilling 4x4 open jeep ride down bumpy estate trails to Jhari Falls.",
    },
    {
        "destination_slug": "rameswaram-dhanushkodi",
        "name": "22 Sacred Teertham Wells Guided Bathing Escort",
        "category": "Sacred Ritual",
        "duration_minutes": 90,
        "price": Decimal("750.00"),
        "currency": "INR",
        "description": "Dedicated temple guide escorting your family smoothly through all 22 sacred teertham water wells in Ramanathaswamy Temple.",
    },
    {
        "destination_slug": "madurai-temple-city",
        "name": "Meenakshi Amman Temple VIP Darshan & Night Procession",
        "category": "Temple Heritage",
        "duration_minutes": 120,
        "price": Decimal("1000.00"),
        "currency": "INR",
        "description": "Special entry darshan at Meenakshi Amman Temple followed by witnessing the 9:00 PM ceremonial silver palanquin procession.",
    },
    {
        "destination_slug": "kanyakumari-cape-comorin",
        "name": "Vivekananda Rock Memorial Mid-Sea Ferry & Sunset View",
        "category": "Island Monument",
        "duration_minutes": 120,
        "price": Decimal("500.00"),
        "currency": "INR",
        "description": "Ferry crossing to Vivekananda Rock Memorial and Thiruvalluvar Statue at the convergence of three oceans.",
    },
    {
        "destination_slug": "mysore-royal-heritage",
        "name": "Mysore Palace Golden Illumination VIP Experience",
        "category": "Royal Splendor",
        "duration_minutes": 90,
        "price": Decimal("800.00"),
        "currency": "INR",
        "description": "Evening palace tour and front-row seating to witness the exterior lit up by nearly 100,000 bulbs with brass band.",
    },
    {
        "destination_slug": "pondicherry-french-quarter",
        "name": "Auroville Matrimandir & White Town Heritage Walk",
        "category": "Cultural Heritage",
        "duration_minutes": 150,
        "price": Decimal("650.00"),
        "currency": "INR",
        "description": "Walking tour exploring the French and Tamil Quarters, colonial architecture, and the golden Matrimandir viewing point.",
    },
]

FLEET_CATALOG = {
    "vehicles": [
        {
            "id": "sedan-dzire",
            "name": "Maruti Suzuki Swift Dzire / Toyota Etios",
            "category": "Comfort Sedan",
            "passenger_capacity": 4,
            "luggage_capacity": "2 Large + 1 Small Bags",
            "ac_type": "Air Conditioned",
            "rate_per_km": 13,
            "min_km_per_day": 250,
            "driver_allowance_per_day": 400,
            "image_url": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
            "highlights": ["Clean & Sanitized", "Experienced Hill Drivers", "Mobile USB Charger", "Bottled Water"],
            "best_for": "Couples & Small Families (Up to 4 Pax)",
            "is_popular": True,
        },
        {
            "id": "suv-innova-crysta",
            "name": "Toyota Innova Crysta",
            "category": "Premium SUV",
            "passenger_capacity": 7,
            "luggage_capacity": "4 Large + 2 Small Bags",
            "ac_type": "Dual AC with Rear Vents",
            "rate_per_km": 19,
            "min_km_per_day": 250,
            "driver_allowance_per_day": 500,
            "image_url": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
            "highlights": ["Captain Seats Option", "Superior Hill Climb Power", "Extra Legroom & Recline", "First Aid Kit"],
            "best_for": "Family Trips & Hill Station Safaris (6-7 Pax)",
            "is_popular": True,
        },
        {
            "id": "mpv-innova-hycross",
            "name": "Toyota Innova Hycross Hybrid",
            "category": "Luxury MPV",
            "passenger_capacity": 6,
            "luggage_capacity": "4 Large Bags",
            "ac_type": "Multi-Zone Climate Control",
            "rate_per_km": 24,
            "min_km_per_day": 250,
            "driver_allowance_per_day": 600,
            "image_url": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
            "highlights": ["Ottoman Reclining Seats", "Panoramic Sunroof", "Silent Hybrid Cabin", "Wireless Charging"],
            "best_for": "VIP Guests & Executive Business Leisure (5-6 Pax)",
            "is_popular": False,
        },
        {
            "id": "van-urbania",
            "name": "Force Urbania Luxury Van",
            "category": "Executive Mini Coach",
            "passenger_capacity": 10,
            "luggage_capacity": "8 Large Bags",
            "ac_type": "Individual Aircraft-Style AC Vents",
            "rate_per_km": 30,
            "min_km_per_day": 300,
            "driver_allowance_per_day": 700,
            "image_url": "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
            "highlights": ["Individual Recliner Seats", "High Roof Full Standing Height", "LED Reading Lights", "USB at Every Seat"],
            "best_for": "Executive Group Tours & Pilgrimages (9-10 Pax)",
            "is_popular": True,
        },
        {
            "id": "coach-tempo-12",
            "name": "Force Tempo Traveller (12-Seater)",
            "category": "Tempo Traveller",
            "passenger_capacity": 12,
            "luggage_capacity": "10 Large Bags",
            "ac_type": "Dual AC",
            "rate_per_km": 26,
            "min_km_per_day": 300,
            "driver_allowance_per_day": 600,
            "image_url": "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
            "highlights": ["Pushback 2x1 Recliners", "Stereo Sound System", "Spacious Luggage Boot", "Curtained Windows"],
            "best_for": "Group Outings & Extended Family Vacations (10-12 Pax)",
            "is_popular": False,
        },
        {
            "id": "coach-tempo-17",
            "name": "Force Tempo Traveller (17-Seater)",
            "category": "Tempo Traveller",
            "passenger_capacity": 17,
            "luggage_capacity": "14 Large Bags",
            "ac_type": "Dual High-Capacity AC",
            "rate_per_km": 29,
            "min_km_per_day": 300,
            "driver_allowance_per_day": 700,
            "image_url": "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
            "highlights": ["Pushback Luxury Seating", "LED TV & Audio", "Ample Overhead Storage", "Uniformed Professional Chauffeur"],
            "best_for": "Large Pilgrimage Groups & College/Corporate Outings (13-17 Pax)",
            "is_popular": False,
        },
    ],
    "fixed_routes": [
        {
            "from_city": "Coimbatore",
            "to_destination": "Ooty & Coonoor",
            "distance_km": 88,
            "duration": "2.5 - 3 Hours",
            "route_description": "Scenic route via Mettupalayam, Kallar, and Coonoor ghat road with 36 hairpin bends.",
            "sedan_fare": 2800,
            "innova_fare": 4200,
            "hycross_fare": 5500,
            "tempo_fare": 6800,
            "is_popular": True,
        },
        {
            "from_city": "Coimbatore",
            "to_destination": "Kodaikanal",
            "distance_km": 175,
            "duration": "4.5 - 5 Hours",
            "route_description": "Smooth highway drive via Palladam, Dharapuram, and Palani Ghat road.",
            "sedan_fare": 4500,
            "innova_fare": 6500,
            "hycross_fare": 8000,
            "tempo_fare": 9500,
            "is_popular": True,
        },
        {
            "from_city": "Coimbatore",
            "to_destination": "Munnar",
            "distance_km": 160,
            "duration": "4.5 Hours",
            "route_description": "Scenic Western Ghats route via Pollachi, Udumalpet, and Marayoor sandalwood forests.",
            "sedan_fare": 4200,
            "innova_fare": 6200,
            "hycross_fare": 7800,
            "tempo_fare": 9200,
            "is_popular": True,
        },
        {
            "from_city": "Coimbatore",
            "to_destination": "Isha Yoga Centre (Same Day Round Trip)",
            "distance_km": 35,
            "duration": "1 Hour each way",
            "route_description": "Direct highway drive to Velliangiri foothills for Dhyanalinga & Adiyogi 112ft statue.",
            "sedan_fare": 1800,
            "innova_fare": 2800,
            "hycross_fare": 3600,
            "tempo_fare": 4500,
            "is_popular": True,
        },
        {
            "from_city": "Coimbatore",
            "to_destination": "Valparai & Sholayar Dam",
            "distance_km": 105,
            "duration": "3.5 Hours",
            "route_description": "Thrilling 40-hairpin curve climb through Anamalai Tiger Reserve tea estates.",
            "sedan_fare": 3800,
            "innova_fare": 5600,
            "hycross_fare": 7000,
            "tempo_fare": 8500,
            "is_popular": True,
        },
        {
            "from_city": "Coimbatore",
            "to_destination": "Madurai (One Way Drop / Round Trip)",
            "distance_km": 215,
            "duration": "3.5 - 4 Hours",
            "route_description": "Smooth 4-lane highway drive directly to Meenakshi Temple or Madurai Airport (IXM).",
            "sedan_fare": 4800,
            "innova_fare": 7200,
            "hycross_fare": 8900,
            "tempo_fare": 11000,
            "is_popular": True,
        },
        {
            "from_city": "Coimbatore",
            "to_destination": "Rameshwaram & Dhanushkodi",
            "distance_km": 370,
            "duration": "6.5 Hours",
            "route_description": "Direct route across Tamil Nadu crossing the famous Pamban Sea Bridge.",
            "sedan_fare": 7800,
            "innova_fare": 11500,
            "hycross_fare": 14000,
            "tempo_fare": 16500,
            "is_popular": False,
        },
        {
            "from_city": "Coimbatore Airport (CJB)",
            "to_destination": "Tiruppur / Erode Drop",
            "distance_km": 55,
            "duration": "1 - 1.5 Hours",
            "route_description": "Quick, punctual airport transfers for textile executives and business travellers.",
            "sedan_fare": 1600,
            "innova_fare": 2600,
            "hycross_fare": 3400,
            "tempo_fare": 4200,
            "is_popular": False,
        },
    ],
    "local_rental_packages": [
        {"package": "4 Hours / 40 KM Local", "sedan": 1200, "innova": 1800, "hycross": 2400, "tempo": 3000},
        {"package": "8 Hours / 80 KM Full Day", "sedan": 2200, "innova": 3200, "hycross": 4200, "tempo": 5200},
        {"package": "12 Hours / 120 KM Extended", "sedan": 3000, "innova": 4400, "hycross": 5800, "tempo": 7200},
    ],
}


def run_seed():
    print("==================================================================")
    print("KV TOURS & TRAVELS — COMPLETE LOCAL CATALOG SEEDER (COIMBATORE)")
    print("==================================================================")

    factory = get_session_factory()
    with factory() as db:
        # 1. Bootstrap Standard Roles & Super Admin
        print("\n1. Bootstrapping User Roles & Super Admin...")
        seed_standard_roles(db)
        bootstrap_super_admin(
            email="admin@kvtours.in",
            first_name="KV Tours",
            last_name="Administrator",
            password="Admin@123456",
            db=db,
        )
        print("  ✓ Super Admin ready: admin@kvtours.in")

        # 2. Seed All South Indian Destinations
        print("\n2. Seeding South Indian Destinations...")
        all_dests_data = list(DESTINATIONS_DATA)
        # Also include any from DESTINATIONS_PART1 not in DESTINATIONS_DATA
        existing_slugs = {d["slug"] for d in all_dests_data}
        for p1_dest in DESTINATIONS_PART1:
            if p1_dest["slug"] not in existing_slugs:
                all_dests_data.append(p1_dest)
                existing_slugs.add(p1_dest["slug"])

        dest_map: dict[str, Destination] = {}
        for ddata in all_dests_data:
            slug = ddata["slug"]
            dest = db.query(Destination).filter(Destination.slug == slug).first()
            if not dest:
                dest = Destination(
                    name=ddata["name"],
                    slug=slug,
                    country=ddata.get("country", "India"),
                    region=ddata.get("region"),
                    state_or_city=ddata.get("state_or_city"),
                    category=ddata.get("category", "Hill Stations"),
                    travel_type=ddata.get("travel_type", "Family Holidays"),
                    short_description=ddata.get("short_description"),
                    description=ddata.get("description"),
                    cover_image_url=ddata.get("cover_image_url"),
                    highlights_json=ddata.get("highlights", []),
                    travel_guide_json=ddata.get("travel_guide", {}),
                    faqs_json=ddata.get("faqs", []),
                    seo_title=ddata.get("seo_title", f"{ddata['name']} Tour Packages | KV Tours"),
                    seo_description=ddata.get("seo_description", f"Explore {ddata['name']} with KV Tours & Travels Coimbatore."),
                    is_featured=ddata.get("is_featured", True),
                    is_published=True,
                )
                db.add(dest)
                db.flush()
                print(f"  ✓ Created destination: {dest.name} ({dest.slug})")
            else:
                # Update with rich metadata if missing
                dest.highlights_json = ddata.get("highlights", dest.highlights_json)
                dest.travel_guide_json = ddata.get("travel_guide", dest.travel_guide_json)
                dest.faqs_json = ddata.get("faqs", dest.faqs_json)
                dest.is_published = True
                if ddata.get("is_featured") is not None:
                    dest.is_featured = ddata["is_featured"]
                print(f"  ✓ Synchronized destination: {dest.name} ({dest.slug})")
            dest_map[slug] = dest

        # 3. Seed Hotels
        print("\n3. Seeding Hotels...")
        for hdata in HOTELS_TO_SEED:
            dslug = hdata["destination_slug"]
            dest = dest_map.get(dslug)
            if not dest:
                continue
            hotel = db.query(Hotel).filter(Hotel.name == hdata["name"]).first()
            if not hotel:
                hotel = Hotel(
                    destination_id=dest.id,
                    name=hdata["name"],
                    star_rating=hdata["star_rating"],
                    address=hdata["address"],
                    description=hdata["description"],
                    is_active=True,
                )
                db.add(hotel)
                db.flush()
                print(f"  ✓ Created hotel: {hotel.name} for {dest.name}")

        # 4. Seed Activities
        print("\n4. Seeding Activities...")
        for adata in ACTIVITIES_TO_SEED:
            dslug = adata["destination_slug"]
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
                    description=adata["description"],
                    status="active",
                )
                db.add(act)
                db.flush()
                print(f"  ✓ Created activity: {act.name} for {dest.name}")

        # 5. Seed South Indian Tour Packages
        print("\n5. Seeding South Indian Tour Packages...")
        for pdata in SOUTH_INDIAN_PACKAGES:
            dslug = pdata["destination_slug"]
            dest = dest_map.get(dslug)
            if not dest:
                print(f"  ⚠️ Destination {dslug} not found for package {pdata['name']}, skipping...")
                continue

            pkg_slug = pdata["slug"]
            pkg = db.query(Package).filter(Package.slug == pkg_slug).first()
            if not pkg:
                pkg = Package(
                    destination_id=dest.id,
                    name=pdata["name"],
                    slug=pkg_slug,
                    short_description=pdata["short_description"],
                    description=pdata["description"],
                    base_price=pdata["base_price"],
                    currency=pdata["currency"],
                    duration_days=pdata["duration_days"],
                    duration_nights=pdata["duration_nights"],
                    minimum_travellers=pdata["minimum_travellers"],
                    maximum_travellers=pdata["maximum_travellers"],
                    category=pdata["category"],
                    travel_type=pdata["travel_type"],
                    difficulty_level=pdata["difficulty_level"],
                    departure_location=pdata["departure_location"],
                    cover_image_url=pdata["cover_image_url"],
                    inclusions_json=pdata["inclusions"],
                    exclusions_json=pdata["exclusions"],
                    child_price=pdata["child_price"],
                    infant_price=pdata["infant_price"],
                    single_room_supplement=pdata["single_room_supplement"],
                    booking_cutoff_days=pdata["booking_cutoff_days"],
                    cancellation_policy=pdata["cancellation_policy"],
                    seo_title=pdata["seo_title"],
                    seo_description=pdata["seo_description"],
                    is_featured=True,
                    is_published=True,
                )
                db.add(pkg)
                db.flush()
                print(f"  ✓ Created package: {pkg.name}")

                # Populate day-by-day itinerary
                for dinfo in pdata["days"]:
                    day = PackageDay(
                        package_id=pkg.id,
                        day_number=dinfo["day_number"],
                        title=dinfo["title"],
                        description=dinfo["description"],
                        accommodation=dinfo.get("accommodation"),
                        meals=dinfo.get("meals"),
                        transportation=dinfo.get("transportation"),
                    )
                    db.add(day)
                print(f"    - Added {len(pdata['days'])} itinerary days")

                for depinfo in pdata.get("departures", []):
                    dep = PackageDeparture(
                        package_id=pkg.id,
                        departure_date=depinfo["start_date"],
                        return_date=depinfo["end_date"],
                        total_capacity=depinfo["capacity"],
                        available_capacity=depinfo["capacity"],
                        reserved_capacity=0,
                        currency=pkg.currency,
                        status=depinfo["status"],
                    )
                    db.add(dep)
                print(f"    - Added {len(pdata.get('departures', []))} departures")
            else:
                # Update existing package
                pkg.cover_image_url = pdata["cover_image_url"]
                pkg.inclusions_json = pdata["inclusions"]
                pkg.exclusions_json = pdata["exclusions"]
                pkg.is_published = True
                pkg.is_featured = True
                print(f"  ✓ Package exists, updated metadata: {pkg.name}")

        # 6. Seed Best Offers for South India Packages
        print("\n6. Seeding Best Offers & Promotional Badges...")
        offers_data = [
            {
                "pkg_slug": "ooty-tea-gardens-heritage-escape",
                "title": "Coimbatore Weekend Special: 15% Off Nilgiri Tea Retreats",
                "offer_label": "Coimbatore Weekend Deal",
                "badge_text": "15% OFF",
                "discount_type": "percentage",
                "discount_value": Decimal("15.00"),
                "short_description": "Book your 3D/2N Ooty tea estate weekend from Coimbatore and save 15% on direct bookings.",
                "display_order": 1,
            },
            {
                "pkg_slug": "munnar-alleppey-hills-and-houseboat",
                "title": "Kerala Monsoon & Winter Magic: Flat ₹3,500 Off",
                "offer_label": "Kerala Highlands Deal",
                "badge_text": "Save ₹3,500",
                "discount_type": "fixed",
                "discount_value": Decimal("3500.00"),
                "short_description": "Experience Munnar tea valleys and private Alleppey houseboat with flat ₹3,500 couple savings.",
                "display_order": 2,
            },
            {
                "pkg_slug": "rameswaram-madurai-sacred-temples",
                "title": "Spiritual Darshan Special: Free Chauffeur Upgrade",
                "offer_label": "Pilgrim Special",
                "badge_text": "Free Upgrade",
                "discount_type": "percentage",
                "discount_value": Decimal("10.00"),
                "short_description": "Book Madurai & Rameshwaram teertham circuit and enjoy complimentary sedan to Innova Crysta upgrade.",
                "display_order": 3,
            },
        ]

        for odata in offers_data:
            target_pkg = db.query(Package).filter(Package.slug == odata["pkg_slug"]).first()
            if target_pkg:
                existing_offer = db.query(BestOffer).filter(BestOffer.package_id == target_pkg.id).first()
                if not existing_offer:
                    new_offer = BestOffer(
                        package_id=target_pkg.id,
                        title=odata["title"],
                        offer_label=odata["offer_label"],
                        badge_text=odata["badge_text"],
                        discount_type=odata["discount_type"],
                        discount_value=odata["discount_value"],
                        short_description=odata["short_description"],
                        is_featured=True,
                        status="active",
                        display_order=odata["display_order"],
                    )
                    db.add(new_offer)
                    print(f"  ✓ Added BestOffer: {odata['title']}")

        # 7. Seed Fleet Services & Tariffs in SiteSettings
        print("\n7. Seeding Fleet Catalog & Outstation Tariffs in SiteSettings...")
        fleet_setting = db.query(SiteSetting).filter(SiteSetting.key == "fleet_catalog").first()
        if not fleet_setting:
            fleet_setting = SiteSetting(
                key="fleet_catalog",
                value=FLEET_CATALOG,
                description="Authoritative fleet catalog, vehicle specs, and Coimbatore outstation cab routes.",
                is_public=True,
            )
            db.add(fleet_setting)
            print("  ✓ Created SiteSetting: fleet_catalog")
        else:
            fleet_setting.value = FLEET_CATALOG
            fleet_setting.is_public = True
            print("  ✓ Updated SiteSetting: fleet_catalog")

        # 8. Seed Chauffeur Fleet Add-Ons for Checkout Integration
        print("\n8. Seeding Chauffeur Fleet Add-Ons...")
        fleet_addons = [
            {
                "name": "Dedicated Chauffeur Cab Upgrade (Innova Crysta SUV)",
                "price_type": "per_booking",
                "price": Decimal("6500.00"),
                "currency": "INR",
                "description": "Upgrade your tour transportation to a dedicated private Toyota Innova Crysta with captain seats and dual AC throughout.",
            },
            {
                "name": "Coimbatore Airport (CJB) VIP Meet & Greet Chauffeur Transfer",
                "price_type": "per_booking",
                "price": Decimal("1500.00"),
                "currency": "INR",
                "description": "Personal chauffeur with name placard at arrivals gate, luggage assistance, and transfer directly to hotel.",
            },
            {
                "name": "Nilgiri Mountain Toy Train First-Class Confirmed Ticket",
                "price_type": "per_person",
                "price": Decimal("850.00"),
                "currency": "INR",
                "description": "Pre-booked guaranteed first-class window seats on the UNESCO steam-engine Toy Train.",
            },
        ]

        for add_data in fleet_addons:
            existing_addon = db.query(AddOn).filter(AddOn.name == add_data["name"]).first()
            if not existing_addon:
                addon = AddOn(
                    name=add_data["name"],
                    price_type=add_data["price_type"],
                    price=add_data["price"],
                    currency=add_data["currency"],
                    description=add_data["description"],
                    is_active=True,
                    applicability_scope="all_packages",
                )
                db.add(addon)
                print(f"  ✓ Added AddOn: {add_data['name']}")

        db.commit()
        print("\n==================================================================")
        print("DATABASE SEEDING COMPLETED SUCCESSFULLY!")
        print("==================================================================")


if __name__ == "__main__":
    run_seed()
