/**
 * Pre-baked initial catalog state for KV Tours & Travels.
 * Guarantees instantaneous 0ms first-paint on PC & Mobile with ZERO flash of empty/dummy content.
 */

import type {
  PublicDestinationListItem,
  PublicPackageListItem,
  PublicDepartureListItem,
  HomePageContent,
} from "./api";

export const INITIAL_DESTINATIONS: PublicDestinationListItem[] = [
  {
    "id": "13c38e3b-634f-4d50-8ae3-f56613411b4b",
    "name": "Agumbe Rainforest",
    "slug": "agumbe-rainforest",
    "country": "India",
    "region": "Karnataka",
    "state_or_city": null,
    "category": "Leisure & Nature",
    "travel_type": "Rainforest Canopy & Cascades",
    "cover_image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "The 'Cherrapunji of South India' featuring dense evergreen rainforests, nocturnal wildlife, and hidden waterfalls.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Agumbe Rainforest scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "e6a7f7ab-056f-4a99-9ba9-35abe8b09166",
    "name": "Almaty & Tian Shan",
    "slug": "almaty-kazakhstan",
    "country": "Kazakhstan",
    "region": "Central Asia",
    "state_or_city": null,
    "category": "Offbeat Vacation",
    "travel_type": "International Winter Wonderland",
    "cover_image_url": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "Spectacular snowbound Tian Shan peaks, Shymbulak ski slopes, Kok Tobe lights, and dramatic Charyn Canyon.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Almaty & Tian Shan scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "b843a066-6ba1-408a-a09d-3f3f564927c0",
    "name": "Gokarna",
    "slug": "gokarna",
    "country": "India",
    "region": "Karnataka",
    "state_or_city": null,
    "category": "Coastal & Beach",
    "travel_type": "Surfing & Coastal Adventure",
    "cover_image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "Sun-drenched beaches, sacred temple culture, tranquil backwaters and beginner-friendly surf breaks along the Arabian Sea.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Gokarna scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "64cacec5-0090-439f-a36a-4b4af4087c54",
    "name": "Kodaikanal & Vellagavi",
    "slug": "kodaikanal-vellagavi",
    "country": "India",
    "region": "Tamil Nadu",
    "state_or_city": null,
    "category": "Offbeat Trek & Village",
    "travel_type": "Hidden Trails & Forest Retreat",
    "cover_image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "A secluded roadless village where footwear is forbidden, nestled in dense mountain valleys below Kodaikanal.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Kodaikanal & Vellagavi scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "a30ac7fa-d99c-4bf3-99f1-58ded4bba99d",
    "name": "Kotagiri & Rangasamy Peak",
    "slug": "kotagiri-rangasamy",
    "country": "India",
    "region": "Tamil Nadu",
    "state_or_city": null,
    "category": "Adventure & Hills",
    "travel_type": "Summit Hikes & Canyons",
    "cover_image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "Kotagiri's dramatic rocky summit rising above Nilgiri river valleys and ancient Irula tribal sanctuaries.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Kotagiri & Rangasamy Peak scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "44a321ed-2d76-4cd2-aacf-b7fc61bd6934",
    "name": "Meghalaya & Cherrapunji",
    "slug": "meghalaya-cherrapunji",
    "country": "India",
    "region": "Meghalaya",
    "state_or_city": null,
    "category": "Offbeat Adventure",
    "travel_type": "Canyons, Caving & Living Roots",
    "cover_image_url": "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "The abode of clouds: turquoise rivers, living root bridges, mystical limestone caves, and towering plunge falls.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Meghalaya & Cherrapunji scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "92ac0d72-8e40-457c-aa3e-9ea78471f8ba",
    "name": "Mizoram Hidden Hills",
    "slug": "mizoram-hidden-hills",
    "country": "India",
    "region": "Northeast India",
    "state_or_city": null,
    "category": "Offbeat Vacation",
    "travel_type": "Remote Ridgelines & Waterfalls",
    "cover_image_url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "Untouched valleys, majestic Vantawng & Tuirihiau falls, grape vineyards of Champhai, and dramatic Reiek cliffs.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Mizoram Hidden Hills scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "680312d4-a344-42dc-9d60-2db184c7899d",
    "name": "Nagaland & Dzukou Valley",
    "slug": "nagaland-dzukou",
    "country": "India",
    "region": "Northeast India",
    "state_or_city": null,
    "category": "Offbeat Vacation",
    "travel_type": "Tribal Culture & High Valley Trek",
    "cover_image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "The land of warriors, misty bamboo trails, emerald Dzukou Valley camping, and green heritage villages.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Nagaland & Dzukou Valley scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "fd9a0f62-9faa-4118-b957-47b113a4c0a3",
    "name": "Nilgiris & Ooty",
    "slug": "nilgiris-ooty",
    "country": "India",
    "region": "Tamil Nadu",
    "state_or_city": null,
    "category": "Hill Stations",
    "travel_type": "Highland Trekking & Biosphere",
    "cover_image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "Rolling tea plantations, misty shola forests, UNESCO heritage toy trains, and pristine Nilgiri biosphere reserves.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Nilgiris & Ooty scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "b235be21-8b09-4f11-b380-fc5be91f52e0",
    "name": "Siruvani & Western Ghats",
    "slug": "siruvani-western-ghats",
    "country": "India",
    "region": "Tamil Nadu",
    "state_or_city": null,
    "category": "Adventure & Nature",
    "travel_type": "Eco Trails & Sweetwater Falls",
    "cover_image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "Home to the world's second sweetest natural mineral water, dense reserve forests, and cascading waterfalls.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Siruvani & Western Ghats scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "3dbb5205-2263-4dd3-a1c3-40c909383daa",
    "name": "Sri Lanka South Coast",
    "slug": "sri-lanka-south-coast",
    "country": "Sri Lanka",
    "region": "South Asia",
    "state_or_city": null,
    "category": "Coastal Vacation",
    "travel_type": "International Island & Surf Escape",
    "cover_image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "Private beach villa living, Galle Dutch Fort, Mirissa whale watching, Coconut Tree Hill sunsets, and surf vibes.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Sri Lanka South Coast scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "1634e52d-41c2-49c4-b1e9-d66be2683002",
    "name": "Tawang & Kaziranga",
    "slug": "tawang-kaziranga",
    "country": "India",
    "region": "Northeast India",
    "state_or_city": null,
    "category": "Offbeat Vacation",
    "travel_type": "Himalayan High Passes & Wildlife",
    "cover_image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "From UNESCO rhinos in Kaziranga grasslands to 13,700 ft Sela Pass and the legendary 400-year-old Tawang Monastery.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Tawang & Kaziranga scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  },
  {
    "id": "ee241214-7928-403d-b318-081d416e7ebe",
    "name": "Wayanad & Banasura",
    "slug": "wayanad-banasura",
    "country": "India",
    "region": "Kerala",
    "state_or_city": null,
    "category": "Adventure & Hills",
    "travel_type": "Peak Treks & Spillway Lakes",
    "cover_image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80",
    "display_order": 0,
    "short_description": "Kerala's premier mountain ridge hike rising to 2,000 meters above India's largest earthen dam.",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Wayanad & Banasura scenic landscape",
      "is_featured": true,
      "sort_order": 0
    },
    "package_count": 1
  }
];

