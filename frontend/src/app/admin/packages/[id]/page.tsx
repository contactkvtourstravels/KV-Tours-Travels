"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package as PackageIcon,
  DollarSign,
  Image as ImageIcon,
  Calendar,
  Building2,
  Compass,
  CalendarCheck,
  Tag,
  Search,
  Plus,
  Trash2,
  Edit2,
  Save,
  Star,
  MapPin,
  AlertCircle,
  X,
  Upload,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Clock,
} from "lucide-react";
import {
  adminApi,
  PackageItem,
  Destination,
  PackageImage,
  PackageDay,
  PackageHotelBinding,
  PackageActivityBinding,
  PackageDeparture,
  Hotel,
  Activity,
  AddOn,
} from "@/lib/api";
import { useAdmin } from "../../AdminContext";
import { CreatableSelect } from "@/components/admin/CreatableSelect";
import { SearchableSelect } from "@/components/admin/SearchableSelect";
import { useCatalogOptions } from "@/components/admin/useCatalogOptions";

type TabKey =
  | "overview"
  | "pricing"
  | "images"
  | "itinerary"
  | "hotels"
  | "activities"
  | "departures"
  | "addons"
  | "seo";



export default function PackageEditorPage() {
  const params = useParams();
  const packageId = params.id as string;
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["manager", "admin", "super_admin"]);
  const { options: catalogOptions, addCustomCategory } = useCatalogOptions();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Core Data
  const [pkg, setPkg] = useState<PackageItem | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [images, setImages] = useState<PackageImage[]>([]);
  const [itinerary, setItinerary] = useState<PackageDay[]>([]);
  const [packageHotels, setPackageHotels] = useState<PackageHotelBinding[]>([]);
  const [packageActivities, setPackageActivities] = useState<PackageActivityBinding[]>([]);
  const [departures, setDepartures] = useState<PackageDeparture[]>([]);
  const [destinationHotels, setDestinationHotels] = useState<Hotel[]>([]);
  const [destinationActivities, setDestinationActivities] = useState<Activity[]>([]);
  const [globalAddOns, setGlobalAddOns] = useState<AddOn[]>([]);

  const destinationOptions = useMemo(
    () =>
      destinations.map((d) => ({
        id: d.id,
        label: d.name,
        subLabel: d.country,
        badge: d.is_published ? undefined : "Draft",
      })),
    [destinations]
  );

  const hotelOptions = useMemo(
    () =>
      destinationHotels.map((h) => ({
        id: h.id,
        label: h.name,
        badge: h.star_rating ? `${h.star_rating}★` : undefined,
      })),
    [destinationHotels]
  );

  const activityOptions = useMemo(
    () =>
      destinationActivities.map((a) => ({
        id: a.id,
        label: a.name,
        subLabel: a.category || "General",
      })),
    [destinationActivities]
  );

  const loadDestinationOptions = useCallback(async (query: string, signal?: AbortSignal) => {
    try {
      const res = await adminApi.getDestinations({
        search: query.trim() || undefined,
        page: 1,
        page_size: 25,
        is_active: true,
      });
      return res.items.map((d) => ({
        id: d.id,
        label: d.name,
        subLabel: d.country,
        badge: d.is_published ? undefined : "Draft",
      }));
    } catch {
      return [];
    }
  }, []);

  const resolveDestinationOption = useCallback(async (id: string) => {
    try {
      const d = await adminApi.getDestination(id);
      return {
        id: d.id,
        label: d.name,
        subLabel: d.country,
        badge: d.is_published ? undefined : "Draft",
      };
    } catch {
      return null;
    }
  }, []);

  const pkgDestinationId = pkg?.destination_id;

  const loadHotelOptions = useCallback(
    async (query: string) => {
      try {
        const res = await adminApi.listHotels({
          destination_id: pkgDestinationId,
          search: query.trim() || undefined,
          page: 1,
          page_size: 25,
          is_active: true,
        });
        return res.items.map((h) => ({
          id: h.id,
          label: h.name,
          subLabel: h.address || undefined,
          badge: h.star_rating ? `${h.star_rating}★` : undefined,
        }));
      } catch {
        return [];
      }
    },
    [pkgDestinationId]
  );

  const resolveHotelOption = useCallback(async (id: string) => {
    try {
      const h = await adminApi.getHotel(id);
      return {
        id: h.id,
        label: h.name,
        subLabel: h.address || undefined,
        badge: h.star_rating ? `${h.star_rating}★` : undefined,
      };
    } catch {
      return null;
    }
  }, []);

  const loadActivityOptions = useCallback(
    async (query: string) => {
      try {
        const res = await adminApi.listActivities({
          destination_id: pkgDestinationId,
          search: query.trim() || undefined,
          page: 1,
          page_size: 25,
          status: "active",
        });
        return res.items.map((a) => ({
          id: a.id,
          label: a.name,
          subLabel: `${a.category || "Activity"} • ${a.duration_minutes ? `${a.duration_minutes}m` : ""}`,
        }));
      } catch {
        return [];
      }
    },
    [pkgDestinationId]
  );

  const resolveActivityOption = useCallback(async (id: string) => {
    try {
      const a = await adminApi.getActivity(id);
      return {
        id: a.id,
        label: a.name,
        subLabel: `${a.category || "Activity"} • ${a.duration_minutes ? `${a.duration_minutes}m` : ""}`,
      };
    } catch {
      return null;
    }
  }, []);

  // Tab 1: Overview Form State
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDestinationId, setFormDestinationId] = useState("");
  const [formCategory, setFormCategory] = useState("Family Vacation");
  const [formTravelType, setFormTravelType] = useState("Private Guided Tour");
  const [formDifficultyLevel, setFormDifficultyLevel] = useState("Easy / Relaxed");
  const [formDepartureLocation, setFormDepartureLocation] = useState("Coimbatore");
  const [formCoverImageUrl, setFormCoverImageUrl] = useState("");
  const [formShortDesc, setFormShortDesc] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDurationDays, setFormDurationDays] = useState(1);
  const [formDurationNights, setFormDurationNights] = useState(0);
  const [formMinTravellers, setFormMinTravellers] = useState(1);
  const [formMaxTravellers, setFormMaxTravellers] = useState<number | "">("");
  const [formInclusions, setFormInclusions] = useState<string[]>([]);
  const [formExclusions, setFormExclusions] = useState<string[]>([]);
  const [formFeatured, setFormFeatured] = useState(false);
  const [formPublished, setFormPublished] = useState(false);
  const [formActive, setFormActive] = useState(true);

  // Tab 2: Pricing Form State
  const [formBasePrice, setFormBasePrice] = useState<number>(0);
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formChildPrice, setFormChildPrice] = useState<number | "">("");
  const [formInfantPrice, setFormInfantPrice] = useState<number | "">("");
  const [formSingleRoomSupplement, setFormSingleRoomSupplement] = useState<number | "">("");
  const [formBookingCutoffDays, setFormBookingCutoffDays] = useState<number>(0);
  const [formCancellationPolicy, setFormCancellationPolicy] = useState("");

  // Tab 9: SEO Form State
  const [formSeoTitle, setFormSeoTitle] = useState("");
  const [formSeoDesc, setFormSeoDesc] = useState("");

  // Tab 3: Images Form State
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");
  const [newImageSort, setNewImageSort] = useState(0);
  const [newImageFeatured, setNewImageFeatured] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Tab 4: Itinerary Day Modal State
  const [dayModalMode, setDayModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedDay, setSelectedDay] = useState<PackageDay | null>(null);
  const [formDayNumber, setFormDayNumber] = useState<number>(1);
  const [formDayTitle, setFormDayTitle] = useState("");
  const [formDayDesc, setFormDayDesc] = useState("");
  const [formDayAccom, setFormDayAccom] = useState("");
  const [formDayMeals, setFormDayMeals] = useState("");
  const [formDayTrans, setFormDayTrans] = useState("");
  const [linkActivityDayId, setLinkActivityDayId] = useState<string | null>(null);
  const [selectedActivityToLink, setSelectedActivityToLink] = useState("");

  // Tab 5 & 6: Link Hotel & Link Activity
  const [selectedHotelToLink, setSelectedHotelToLink] = useState("");
  const [selectedPackageActivityToLink, setSelectedPackageActivityToLink] = useState("");

  // Tab 7: Departures Form Modal State
  const [depModalMode, setDepModalMode] = useState<"create" | "edit" | null>(null);
  const [selectedDep, setSelectedDep] = useState<PackageDeparture | null>(null);
  const [formDepDate, setFormDepDate] = useState("");
  const [formDepReturnDate, setFormDepReturnDate] = useState("");
  const [formDepTotalCap, setFormDepTotalCap] = useState(20);
  const [formDepReservedCap, setFormDepReservedCap] = useState(0);
  const [formDepSpecialPrice, setFormDepSpecialPrice] = useState<number | "">("");
  const [formDepStatus, setFormDepStatus] = useState<PackageDeparture["status"]>("open");

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load Package details
      const packageData = await adminApi.getPackage(packageId);
      setPkg(packageData);
      setFormName(packageData.name);
      setFormSlug(packageData.slug);
      setFormDestinationId(packageData.destination_id);
      setFormCategory(packageData.category || "Family Vacation");
      setFormTravelType(packageData.travel_type || "Private Guided Tour");
      setFormDifficultyLevel(packageData.difficulty_level || "Easy / Relaxed");
      setFormDepartureLocation(packageData.departure_location || "Coimbatore");
      setFormCoverImageUrl(packageData.cover_image_url || "");
      setFormShortDesc(packageData.short_description || "");
      setFormDesc(packageData.description || "");
      setFormDurationDays(packageData.duration_days);
      setFormDurationNights(packageData.duration_nights);
      setFormMinTravellers(packageData.minimum_travellers);
      setFormMaxTravellers(packageData.maximum_travellers ?? "");
      setFormInclusions(
        Array.isArray(packageData.inclusions_json) ? [...packageData.inclusions_json] : []
      );
      setFormExclusions(
        Array.isArray(packageData.exclusions_json) ? [...packageData.exclusions_json] : []
      );

      setFormBasePrice(Number(packageData.base_price));
      setFormCurrency(packageData.currency);
      setFormChildPrice(
        packageData.child_price != null ? Number(packageData.child_price) : ""
      );
      setFormInfantPrice(
        packageData.infant_price != null ? Number(packageData.infant_price) : ""
      );
      setFormSingleRoomSupplement(
        packageData.single_room_supplement != null
          ? Number(packageData.single_room_supplement)
          : ""
      );
      setFormBookingCutoffDays(packageData.booking_cutoff_days ?? 0);
      setFormCancellationPolicy(packageData.cancellation_policy || "");

      setFormFeatured(packageData.is_featured);
      setFormPublished(packageData.is_published);
      setFormActive(packageData.is_active);
      setFormSeoTitle(packageData.seo_title || "");
      setFormSeoDesc(packageData.seo_description || "");

      // Load sub-resources in parallel
      const [
        destRes,
        imagesRes,
        itineraryRes,
        hotelsRes,
        activitiesRes,
        departuresRes,
        destHotelsRes,
        destActsRes,
        addonsRes,
      ] = await Promise.all([
        adminApi.getDestinations({ page: 1, page_size: 100 }),
        adminApi.listPackageImages(packageId),
        adminApi.listPackageItinerary(packageId),
        adminApi.listPackageHotels(packageId),
        adminApi.listPackageActivities(packageId),
        adminApi.listPackageDepartures(packageId),
        adminApi.listHotels({
          destination_id: packageData.destination_id,
          page: 1,
          page_size: 100,
        }),
        adminApi.listActivities({
          destination_id: packageData.destination_id,
          page: 1,
          page_size: 100,
        }),
        adminApi.listAddOns({ page: 1, page_size: 100, is_active: true }),
      ]);

      setDestinations(destRes.items);
      setImages(imagesRes);
      setItinerary(itineraryRes);
      setPackageHotels(hotelsRes);
      setPackageActivities(activitiesRes);
      setDepartures(departuresRes);
      setDestinationHotels(destHotelsRes.items);
      setDestinationActivities(destActsRes.items);
      setGlobalAddOns(addonsRes.items);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load package data.");
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Save General Attributes (Overview, Pricing, Inclusions, SEO)
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const cleanedInclusions = formInclusions
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
      const cleanedExclusions = formExclusions
        .map((x) => x.trim())
        .filter((x) => x.length > 0);

      const updated = await adminApi.updatePackage(packageId, {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        destination_id: formDestinationId,
        category: formCategory.trim() || undefined,
        travel_type: formTravelType.trim() || undefined,
        difficulty_level: formDifficultyLevel.trim() || undefined,
        departure_location: formDepartureLocation.trim() || undefined,
        cover_image_url: formCoverImageUrl.trim() || undefined,
        short_description: formShortDesc.trim() || undefined,
        description: formDesc.trim() || undefined,
        duration_days: Number(formDurationDays),
        duration_nights: Number(formDurationNights),
        minimum_travellers: Number(formMinTravellers),
        maximum_travellers:
          formMaxTravellers === "" ? undefined : Number(formMaxTravellers),
        inclusions_json: cleanedInclusions,
        exclusions_json: cleanedExclusions,
        base_price: Number(formBasePrice),
        currency: formCurrency.toUpperCase(),
        child_price: formChildPrice === "" ? undefined : Number(formChildPrice),
        infant_price: formInfantPrice === "" ? undefined : Number(formInfantPrice),
        single_room_supplement:
          formSingleRoomSupplement === "" ? undefined : Number(formSingleRoomSupplement),
        booking_cutoff_days: Number(formBookingCutoffDays || 0),
        cancellation_policy: formCancellationPolicy.trim() || undefined,
        is_featured: formFeatured,
        is_published: formPublished,
        is_active: formActive,
        seo_title: formSeoTitle.trim() || undefined,
        seo_description: formSeoDesc.trim() || undefined,
      });
      setPkg(updated);
      setSuccessMessage("Package saved successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to save package details.");
    } finally {
      setSaving(false);
    }
  };

  // Upload Cover Image
  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      const res = await adminApi.uploadMedia(file, "travelagency/packages");
      setFormCoverImageUrl(res.url);
      setSuccessMessage("Cover photo uploaded successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to upload cover photo.");
    } finally {
      setUploadingCover(false);
    }
  };

  // Inclusions & Exclusions helpers
  const addInclusionItem = () => {
    setFormInclusions([...formInclusions, ""]);
  };

  const removeInclusionItem = (index: number) => {
    setFormInclusions(formInclusions.filter((_, i) => i !== index));
  };

  const updateInclusionItem = (index: number, val: string) => {
    const next = [...formInclusions];
    next[index] = val;
    setFormInclusions(next);
  };

  const moveInclusionUp = (index: number) => {
    if (index === 0) return;
    const next = [...formInclusions];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setFormInclusions(next);
  };

  const moveInclusionDown = (index: number) => {
    if (index === formInclusions.length - 1) return;
    const next = [...formInclusions];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setFormInclusions(next);
  };

  const addPresetInclusion = (text: string) => {
    if (formInclusions.includes(text)) return;
    setFormInclusions([...formInclusions, text]);
  };

  const addExclusionItem = () => {
    setFormExclusions([...formExclusions, ""]);
  };

  const removeExclusionItem = (index: number) => {
    setFormExclusions(formExclusions.filter((_, i) => i !== index));
  };

  const updateExclusionItem = (index: number, val: string) => {
    const next = [...formExclusions];
    next[index] = val;
    setFormExclusions(next);
  };

  const moveExclusionUp = (index: number) => {
    if (index === 0) return;
    const next = [...formExclusions];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setFormExclusions(next);
  };

  const moveExclusionDown = (index: number) => {
    if (index === formExclusions.length - 1) return;
    const next = [...formExclusions];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setFormExclusions(next);
  };

  const addPresetExclusion = (text: string) => {
    if (formExclusions.includes(text)) return;
    setFormExclusions([...formExclusions, text]);
  };


  // Image actions
  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      setError(null);
      const res = await adminApi.uploadMedia(file, "travelagency/packages");
      setNewImageUrl(res.url);
      if (!newImageAlt) {
        setNewImageAlt(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
      setSuccessMessage("Image file uploaded successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to upload image file.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim() || !newImageAlt.trim()) {
      setError("Image URL and Alt Text are required.");
      return;
    }
    try {
      setSaving(true);
      await adminApi.addPackageImage(packageId, {
        image_url: newImageUrl.trim(),
        alt_text: newImageAlt.trim(),
        sort_order: Number(newImageSort),
        is_featured: newImageFeatured,
      });
      setNewImageUrl("");
      setNewImageAlt("");
      setNewImageSort(0);
      setNewImageFeatured(false);
      const updatedImages = await adminApi.listPackageImages(packageId);
      setImages(updatedImages);
      setSuccessMessage("Gallery image added.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to add image.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (imgId: string) => {
    try {
      setSaving(true);
      await adminApi.deletePackageImage(packageId, imgId);
      setImages(images.filter((img) => img.id !== imgId));
      setSuccessMessage("Image removed.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to remove image.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeaturedImage = async (img: PackageImage) => {
    try {
      setSaving(true);
      await adminApi.updatePackageImage(packageId, img.id, {
        is_featured: !img.is_featured,
      });
      const updatedImages = await adminApi.listPackageImages(packageId);
      setImages(updatedImages);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update hero status.");
    } finally {
      setSaving(false);
    }
  };

  // Itinerary actions
  const openCreateDayModal = () => {
    setSelectedDay(null);
    const nextDayNum =
      itinerary.length > 0 ? Math.max(...itinerary.map((d) => d.day_number)) + 1 : 1;
    setFormDayNumber(nextDayNum);
    setFormDayTitle("");
    setFormDayDesc("");
    setFormDayAccom("");
    setFormDayMeals("");
    setFormDayTrans("");
    setDayModalMode("create");
  };

  const openEditDayModal = (day: PackageDay) => {
    setSelectedDay(day);
    setFormDayNumber(day.day_number);
    setFormDayTitle(day.title);
    setFormDayDesc(day.description || "");
    setFormDayAccom(day.accommodation || "");
    setFormDayMeals(day.meals || "");
    setFormDayTrans(day.transportation || "");
    setDayModalMode("edit");
  };

  const handleSaveDay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (dayModalMode === "create") {
        await adminApi.createPackageDay(packageId, {
          day_number: Number(formDayNumber),
          title: formDayTitle.trim(),
          description: formDayDesc.trim() || undefined,
          accommodation: formDayAccom.trim() || undefined,
          meals: formDayMeals.trim() || undefined,
          transportation: formDayTrans.trim() || undefined,
        });
        setSuccessMessage(`Day ${formDayNumber} created.`);
      } else if (dayModalMode === "edit" && selectedDay) {
        await adminApi.updatePackageDay(packageId, selectedDay.id, {
          day_number: Number(formDayNumber),
          title: formDayTitle.trim(),
          description: formDayDesc.trim() || undefined,
          accommodation: formDayAccom.trim() || undefined,
          meals: formDayMeals.trim() || undefined,
          transportation: formDayTrans.trim() || undefined,
        });
        setSuccessMessage(`Day ${formDayNumber} updated.`);
      }
      setDayModalMode(null);
      const updated = await adminApi.listPackageItinerary(packageId);
      setItinerary(updated);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to save itinerary day.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!window.confirm("Delete this itinerary day and unbind attached activities?")) return;
    try {
      setSaving(true);
      await adminApi.deletePackageDay(packageId, dayId);
      setItinerary(itinerary.filter((d) => d.id !== dayId));
      setSuccessMessage("Itinerary day removed.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to delete day.");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveDay = async (dayIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? dayIndex - 1 : dayIndex + 1;
    if (targetIndex < 0 || targetIndex >= itinerary.length) return;
    const newItinerary = [...itinerary];
    const temp = newItinerary[dayIndex];
    newItinerary[dayIndex] = newItinerary[targetIndex];
    newItinerary[targetIndex] = temp;
    const newDayIds = newItinerary.map((d) => d.id);
    try {
      setSaving(true);
      setError(null);
      const updated = await adminApi.reorderPackageDays(packageId, newDayIds);
      setItinerary(updated);
      setSuccessMessage("Itinerary days reordered successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to reorder itinerary days.");
    } finally {
      setSaving(false);
    }
  };


  const handleAddDayActivity = async (dayId: string) => {
    if (!selectedActivityToLink) return;
    try {
      setSaving(true);
      await adminApi.addDayActivity(packageId, dayId, {
        activity_id: selectedActivityToLink,
      });
      const updated = await adminApi.listPackageItinerary(packageId);
      setItinerary(updated);
      setLinkActivityDayId(null);
      setSelectedActivityToLink("");
      setSuccessMessage("Activity attached to itinerary day.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to attach activity.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDayActivity = async (dayId: string, activityId: string) => {
    try {
      setSaving(true);
      await adminApi.removeDayActivity(packageId, dayId, activityId);
      const updated = await adminApi.listPackageItinerary(packageId);
      setItinerary(updated);
      setSuccessMessage("Activity detached from day.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to remove activity.");
    } finally {
      setSaving(false);
    }
  };

  // Hotel actions
  const handleLinkHotel = async () => {
    if (!selectedHotelToLink) return;
    try {
      setSaving(true);
      await adminApi.linkPackageHotel(packageId, selectedHotelToLink);
      const updatedHotels = await adminApi.listPackageHotels(packageId);
      setPackageHotels(updatedHotels);
      setSelectedHotelToLink("");
      setSuccessMessage("Hotel linked to package.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to link hotel.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkHotel = async (hotelId: string) => {
    try {
      setSaving(true);
      await adminApi.unlinkPackageHotel(packageId, hotelId);
      setPackageHotels(packageHotels.filter((h) => h.hotel_id !== hotelId));
      setSuccessMessage("Hotel unlinked from package.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to unlink hotel.");
    } finally {
      setSaving(false);
    }
  };

  // Activity actions
  const handleLinkActivity = async () => {
    if (!selectedPackageActivityToLink) return;
    try {
      setSaving(true);
      await adminApi.linkPackageActivity(packageId, selectedPackageActivityToLink);
      const updated = await adminApi.listPackageActivities(packageId);
      setPackageActivities(updated);
      setSelectedPackageActivityToLink("");
      setSuccessMessage("Activity linked to package.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to link activity.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlinkActivity = async (actId: string) => {
    try {
      setSaving(true);
      await adminApi.unlinkPackageActivity(packageId, actId);
      setPackageActivities(packageActivities.filter((a) => a.activity_id !== actId));
      setSuccessMessage("Activity unlinked from package.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to unlink activity.");
    } finally {
      setSaving(false);
    }
  };

  // Departures actions
  const handleSaveDeparture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDepDate) return;
    try {
      setSaving(true);
      const splPrice = formDepSpecialPrice === "" ? undefined : Number(formDepSpecialPrice);
      if (depModalMode === "create") {
        await adminApi.createDeparture({
          package_id: packageId,
          departure_date: formDepDate,
          return_date: formDepReturnDate.trim() || undefined,
          total_capacity: Number(formDepTotalCap),
          special_price: splPrice,
          currency: formCurrency.toUpperCase(),
          status: formDepStatus,
        });
        setSuccessMessage("Fixed-date group departure created.");
      } else if (depModalMode === "edit" && selectedDep) {
        await adminApi.updateDeparture(selectedDep.id, {
          departure_date: formDepDate,
          return_date: formDepReturnDate.trim() || undefined,
          total_capacity: Number(formDepTotalCap),
          reserved_capacity: Number(formDepReservedCap),
          special_price: splPrice,
          currency: formCurrency.toUpperCase(),
          status: formDepStatus,
        });
        setSuccessMessage("Departure updated.");
      }
      setDepModalMode(null);
      const updatedDeps = await adminApi.listPackageDepartures(packageId);
      setDepartures(updatedDeps);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to save departure.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelDeparture = async (depId: string) => {
    try {
      setSaving(true);
      await adminApi.cancelOrDeleteDeparture(depId);
      const updatedDeps = await adminApi.listPackageDepartures(packageId);
      setDepartures(updatedDeps);
      setSuccessMessage("Departure status updated.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to cancel departure.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-4 border-[#24292F] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-wider text-[#70757A]">
          Loading tour package studio...
        </p>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-[#202124]">Package Not Found</h2>
        <p className="text-xs text-[#70757A]">The requested package record could not be retrieved.</p>
        <Link
          href="/admin/packages"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#24292F] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#3D4450]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Packages
        </Link>
      </div>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; icon: React.ElementType; count?: number }> = [
    { key: "overview", label: "Overview & Logistics", icon: PackageIcon },
    { key: "pricing", label: "Pricing & Policies", icon: DollarSign },
    { key: "images", label: "Gallery Photography", icon: ImageIcon, count: images.length },
    { key: "itinerary", label: "Day-by-Day Itinerary", icon: Calendar, count: itinerary.length },
    { key: "hotels", label: "Partner Hotels", icon: Building2, count: packageHotels.length },
    { key: "activities", label: "Activities", icon: Compass, count: packageActivities.length },
    { key: "departures", label: "Group Departures", icon: CalendarCheck, count: departures.length },
    { key: "addons", label: "Add-Ons & Scope", icon: Tag, count: globalAddOns.length },
    { key: "seo", label: "SEO Metadata", icon: Search },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-[#E4E5E7]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/packages"
              className="p-2 rounded-xl bg-white border border-[#D3D8DF] text-[#5F6368] hover:text-[#202124] hover:bg-[#F7F7F5] transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
                  Tour Package Studio
                </span>
                <span className="text-[#D3D8DF]">•</span>
                <span className="text-[11px] font-bold text-[#5F6368]">
                  {pkg.duration_days} Days / {pkg.duration_nights} Nights
                </span>
              </div>
              <h1 className="text-2xl font-serif font-bold tracking-tight text-[#202124] flex items-center gap-2">
                <PackageIcon className="w-6 h-6 text-[#C5A880]" />
                <span>{pkg.name}</span>
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-11 text-xs">
            <span className="text-[#5F6368] flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
              {pkg.destination_name || "Destination"}
            </span>
            <span className="text-[#D3D8DF]">•</span>
            <span className="font-mono text-[#70757A]">/{pkg.slug}</span>
            <Link
              href={`/packages/${pkg.slug}`}
              target="_blank"
              rel="noreferrer"
              title="View Live Public Package"
              className="text-[#C5A880] hover:text-[#A3865F] inline-flex items-center"
            >
              <ExternalLink className="w-3 h-3" />
            </Link>
            <span className="text-[#D3D8DF]">•</span>
            {pkg.is_published ? (
              <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                Published
              </span>
            ) : (
              <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                Draft
              </span>
            )}
            {pkg.is_featured && (
              <span className="text-[#C5A880] font-bold flex items-center gap-0.5 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                <Star className="w-3 h-3 fill-[#C5A880]" /> Featured
              </span>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-3">
            <Link
              href={`/packages/${pkg.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] text-xs font-semibold shadow-2xs transition-all"
            >
              <ExternalLink className="w-4 h-4 text-[#C5A880]" />
              <span>Preview Package</span>
            </Link>
            <button
              onClick={handleSaveGeneral}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4 text-[#C5A880]" />
              )}
              <span>{saving ? "Saving..." : "Save Package"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-[#E4E5E7] flex overflow-x-auto gap-2 pb-px bg-[#F7F7F5] p-2 rounded-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-[#202124] shadow-xs border border-[#E4E5E7]"
                  : "text-[#70757A] hover:text-[#202124] hover:bg-white/50"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${isActive ? "text-[#C5A880]" : "text-[#70757A]"}`}
              />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? "bg-[#24292F] text-white" : "bg-[#E4E5E7] text-[#5F6368]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT CONTAINER */}
      <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 md:p-8 shadow-2xs">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <form onSubmit={handleSaveGeneral} className="space-y-6 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Package Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  URL Slug <span className="text-[#70757A] font-normal">(Auto-generated if empty)</span>
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="leave empty to auto-slugify"
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-mono text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <SearchableSelect
                  label="Primary Destination"
                  required={true}
                  value={formDestinationId || null}
                  onChange={(val) => setFormDestinationId(val || "")}
                  options={destinationOptions}
                  loadOptions={loadDestinationOptions}
                  resolveOption={resolveDestinationOption}
                  placeholder="Select primary destination..."
                />
              </div>

              <div>
                <CreatableSelect
                  label="Package Category"
                  value={formCategory || null}
                  onChange={(val) => setFormCategory(val || "")}
                  options={catalogOptions.package_categories}
                  placeholder="Select or enter custom category..."
                  allowNone={true}
                  noneLabel="None (Unset Category)"
                  onCustomCreate={(newCat) =>
                    addCustomCategory("package_categories", newCat)
                  }
                />
              </div>

              <div>
                <CreatableSelect
                  label="Travel Type / Style"
                  value={formTravelType || null}
                  onChange={(val) => setFormTravelType(val || "")}
                  options={catalogOptions.package_travel_types}
                  placeholder="Select or enter travel type..."
                  allowNone={true}
                  noneLabel="None (Unset Travel Type)"
                  onCustomCreate={(newType) =>
                    addCustomCategory("package_travel_types", newType)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Duration Days <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formDurationDays}
                  onChange={(e) => setFormDurationDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Duration Nights <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formDurationNights}
                  onChange={(e) => setFormDurationNights(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Departure Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Coimbatore, Chennai"
                  value={formDepartureLocation}
                  onChange={(e) => setFormDepartureLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>

              <div>
                <CreatableSelect
                  label="Difficulty Level"
                  value={formDifficultyLevel || null}
                  onChange={(val) => setFormDifficultyLevel(val || "")}
                  options={catalogOptions.package_difficulty_levels}
                  placeholder="Select or enter difficulty..."
                  allowNone={true}
                  noneLabel="None (Unset Difficulty)"
                  onCustomCreate={(newDiff) =>
                    addCustomCategory("package_difficulty_levels", newDiff)
                  }
                />
              </div>
            </div>

            {/* Cover Photo URL + Upload */}
            <div>
              <label className="block text-xs font-bold text-[#202124] mb-1">
                Hero Cover Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://... or upload local image"
                  value={formCoverImageUrl}
                  onChange={(e) => setFormCoverImageUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
                <label className="px-4 py-2 bg-white border border-[#D3D8DF] hover:border-[#C5A880] rounded-xl text-xs font-bold text-[#202124] cursor-pointer flex items-center gap-1.5 shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>{uploadingCover ? "Uploading..." : "Upload Cover"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCover}
                    disabled={uploadingCover}
                    className="hidden"
                  />
                </label>
              </div>
              {formCoverImageUrl && (
                <div className="mt-2 w-full h-32 rounded-xl overflow-hidden border border-[#D3D8DF] bg-[#F7F7F5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formCoverImageUrl}
                    alt="Package Cover Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Minimum Travellers
                </label>
                <input
                  type="number"
                  min="1"
                  value={formMinTravellers}
                  onChange={(e) => setFormMinTravellers(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Maximum Travellers (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formMaxTravellers}
                  onChange={(e) =>
                    setFormMaxTravellers(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Unlimited if empty"
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202124] mb-1">
                Short Teaser Description
              </label>
              <textarea
                rows={2}
                value={formShortDesc}
                onChange={(e) => setFormShortDesc(e.target.value)}
                placeholder="High-impact marketing snippet for catalog cards..."
                className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202124] mb-1">
                Comprehensive Package Description
              </label>
              <textarea
                rows={5}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Full narrative of experience, sights, accommodations, and travel route..."
                className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
              />
            </div>

            {/* Inclusions and Exclusions Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Inclusions Builder */}
              <div className="p-5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                      Package Inclusions ({formInclusions.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addInclusionItem}
                    className="px-2.5 py-1 bg-white border border-[#D3D8DF] hover:border-[#C5A880] text-[#202124] rounded-lg text-xs font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Preset Suggestions */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#70757A]">Quick Add Presets:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "Accommodation at 4★ Resort",
                      "Daily Breakfast & Dinner",
                      "Sightseeing with Private AC Vehicle",
                      "All Entry & Monument Permits",
                      "Experienced Tour Guide",
                      "Airport Transfers Included",
                      "All Taxes & GST Included",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => addPresetInclusion(preset)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#D3D8DF] hover:border-emerald-500 hover:text-emerald-700 text-[#5F6368] transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {formInclusions.length === 0 ? (
                  <p className="text-xs text-[#70757A] italic py-2">
                    No inclusions specified. Click + Add or select presets above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formInclusions.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-[#70757A] w-4 text-right">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. Daily buffet breakfast at 4★ resort"
                          value={item}
                          onChange={(e) => updateInclusionItem(idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                        />
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveInclusionUp(idx)}
                          className="p-1 text-[#5F6368] hover:text-[#202124] disabled:opacity-20 cursor-pointer"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === formInclusions.length - 1}
                          onClick={() => moveInclusionDown(idx)}
                          className="p-1 text-[#5F6368] hover:text-[#202124] disabled:opacity-20 cursor-pointer"
                          title="Move Down"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => removeInclusionItem(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Exclusions Builder */}
              <div className="p-5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                      Package Exclusions ({formExclusions.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addExclusionItem}
                    className="px-2.5 py-1 bg-white border border-[#D3D8DF] hover:border-[#C5A880] text-[#202124] rounded-lg text-xs font-bold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>

                {/* Preset Suggestions */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#70757A]">Quick Add Presets:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "Airfare / Train Tickets to Origin",
                      "Personal Expenses & Laundry",
                      "Unspecified Lunches / Snacks",
                      "Optional Adventure Sports & Rides",
                      "Travel & Medical Insurance",
                      "Early Check-in / Late Checkout",
                      "Tips & Driver Gratuities",
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => addPresetExclusion(preset)}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#D3D8DF] hover:border-rose-500 hover:text-rose-700 text-[#5F6368] transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {formExclusions.length === 0 ? (
                  <p className="text-xs text-[#70757A] italic py-2">
                    No exclusions specified. Click + Add or select presets above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {formExclusions.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-[#70757A] w-4 text-right">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. Airfare / train tickets to departure city"
                          value={item}
                          onChange={(e) => updateExclusionItem(idx, e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-[#D3D8DF] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                        />
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveExclusionUp(idx)}
                          className="p-1 text-[#5F6368] hover:text-[#202124] disabled:opacity-20 cursor-pointer"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === formExclusions.length - 1}
                          onClick={() => moveExclusionDown(idx)}
                          className="p-1 text-[#5F6368] hover:text-[#202124] disabled:opacity-20 cursor-pointer"
                          title="Move Down"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => removeExclusionItem(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


            {/* Publication and Status Checkboxes */}
            <div className="p-5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#70757A]">
                Visibility & Showcase
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formPublished}
                  onChange={(e) => setFormPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-[#24292F] focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-[#202124]">
                    Publish to Live Website
                  </span>
                  <p className="text-[11px] text-[#70757A]">
                    Makes this package visible to public travellers on the main catalog.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formFeatured}
                  onChange={(e) => setFormFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-[#24292F] focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-[#202124]">
                    Featured Hero Showcase
                  </span>
                  <p className="text-[11px] text-[#70757A]">
                    Highlights this tour package prominently on the homepage trending itineraries.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#24292F] focus:ring-0"
                />
                <div>
                  <span className="text-xs font-bold text-[#202124]">Active Record</span>
                  <p className="text-[11px] text-[#70757A]">
                    Uncheck to soft-deactivate this package from admin assignments.
                  </p>
                </div>
              </label>
            </div>

            {canEdit && (
              <div className="pt-4 border-t border-[#E4E5E7]">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving Overview..." : "Save Overview Section"}
                </button>
              </div>
            )}
          </form>
        )}

        {/* TAB 2: PRICING & POLICIES */}
        {activeTab === "pricing" && (
          <form onSubmit={handleSaveGeneral} className="space-y-6 max-w-3xl">
            <div className="bg-[#F7F7F5] border border-[#E4E5E7] p-4 rounded-2xl text-xs text-[#5F6368] space-y-1">
              <div className="font-bold text-[#202124] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#C5A880]" />
                <span>Authoritative Decimal Financial Integrity:</span>
              </div>
              <p>
                Base prices, supplements, and child tiers are calculated authoritatively on the server.
                Existing customer bookings snapshot their line items at the moment of order creation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Base Price per Adult Traveller <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formBasePrice}
                  onChange={(e) => setFormBasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Currency (ISO 4217) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-mono text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Tiered Pricing Supplements */}
            <div className="p-5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                Tiered Pricing & Supplements
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5F6368] mb-1">
                    Child Price (Under 12)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Defaults to base price if empty"
                    value={formChildPrice}
                    onChange={(e) =>
                      setFormChildPrice(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5F6368] mb-1">
                    Infant Price (Under 2)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional infant fee"
                    value={formInfantPrice}
                    onChange={(e) =>
                      setFormInfantPrice(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5F6368] mb-1">
                    Single Room Supplement
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Fee for solo occupancy"
                    value={formSingleRoomSupplement}
                    onChange={(e) =>
                      setFormSingleRoomSupplement(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>
            </div>

            {/* Cutoff & Cancellation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Booking Cutoff Days (Advance notice)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formBookingCutoffDays}
                  onChange={(e) => setFormBookingCutoffDays(Number(e.target.value))}
                  placeholder="e.g. 3 days before travel date"
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
                <p className="text-[11px] text-[#70757A] mt-1">
                  Days before departure when new booking reservations automatically close.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Cancellation Policy
                </label>
                <textarea
                  rows={3}
                  value={formCancellationPolicy}
                  onChange={(e) => setFormCancellationPolicy(e.target.value)}
                  placeholder="e.g. Free cancellation up to 15 days before departure. 50% refund between 7-14 days..."
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#70757A]">Published Base Rate</div>
                <div className="text-2xl font-bold font-mono text-[#202124] mt-1">
                  {formCurrency} {Number(formBasePrice).toLocaleString()}
                </div>
              </div>
              <span className="text-xs font-semibold text-[#5F6368]">
                Per adult traveller sharing twin room
              </span>
            </div>

            {canEdit && (
              <div className="pt-4 border-t border-[#E4E5E7]">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving Pricing..." : "Save Pricing & Policies"}
                </button>
              </div>
            )}
          </form>
        )}

        {/* TAB 3: IMAGES */}
        {activeTab === "images" && (
          <div className="space-y-8">
            {/* Add Image Form */}
            {canEdit && (
              <form
                onSubmit={handleAddImage}
                className="bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl p-5 space-y-4"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#202124] flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#C5A880]" />
                  <span>Attach Gallery Photo</span>
                </h3>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="w-full sm:w-auto px-4 py-2 bg-white border border-[#D3D8DF] hover:border-[#C5A880] rounded-xl text-xs font-bold text-[#202124] cursor-pointer flex items-center justify-center gap-2 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>{uploadingImage ? "Uploading..." : "Select File From Computer"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImageFile}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-[#70757A]">or enter direct image URL below</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5F6368] mb-1">
                      Image URL *
                    </label>
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://... or uploaded image path"
                      className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5F6368] mb-1">
                      Alt Description *
                    </label>
                    <input
                      type="text"
                      value={newImageAlt}
                      onChange={(e) => setNewImageAlt(e.target.value)}
                      placeholder="e.g. Mountain sunrise from valley cottage"
                      className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newImageFeatured}
                        onChange={(e) => setNewImageFeatured(e.target.checked)}
                        className="w-4 h-4 rounded text-[#24292F] focus:ring-0"
                      />
                      <span>Mark as Hero Featured Photo</span>
                    </label>

                    <div className="flex items-center gap-2 text-xs text-[#5F6368]">
                      <span>Order:</span>
                      <input
                        type="number"
                        min="0"
                        value={newImageSort}
                        onChange={(e) => setNewImageSort(Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-white border border-[#D3D8DF] rounded-lg text-xs text-center"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving || uploadingImage}
                    className="px-5 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                  >
                    Add Image to Gallery
                  </button>
                </div>
              </form>
            )}

            {/* Gallery Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#70757A]">
                Current Package Photos ({images.length})
              </h3>

              {images.length === 0 ? (
                <div className="py-12 text-center text-[#70757A] text-xs border border-dashed border-[#D3D8DF] rounded-2xl">
                  No gallery photography attached yet. Upload or add photo URLs above.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-2xl border border-[#E4E5E7] bg-white overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col"
                    >
                      <div className="relative aspect-4/3 bg-[#F7F7F5] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.image_url}
                          alt={img.alt_text}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {img.is_featured && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#24292F] text-[#C5A880] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs">
                            <Star className="w-3 h-3 fill-[#C5A880]" /> Hero
                          </div>
                        )}
                      </div>

                      <div className="p-3 text-xs flex-1 flex flex-col justify-between space-y-2">
                        <p className="font-semibold text-[#202124] line-clamp-1">{img.alt_text}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-[#E4E5E7]">
                          <span className="text-[10px] text-[#70757A]">Order {img.sort_order}</span>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggleFeaturedImage(img)}
                                title={img.is_featured ? "Unmark hero" : "Set as hero photo"}
                                className={`p-1 rounded-md text-xs cursor-pointer ${
                                  img.is_featured ? "text-[#C5A880] bg-amber-50" : "text-[#70757A]"
                                }`}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    img.is_featured ? "fill-[#C5A880]" : ""
                                  }`}
                                />
                              </button>
                              <button
                                onClick={() => handleDeleteImage(img.id)}
                                title="Remove photo"
                                className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ITINERARY */}
        {activeTab === "itinerary" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                  Day-by-Day Journey Itinerary
                </h3>
                <p className="text-[11px] text-[#70757A] mt-0.5">
                  Chronological day schedule with scheduled activities, accommodations, meals, and transit.
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={openCreateDayModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Day
                </button>
              )}
            </div>

            {itinerary.length === 0 ? (
              <div className="py-12 text-center text-[#70757A] text-xs border border-dashed border-[#D3D8DF] rounded-2xl">
                No itinerary days created yet. Click &quot;Add Day&quot; to build the journey.
              </div>
            ) : (
              <div className="space-y-4">
                {itinerary.map((day, idx) => (
                  <div
                    key={day.id}
                    className="bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1">
                          <div className="px-3 py-1.5 rounded-xl bg-white border border-[#D3D8DF] text-[#C5A880] font-bold font-mono text-sm shadow-2xs">
                            Day {day.day_number}
                          </div>
                          {canEdit && itinerary.length > 1 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                type="button"
                                disabled={idx === 0 || saving}
                                onClick={() => handleMoveDay(idx, "up")}
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-[#D3D8DF] hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed text-[#5F6368] text-[11px] font-bold cursor-pointer"
                                title="Move Day Earlier"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === itinerary.length - 1 || saving}
                                onClick={() => handleMoveDay(idx, "down")}
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-[#D3D8DF] hover:bg-slate-100 disabled:opacity-25 disabled:cursor-not-allowed text-[#5F6368] text-[11px] font-bold cursor-pointer"
                                title="Move Day Later"
                              >
                                ▼
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-[#202124]">{day.title}</h4>
                          {day.description && (
                            <p className="text-xs text-[#5F6368] mt-1 max-w-2xl leading-relaxed">
                              {day.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditDayModal(day)}
                            className="p-1.5 text-[#5F6368] hover:text-[#202124] hover:bg-white rounded-lg border border-transparent hover:border-[#D3D8DF] cursor-pointer"
                            title="Edit Day"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDay(day.id)}
                            className="p-1.5 text-[#70757A] hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-rose-200 cursor-pointer"
                            title="Delete Day"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Logistics metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#5F6368] bg-white p-3.5 rounded-xl border border-[#E4E5E7]">
                      <div>
                        <span className="text-[#202124] font-bold">Accommodation: </span>
                        {day.accommodation || "Not specified"}
                      </div>
                      <div>
                        <span className="text-[#202124] font-bold">Meals: </span>
                        {day.meals || "Not specified"}
                      </div>
                      <div>
                        <span className="text-[#202124] font-bold">Transportation: </span>
                        {day.transportation || "Not specified"}
                      </div>
                    </div>

                    {/* Day Activities */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#70757A]">
                          Attached Activities
                        </span>
                        {canEdit && (
                          <button
                            onClick={() => setLinkActivityDayId(day.id)}
                            className="text-xs text-[#C5A880] hover:text-[#A3865F] font-bold cursor-pointer"
                          >
                            + Attach Activity
                          </button>
                        )}
                      </div>

                      {day.activities && day.activities.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {day.activities.map((act) => (
                            <div
                              key={act.id}
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-white border border-[#D3D8DF] text-[#202124] shadow-2xs"
                            >
                              <Compass className="w-3.5 h-3.5 text-[#C5A880]" />
                              <span>{act.activity_name}</span>
                              {act.duration_minutes && (
                                <span className="text-[#70757A] font-mono">
                                  ({act.duration_minutes}m)
                                </span>
                              )}
                              {canEdit && (
                                <button
                                  onClick={() => handleRemoveDayActivity(day.id, act.activity_id)}
                                  className="text-[#70757A] hover:text-rose-600 ml-1 cursor-pointer"
                                  title="Unlink"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#70757A] italic">No specific activities attached to this day.</p>
                      )}

                      {/* Attach Activity inline dropdown */}
                      {linkActivityDayId === day.id && (
                        <div className="flex items-center gap-2 pt-2">
                          <div className="min-w-[260px]">
                            <SearchableSelect
                              options={activityOptions}
                              loadOptions={loadActivityOptions}
                              resolveOption={resolveActivityOption}
                              value={selectedActivityToLink}
                              onChange={(val) => setSelectedActivityToLink(val || "")}
                              placeholder="Select Activity to Attach..."
                            />
                          </div>
                          <button
                            onClick={() => handleAddDayActivity(day.id)}
                            className="px-3 py-1.5 rounded-xl bg-[#24292F] text-white font-bold text-xs uppercase cursor-pointer"
                          >
                            Attach
                          </button>
                          <button
                            onClick={() => setLinkActivityDayId(null)}
                            className="text-[#70757A] hover:text-[#202124] text-xs px-2 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: HOTELS */}
        {activeTab === "hotels" && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                Associated Partner Hotels
              </h3>
              <p className="text-[11px] text-[#70757A] mt-0.5">
                Link hotels in {pkg.destination_name || "this destination"} included in this travel package.
              </p>
            </div>

            {canEdit && (
              <div className="flex items-center gap-3 bg-[#F7F7F5] p-4 rounded-2xl border border-[#E4E5E7]">
                <div className="flex-1">
                  <SearchableSelect
                    options={hotelOptions}
                    loadOptions={loadHotelOptions}
                    resolveOption={resolveHotelOption}
                    value={selectedHotelToLink}
                    onChange={(val) => setSelectedHotelToLink(val || "")}
                    placeholder="Select Destination Hotel to Bind..."
                  />
                </div>
                <button
                  onClick={handleLinkHotel}
                  disabled={!selectedHotelToLink || saving}
                  className="px-4 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
                >
                  Link Hotel
                </button>
              </div>
            )}

            <div className="space-y-3">
              {packageHotels.length === 0 ? (
                <div className="py-12 text-center text-[#70757A] text-xs border border-dashed border-[#D3D8DF] rounded-2xl">
                  No hotels linked yet. Select a destination partner hotel above.
                </div>
              ) : (
                packageHotels.map((ph) => (
                  <div
                    key={ph.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white border border-[#D3D8DF]">
                        <Building2 className="w-5 h-5 text-[#C5A880]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#202124] text-xs">{ph.hotel_name}</h4>
                        <div className="text-[11px] text-[#70757A]">
                          {ph.star_rating && <span>{ph.star_rating}★ Rating • </span>}
                          <span>Partner Accommodation</span>
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleUnlinkHotel(ph.hotel_id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Unlink Hotel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: ACTIVITIES */}
        {activeTab === "activities" && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                Included Sightseeing & Activities
              </h3>
              <p className="text-[11px] text-[#70757A] mt-0.5">
                Link destination excursions and guided experiences included in the base package price.
              </p>
            </div>

            {canEdit && (
              <div className="flex items-center gap-3 bg-[#F7F7F5] p-4 rounded-2xl border border-[#E4E5E7]">
                <div className="flex-1">
                  <SearchableSelect
                    options={activityOptions}
                    loadOptions={loadActivityOptions}
                    resolveOption={resolveActivityOption}
                    value={selectedPackageActivityToLink}
                    onChange={(val) => setSelectedPackageActivityToLink(val || "")}
                    placeholder="Select Destination Activity to Bind..."
                  />
                </div>
                <button
                  onClick={handleLinkActivity}
                  disabled={!selectedPackageActivityToLink || saving}
                  className="px-4 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white font-bold text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
                >
                  Link Activity
                </button>
              </div>
            )}

            <div className="space-y-3">
              {packageActivities.length === 0 ? (
                <div className="py-12 text-center text-[#70757A] text-xs border border-dashed border-[#D3D8DF] rounded-2xl">
                  No package activities linked yet.
                </div>
              ) : (
                packageActivities.map((pa) => (
                  <div
                    key={pa.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white border border-[#D3D8DF]">
                        <Compass className="w-5 h-5 text-[#C5A880]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#202124] text-xs">{pa.activity_name}</h4>
                        <div className="text-[11px] text-[#70757A]">
                          {pa.category && <span>{pa.category} • </span>}
                          {pa.duration_minutes && <span>{pa.duration_minutes} mins</span>}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleUnlinkActivity(pa.activity_id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Unlink Activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 7: DEPARTURES */}
        {activeTab === "departures" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                  Fixed-Date Group Departures
                </h3>
                <p className="text-[11px] text-[#70757A] mt-0.5">
                  Scheduled departure dates, capacities, and group availability counters.
                </p>
              </div>
              {canEdit && (
                <button
                  onClick={() => {
                    setSelectedDep(null);
                    setFormDepDate("");
                    setFormDepReturnDate("");
                    setFormDepTotalCap(20);
                    setFormDepReservedCap(0);
                    setFormDepSpecialPrice("");
                    setFormDepStatus("open");
                    setDepModalMode("create");
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Schedule Departure
                </button>
              )}
            </div>

            {departures.length === 0 ? (
              <div className="py-12 text-center text-[#70757A] text-xs border border-dashed border-[#D3D8DF] rounded-2xl">
                No group departures scheduled for this package. Click &quot;Schedule Departure&quot; to open dates.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F7F7F5] text-[11px] uppercase tracking-wider text-[#5F6368] border-b border-[#E4E5E7]">
                    <tr>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Capacity & Availability</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E5E7]">
                    {departures.map((d) => (
                      <tr key={d.id} className="hover:bg-[#FDFBF7]">
                        <td className="px-4 py-3 font-mono text-[#202124]">
                          <div className="font-bold">{d.departure_date}</div>
                          {d.return_date && (
                            <div className="text-[#70757A] text-[11px]">to {d.return_date}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[#202124] font-bold">{d.reserved_capacity}</span> /{" "}
                          <span className="text-[#70757A]">{d.total_capacity} booked</span>
                          <span className="ml-2 text-emerald-700 font-bold font-mono">
                            ({d.available_capacity} left)
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {d.special_price ? (
                            <span className="text-[#C5A880] font-bold">
                              {d.currency} {Number(d.special_price).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[#70757A]">Standard</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              d.status === "open"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : d.status === "sold_out"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-stone-50 text-stone-600 border-stone-200"
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canEdit && (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedDep(d);
                                  setFormDepDate(d.departure_date);
                                  setFormDepReturnDate(d.return_date || "");
                                  setFormDepTotalCap(d.total_capacity);
                                  setFormDepReservedCap(d.reserved_capacity);
                                  setFormDepSpecialPrice(d.special_price ?? "");
                                  setFormDepStatus(d.status);
                                  setDepModalMode("edit");
                                }}
                                className="p-1.5 text-[#5F6368] hover:text-[#202124] rounded-lg border border-[#D3D8DF] bg-white cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleCancelDeparture(d.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg border border-[#D3D8DF] bg-white cursor-pointer"
                                title="Cancel / Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: ADD-ONS (ISOLATION & SCOPE AWARE) */}
        {activeTab === "addons" && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                  Add-Ons & Scope Applicability
                </h3>
                <p className="text-[11px] text-[#70757A] mt-0.5">
                  Centrally configured travel extras and their applicability status for this specific package.
                </p>
              </div>
              <Link
                href="/admin/add-ons"
                className="px-4 py-2 rounded-xl bg-white border border-[#D3D8DF] hover:border-[#C5A880] text-xs font-bold text-[#202124] shadow-2xs inline-flex items-center gap-1.5"
              >
                <span>Manage Add-On Rules</span>
                <ExternalLink className="w-3 h-3 text-[#C5A880]" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {globalAddOns.map((addon) => {
                const isApplicable =
                  addon.applicability_scope === "all_packages" ||
                  ((addon.applicability_scope === "selected_packages" ||
                    addon.applicability_scope === "single_package") &&
                    addon.package_ids?.includes(pkg.id)) ||
                  (addon.applicability_scope === "selected_destinations" &&
                    addon.destination_ids?.includes(pkg.destination_id));

                const scopeLabel =
                  addon.applicability_scope === "all_packages"
                    ? "Global (All Packages)"
                    : addon.applicability_scope === "selected_packages"
                    ? "Selected Packages"
                    : addon.applicability_scope === "selected_destinations"
                    ? "Destination Bound"
                    : "Single Package Only";

                const priceTypeLabel =
                  addon.price_type === "per_booking"
                    ? "Per Booking"
                    : addon.price_type === "per_traveller"
                    ? "Per Traveller"
                    : addon.price_type === "per_room_night"
                    ? "Per Room Night"
                    : "Per Unit";

                return (
                  <div
                    key={addon.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      isApplicable
                        ? "bg-white border-[#C5A880] shadow-xs ring-1 ring-[#C5A880]/30"
                        : "bg-[#F7F7F5] border-[#E4E5E7] opacity-65"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-[#202124] text-sm">{addon.name}</span>
                        {addon.description && (
                          <p className="text-xs text-[#5F6368] line-clamp-2 mt-1 leading-relaxed">
                            {addon.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-[#202124] font-bold text-sm">
                          {addon.currency} {Number(addon.price).toLocaleString()}
                        </span>
                        <div className="text-[10px] text-[#70757A] font-semibold mt-0.5">
                          {priceTypeLabel}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E4E5E7]">
                      {/* Applicability Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isApplicable
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-stone-100 text-stone-600 border-stone-200"
                        }`}
                      >
                        {isApplicable ? "✓ Applicable at Checkout" : "✕ Not Configured for this Tour"}
                      </span>

                      {/* Scope Badge */}
                      <span className="px-2 py-0.5 rounded-md bg-[#F7F7F5] border border-[#D3D8DF] text-[10px] font-semibold text-[#5F6368]">
                        Scope: {scopeLabel}
                      </span>

                      {addon.is_mandatory && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-700">
                          Mandatory
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 9: SEO */}
        {activeTab === "seo" && (
          <form onSubmit={handleSaveGeneral} className="space-y-6 max-w-2xl">
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                Search Engine Optimization
              </h3>
              <p className="text-[11px] text-[#70757A]">
                Configure SEO title and meta descriptions for search visibility and rich social share snippets.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#202124]">SEO Meta Title</label>
                <span className="text-[11px] text-[#70757A] font-mono">
                  {formSeoTitle.length} / 180 chars
                </span>
              </div>
              <input
                type="text"
                maxLength={180}
                value={formSeoTitle}
                onChange={(e) => setFormSeoTitle(e.target.value)}
                placeholder="e.g. 5-Day Luxury Ooty & Nilgiri Tour Package | KV Tours Coimbatore"
                className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#202124]">
                  SEO Meta Description
                </label>
                <span className="text-[11px] text-[#70757A] font-mono">
                  {formSeoDesc.length} / 320 chars
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={320}
                value={formSeoDesc}
                onChange={(e) => setFormSeoDesc(e.target.value)}
                placeholder="Experience bespoke holiday packages to Ooty with KV Tours & Travels Coimbatore..."
                className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] space-y-1">
              <div className="text-[10px] uppercase font-bold text-[#70757A]">Search Snippet Preview</div>
              <div className="text-sm font-bold text-blue-700 truncate">
                {formSeoTitle || `${pkg.name} | KV Tours & Travels`}
              </div>
              <div className="text-xs text-emerald-700 font-mono">
                https://kvtours.in/packages/{formSlug || pkg.slug}
              </div>
              <div className="text-xs text-[#5F6368] line-clamp-2">
                {formSeoDesc ||
                  pkg.short_description ||
                  "Book curated luxury travel packages with KV Tours & Travels Coimbatore."}
              </div>
            </div>

            {canEdit && (
              <div className="pt-4 border-t border-[#E4E5E7]">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving SEO..." : "Save SEO Metadata"}
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Itinerary Day Modal */}
      {dayModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <h3 className="text-base font-bold text-[#202124]">
                {dayModalMode === "create" ? "Add Itinerary Day" : `Edit Day ${formDayNumber}`}
              </h3>
              <button
                onClick={() => setDayModalMode(null)}
                className="text-[#70757A] hover:text-[#202124] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDay} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Day Number *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formDayNumber}
                    onChange={(e) => setFormDayNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Day Title *
                  </label>
                  <input
                    type="text"
                    value={formDayTitle}
                    onChange={(e) => setFormDayTitle(e.target.value)}
                    placeholder="e.g. Arrival & Nilgiri Heritage Railway"
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formDayDesc}
                  onChange={(e) => setFormDayDesc(e.target.value)}
                  placeholder="Detailed schedule of the day..."
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#5F6368] mb-1">
                    Stay / Hotel
                  </label>
                  <input
                    type="text"
                    value={formDayAccom}
                    onChange={(e) => setFormDayAccom(e.target.value)}
                    placeholder="e.g. Heritage Bungalow"
                    className="w-full px-2.5 py-1.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-lg text-xs text-[#202124]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5F6368] mb-1">
                    Meals
                  </label>
                  <input
                    type="text"
                    value={formDayMeals}
                    onChange={(e) => setFormDayMeals(e.target.value)}
                    placeholder="e.g. Breakfast, Dinner"
                    className="w-full px-2.5 py-1.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-lg text-xs text-[#202124]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#5F6368] mb-1">
                    Transport
                  </label>
                  <input
                    type="text"
                    value={formDayTrans}
                    onChange={(e) => setFormDayTrans(e.target.value)}
                    placeholder="e.g. Chauffeur Cab"
                    className="w-full px-2.5 py-1.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-lg text-xs text-[#202124]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4E5E7]">
                <button
                  type="button"
                  onClick={() => setDayModalMode(null)}
                  className="px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs font-bold text-[#202124] hover:bg-[#F7F7F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Day"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Departures Modal */}
      {depModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl w-full max-w-md p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
              <h3 className="text-base font-bold text-[#202124]">
                {depModalMode === "create" ? "Schedule Departure" : "Update Departure"}
              </h3>
              <button
                onClick={() => setDepModalMode(null)}
                className="text-[#70757A] hover:text-[#202124] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeparture} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Departure Date *
                  </label>
                  <input
                    type="date"
                    value={formDepDate}
                    onChange={(e) => setFormDepDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Return Date
                  </label>
                  <input
                    type="date"
                    value={formDepReturnDate}
                    onChange={(e) => setFormDepReturnDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Total Capacity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formDepTotalCap}
                    onChange={(e) => setFormDepTotalCap(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                    required
                  />
                </div>
                {depModalMode === "edit" ? (
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Reserved Seats
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formDepReservedCap}
                      onChange={(e) => setFormDepReservedCap(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-[#202124] mb-1">
                      Status
                    </label>
                    <select
                      value={formDepStatus}
                      onChange={(e) =>
                        setFormDepStatus(e.target.value as PackageDeparture["status"])
                      }
                      className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                    >
                      <option value="open">Open</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Special Price Override (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formDepSpecialPrice}
                  onChange={(e) =>
                    setFormDepSpecialPrice(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Defaults to base package price"
                  className="w-full px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4E5E7]">
                <button
                  type="button"
                  onClick={() => setDepModalMode(null)}
                  className="px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs font-bold text-[#202124] hover:bg-[#F7F7F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Departure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
