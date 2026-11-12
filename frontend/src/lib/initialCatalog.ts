/**
 * Pre-baked initial catalog state for KV Tours & Travels.
 * Guarantees instantaneous 0ms first-paint and offline/cold-start resilience across all routes.
 */

import type {
  PublicDestinationListItem,
  PublicPackageListItem,
  PublicDepartureListItem,
  HomePageContent,
  PublicDestinationDetail,
  PublicPackageDetail,
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
    "base_price": 8999.0,
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
    "base_price": 5700.0,
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
    "base_price": 55799.0,
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
    "base_price": 22999.0,
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
    "base_price": 34999.0,
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
    "base_price": 24999.0,
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
    "base_price": 3799.0,
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
    "base_price": 3299.0,
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
    "base_price": 2999.0,
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
    "base_price": 39599.0,
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
    "base_price": 11299.0,
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
    "base_price": 32999.0,
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
    "base_price": 8999.0,
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
    "special_price": 3799.0,
    "base_price": 3799.0,
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
    "special_price": 2999.0,
    "base_price": 2999.0,
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
    "special_price": 3299.0,
    "base_price": 3299.0,
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
    "special_price": 11299.0,
    "base_price": 11299.0,
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
    "special_price": 8999.0,
    "base_price": 8999.0,
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
    "special_price": 8999.0,
    "base_price": 8999.0,
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
    "special_price": 5700.0,
    "base_price": 5700.0,
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
    "special_price": 3799.0,
    "base_price": 3799.0,
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
    "special_price": 22999.0,
    "base_price": 22999.0,
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
    "special_price": 8999.0,
    "base_price": 8999.0,
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
    "special_price": 55799.0,
    "base_price": 55799.0,
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
    "special_price": 32999.0,
    "base_price": 32999.0,
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
    "special_price": 39599.0,
    "base_price": 39599.0,
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
    "special_price": 24999.0,
    "base_price": 24999.0,
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
    "special_price": 8999.0,
    "base_price": 8999.0,
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
    "special_price": 24999.0,
    "base_price": 24999.0,
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
    "special_price": 32999.0,
    "base_price": 32999.0,
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
    "special_price": 34999.0,
    "base_price": 34999.0,
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

export const INITIAL_DESTINATION_DETAILS: Record<string, PublicDestinationDetail> = {
  "agumbe-rainforest": {
    "id": "13c38e3b-634f-4d50-8ae3-f56613411b4b",
    "name": "Agumbe Rainforest",
    "slug": "agumbe-rainforest",
    "country": "India",
    "region": "Karnataka",
    "state_or_city": null,
    "category": "Leisure & Nature",
    "travel_type": "Rainforest Canopy & Cascades",
    "cover_image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
    "short_description": "The 'Cherrapunji of South India' featuring dense evergreen rainforests, nocturnal wildlife, and hidden waterfalls.",
    "description": "Agumbe is a high-altitude rainforest sanctuary in the Western Ghats renowned for its extraordinary biodiversity, glistening waterfalls like Kudlu Teertha and Jogigundi, sunrise views from Kundadri Hill Jain temple, and serene Malnad village homestays.",
    "highlights": [
      {
        "title": "Kudlu Teertha Falls",
        "description": ""
      },
      {
        "title": "Jogigundi Hidden Pool",
        "description": ""
      },
      {
        "title": "Kundadri Sunrise Jain Temple",
        "description": ""
      },
      {
        "title": "Nocturnal Rainforest Walk",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "October to February",
      "ideal_duration": "3 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Agumbe Rainforest scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "almaty-kazakhstan": {
    "id": "e6a7f7ab-056f-4a99-9ba9-35abe8b09166",
    "name": "Almaty & Tian Shan",
    "slug": "almaty-kazakhstan",
    "country": "Kazakhstan",
    "region": "Central Asia",
    "state_or_city": null,
    "category": "Offbeat Vacation",
    "travel_type": "International Winter Wonderland",
    "cover_image_url": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
    "short_description": "Spectacular snowbound Tian Shan peaks, Shymbulak ski slopes, Kok Tobe lights, and dramatic Charyn Canyon.",
    "description": "Almaty combines Central Asian culture with alpine winter majesty. Experience cable car rides to high mountain passes, frozen waterfalls, the dramatic red rock formations of Charyn Canyon (Central Asia's Grand Canyon), geothermal hot springs, and fairy-tale festive street illumination.",
    "highlights": [
      {
        "title": "Shymbulak Mountain Resort",
        "description": ""
      },
      {
        "title": "Charyn Canyon Valley of Castles",
        "description": ""
      },
      {
        "title": "Kok Tobe Panoramic View",
        "description": ""
      },
      {
        "title": "Alma Arasan Hot Springs",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "December to February for Winter Snow",
      "ideal_duration": "6 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Almaty & Tian Shan scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "gokarna": {
    "id": "b843a066-6ba1-408a-a09d-3f3f564927c0",
    "name": "Gokarna",
    "slug": "gokarna",
    "country": "India",
    "region": "Karnataka",
    "state_or_city": null,
    "category": "Coastal & Beach",
    "travel_type": "Surfing & Coastal Adventure",
    "cover_image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    "short_description": "Sun-drenched beaches, sacred temple culture, tranquil backwaters and beginner-friendly surf breaks along the Arabian Sea.",
    "description": "Gokarna is the laid-back coastal jewel of Karnataka where golden sand beaches meet the gentle waves of the Arabian Sea. Renowned for Kudle, Om, and Half Moon beaches, Gokarna offers an authentic coastal surf lifestyle, pristine estuaries, beachside campfires, and fresh Malnad coastal cuisine.",
    "highlights": [
      {
        "title": "Pristine Beaches",
        "description": ""
      },
      {
        "title": "Surf Breaks",
        "description": ""
      },
      {
        "title": "Coastal Estuaries",
        "description": ""
      },
      {
        "title": "Seaside Sunsets",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "October to March",
      "ideal_duration": "3-4 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Gokarna scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "kodaikanal-vellagavi": {
    "id": "64cacec5-0090-439f-a36a-4b4af4087c54",
    "name": "Kodaikanal & Vellagavi",
    "slug": "kodaikanal-vellagavi",
    "country": "India",
    "region": "Tamil Nadu",
    "state_or_city": null,
    "category": "Offbeat Trek & Village",
    "travel_type": "Hidden Trails & Forest Retreat",
    "cover_image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    "short_description": "A secluded roadless village where footwear is forbidden, nestled in dense mountain valleys below Kodaikanal.",
    "description": "Vellagavi is an ancient mountain hamlet older than Kodaikanal itself, accessible only via a strenuous 9 km forest trail. With sacred temples, tranquil orange and cardamom groves, and strict footwear traditions, it offers one of the most immersive cultural and wilderness journeys in the Palani Hills.",
    "highlights": [
      {
        "title": "Roadless Hamlet",
        "description": ""
      },
      {
        "title": "Sacred Footwear Tradition",
        "description": ""
      },
      {
        "title": "Kumbakkarai Trail",
        "description": ""
      },
      {
        "title": "Poondi & Kilavarai Escapes",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "September to March",
      "ideal_duration": "3 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Kodaikanal & Vellagavi scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "kotagiri-rangasamy": {
    "id": "a30ac7fa-d99c-4bf3-99f1-58ded4bba99d",
    "name": "Kotagiri & Rangasamy Peak",
    "slug": "kotagiri-rangasamy",
    "country": "India",
    "region": "Tamil Nadu",
    "state_or_city": null,
    "category": "Adventure & Hills",
    "travel_type": "Summit Hikes & Canyons",
    "cover_image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    "short_description": "Kotagiri's dramatic rocky summit rising above Nilgiri river valleys and ancient Irula tribal sanctuaries.",
    "description": "Kotagiri is the quietest and oldest of the Nilgiri hill stations. Rangasamy Peak, a dramatic conical rock formation sacred to local tribes, provides one of the most thrilling day treks in South India with sheer drop-offs, canyon views, and misty summit panoramas.",
    "highlights": [
      {
        "title": "Rangasamy Peak Summit",
        "description": ""
      },
      {
        "title": "Irula Sacred Pillar",
        "description": ""
      },
      {
        "title": "Tea Valley Panoramas",
        "description": ""
      },
      {
        "title": "Canyon Ridge Trails",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "October to April",
      "ideal_duration": "1-2 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Kotagiri & Rangasamy Peak scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "meghalaya-cherrapunji": {
    "id": "44a321ed-2d76-4cd2-aacf-b7fc61bd6934",
    "name": "Meghalaya & Cherrapunji",
    "slug": "meghalaya-cherrapunji",
    "country": "India",
    "region": "Meghalaya",
    "state_or_city": null,
    "category": "Offbeat Adventure",
    "travel_type": "Canyons, Caving & Living Roots",
    "cover_image_url": "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1200&q=80",
    "short_description": "The abode of clouds: turquoise rivers, living root bridges, mystical limestone caves, and towering plunge falls.",
    "description": "Meghalaya is Northeast India's wonderland of natural architecture. From the Double Decker Living Root Bridge in Nongriat to the transparent emerald waters of Umngot River in Dawki, the limestone caverns of Krem Puri, and majestic Nohkalikai Falls, it delivers unforgettable adventures.",
    "highlights": [
      {
        "title": "Double Decker Living Root Bridge",
        "description": ""
      },
      {
        "title": "Dawki Umngot Boating",
        "description": ""
      },
      {
        "title": "Cherrapunji Waterfalls",
        "description": ""
      },
      {
        "title": "Arwah & Krem Caves",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "October to April",
      "ideal_duration": "6 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Meghalaya & Cherrapunji scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "mizoram-hidden-hills": {
    "id": "92ac0d72-8e40-457c-aa3e-9ea78471f8ba",
    "name": "Mizoram Hidden Hills",
    "slug": "mizoram-hidden-hills",
    "country": "India",
    "region": "Northeast India",
    "state_or_city": null,
    "category": "Offbeat Vacation",
    "travel_type": "Remote Ridgelines & Waterfalls",
    "cover_image_url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    "short_description": "Untouched valleys, majestic Vantawng & Tuirihiau falls, grape vineyards of Champhai, and dramatic Reiek cliffs.",
    "description": "The barely touched jewel of the Far East. Wind through dramatic emerald ridgelines, cascading jungle waterfalls in Thenzawl, serene borderlands near Myanmar in Champhai, heart-shaped Rih Dil lake, and breathtaking sunset cliffs atop Reiek Tlang in Aizawl.",
    "highlights": [
      {
        "title": "Tuirihiau & Vantawng Falls",
        "description": ""
      },
      {
        "title": "Champhai Vineyards & Borderland",
        "description": ""
      },
      {
        "title": "Reiek Tlang Cliff Summit",
        "description": ""
      },
      {
        "title": "Authentic Mizo Homestays",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "October to April",
      "ideal_duration": "7 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Mizoram Hidden Hills scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "nagaland-dzukou": {
    "id": "680312d4-a344-42dc-9d60-2db184c7899d",
    "name": "Nagaland & Dzukou Valley",
    "slug": "nagaland-dzukou",
    "country": "India",
    "region": "Northeast India",
    "state_or_city": null,
    "category": "Offbeat Vacation",
    "travel_type": "Tribal Culture & High Valley Trek",
    "cover_image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    "short_description": "The land of warriors, misty bamboo trails, emerald Dzukou Valley camping, and green heritage villages.",
    "description": "Nagaland is India's most fascinating tribal frontier. Trek through dense bamboo forests into the surreal, rolling emerald hills of Dzukou Valley above the clouds. Explore Khonoma (India's first green village), Kisama Heritage Village, and immerse yourself in authentic Naga culture.",
    "highlights": [
      {
        "title": "Dzukou Valley Overnight Camping",
        "description": ""
      },
      {
        "title": "Khonoma Green Village",
        "description": ""
      },
      {
        "title": "Kisama Cultural Village",
        "description": ""
      },
      {
        "title": "Kapamodzu Summit",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "October to May",
      "ideal_duration": "6 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Nagaland & Dzukou Valley scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "nilgiris-ooty": {
    "id": "fd9a0f62-9faa-4118-b957-47b113a4c0a3",
    "name": "Nilgiris & Ooty",
    "slug": "nilgiris-ooty",
    "country": "India",
    "region": "Tamil Nadu",
    "state_or_city": null,
    "category": "Hill Stations",
    "travel_type": "Highland Trekking & Biosphere",
    "cover_image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
    "short_description": "Rolling tea plantations, misty shola forests, UNESCO heritage toy trains, and pristine Nilgiri biosphere reserves.",
    "description": "The Blue Mountains of the Nilgiris rise high in the Western Ghats. Featuring lush tea estates, ancient Toda tribal settlements, Shola-grassland ecosystems, and the remote Parsons Valley reservoir, the region offers world-class trekking and peaceful highland escapes.",
    "highlights": [
      {
        "title": "Parsons Valley Reservoir",
        "description": ""
      },
      {
        "title": "Mukurthi National Park Borders",
        "description": ""
      },
      {
        "title": "Colonial Tea Heritage",
        "description": ""
      },
      {
        "title": "Shola Forests",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "September to May",
      "ideal_duration": "1-3 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Nilgiris & Ooty scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "siruvani-western-ghats": {
    "id": "b235be21-8b09-4f11-b380-fc5be91f52e0",
    "name": "Siruvani & Western Ghats",
    "slug": "siruvani-western-ghats",
    "country": "India",
    "region": "Tamil Nadu",
    "state_or_city": null,
    "category": "Adventure & Nature",
    "travel_type": "Eco Trails & Sweetwater Falls",
    "cover_image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
    "short_description": "Home to the world's second sweetest natural mineral water, dense reserve forests, and cascading waterfalls.",
    "description": "Nestled in the lush foothills of the Western Ghats just outside Coimbatore, the Siruvani river and reservoir are celebrated worldwide for their crystal mineral water and untouched rainforest trails. A tranquil eco-adventure through reserve forests and tribal village corridors.",
    "highlights": [
      {
        "title": "Siruvani Waterfalls",
        "description": ""
      },
      {
        "title": "Sweetest Natural Water",
        "description": ""
      },
      {
        "title": "Foothill Trekking",
        "description": ""
      },
      {
        "title": "Rich Avian Biodiversity",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "September to March",
      "ideal_duration": "1 Day"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Siruvani & Western Ghats scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "sri-lanka-south-coast": {
    "id": "3dbb5205-2263-4dd3-a1c3-40c909383daa",
    "name": "Sri Lanka South Coast",
    "slug": "sri-lanka-south-coast",
    "country": "Sri Lanka",
    "region": "South Asia",
    "state_or_city": null,
    "category": "Coastal Vacation",
    "travel_type": "International Island & Surf Escape",
    "cover_image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80",
    "short_description": "Private beach villa living, Galle Dutch Fort, Mirissa whale watching, Coconut Tree Hill sunsets, and surf vibes.",
    "description": "Celebrate the New Year along the sun-drenched southern coastline of Sri Lanka. Stay in charming seaside villas, watch golden sunsets from Coconut Tree Hill, dance barefoot on Mirissa beach, cruise for blue whales, and explore the cobblestone ramparts of Galle Fort.",
    "highlights": [
      {
        "title": "Mirissa Beach NYE",
        "description": ""
      },
      {
        "title": "Coconut Tree Hill",
        "description": ""
      },
      {
        "title": "Blue Whale Marine Safari",
        "description": ""
      },
      {
        "title": "Galle UNESCO Dutch Fort",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "November to April",
      "ideal_duration": "5 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Sri Lanka South Coast scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "tawang-kaziranga": {
    "id": "1634e52d-41c2-49c4-b1e9-d66be2683002",
    "name": "Tawang & Kaziranga",
    "slug": "tawang-kaziranga",
    "country": "India",
    "region": "Northeast India",
    "state_or_city": null,
    "category": "Offbeat Vacation",
    "travel_type": "Himalayan High Passes & Wildlife",
    "cover_image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
    "short_description": "From UNESCO rhinos in Kaziranga grasslands to 13,700 ft Sela Pass and the legendary 400-year-old Tawang Monastery.",
    "description": "An expedition spanning the untamed grasslands of Assam and the soaring snow peaks of Arunachal Pradesh. Track one-horned rhinos in Kaziranga National Park, cross the frozen Sela Pass, explore Tawang Monastery, and stand near the frontier at Bum La Pass and Madhuri Lake.",
    "highlights": [
      {
        "title": "Kaziranga Rhino Safari",
        "description": ""
      },
      {
        "title": "Sela Pass & Sela Lake (13,700 ft)",
        "description": ""
      },
      {
        "title": "Tawang Monastery",
        "description": ""
      },
      {
        "title": "Bum La Pass & Sangetsar Lake",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "November to April",
      "ideal_duration": "7 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Tawang & Kaziranga scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  },
  "wayanad-banasura": {
    "id": "ee241214-7928-403d-b318-081d416e7ebe",
    "name": "Wayanad & Banasura",
    "slug": "wayanad-banasura",
    "country": "India",
    "region": "Kerala",
    "state_or_city": null,
    "category": "Adventure & Hills",
    "travel_type": "Peak Treks & Spillway Lakes",
    "cover_image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80",
    "short_description": "Kerala's premier mountain ridge hike rising to 2,000 meters above India's largest earthen dam.",
    "description": "Wayanad is Kerala's green paradise of mist, spice plantations, and towering peaks. Banasura Peak trek takes hikers along wind-swept grassland ridges, secret mountain streams, and panoramic viewpoints overlooking the Banasura Sagar reservoir and Western Ghats canopy.",
    "highlights": [
      {
        "title": "Banasura Peak Summit (2000m)",
        "description": ""
      },
      {
        "title": "Meenmutty Waterfalls",
        "description": ""
      },
      {
        "title": "Banasura Sagar Dam",
        "description": ""
      },
      {
        "title": "Malabar Homestay Dining",
        "description": ""
      }
    ],
    "travel_guide": {
      "best_time_to_visit": "October to March",
      "ideal_duration": "2 Days"
    },
    "faqs": [],
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Wayanad & Banasura scenic landscape",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "seo_title": null,
    "seo_description": null
  }
};

export const INITIAL_PACKAGE_DETAILS: Record<string, PublicPackageDetail> = {
  "agumbe-mist-moss": {
    "id": "79598260-f16a-4899-98fc-36e9b79df99c",
    "name": "Agumbe",
    "slug": "agumbe-mist-moss",
    "destination_name": "Agumbe Rainforest",
    "destination_slug": "agumbe-rainforest",
    "short_description": "A slow rainforest escape into the Western Ghats: moss-covered trails, hidden cascades, Kundadri sunrise, and night walks.",
    "description": "Mist & Moss: A slow drift through the evergreen heart of Agumbe. Escape rushed tourist checklists for serene waterfall trails at Kudlu Teertha and Jogigundi, reflective ponds atop ancient Kundadri Hills, guided nocturnal rainforest walks, and traditional Malnad homestays.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b98,099)\n\u2022 Itinerary: https://sites.google.com/view/agumbe-between-mist-moss/home\n\u2022 Instagram: https://www.instagram.com/p/DfR_mJhE5Bm/\n\u2022 Posters & Media: https://drive.google.com/drive/folders/1LUOQHVU8bwzDYXrQWesQ29E0oRZJLdRD?usp=sharing",
    "category": "Leisure",
    "travel_type": "Rainforest Canopy & Cascades",
    "difficulty_level": "Easy to Moderate",
    "departure_location": "Mangalore Central Railway Station",
    "cover_image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "2 Nights Traditional Malnad Homestay in Agumbe",
      "Round-trip AC Transport from Mangalore Central Station",
      "Guided Kudlu Teertha and Jogigundi Waterfall Trails",
      "Guided Rainforest Night Walk with Naturalist",
      "Kundadri Hill Sunrise Visit & Jain Temple Excursion",
      "Malnad Cuisine (2 Breakfasts, 1 Lunch, 2 Dinners)"
    ],
    "exclusions": [
      "Train or Flight tickets to Mangalore",
      "Any personal camera permits or specialized gear",
      "Meals outside specified package inclusions"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 8999.0,
    "currency": "INR",
    "duration_days": 3,
    "duration_nights": 2,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Agumbe tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Mangalore to Agumbe via Udupi Coast & Jogigundi Falls",
        "description": "Pickup at Mangalore Central (6:30 AM). Scenic coastal drive via Udupi with authentic breakfast. Ascend the Someshwara Ghat into Agumbe. Check in and enjoy traditional Malnad lunch. Trek to the hidden Jogigundi rainforest waterfall pool. Evening classic Western Ghats horizon sunset and guided night walk for nocturnal wildlife.",
        "accommodation": "Heritage Malnad Homestay in Agumbe",
        "meals": "Breakfast, Lunch & Dinner",
        "transportation": "Shared AC Vehicle from Mangalore",
        "activities": []
      },
      {
        "day_number": 2,
        "title": "Kundadri Hill Sunrise & Kudlu Teertha Waterfall Hike",
        "description": "Dawn drive to Kundadri Hill for sunrise over misty canopy and ancient 17th-century Jain temple. Return for hearty breakfast. Trek deep into the rainforest to spectacular Kudlu Teertha Falls. Relax by the natural plunge pool. Evening bonfire and storytelling.",
        "accommodation": "Heritage Malnad Homestay in Agumbe",
        "meals": "Breakfast & Dinner",
        "transportation": "Shared AC Vehicle",
        "activities": []
      },
      {
        "day_number": 3,
        "title": "Rainforest Canopy Walk, Coastal Drive & Return",
        "description": "Slow morning coffee and guided flora walk. Check out and drive down the ghats towards the Arabian coast. Beach sunset stop before dropping off at Mangalore Central Railway Station for evening connections.",
        "accommodation": "None (Departure Day)",
        "meals": "Breakfast",
        "transportation": "Shared AC Vehicle to Mangalore",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "1dcd8a7e-3751-4a58-9782-53974ce23dc6",
        "departure_date": "2026-11-27",
        "return_date": "2026-11-29",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 8999.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "banasura-hill-trek": {
    "id": "41fb5e5f-3005-4b5d-a7ef-2dc13654bbc9",
    "name": "Banasura",
    "slug": "banasura-hill-trek",
    "destination_name": "Wayanad & Banasura",
    "destination_slug": "wayanad-banasura",
    "short_description": "Ascend above the clouds of Banasura Peak in Wayanad: waterfalls, mountain ridge hikes, and panoramic spillway views.",
    "description": "Above the Clouds of Banasura: A 2-day mountain adventure through Kerala's lush Western Ghats. Features the exhilarating Banasura Peak ridge hike (~2,000 m altitude, 14 km round trip), hidden Meenmutty Waterfalls, sunset nature walks, and authentic Kerala cuisine.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b95,130)\n\u2022 Itinerary: https://sites.google.com/view/banasurahilltrek/home\n\u2022 Instagram: https://www.instagram.com/p/Ddx0UC8ARm5/\n\u2022 Posters & Media: https://drive.google.com/drive/folders/1I5nHGfqqXbcSR67wvKPJDRENSmQ45LVB?usp=sharing",
    "category": "Adventure",
    "travel_type": "Mountain Trek & Ridge Camping",
    "difficulty_level": "Moderate",
    "departure_location": "Kannur Railway Station",
    "cover_image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "1 Night Nature Resort / Homestay Stay in Wayanad",
      "Round-trip Transportation from Kannur Railway Station",
      "Banasura Peak Trekking Permits & Forest Guide Fees",
      "Visit to Meenmutty Waterfalls & Banasura Sagar Viewpoints",
      "Traditional Kerala Breakfasts, Trail Snacks & Dinners",
      "Dedicated KV Tours Adventure Trip Leader"
    ],
    "exclusions": [
      "Train tickets to/from Kannur",
      "Speedboating or zip-line tickets at Banasura Sagar Dam",
      "Personal trekking gear and hydration backpacks"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 5700.0,
    "currency": "INR",
    "duration_days": 2,
    "duration_nights": 1,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Banasura tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Kannur to Wayanad, Meenmutty Falls & Nature Stay",
        "description": "Meet trip lead at Kannur Railway Station (morning pickup). Scenic drive up the mountain ghats of Wayanad. Stop for authentic Kerala breakfast. Check in to nature stay near Padinjarathara. Trek to hidden Meenmutty Waterfalls for a refreshing swim and sunset ridge walk. Evening dinner and trip briefing.",
        "accommodation": "Nature Resort / Homestay in Wayanad",
        "meals": "Breakfast & Dinner",
        "transportation": "Shared AC Vehicle from Kannur",
        "activities": []
      },
      {
        "day_number": 2,
        "title": "Banasura Peak Summit Push (2,000m) & Return",
        "description": "Early morning start for the Banasura Peak trek (14 km round-trip). Hike through shola forests, steep grasslands, and misty knife-edge ridges to the 2,000m summit. Soak in views of Banasura Sagar dam and Wayanad valley. Descend for late lunch and transfer back to Kannur Railway Station by 7:30 PM.",
        "accommodation": "None (Departure Day)",
        "meals": "Breakfast & Trail Lunch",
        "transportation": "Shared AC Vehicle to Kannur",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "6a395d1c-e17a-4752-9b85-a06ce8583c14",
        "departure_date": "2026-12-05",
        "return_date": "2026-12-06",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 5700.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "kazakhstan-winter-edition": {
    "id": "60ef2cdb-c37c-4634-8a33-4243a28a671b",
    "name": "Kazakstan : Winter Edition",
    "slug": "kazakhstan-winter-edition",
    "destination_name": "Almaty & Tian Shan",
    "destination_slug": "almaty-kazakhstan",
    "short_description": "Christmas & New Year under snowy Tian Shan skies: Kok Tobe, Shymbulak ski heights, Alma Arasan hot springs, and Charyn Canyon.",
    "description": "Where Snow Meets the Soul: A holiday journey beyond the ordinary script. Spend 6 days immersed in Kazakhstan's snow-framed mountains, glowing festive winter streets, high-altitude cable cars at Shymbulak (3,200 m), geothermal hot springs in Alma Arasan gorge, and the red rock Valley of Castles at Charyn Canyon.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b950,219)\n\u2022 Itinerary: https://sites.google.com/view/winter-edition-kazakhstan/home\n\u2022 Instagram: https://www.instagram.com/p/DehHrtTgQ_l/\n\u2022 Posters & Media: https://drive.google.com/drive/folders/1mo2VG62o0zGF9XcEHBAO-eqSDhMh9b_z?usp=sharing",
    "category": "Offbeat vacation",
    "travel_type": "International Winter Expedition",
    "difficulty_level": "Easy to Moderate",
    "departure_location": "Almaty International Airport (ALA)",
    "cover_image_url": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "5 Nights 4\u2605 Hotel Accommodation in Central Almaty",
      "Round-trip Airport Transfers (Almaty International Airport)",
      "Cable Car Tickets to Kok Tobe & Shymbulak Mountain Resort (Level 3)",
      "Day Excursion to Charyn Canyon & Kolsay Lake Region",
      "Alma Arasan Hot Springs & Mountain Gorge Excursion",
      "Daily Breakfasts at Hotel",
      "English-Speaking Local Guide & KV Tours Coordinator"
    ],
    "exclusions": [
      "International Flights to/from Almaty (ALA)",
      "Kazakhstan Visa charges (Visa-free for Indians up to 14 days)",
      "Ski gear rental, ski passes or ice skating rentals",
      "Lunches, dinners, and personal beverages",
      "Travel & Medical Insurance"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 55799.0,
    "currency": "INR",
    "duration_days": 6,
    "duration_nights": 5,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Kazakstan : Winter Edition tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Arrival in Almaty & Christmas Evening at Kok Tobe",
        "description": "Arrive at Almaty International Airport (ALA). Chauffeur transfer to hotel and check-in. Evening cable car ride up to Kok Tobe hill for spectacular 360-degree views of glowing city lights and snow-clad Tian Shan peaks. Welcome winter dinner.",
        "accommodation": "4\u2605 Hotel in Almaty",
        "meals": "Dinner",
        "transportation": "Private AC Airport & City Transfer",
        "activities": []
      },
      {
        "day_number": 2,
        "title": "Medeu High Altitude Rink & Shymbulak Alpine Resort",
        "description": "Drive up the mountain to Medeu, the world's highest Olympic outdoor speed skating rink. Take the panoramic cable car system up to Shymbulak Ski Resort (3,200 m). Enjoy alpine views, snow activities, hot chocolate at mountain cafes, and return to city.",
        "accommodation": "4\u2605 Hotel in Almaty",
        "meals": "Breakfast",
        "transportation": "Private Tour Vehicle",
        "activities": []
      },
      {
        "day_number": 3,
        "title": "Alma Arasan Hot Springs & Arbat Street Walk",
        "description": "Drive into the scenic Alma Arasan gorge. Walk through winter trails and soak in natural thermal hot springs surrounded by snow. Afternoon stroll through pedestrian Arbat street, Green Bazaar local dry fruits market, and Panfilov Park Zenkov Cathedral.",
        "accommodation": "4\u2605 Hotel in Almaty",
        "meals": "Breakfast",
        "transportation": "Private Tour Vehicle",
        "activities": []
      },
      {
        "day_number": 4,
        "title": "Charyn Canyon: The Valley of Castles",
        "description": "Full-day expedition east to Charyn Canyon. Hike into the 2-million-year-old Valley of Castles, marveling at red sedimentary rock towers dusted with winter snow. Riverside lunch stop and sunset drive back to Almaty.",
        "accommodation": "4\u2605 Hotel in Almaty",
        "meals": "Breakfast & Lunch",
        "transportation": "Private Touring Bus",
        "activities": []
      },
      {
        "day_number": 5,
        "title": "Kolsay Alpine Lakes & Winter Village Life",
        "description": "Visit the alpine Kolsay Lake framed by snow-covered spruce trees and mirror-like reflections. Experience Kazakh village hospitality and horse sleigh rides in Saty village. Return to Almaty for celebratory farewell dinner.",
        "accommodation": "4\u2605 Hotel in Almaty",
        "meals": "Breakfast",
        "transportation": "Private Touring Bus",
        "activities": []
      },
      {
        "day_number": 6,
        "title": "Almaty Souvenir Shopping & Airport Departure",
        "description": "Leisurely breakfast and souvenir shopping for Kazakh chocolates and souvenirs. Private transfer to Almaty International Airport for flights home.",
        "accommodation": "None (Departure Day)",
        "meals": "Breakfast",
        "transportation": "Private Airport Transfer",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "780ddd0f-4b42-43e6-96f0-6d65d1160913",
        "departure_date": "2026-12-25",
        "return_date": "2026-12-30",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 55799.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "meghalaya-winter-edition": {
    "id": "0020d523-55ee-4d51-ae3b-747664bb3464",
    "name": "Meghalaya : Winter Edition",
    "slug": "meghalaya-winter-edition",
    "destination_name": "Meghalaya & Cherrapunji",
    "destination_slug": "meghalaya-cherrapunji",
    "short_description": "Six-day winter journey through Meghalaya: crystal Umngot river in Dawki, Double Decker Root Bridge, and Sohra canyon waterfalls.",
    "description": "Explore the mystical Abode of Clouds in crisp winter weather. Trek 3,500 steps down into Nongriat to stand on the Double Decker Living Root Bridge and Rainbow Falls. Camp beside the mirror-clear waters of Umngot River in Shnongpdeng, explore prehistoric caves in Cherrapunji, and soak in Mawlynnong village.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b920,699)\n\u2022 Itinerary: https://sites.google.com/view/meghalayamonsoonedition/home\n\u2022 Instagram: https://www.instagram.com/p/DePCpeDBg2C/\n\u2022 Posters & Media: https://drive.google.com/drive/folders/15gVQqkRJjB4QNn0HqjJ3t5PALOCUOVX_?usp=sharing",
    "category": "Offbeat Adventure",
    "travel_type": "Canyons, Caving & Living Roots",
    "difficulty_level": "Moderate",
    "departure_location": "Guwahati Airport / Railway Station",
    "cover_image_url": "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "5 Nights Handpicked Stays (Sohra, Shnongpdeng & Shillong)",
      "Guwahati to Guwahati Dedicated Vehicle & Transfers",
      "Double Decker Living Root Bridge & Rainbow Falls Guided Trek",
      "Boating & Cliff Jumping Session in Dawki / Shnongpdeng",
      "Mawsmai & Arwah Cave Exploration Permits",
      "Daily Breakfasts and Bonfire Evenings",
      "Local Khasi Guide & KV Tours Trip Leader"
    ],
    "exclusions": [
      "Airfare or Train tickets to/from Guwahati",
      "Lunches and Dinners (to explore authentic local cafes)",
      "Zip-lining, scuba or specialized adventure activities",
      "Personal expenses and porterage"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 22999.0,
    "currency": "INR",
    "duration_days": 6,
    "duration_nights": 5,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Meghalaya : Winter Edition tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Guwahati to Shillong via Umiam Lake",
        "description": "Pickup from Guwahati Airport/Station by 11:00 AM. Drive past verdant hills into Meghalaya. Photo stop at breathtaking Umiam Lake. Arrive in Shillong, explore Police Bazar and local cafes. Overnight in Shillong.",
        "accommodation": "Boutique Hotel / Homestay in Shillong",
        "meals": "Breakfast",
        "transportation": "Dedicated SUV / Traveler from Guwahati",
        "activities": []
      },
      {
        "day_number": 2,
        "title": "Shillong to Cherrapunji (Sohra) Canyons & Waterfalls",
        "description": "Drive towards Cherrapunji. Visit towering Nohkalikai Falls, Wei Sawdong 3-tiered falls, and explore the ancient stalactites of Arwah Cave. Sunset at Mawkdok Dympep Valley bridge. Overnight in Cherrapunji.",
        "accommodation": "Cozy Resort / Homestay in Cherrapunji",
        "meals": "Breakfast",
        "transportation": "Dedicated Vehicle",
        "activities": []
      },
      {
        "day_number": 3,
        "title": "Trek to Double Decker Living Root Bridge & Rainbow Falls",
        "description": "Early morning descent of 3,500 stone stairs from Tyrna village down into Nongriat. Cross thrilling suspension bridges to marvel at the centuries-old Jingkieng Nongriat Double Decker Living Root Bridge. Continue hike to turquoise Rainbow Falls pool. Return to Sohra for overnight.",
        "accommodation": "Cozy Resort / Homestay in Cherrapunji",
        "meals": "Breakfast",
        "transportation": "Dedicated Vehicle to Trailhead",
        "activities": []
      },
      {
        "day_number": 4,
        "title": "Mawlynnong Clean Village & Crystal Waters of Shnongpdeng",
        "description": "Drive to Mawlynnong, recognized as Asia's cleanest village. Visit the single living root bridge at Riwai. Continue to Shnongpdeng along the Umngot River where water is so transparent boats appear to float in mid-air. Riverside camping and bonfire.",
        "accommodation": "Riverside Camp / Cottage in Shnongpdeng",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Vehicle",
        "activities": []
      },
      {
        "day_number": 5,
        "title": "Water Activities on Umngot River & Krang Shuri Falls",
        "description": "Morning country boat ride on Umngot river, cliff jumping, and kayaking. After lunch, visit the shimmering blue waters of Krang Shuri Falls in Jaintia Hills. Drive back to Shillong for celebratory farewell dinner.",
        "accommodation": "Boutique Hotel in Shillong",
        "meals": "Breakfast",
        "transportation": "Dedicated Vehicle",
        "activities": []
      },
      {
        "day_number": 6,
        "title": "Shillong to Guwahati Airport Departure",
        "description": "Morning breakfast and shopping for Khasi honey and artisanal crafts. Scenic drive back to Guwahati Airport with drop-off by 3:00 PM for flights.",
        "accommodation": "None (Departure Day)",
        "meals": "Breakfast",
        "transportation": "Dedicated Vehicle to Guwahati Airport",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "79ec47eb-273b-4379-a1b7-e3c9d8b09537",
        "departure_date": "2026-12-24",
        "return_date": "2026-12-29",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 22999.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "mizoram-hidden-hills": {
    "id": "d794d7e9-8213-481b-88ec-6279b5cbd139",
    "name": "Mizoram",
    "slug": "mizoram-hidden-hills",
    "destination_name": "Mizoram Hidden Hills",
    "destination_slug": "mizoram-hidden-hills",
    "short_description": "Seven days through the barely touched hills of Mizoram: Thenzawl waterfalls, Champhai eastern borderlands, and Reiek Tlang peak.",
    "description": "Far East. Barely Touched. Seven days across endless ridgelines, quiet villages, waterfalls, borderlands and mountain mornings. Explore the dramatic cascading waters of Tuirihiau and Vantawng Falls, the eastern rice bowl and vineyards of Champhai, Indo-Myanmar border at Zokhawthar, and the majestic Reiek cliff summit.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b931,499)\n\u2022 Itinerary: https://sites.google.com/view/mizoram-the-hidden-hills/home",
    "category": "Offbeat vacation",
    "travel_type": "Remote Ridgelines & Waterfalls",
    "difficulty_level": "Moderate",
    "departure_location": "Lengpui Airport, Aizawl (AJL)",
    "cover_image_url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "6 Nights Homestays & Lodges (2N Thenzawl, 2N Champhai, 2N Aizawl)",
      "Lengpui Airport to Lengpui Airport Dedicated Vehicle & Chauffeur",
      "Inner Line Permits (ILP) for Mizoram",
      "Guided Excursions to Tuirihiau Falls & Vantawng Falls",
      "Reiek Tlang Mountain Summit Hike & Heritage Village Entry",
      "Daily Traditional Mizo Breakfasts & Dinners",
      "Dedicated KV Tours Expedition Leader"
    ],
    "exclusions": [
      "Flights to/from Lengpui Airport (AJL)",
      "Lunches and daytime snacks",
      "Personal expenses, camera permits and tips"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 34999.0,
    "currency": "INR",
    "duration_days": 7,
    "duration_nights": 6,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Mizoram tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Lengpui Airport Arrival & Scenic Drive to Thenzawl",
        "description": "Arrive at Lengpui Airport (AJL) by noon. Drive through winding green ridges to Thenzawl, the handloom and waterfall capital of Mizoram. Check in to homestay, evening tea, and stargazing under pollution-free skies.",
        "accommodation": "Cozy Homestay in Thenzawl",
        "meals": "Dinner",
        "transportation": "Dedicated Mountain Vehicle from Airport",
        "activities": []
      },
      {
        "day_number": 2,
        "title": "Tuirihiau Falls Cave Walk & Vantawng Waterfalls",
        "description": "Morning trek to Tuirihiau Falls, where you can walk behind the curtain of falling water inside a natural rock cavern. Visit Vantawng Khawhthla, the highest two-tiered waterfall in Mizoram. Explore local weaving clusters in Thenzawl.",
        "accommodation": "Cozy Homestay in Thenzawl",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Mountain Vehicle",
        "activities": []
      },
      {
        "day_number": 3,
        "title": "Thenzawl through East Lungdar to Champhai",
        "description": "Drive east across deep river gorges and bamboo hills through East Lungdar. Reach Champhai, known as the 'Rice Bowl of Mizoram' nestled against the blue hills of Myanmar. Check in and evening valley walk.",
        "accommodation": "Lodge / Homestay in Champhai",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Mountain Vehicle",
        "activities": []
      },
      {
        "day_number": 4,
        "title": "Indo-Myanmar Border, Zokhawthar & Champhai Vineyards",
        "description": "Day trip to Zokhawthar on the Indo-Myanmar border. Visit the heart-shaped natural lake of Rih Dil. Tour local passion fruit and grape vineyards in Hnahlan / Champhai. Sunset over the eastern frontier.",
        "accommodation": "Lodge / Homestay in Champhai",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Mountain Vehicle",
        "activities": []
      },
      {
        "day_number": 5,
        "title": "Champhai to Aizawl Mountain Capital",
        "description": "Scenic road trip west to Aizawl, the vertical city built dramatically across mountain ridges. Check into boutique hotel. Evening walk along Chanmari and Solomon's Temple corridor.",
        "accommodation": "Boutique Hotel in Aizawl",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Mountain Vehicle",
        "activities": []
      },
      {
        "day_number": 6,
        "title": "Reiek Tlang Cliff Summit Hike & Mizo Heritage Village",
        "description": "Drive to Reiek hill. Hike 3 km through dense subtropical jungle and boulder trails to the sheer rocky cliff summit of Reiek Tlang (1,548 m) for breathtaking 360-degree views of Bangladesh plains and Mizo hills. Visit preserved traditional Mizo village huts.",
        "accommodation": "Boutique Hotel in Aizawl",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Mountain Vehicle",
        "activities": []
      },
      {
        "day_number": 7,
        "title": "Aizawl to Lengpui Airport & Departure",
        "description": "Breakfast and souvenir shopping for Mizo chili and bamboo crafts. Transfer to Lengpui Airport (AJL) for return flights.",
        "accommodation": "None (Departure Day)",
        "meals": "Breakfast",
        "transportation": "Dedicated Vehicle to Lengpui Airport",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "134e1d22-de79-409c-a37c-9ca4a7488491",
        "departure_date": "2027-01-24",
        "return_date": "2027-01-30",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 34999.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "nagaland-expedition-dzukou": {
    "id": "08a6c6f3-fe7d-4a5b-9845-90b5901276c7",
    "name": "Nagaland Expedition",
    "slug": "nagaland-expedition-dzukou",
    "destination_name": "Nagaland & Dzukou Valley",
    "destination_slug": "nagaland-dzukou",
    "short_description": "Untouched expedition through Nagaland: trek and camp in emerald Dzukou Valley, Khonoma green village, and Kisama heritage.",
    "description": "The Land of Warriors, Mist & Timeless Traditions. Trek into the breathtaking Dzukou Valley to sleep in a valley above the clouds with no signal, walk through Khonoma (India's first green village), Dzuleke eco village, Kisama Heritage Village, and summit Kapamodzu peak.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b922,499)\n\u2022 Itinerary: https://sites.google.com/view/gypsysouls-nagaland-sep2026/home\n\u2022 Instagram: https://www.instagram.com/p/DeR3okXgQ2D/\n\u2022 Posters & Media: https://drive.google.com/drive/folders/1gOk568oPDHiILTEb3S8CXPFG1bZgBzkt?usp=sharing",
    "category": "Offbeat vacation",
    "travel_type": "Tribal Culture & Valley Trek",
    "difficulty_level": "Moderate",
    "departure_location": "Dimapur Airport / Railway Station (DMU)",
    "cover_image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "4 Nights Homestay in Kohima / Khonoma & 1 Night Dzukou Valley Camping",
      "Dimapur to Dimapur Dedicated Vehicle Transfers",
      "Dzukou Valley Trek Entry Permits, Guide Fees & Camp Equipment",
      "Inner Line Permits (ILP) for Nagaland",
      "Khonoma Green Village & Kisama Heritage Guided Walks",
      "Daily Traditional Naga Breakfasts & Trek Meals",
      "Dedicated KV Tours Cultural & Trek Host"
    ],
    "exclusions": [
      "Travel to/from Dimapur (DMU)",
      "Lunches in cafes and towns",
      "Personal sleeping bags (rentals available) & trekking poles",
      "Tips and personal expenses"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 24999.0,
    "currency": "INR",
    "duration_days": 6,
    "duration_nights": 5,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Nagaland Expedition tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Dimapur Arrival & Scenic Drive to Kohima",
        "description": "Meet in Dimapur by 11:00 AM. Drive into the hills of Kohima. Visit the historic Kohima War Cemetery and Mary Help of Christians Cathedral. Check into traditional homestay and enjoy dinner.",
        "accommodation": "Traditional Homestay in Kohima",
        "meals": "Dinner",
        "transportation": "Dedicated Mountain Vehicle from Dimapur",
        "activities": []
      },
      {
        "day_number": 2,
        "title": "Khonoma Green Village & Dzuleke Forest Trails",
        "description": "Full-day immersion in Khonoma, India's first green village. Learn about Angami warrior history, terrace cultivation, and community conservation. Walk the tranquil forest trails of Dzuleke eco-village before returning to Kohima.",
        "accommodation": "Traditional Homestay in Kohima",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Mountain Vehicle",
        "activities": []
      },
      {
        "day_number": 3,
        "title": "Trek into Dzukou Valley & Night Above the Clouds",
        "description": "Drive to Viswema trailhead. Trek through steep stone steps and dwarf bamboo forests into the expansive emerald sanctuary of Dzukou Valley (2,450 m). Savor sunset over rolling ridgelines. Camp in tents/resthouse with warm campfire dinner.",
        "accommodation": "Camp / Trekker Hut in Dzukou Valley",
        "meals": "Breakfast, Trail Lunch & Dinner",
        "transportation": "Transfer to Trailhead",
        "activities": []
      },
      {
        "day_number": 4,
        "title": "Dzukou Sunrise Exploration & Return to Kohima",
        "description": "Witness magical morning mist rising from the valley floor. Walk to the cave and frozen crystal streams. Trek down via Jakhama trail. Transfer to Kohima for a relaxing hot shower and celebratory meal.",
        "accommodation": "Traditional Homestay in Kohima",
        "meals": "Breakfast & Dinner",
        "transportation": "Transfer from Jakhama Base",
        "activities": []
      },
      {
        "day_number": 5,
        "title": "Kisama Heritage Village & Kapamodzu Peak Climb",
        "description": "Visit Kisama Heritage Village, venue of the world-famous Hornbill Festival. Marvel at traditional morungs of 16 Naga tribes. Undertake the offbeat summit push to Kapamodzu Peak with panoramic views across Nagaland and Manipur.",
        "accommodation": "Traditional Homestay in Kohima",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Mountain Vehicle",
        "activities": []
      },
      {
        "day_number": 6,
        "title": "Kohima to Dimapur Airport Departure",
        "description": "Morning breakfast and visit local Kohima market. Scenic drive down the hills to Dimapur Airport / Railway Station with drop-off by 2:00 PM.",
        "accommodation": "None (Departure Day)",
        "meals": "Breakfast",
        "transportation": "Dedicated Mountain Vehicle to Dimapur",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "9986350c-32c1-42d1-a1e9-e4a41b50feb7",
        "departure_date": "2026-12-30",
        "return_date": "2027-01-04",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 24999.0,
        "currency": "INR",
        "status": "open"
      },
      {
        "id": "06bbf54e-98e6-4495-97cf-bb92e5bb6408",
        "departure_date": "2027-01-14",
        "return_date": "2027-01-19",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 24999.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "parsons-valley-trek": {
    "id": "d6a85b8b-155c-43d7-820e-94a21afb0d1f",
    "name": "Parsons Valley Trek",
    "slug": "parsons-valley-trek",
    "destination_name": "Nilgiris & Ooty",
    "destination_slug": "nilgiris-ooty",
    "short_description": "Exclusive day trek through Mukurthi biosphere buffer, silent pine forests, and the pristine Parsons Valley reservoir in the Nilgiris.",
    "description": "Explore one of the most strictly protected and pristine high-altitude valleys in the Western Ghats. Parsons Valley is home to shola-grassland habitats, endemic birds, and the crystal waters of the reservoir.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b93,419)\n\u2022 Registration Form: https://docs.google.com/forms/d/e/1FAIpQLSenrpYsdjRrpPkzWkjioSGjmLo5vSgQ2-MDX1_EoC_zZEQxng/viewform\n\u2022 Instagram: https://www.instagram.com/p/DfR_nKTExqb/\n\u2022 Posters & Media: https://drive.google.com/drive/folders/1rpnGzhODcJRazW82_ud-gENzzYUBK-1p?usp=sharing",
    "category": "Adventure",
    "travel_type": "Trek & Hiking",
    "difficulty_level": "Moderate",
    "departure_location": "Ooty / Nilgiris Base",
    "cover_image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "Forest Department Entry Permits & Eco-Taxes",
      "Certified Nilgiri Forest Trek Guide & First Aid",
      "Local Transfers from Ooty base to Parsons Valley Trek Point",
      "Packed Trail Lunch, Energy Snacks & Hydration",
      "Guided Flora & Fauna Interpretation"
    ],
    "exclusions": [
      "Travel to/from Ooty base",
      "Hotel accommodation before/after trek",
      "Personal trekking gear (sturdy boots, poncho)",
      "Camera fees or personal expenses"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 3799.0,
    "currency": "INR",
    "duration_days": 1,
    "duration_nights": 0,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Parsons Valley Trek tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Parsons Valley Shola & Reservoir Day Trek",
        "description": "Assemble at Ooty base by 7:00 AM. Transfer into forest check-post. Begin 10 km guided trek through shola forest canopies, montane grasslands, and quiet streams leading to Parsons Valley reservoir. Enjoy a scenic trail lunch overlooking the water, explore buffer zone biodiversity, and return by late afternoon.",
        "accommodation": "None (Day Trek)",
        "meals": "Packed Trail Lunch & Energy Refreshments",
        "transportation": "Local Jeep Transfers from Ooty Base",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "6e55b064-1f42-4f7a-8bb8-aa42bca86c36",
        "departure_date": "2026-11-15",
        "return_date": "2026-11-15",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 3799.0,
        "currency": "INR",
        "status": "open"
      },
      {
        "id": "5391ca5e-4d4d-406c-a6ae-b933e08f535b",
        "departure_date": "2026-12-06",
        "return_date": "2026-12-06",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 3799.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "rangasamy-peak-trek": {
    "id": "f0ed3c0a-81f7-4dac-8002-c15117bdda47",
    "name": "Rangasamy Peak Trek",
    "slug": "rangasamy-peak-trek",
    "destination_name": "Kotagiri & Rangasamy Peak",
    "destination_slug": "kotagiri-rangasamy",
    "short_description": "Thrilling summit ascent of Kotagiri's most sacred conical peak, offering sheer canyon drop-offs and 360-degree Nilgiri vistas.",
    "description": "Ascend Rangasamy Peak and Pillar, a solitary conical rock peak venerated by Nilgiri hill tribes. The trek climbs through tea plantations, dense shola copses, and rocky ridges to reveal jaw-dropping views of Moyar Gorge, Bhavani Sagar, and the Nilgiri hills.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b92,969)\n\u2022 Registration Form: https://docs.google.com/forms/d/e/1FAIpQLSdpabNwywKqZ6D2IOZc6maMLJ-7If0-5Z1rk4vEy9RzP_mqBg/viewform\n\u2022 Instagram: https://www.instagram.com/p/DfHqEqsDDxc/\n\u2022 Posters & Media: https://drive.google.com/drive/folders/1m0c1IGW2d1BE9MXrgT9impjJuaYT7ZGr?usp=sharing",
    "category": "Adventure",
    "travel_type": "Summit Hike & Trek",
    "difficulty_level": "Moderate to Challenging",
    "departure_location": "Kotagiri / Mettupalayam",
    "cover_image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "Local Transfers from Kotagiri Base to Trailhead",
      "Forest Permits & Local Tribal Community Guides",
      "Certified Wilderness Trek Guide",
      "Packed Trail Lunch, Fruits & Energy Hydration",
      "First Aid & Emergency Safety Backup"
    ],
    "exclusions": [
      "Travel to/from Kotagiri base",
      "Trekking poles, footwear, and personal rainwear",
      "Personal tips and miscellaneous expenses"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 3299.0,
    "currency": "INR",
    "duration_days": 1,
    "duration_nights": 0,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Rangasamy Peak Trek tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Rangasamy Peak Summit Climb & Ridge Return",
        "description": "Meet in Kotagiri at 7:30 AM and transfer to Kil-Kotagiri trailhead. Begin ascent past tea estates into steep forest ridges. Summit Rangasamy Peak (1,788 m) with sweeping views across Nilgiri river canyons. Savor trail lunch at the summit shrine and descend via scenic ridge paths. Conclude at Kotagiri by 5:00 PM.",
        "accommodation": "None (Day Trek)",
        "meals": "Trail Lunch & Summit Snacks",
        "transportation": "Jeep Transfers from Kotagiri Base",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "49bf8e82-c94c-4c89-afb3-d76acd345712",
        "departure_date": "2026-11-22",
        "return_date": "2026-11-22",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 3299.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "siruvani-trek": {
    "id": "6d980ef8-7d3c-488a-ab96-7eeb5c813af3",
    "name": "Siruvani",
    "slug": "siruvani-trek",
    "destination_name": "Siruvani & Western Ghats",
    "destination_slug": "siruvani-western-ghats",
    "short_description": "Immersive day trek through reserve forest streams and cascading waterfalls carrying the world-renowned sweet waters of Siruvani.",
    "description": "Experience the pristine foothills of the Western Ghats just outside Coimbatore. Trek through lush reserve forests, cross sweet mineral streams, visit cascading forest pools, and learn about the indigenous tribal ecosystem.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b92,699)\n\u2022 Registration Form: https://docs.google.com/forms/d/e/1FAIpQLSe-ejQ1UsAw854LEpyvwMQcpLJVEZ4w5Gcak2PXz6Rgm5FrmQ/viewform",
    "category": "Adventure",
    "travel_type": "Day Trek & Waterfalls",
    "difficulty_level": "Easy to Moderate",
    "departure_location": "Coimbatore Junction / Gandhipuram",
    "cover_image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "Coimbatore to Siruvani return transfers in private vehicle",
      "Forest Department Entry Permits & Eco Passes",
      "Experienced Local Trek Leader & Safety Lead",
      "Traditional Foothill Lunch & Evening Tea/Snacks",
      "Guided Nature & Stream Trail Walk"
    ],
    "exclusions": [
      "Transport from outside Coimbatore",
      "Personal water bottles and change of clothes",
      "Personal medical supplies"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 2999.0,
    "currency": "INR",
    "duration_days": 1,
    "duration_nights": 0,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Siruvani tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Siruvani Foothills Forest Walk & Waterfalls",
        "description": "Depart Coimbatore by 7:30 AM towards Siruvani foothills. Forest check-in and briefing. Guided 7 km nature trail along crystal clear forest streams, waterfalls, and reserve forest flora. Taste the famous sweet water straight from the mountains, enjoy a traditional lunch, and return to Coimbatore by evening.",
        "accommodation": "None (Day Trek)",
        "meals": "Traditional Lunch & Trail Snacks",
        "transportation": "Private AC Vehicle from Coimbatore",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "e16426c3-5c98-4ce5-aebf-4b07e9df0966",
        "departure_date": "2026-11-22",
        "return_date": "2026-11-22",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 2999.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "sri-lanka-new-year-edition": {
    "id": "1b1c5837-fb2b-4513-acf9-90f6cbb8cd83",
    "name": "Sri Lanka (New Year Edition)",
    "slug": "sri-lanka-new-year-edition",
    "destination_name": "Sri Lanka South Coast",
    "destination_slug": "sri-lanka-south-coast",
    "short_description": "Ring in the New Year on the southern coast of Sri Lanka: cozy private villas, Mirissa beach party, whale watching, and Galle Fort.",
    "description": "Not a holiday. A New Year's Story! Watch the last sunset of 2026 from Coconut Tree Hill, count down to midnight barefoot on Mirissa Beach, and greet the first sunrise of 2027 watching majestic blue whales from a boat safari. Featuring cozy Sri Lankan coastal villas, Galle's 400-year-old Dutch fort, surf sessions, and beach club vibes.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b935,639)\n\u2022 Itinerary: https://sites.google.com/view/srilanka-yearend/home\n\u2022 Instagram: https://www.instagram.com/p/DelclxFgeae/\n\u2022 Posters & Media: https://drive.google.com/drive/folders/1Ft_OJUlYvpxgwK_GCIOLrwPO6UIgI7hg?usp=sharing",
    "category": "Coastal vacation",
    "travel_type": "International Island & Beach NYE",
    "difficulty_level": "Easy",
    "departure_location": "Bandaranaike International Airport, Colombo (CMB)",
    "cover_image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "4 Nights Stay in Handpicked Sri Lankan Coastal Villas in Mirissa",
      "Round-trip Airport Transfers (Colombo Airport - South Coast - Colombo)",
      "Private Sunrise Blue Whale Watching Boat Safari",
      "Guided Walking Tour of UNESCO Galle Dutch Fort & Lighthouse",
      "Coconut Tree Hill Sunset Excursion & Surf lesson",
      "Daily Tropical Breakfasts (Day 2 to 5)",
      "Dedicated KV Tours Island Host & Coordinator"
    ],
    "exclusions": [
      "International Flights to/from Colombo (CMB)",
      "Sri Lanka ETA / Visa (Indian passport holders check current waiver)",
      "Lunches and Dinners (curated dining at beachfront cafes)",
      "Personal alcoholic beverages and water sports rentals"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 39599.0,
    "currency": "INR",
    "duration_days": 5,
    "duration_nights": 4,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Sri Lanka (New Year Edition) tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Arrive Colombo & Coastal Drive to Mirissa Villa",
        "description": "Land at Bandaranaike International Airport (CMB) in Colombo. Chauffeur pickup and scenic expressway drive down the southwest coast to Mirissa. Check in to our cozy private beach villa. Relax, swim, and evening sunset drinks by the Indian Ocean.",
        "accommodation": "Cozy Coastal Villa in Mirissa",
        "meals": "Welcome Dinner",
        "transportation": "Private AC Vehicle from Colombo",
        "activities": []
      },
      {
        "day_number": 2,
        "title": "Galle Fort Heritage, Stilt Fishermen & Surf Intro",
        "description": "Morning excursion to UNESCO World Heritage Galle Dutch Fort. Walk the 400-year-old sea-facing ramparts, lighthouse, and boutique lanes. Watch traditional stilt fishermen at Koggala. Afternoon beginner surf session in Weligama bay.",
        "accommodation": "Cozy Coastal Villa in Mirissa",
        "meals": "Breakfast",
        "transportation": "Private AC Vehicle",
        "activities": []
      },
      {
        "day_number": 3,
        "title": "Coconut Tree Hill Sunset & Mirissa Beach NYE Countdown",
        "description": "Morning leisure at secret coves and cafes. Late afternoon gather at iconic Coconut Tree Hill to watch the final sunset of 2026 melt into the ocean. Head to Mirissa beach for seafood dinner, beach clubs, and barefoot countdown into 2027 with fireworks.",
        "accommodation": "Cozy Coastal Villa in Mirissa",
        "meals": "Breakfast",
        "transportation": "Private AC Vehicle",
        "activities": []
      },
      {
        "day_number": 4,
        "title": "Sunrise Blue Whale Boat Safari & Beach Relaxation",
        "description": "Early morning boat safari into deep waters off Mirissa to spot blue whales, sperm whales, and spinning dolphins. Afternoon slow island recovery, massage, and farewell coastal feast with the travel tribe.",
        "accommodation": "Cozy Coastal Villa in Mirissa",
        "meals": "Breakfast",
        "transportation": "Boat & Local Transfers",
        "activities": []
      },
      {
        "day_number": 5,
        "title": "Mirissa to Colombo Airport & Departure",
        "description": "Breakfast at the villa. Pack up memories and drive north along the coastal highway to Colombo International Airport for flights home.",
        "accommodation": "None (Departure Day)",
        "meals": "Breakfast",
        "transportation": "Private AC Vehicle to Colombo Airport",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "9b16fc5f-aad2-47cd-b026-8a33ab661ceb",
        "departure_date": "2026-12-29",
        "return_date": "2027-01-02",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 39599.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "surf-and-roam-gokarna": {
    "id": "8be47c4c-712d-4f84-b580-a7929385df12",
    "name": "Surf & Roam Gokarna",
    "slug": "surf-and-roam-gokarna",
    "destination_name": "Gokarna",
    "destination_slug": "gokarna",
    "short_description": "Three days along Karnataka's slow coast with guided surf sessions, quiet river mouths, hidden coastal stretches and beach sunsets.",
    "description": "Salt, surf and the slow coastal rhythm of Gokarna. Designed for first-timers and active explorers alike, this 3-day journey features three professional surf lessons, ocean safety instruction, relaxed estuary exploration, sunset viewpoints, and authentic coastal dining with your travel tribe.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b910,169)\n\u2022 Itinerary: https://sites.google.com/view/gokarnasurfroam/home\n\u2022 Instagram: https://www.instagram.com/p/Dd_aCbICvQO/\n\u2022 Posters & Media: https://drive.google.com/drive/folders/1J2IeaPelwTLhFxdvfix66kurIZc5xP19?usp=sharing",
    "category": "Adventure",
    "travel_type": "Coastal & Surf",
    "difficulty_level": "Easy to Moderate",
    "departure_location": "Mangalore Central Railway Station",
    "cover_image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "2 Nights Beachside Resort / Homestay Stay in Gokarna",
      "3 Guided Professional Surf Lessons with Gear & Boards",
      "Ocean Safety, Paddling, Wave Selection & Balance Coaching",
      "Pick-up and Drop from Mangalore Central Railway Station",
      "Local Transportation across Gokarna Beaches & Viewpoints",
      "Daily Breakfast and Guided Coastal Walks",
      "Dedicated KV Tours Trip Lead & Community Host"
    ],
    "exclusions": [
      "Train / Flight tickets to/from Mangalore",
      "Personal water sports & specialized gear rental beyond surfing",
      "Meals not specified in the itinerary",
      "Personal expenses, telephone, laundry, and tips"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 11299.0,
    "currency": "INR",
    "duration_days": 3,
    "duration_nights": 2,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Surf & Roam Gokarna tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Mangalore to Gokarna Arrival & First Surf Session",
        "description": "Meet trip lead at Mangalore Central Railway Station by 6:30 AM. Coastal breakfast stop en route to Gokarna. Check into beachside stay, relax, and head for Surf Session 01 covering ocean safety, paddling, and catching your first waves. Sunset gather by the coast and welcome dinner.",
        "accommodation": "Beachside Cottage / Homestay in Gokarna",
        "meals": "Breakfast & Dinner",
        "transportation": "Shared AC Vehicle from Mangalore to Gokarna",
        "activities": []
      },
      {
        "day_number": 2,
        "title": "Morning Surf Coaching & Estuary Sunset",
        "description": "Morning coastal coffee followed by Surf Session 02 focusing on wave timing, balance, and pop-up technique. Afternoon explore local Gokarna temple streets, Mahabaleshwar temple corridor, and quiet river mouths. Golden hour on the cliffs followed by a bonfire evening.",
        "accommodation": "Beachside Cottage / Homestay in Gokarna",
        "meals": "Breakfast",
        "transportation": "Local Transfers in Gokarna",
        "activities": []
      },
      {
        "day_number": 3,
        "title": "Free Surf Session, Beach Roam & Return to Mangalore",
        "description": "Final morning Surf Session 03 to ride waves independently and capture surf photos. Check-out by noon. Visit scenic Mirjan Fort and scenic viewpoints en route back to Mangalore Central for evening departures.",
        "accommodation": "None (Departure Day)",
        "meals": "Breakfast",
        "transportation": "Shared AC Vehicle back to Mangalore",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "3109591b-cecb-4324-9c99-4ace4a30783f",
        "departure_date": "2026-11-27",
        "return_date": "2026-11-29",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 11299.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "tawang-and-kaziranga": {
    "id": "3de90129-c0a5-4dbd-853b-39251f816f42",
    "name": "Tawang & Kaziranga",
    "slug": "tawang-and-kaziranga",
    "destination_name": "Tawang & Kaziranga",
    "destination_slug": "tawang-kaziranga",
    "short_description": "New Year expedition through high Himalayan passes: Kaziranga rhino safari, Sela Pass (13,700 ft), Tawang Monastery and Bum La Pass.",
    "description": "High Passes, Hidden Valleys, and Wild Grasslands. Journey from the rhino-rich plains of Kaziranga in Assam up into the eastern Himalayas of Arunachal Pradesh. Cross frozen Sela Pass, witness the spiritual majesty of 400-year-old Tawang Monastery, and reach the high Indo-China border frontier at Bum La and Sangetsar Lake.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b929,699)\n\u2022 Itinerary: https://sites.google.com/view/twang-kaziranga/home\n\u2022 Instagram: https://www.instagram.com/p/DeUmp2dAW3R/\n\u2022 Posters & Media: https://drive.google.com/drive/folders/1RDio9xP22cbwNhF6LpyhO252yT-v7_Cd?usp=sharing",
    "category": "Offbeat vacation",
    "travel_type": "Himalayan Road Trip & Wildlife",
    "difficulty_level": "Challenging",
    "departure_location": "Guwahati Airport / Railway Station",
    "cover_image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "6 Nights Accommodation (Kaziranga, Dirang, Tawang, Bomdila)",
      "Dedicated SUV Vehicle with Experienced Himalayan Chauffeur",
      "Kaziranga National Park Jeep Safari & Park Entry Permits",
      "Inner Line Permits (ILP) for Arunachal Pradesh",
      "Bum La Pass & Sangetsar Lake Army Permits & Local 4x4",
      "Daily Breakfasts and Dinners as per itinerary",
      "Experienced KV Tours Mountain Lead"
    ],
    "exclusions": [
      "Travel to/from Guwahati",
      "Elephant safari charges in Kaziranga",
      "Personal heavy winter gear (thermal boots, down jackets)",
      "Personal tips, laundry and medical emergencies"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 32999.0,
    "currency": "INR",
    "duration_days": 7,
    "duration_nights": 6,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Tawang & Kaziranga tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Guwahati to Kaziranga National Park",
        "description": "Assemble in Guwahati by 9:00 AM. Drive east along the Brahmaputra valley to Kaziranga. Check in to jungle lodge and visit Orchid biodiversity park. Evening cultural folk dance and safari briefing.",
        "accommodation": "Jungle Lodge in Kaziranga",
        "meals": "Dinner",
        "transportation": "Dedicated SUV / Force Traveler",
        "activities": []
      },
      {
        "day_number": 2,
        "title": "Kaziranga Rhino Safari & Ascent to Dirang Valley",
        "description": "Early morning open jeep safari in Kaziranga to track the greater one-horned rhinoceros, wild water buffaloes, and deer. Drive across the Arunachal border into Dirang valley. Visit Dirang Dzong ancient stone village.",
        "accommodation": "Mountain Hotel in Dirang",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Mountain Vehicle",
        "activities": []
      },
      {
        "day_number": 3,
        "title": "Dirang across Sela Pass (13,700 ft) to Tawang",
        "description": "Drive up to the frozen Sela Pass at 13,700 ft with views of Sela Lake. Pay homage at Jaswant Garh War Memorial. Descend past magnificent Nuranang (Jung) Falls into Tawang valley. Check in and rest.",
        "accommodation": "Cozy Hotel in Tawang",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Mountain Vehicle",
        "activities": []
      },
      {
        "day_number": 4,
        "title": "Bum La Pass & Sangetsar (Madhuri) Lake Frontier",
        "description": "Board high-altitude 4x4 vehicles for the Indo-China border at Bum La Pass (15,200 ft). Marvel at frozen alpine lakes and scenic Sangetsar Lake. Return to Tawang for evening sound-and-light show at Tawang War Memorial.",
        "accommodation": "Cozy Hotel in Tawang",
        "meals": "Breakfast & Dinner",
        "transportation": "Local 4x4 Mountain Vehicles",
        "activities": []
      },
      {
        "day_number": 5,
        "title": "Tawang Monastery Spiritual Trail & Urgelling Gompa",
        "description": "Visit Tawang Monastery (Galden Namgyal Lhatse), the second largest Buddhist monastery in the world. Explore ancient manuscripts, museum, and spinning prayer wheels. Afternoon visit Urgelling, birthplace of the 6th Dalai Lama.",
        "accommodation": "Cozy Hotel in Tawang",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Mountain Vehicle",
        "activities": []
      },
      {
        "day_number": 6,
        "title": "Tawang to Bomdila Monastery & Market",
        "description": "Scenic mountain return drive over passes to Bomdila. Visit Bomdila Monastery, viewpoint overlooking the eastern Himalayan ranges, and explore local Tibetan craft markets.",
        "accommodation": "Hotel in Bomdila",
        "meals": "Breakfast & Dinner",
        "transportation": "Dedicated Mountain Vehicle",
        "activities": []
      },
      {
        "day_number": 7,
        "title": "Bomdila to Guwahati Airport & Farewell",
        "description": "Early morning drive down through the Bhalukpong corridor into the plains of Assam. Arrive at Guwahati Airport by 5:00 PM for return flights.",
        "accommodation": "None (Departure Day)",
        "meals": "Breakfast",
        "transportation": "Dedicated Vehicle to Guwahati",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "d493d299-b67f-4ef9-9df9-422bf1bb1c2b",
        "departure_date": "2026-12-28",
        "return_date": "2027-01-03",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 32999.0,
        "currency": "INR",
        "status": "open"
      },
      {
        "id": "63dfa8d3-83ea-4765-8b80-dafe916d6d14",
        "departure_date": "2027-01-24",
        "return_date": "2027-01-30",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 32999.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  },
  "vellagavi-trek-poondi": {
    "id": "b2c62812-6244-4db1-97ba-cdc3ad9472ae",
    "name": "Vellagavi",
    "slug": "vellagavi-trek-poondi",
    "destination_name": "Kodaikanal & Vellagavi",
    "destination_slug": "kodaikanal-vellagavi",
    "short_description": "Kodai like never before: trek to the ancient roadless village of Vellagavi, combined with a peaceful mountain retreat in Poondi and Kilavarai.",
    "description": "Explore the hidden soul of the Palani Hills beyond tourist viewpoints. Hike 9 km through dense forest trails and boulder streams up to Vellagavi, an ancient roadless settlement where residents walk barefoot out of respect for sacred ground. Continue to high-altitude Poondi and Kilavarai for breathtaking valley panoramas.\n\n\u2022 Min Travelers: 4 | Max Travelers: 12\n\u2022 B2B Rate: 10% discount per booking (Net: \u20b98,099)\n\u2022 Itinerary: https://sites.google.com/view/vellagavixpoondi/home\n\u2022 Posters & Media: https://drive.google.com/drive/folders/1IdoucVKIsYLIGKzd3NMy2Iay0Jc_N4VI?usp=sharing",
    "category": "Adventure",
    "travel_type": "Offbeat Trek & Village Stay",
    "difficulty_level": "Moderate to Challenging",
    "departure_location": "Periyakulam / Kumbakkarai Base",
    "cover_image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    "inclusions": [
      "1 Night Camping / Homestay in Vellagavi Village",
      "1 Night Premium Offbeat Stay in Poondi / Kodaikanal Hills",
      "5 Authentic Meals (Breakfasts & Dinners as per itinerary)",
      "Forest Permits, Trek Guides & Village Entry Clearance",
      "Internal Transfers between Kumbakkarai base, Kodaikanal & Poondi",
      "Bonfire Evening & Curated Storytelling"
    ],
    "exclusions": [
      "Transport from home city to Kumbakkarai base",
      "Lunches on Day 1 & Day 3",
      "Personal trekking equipment and baggage porterage"
    ],
    "child_price": null,
    "infant_price": null,
    "single_room_supplement": null,
    "booking_cutoff_days": 3,
    "cancellation_policy": null,
    "base_price": 8999.0,
    "currency": "INR",
    "duration_days": 3,
    "duration_nights": 2,
    "minimum_travellers": 4,
    "maximum_travellers": 12,
    "seo_title": null,
    "seo_description": null,
    "images": [
      {
        "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        "alt_text": "Vellagavi tour package",
        "is_featured": true,
        "sort_order": 0
      }
    ],
    "hotels": [],
    "activities": [],
    "itinerary": [
      {
        "day_number": 1,
        "title": "Trek from Kumbakkarai Falls to Vellagavi Village",
        "description": "Freshen up and breakfast near base. Begin 9 km trek from Kumbakkarai Falls through forest trails, boulder streams, and uphill terrain. Reach Vellagavi by afternoon. Village walk, meet village elders, learn about the temple traditions, and camp under the stars.",
        "accommodation": "Village Homestay / Tents in Vellagavi",
        "meals": "Lunch & Dinner",
        "transportation": "Base Jeep Transfer",
        "activities": []
      },
      {
        "day_number": 2,
        "title": "Ascent to Kodaikanal, Dolphin's Nose & Poondi Retreat",
        "description": "Sunrise hike with panoramic valley views. Trek up to Dolphin's Nose and Vattakanal. Board vehicle for scenic mountain drive to the tranquil village of Poondi. Check in to premium secluded homestay with evening bonfire.",
        "accommodation": "Serene Mountain Resort / Homestay in Poondi",
        "meals": "Breakfast & Dinner",
        "transportation": "Private Hill Vehicle",
        "activities": []
      },
      {
        "day_number": 3,
        "title": "Kilavarai Border Village Exploration & Departure",
        "description": "Morning drive to Kilavarai, the picturesque last village of the Palani circuit bordering Kerala. Walk through terraced garlic and carrot farms. Return to Kodaikanal/base for onward journeys.",
        "accommodation": "None (Departure Day)",
        "meals": "Breakfast",
        "transportation": "Private Hill Vehicle to Base",
        "activities": []
      }
    ],
    "upcoming_departures": [
      {
        "id": "ec2781b1-7e96-43de-b874-6c6e40954090",
        "departure_date": "2026-11-27",
        "return_date": "2026-11-29",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 8999.0,
        "currency": "INR",
        "status": "open"
      },
      {
        "id": "4eb9ed4e-35ec-41be-a813-d54026e6c31b",
        "departure_date": "2026-12-25",
        "return_date": "2026-12-27",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 8999.0,
        "currency": "INR",
        "status": "open"
      },
      {
        "id": "e992f451-ad4c-42cd-8357-9e035d265b21",
        "departure_date": "2026-12-31",
        "return_date": "2027-01-02",
        "total_capacity": 12,
        "available_capacity": 12,
        "special_price": 8999.0,
        "currency": "INR",
        "status": "open"
      }
    ],
    "add_ons": []
  }
};

export function getInitialDestinationDetail(slug: string): PublicDestinationDetail | null {
  const clean = slug.trim().toLowerCase();
  return INITIAL_DESTINATION_DETAILS[clean] || null;
}

export function getInitialPackageDetail(slug: string): PublicPackageDetail | null {
  const clean = slug.trim().toLowerCase();
  return INITIAL_PACKAGE_DETAILS[clean] || null;
}