export const INITIAL_PACKAGES: PublicPackageListItem[] = [
  {
    "id": "79598260-f16a-4899-98fc-36e9b79df99c",
    "name": "Agumbe",
    "slug": "agumbe-mist-moss",
    "destination_name": "Agumbe Rainforest",
    "destination_slug": "agumbe-rainforest",
    "category": "Leisure",
    "travel_type": "Rainforest Canopy & Cascades",
    "cover_image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
    "base_price": 8999.00,
    "currency": "INR",
    "duration_days": 3,
    "duration_nights": 2,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Agumbe tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "41fb5e5f-3005-4b5d-a7ef-2dc13654bbc9",
    "name": "Banasura",
    "slug": "banasura-hill-trek",
    "destination_name": "Wayanad & Banasura",
    "destination_slug": "wayanad-banasura",
    "category": "Adventure",
    "travel_type": "Mountain Trek & Ridge Camping",
    "cover_image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80",
    "base_price": 5700.00,
    "currency": "INR",
    "duration_days": 2,
    "duration_nights": 1,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Banasura tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "60ef2cdb-c37c-4634-8a33-4243a28a671b",
    "name": "Kazakstan : Winter Edition",
    "slug": "kazakhstan-winter-edition",
    "destination_name": "Almaty & Tian Shan",
    "destination_slug": "almaty-kazakhstan",
    "category": "Offbeat vacation",
    "travel_type": "International Winter Expedition",
    "cover_image_url": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
    "base_price": 55799.00,
    "currency": "INR",
    "duration_days": 6,
    "duration_nights": 5,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Kazakstan : Winter Edition tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "0020d523-55ee-4d51-ae3b-747664bb3464",
    "name": "Meghalaya : Winter Edition",
    "slug": "meghalaya-winter-edition",
    "destination_name": "Meghalaya & Cherrapunji",
    "destination_slug": "meghalaya-cherrapunji",
    "category": "Offbeat Adventure",
    "travel_type": "Canyons, Caving & Living Roots",
    "cover_image_url": "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1200&q=80",
    "base_price": 22999.00,
    "currency": "INR",
    "duration_days": 6,
    "duration_nights": 5,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Meghalaya : Winter Edition tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "d794d7e9-8213-481b-88ec-6279b5cbd139",
    "name": "Mizoram",
    "slug": "mizoram-hidden-hills",
    "destination_name": "Mizoram Hidden Hills",
    "destination_slug": "mizoram-hidden-hills",
    "category": "Offbeat vacation",
    "travel_type": "Remote Ridgelines & Waterfalls",
    "cover_image_url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    "base_price": 34999.00,
    "currency": "INR",
    "duration_days": 7,
    "duration_nights": 6,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Mizoram tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "08a6c6f3-fe7d-4a5b-9845-90b5901276c7",
    "name": "Nagaland Expedition",
    "slug": "nagaland-expedition-dzukou",
    "destination_name": "Nagaland & Dzukou Valley",
    "destination_slug": "nagaland-dzukou",
    "category": "Offbeat vacation",
    "travel_type": "Tribal Culture & Valley Trek",
    "cover_image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    "base_price": 24999.00,
    "currency": "INR",
    "duration_days": 6,
    "duration_nights": 5,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Nagaland Expedition tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "d6a85b8b-155c-43d7-820e-94a21afb0d1f",
    "name": "Parsons Valley Trek",
    "slug": "parsons-valley-trek",
    "destination_name": "Nilgiris & Ooty",
    "destination_slug": "nilgiris-ooty",
    "category": "Adventure",
    "travel_type": "Trek & Hiking",
    "cover_image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
    "base_price": 3799.00,
    "currency": "INR",
    "duration_days": 1,
    "duration_nights": 0,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Parsons Valley Trek tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "f0ed3c0a-81f7-4dac-8002-c15117bdda47",
    "name": "Rangasamy Peak Trek",
    "slug": "rangasamy-peak-trek",
    "destination_name": "Kotagiri & Rangasamy Peak",
    "destination_slug": "kotagiri-rangasamy",
    "category": "Adventure",
    "travel_type": "Summit Hike & Trek",
    "cover_image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    "base_price": 3299.00,
    "currency": "INR",
    "duration_days": 1,
    "duration_nights": 0,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Rangasamy Peak Trek tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "6d980ef8-7d3c-488a-ab96-7eeb5c813af3",
    "name": "Siruvani",
    "slug": "siruvani-trek",
    "destination_name": "Siruvani & Western Ghats",
    "destination_slug": "siruvani-western-ghats",
    "category": "Adventure",
    "travel_type": "Day Trek & Waterfalls",
    "cover_image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
    "base_price": 2999.00,
    "currency": "INR",
    "duration_days": 1,
    "duration_nights": 0,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Siruvani tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "1b1c5837-fb2b-4513-acf9-90f6cbb8cd83",
    "name": "Sri Lanka (New Year Edition)",
    "slug": "sri-lanka-new-year-edition",
    "destination_name": "Sri Lanka South Coast",
    "destination_slug": "sri-lanka-south-coast",
    "category": "Coastal vacation",
    "travel_type": "International Island & Beach NYE",
    "cover_image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80",
    "base_price": 39599.00,
    "currency": "INR",
    "duration_days": 5,
    "duration_nights": 4,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Sri Lanka (New Year Edition) tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "8be47c4c-712d-4f84-b580-a7929385df12",
    "name": "Surf & Roam Gokarna",
    "slug": "surf-and-roam-gokarna",
    "destination_name": "Gokarna",
    "destination_slug": "gokarna",
    "category": "Adventure",
    "travel_type": "Coastal & Surf",
    "cover_image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    "base_price": 11299.00,
    "currency": "INR",
    "duration_days": 3,
    "duration_nights": 2,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Surf & Roam Gokarna tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "3de90129-c0a5-4dbd-853b-39251f816f42",
    "name": "Tawang & Kaziranga",
    "slug": "tawang-and-kaziranga",
    "destination_name": "Tawang & Kaziranga",
    "destination_slug": "tawang-kaziranga",
    "category": "Offbeat vacation",
    "travel_type": "Himalayan Road Trip & Wildlife",
    "cover_image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
    "base_price": 32999.00,
    "currency": "INR",
    "duration_days": 7,
    "duration_nights": 6,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Tawang & Kaziranga tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  },
  {
    "id": "b2c62812-6244-4db1-97ba-cdc3ad9472ae",
    "name": "Vellagavi",
    "slug": "vellagavi-trek-poondi",
    "destination_name": "Kodaikanal & Vellagavi",
    "destination_slug": "kodaikanal-vellagavi",
    "category": "Adventure",
    "travel_type": "Offbeat Trek & Village Stay",
    "cover_image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    "base_price": 8999.00,
    "currency": "INR",
    "duration_days": 3,
    "duration_nights": 2,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Vellagavi tour package",
      "is_featured": true,
      "sort_order": 0
    },
    "is_featured": true
  }
];

