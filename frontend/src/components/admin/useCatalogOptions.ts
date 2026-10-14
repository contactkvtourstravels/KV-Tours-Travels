"use client";

import { useState, useEffect, useCallback } from "react";
import { adminOptionsApi, CatalogCategoriesResponse } from "@/lib/api";

const FALLBACK_OPTIONS: CatalogCategoriesResponse = {
  destination_categories: [
    "Hill Station",
    "Beach & Coastal",
    "Cultural & Heritage",
    "Wildlife & Nature",
    "Pilgrimage & Spiritual",
    "Adventure & Trekking",
    "Island & Tropical",
    "Desert & Dunes",
    "Urban & City Break",
    "Ayurveda & Wellness",
  ],
  destination_travel_types: [
    "Family Holidays",
    "Honeymoon & Romance",
    "Solo Exploration",
    "Luxury Escapes",
    "Weekend Getaway",
    "Group Tours",
    "Adventure Expeditions",
  ],
  package_categories: [
    "Hill Station",
    "Beach & Coastal",
    "Cultural & Heritage",
    "Wildlife & Nature",
    "Pilgrimage & Spiritual",
    "Adventure & Trekking",
    "Island & Tropical",
    "Desert & Dunes",
    "Urban & City Break",
    "Ayurveda & Wellness",
  ],
  package_travel_types: [
    "Family Holidays",
    "Honeymoon & Romance",
    "Solo Exploration",
    "Luxury Escapes",
    "Weekend Getaway",
    "Group Tours",
    "Adventure Expeditions",
  ],
  package_difficulty_levels: ["Easy", "Moderate", "Challenging", "Strenuous", "Expert"],
  activity_categories: [
    "Water Sports",
    "Adventure & Trekking",
    "Sightseeing & Heritage",
    "Cultural & Local Life",
    "Wildlife & Nature",
    "Culinary & Dining",
    "Wellness & Spa",
    "Cruises & Sailing",
    "Photography & Scenic",
  ],
};

export function useCatalogOptions() {
  const [options, setOptions] = useState<CatalogCategoriesResponse>(FALLBACK_OPTIONS);
  const [loading, setLoading] = useState(true);

  const fetchOptions = useCallback(async () => {
    try {
      const data = await adminOptionsApi.getCategories();
      if (data) {
        setOptions(data);
      }
    } catch {
      // Use fallback defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const addCustomCategory = useCallback(
    async (field: keyof CatalogCategoriesResponse, value: string) => {
      const cleaned = value.trim();
      if (!cleaned) return;

      // Optimistic local update
      setOptions((prev) => {
        const currentList = prev[field] || [];
        if (!currentList.some((c) => c.toLowerCase() === cleaned.toLowerCase())) {
          return {
            ...prev,
            [field]: [...currentList, cleaned].sort((a, b) => a.localeCompare(b)),
          };
        }
        return prev;
      });

      try {
        const updated = await adminOptionsApi.registerCategory(field, cleaned);
        if (updated) {
          setOptions(updated);
        }
      } catch {
        // Kept optimistic update
      }
    },
    []
  );

  return { options, loading, addCustomCategory, refreshOptions: fetchOptions };
}