export const INITIAL_DEPARTURES: PublicDepartureListItem[] = [
  {
    "id": "6e55b064-1f42-4f7a-8bb8-aa42bca86c36",
    "departure_date": "2026-11-15",
    "return_date": "2026-11-15",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 3799.00,
    "base_price": 3799.00,
    "currency": "INR",
    "status": "open",
    "package_id": "d6a85b8b-155c-43d7-820e-94a21afb0d1f",
    "package_name": "Parsons Valley Trek",
    "package_slug": "parsons-valley-trek",
    "duration_days": 1,
    "duration_nights": 0,
    "destination_name": "Nilgiris & Ooty",
    "destination_slug": "nilgiris-ooty",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Parsons Valley Trek tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "e16426c3-5c98-4ce5-aebf-4b07e9df0966",
    "departure_date": "2026-11-22",
    "return_date": "2026-11-22",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 2999.00,
    "base_price": 2999.00,
    "currency": "INR",
    "status": "open",
    "package_id": "6d980ef8-7d3c-488a-ab96-7eeb5c813af3",
    "package_name": "Siruvani",
    "package_slug": "siruvani-trek",
    "duration_days": 1,
    "duration_nights": 0,
    "destination_name": "Siruvani & Western Ghats",
    "destination_slug": "siruvani-western-ghats",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Siruvani tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "49bf8e82-c94c-4c89-afb3-d76acd345712",
    "departure_date": "2026-11-22",
    "return_date": "2026-11-22",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 3299.00,
    "base_price": 3299.00,
    "currency": "INR",
    "status": "open",
    "package_id": "f0ed3c0a-81f7-4dac-8002-c15117bdda47",
    "package_name": "Rangasamy Peak Trek",
    "package_slug": "rangasamy-peak-trek",
    "duration_days": 1,
    "duration_nights": 0,
    "destination_name": "Kotagiri & Rangasamy Peak",
    "destination_slug": "kotagiri-rangasamy",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Rangasamy Peak Trek tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "3109591b-cecb-4324-9c99-4ace4a30783f",
    "departure_date": "2026-11-27",
    "return_date": "2026-11-29",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 11299.00,
    "base_price": 11299.00,
    "currency": "INR",
    "status": "open",
    "package_id": "8be47c4c-712d-4f84-b580-a7929385df12",
    "package_name": "Surf & Roam Gokarna",
    "package_slug": "surf-and-roam-gokarna",
    "duration_days": 3,
    "duration_nights": 2,
    "destination_name": "Gokarna",
    "destination_slug": "gokarna",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Surf & Roam Gokarna tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "ec2781b1-7e96-43de-b874-6c6e40954090",
    "departure_date": "2026-11-27",
    "return_date": "2026-11-29",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 8999.00,
    "base_price": 8999.00,
    "currency": "INR",
    "status": "open",
    "package_id": "b2c62812-6244-4db1-97ba-cdc3ad9472ae",
    "package_name": "Vellagavi",
    "package_slug": "vellagavi-trek-poondi",
    "duration_days": 3,
    "duration_nights": 2,
    "destination_name": "Kodaikanal & Vellagavi",
    "destination_slug": "kodaikanal-vellagavi",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Vellagavi tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "1dcd8a7e-3751-4a58-9782-53974ce23dc6",
    "departure_date": "2026-11-27",
    "return_date": "2026-11-29",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 8999.00,
    "base_price": 8999.00,
    "currency": "INR",
    "status": "open",
    "package_id": "79598260-f16a-4899-98fc-36e9b79df99c",
    "package_name": "Agumbe",
    "package_slug": "agumbe-mist-moss",
    "duration_days": 3,
    "duration_nights": 2,
    "destination_name": "Agumbe Rainforest",
    "destination_slug": "agumbe-rainforest",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Agumbe tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "6a395d1c-e17a-4752-9b85-a06ce8583c14",
    "departure_date": "2026-12-05",
    "return_date": "2026-12-06",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 5700.00,
    "base_price": 5700.00,
    "currency": "INR",
    "status": "open",
    "package_id": "41fb5e5f-3005-4b5d-a7ef-2dc13654bbc9",
    "package_name": "Banasura",
    "package_slug": "banasura-hill-trek",
    "duration_days": 2,
    "duration_nights": 1,
    "destination_name": "Wayanad & Banasura",
    "destination_slug": "wayanad-banasura",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Banasura tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "5391ca5e-4d4d-406c-a6ae-b933e08f535b",
    "departure_date": "2026-12-06",
    "return_date": "2026-12-06",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 3799.00,
    "base_price": 3799.00,
    "currency": "INR",
    "status": "open",
    "package_id": "d6a85b8b-155c-43d7-820e-94a21afb0d1f",
    "package_name": "Parsons Valley Trek",
    "package_slug": "parsons-valley-trek",
    "duration_days": 1,
    "duration_nights": 0,
    "destination_name": "Nilgiris & Ooty",
    "destination_slug": "nilgiris-ooty",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Parsons Valley Trek tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "79ec47eb-273b-4379-a1b7-e3c9d8b09537",
    "departure_date": "2026-12-24",
    "return_date": "2026-12-29",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 22999.00,
    "base_price": 22999.00,
    "currency": "INR",
    "status": "open",
    "package_id": "0020d523-55ee-4d51-ae3b-747664bb3464",
    "package_name": "Meghalaya : Winter Edition",
    "package_slug": "meghalaya-winter-edition",
    "duration_days": 6,
    "duration_nights": 5,
    "destination_name": "Meghalaya & Cherrapunji",
    "destination_slug": "meghalaya-cherrapunji",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Meghalaya : Winter Edition tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "4eb9ed4e-35ec-41be-a813-d54026e6c31b",
    "departure_date": "2026-12-25",
    "return_date": "2026-12-27",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 8999.00,
    "base_price": 8999.00,
    "currency": "INR",
    "status": "open",
    "package_id": "b2c62812-6244-4db1-97ba-cdc3ad9472ae",
    "package_name": "Vellagavi",
    "package_slug": "vellagavi-trek-poondi",
    "duration_days": 3,
    "duration_nights": 2,
    "destination_name": "Kodaikanal & Vellagavi",
    "destination_slug": "kodaikanal-vellagavi",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Vellagavi tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "780ddd0f-4b42-43e6-96f0-6d65d1160913",
    "departure_date": "2026-12-25",
    "return_date": "2026-12-30",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 55799.00,
    "base_price": 55799.00,
    "currency": "INR",
    "status": "open",
    "package_id": "60ef2cdb-c37c-4634-8a33-4243a28a671b",
    "package_name": "Kazakstan : Winter Edition",
    "package_slug": "kazakhstan-winter-edition",
    "duration_days": 6,
    "duration_nights": 5,
    "destination_name": "Almaty & Tian Shan",
    "destination_slug": "almaty-kazakhstan",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Kazakstan : Winter Edition tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "d493d299-b67f-4ef9-9df9-422bf1bb1c2b",
    "departure_date": "2026-12-28",
    "return_date": "2027-01-03",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 32999.00,
    "base_price": 32999.00,
    "currency": "INR",
    "status": "open",
    "package_id": "3de90129-c0a5-4dbd-853b-39251f816f42",
    "package_name": "Tawang & Kaziranga",
    "package_slug": "tawang-and-kaziranga",
    "duration_days": 7,
    "duration_nights": 6,
    "destination_name": "Tawang & Kaziranga",
    "destination_slug": "tawang-kaziranga",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Tawang & Kaziranga tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "9b16fc5f-aad2-47cd-b026-8a33ab661ceb",
    "departure_date": "2026-12-29",
    "return_date": "2027-01-02",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 39599.00,
    "base_price": 39599.00,
    "currency": "INR",
    "status": "open",
    "package_id": "1b1c5837-fb2b-4513-acf9-90f6cbb8cd83",
    "package_name": "Sri Lanka (New Year Edition)",
    "package_slug": "sri-lanka-new-year-edition",
    "duration_days": 5,
    "duration_nights": 4,
    "destination_name": "Sri Lanka South Coast",
    "destination_slug": "sri-lanka-south-coast",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Sri Lanka (New Year Edition) tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "9986350c-32c1-42d1-a1e9-e4a41b50feb7",
    "departure_date": "2026-12-30",
    "return_date": "2027-01-04",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 24999.00,
    "base_price": 24999.00,
    "currency": "INR",
    "status": "open",
    "package_id": "08a6c6f3-fe7d-4a5b-9845-90b5901276c7",
    "package_name": "Nagaland Expedition",
    "package_slug": "nagaland-expedition-dzukou",
    "duration_days": 6,
    "duration_nights": 5,
    "destination_name": "Nagaland & Dzukou Valley",
    "destination_slug": "nagaland-dzukou",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Nagaland Expedition tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "e992f451-ad4c-42cd-8357-9e035d265b21",
    "departure_date": "2026-12-31",
    "return_date": "2027-01-02",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 8999.00,
    "base_price": 8999.00,
    "currency": "INR",
    "status": "open",
    "package_id": "b2c62812-6244-4db1-97ba-cdc3ad9472ae",
    "package_name": "Vellagavi",
    "package_slug": "vellagavi-trek-poondi",
    "duration_days": 3,
    "duration_nights": 2,
    "destination_name": "Kodaikanal & Vellagavi",
    "destination_slug": "kodaikanal-vellagavi",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Vellagavi tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "06bbf54e-98e6-4495-97cf-bb92e5bb6408",
    "departure_date": "2027-01-14",
    "return_date": "2027-01-19",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 24999.00,
    "base_price": 24999.00,
    "currency": "INR",
    "status": "open",
    "package_id": "08a6c6f3-fe7d-4a5b-9845-90b5901276c7",
    "package_name": "Nagaland Expedition",
    "package_slug": "nagaland-expedition-dzukou",
    "duration_days": 6,
    "duration_nights": 5,
    "destination_name": "Nagaland & Dzukou Valley",
    "destination_slug": "nagaland-dzukou",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Nagaland Expedition tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "63dfa8d3-83ea-4765-8b80-dafe916d6d14",
    "departure_date": "2027-01-24",
    "return_date": "2027-01-30",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 32999.00,
    "base_price": 32999.00,
    "currency": "INR",
    "status": "open",
    "package_id": "3de90129-c0a5-4dbd-853b-39251f816f42",
    "package_name": "Tawang & Kaziranga",
    "package_slug": "tawang-and-kaziranga",
    "duration_days": 7,
    "duration_nights": 6,
    "destination_name": "Tawang & Kaziranga",
    "destination_slug": "tawang-kaziranga",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Tawang & Kaziranga tour package",
      "is_featured": true,
      "sort_order": 0
    }
  },
  {
    "id": "134e1d22-de79-409c-a37c-9ca4a7488491",
    "departure_date": "2027-01-24",
    "return_date": "2027-01-30",
    "total_capacity": 12,
    "available_capacity": 12,
    "special_price": 34999.00,
    "base_price": 34999.00,
    "currency": "INR",
    "status": "open",
    "package_id": "d794d7e9-8213-481b-88ec-6279b5cbd139",
    "package_name": "Mizoram",
    "package_slug": "mizoram-hidden-hills",
    "duration_days": 7,
    "duration_nights": 6,
    "destination_name": "Mizoram Hidden Hills",
    "destination_slug": "mizoram-hidden-hills",
    "featured_image": {
      "image_url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
      "alt_text": "Mizoram tour package",
      "is_featured": true,
      "sort_order": 0
    }
  }
];

export const INITIAL_HOME_CONTENT: HomePageContent = {
  "hero": {
    "eyebrow": "KV TOURS & TRAVELS \u2022 SIGNATURE ESCAPES",
    "heading": "Discover Extraordinary Journeys Across India & Beyond",
    "description": "Curating bespoke international escapes, breathtaking domestic expeditions, and signature group departures from Coimbatore.",
    "media_type": "image",
    "image_url": "/images/hero/hero-4k.webp",
    "video_url": null,
    "primary_cta_text": "Explore Curated Journeys",
    "primary_cta_link": "/packages",
    "secondary_cta_text": "Plan Custom Trip",
    "secondary_cta_link": "/custom-trip",
    "whatsapp_cta_text": "WhatsApp Us",
    "popular_tags": [
      "Gokarna",
      "Nilgiris",
      "Meghalaya",
      "Kazakhstan",
      "Sri Lanka",
      "Nagaland",
      "Agumbe",
      "Wayanad"
    ]
  },
  "intro_eyebrow": "Bespoke Travel",
  "intro_heading": "Handcrafted Journeys Beyond the Ordinary",
  "intro_description": "Every itinerary is tailored from scratch with private transfers, verified boutique stays, and dedicated concierge support.",
  "trust_indicators": [
    {
      "icon": "ShieldCheck",
      "label": "Verified Luxury Stays"
    },
    {
      "icon": "Sparkles",
      "label": "Personalized Concierge"
    },
    {
      "icon": "Plane",
      "label": "Seamless Flight Logistics"
    }
  ],
  "featured_content": {
    "featured_destination_ids": [],
    "featured_package_ids": [],
    "promo_banner_active": false,
    "promo_banner_text": "Special Seasonal Offer: Up to 15% off Early Bird Bookings",
    "promo_banner_link": "/offers",
    "best_offers_enabled": true
  },
  "sections_visibility": {
    "trending_destinations": true,
    "best_offers": true,
    "featured_packages": true,
    "travel_inspirations": true,
    "upcoming_departures": true,
    "custom_cta": true
  },
  "sections_order": [
    "hero",
    "trending_destinations",
    "best_offers",
    "featured_packages",
    "travel_inspirations",
    "upcoming_departures",
    "custom_cta"
  ],
  "seo_title": "KV Tours & Travels | Luxury & Adventure Journeys Coimbatore",
  "seo_meta_description": "Curated international holidays, private expeditions, and bespoke vacations by KV Tours & Travels.",
  "seo_og_image": "/images/hero/hero-4k.webp",
  "seo_social_title": "KV Tours & Travels | Bespoke Luxury Escapes",
  "seo_social_description": "Explore world-class holidays and signature departures crafted from Coimbatore."
};
