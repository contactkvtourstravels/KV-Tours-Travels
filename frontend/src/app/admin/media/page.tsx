"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon,
  Upload,
  Search,
  Copy,
  Check,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import { adminApi, Destination, PackageItem } from "@/lib/api";
import { useAdmin } from "../AdminContext";

interface MediaItem {
  id: string;
  url: string;
  title: string;
  folder: string;
  size?: string;
  type: string;
  source: "catalog" | "uploaded";
}

const DEFAULT_CURATED_MEDIA: MediaItem[] = [
  {
    id: "cur-1",
    url: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80",
    title: "Maldives Luxury Overwater Villas",
    folder: "destinations",
    type: "image/jpeg",
    source: "catalog",
  },
  {
    id: "cur-2",
    url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    title: "Lakshadweep Coral Lagoon Azure Waters",
    folder: "destinations",
    type: "image/jpeg",
    source: "catalog",
  },
  {
    id: "cur-3",
    url: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    title: "Bali Tropical Temple Sanctuary",
    folder: "destinations",
    type: "image/jpeg",
    source: "catalog",
  },
  {
    id: "cur-4",
    url: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
    title: "Manali Snowclad Alpine Peaks",
    folder: "packages",
    type: "image/jpeg",
    source: "catalog",
  },
  {
    id: "cur-5",
    url: "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80",
    title: "Almaty Mountain Canyon Panorama",
    folder: "packages",
    type: "image/jpeg",
    source: "catalog",
  },
  {
    id: "cur-6",
    url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    title: "Kyoto Heritage Pagoda Gardens",
    folder: "packages",
    type: "image/jpeg",
    source: "catalog",
  },
];

export default function MediaLibraryPage() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["staff", "manager", "admin", "super_admin"]);

  const [items, setItems] = useState<MediaItem[]>(DEFAULT_CURATED_MEDIA);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<MediaItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadCatalogMedia = useCallback(async () => {
    try {
      setLoading(true);
      const [destsRes, pkgsRes] = await Promise.allSettled([
        adminApi.getDestinations({ page_size: 100 }),
        adminApi.getPackages({ page_size: 100 }),
      ]);

      const extracted: MediaItem[] = [];

      if (destsRes.status === "fulfilled" && destsRes.value?.items) {
        destsRes.value.items.forEach((dest: Destination) => {
          if (dest.cover_image_url) {
            extracted.push({
              id: `dest-${dest.id}`,
              url: dest.cover_image_url,
              title: `${dest.name} — Cover Photo`,
              folder: "destinations",
              type: "image/jpeg",
              source: "catalog",
            });
          }
        });
      }

      if (pkgsRes.status === "fulfilled" && pkgsRes.value?.items) {
        pkgsRes.value.items.forEach((pkg: PackageItem) => {
          if (pkg.cover_image_url) {
            extracted.push({
              id: `pkg-${pkg.id}`,
              url: pkg.cover_image_url,
              title: `${pkg.name} — Hero Banner`,
              folder: "packages",
              type: "image/jpeg",
              source: "catalog",
            });
          }
        });
      }

      // Merge unique URLs
      const existingUrls = new Set(extracted.map((m) => m.url));
      const curatedUnique = DEFAULT_CURATED_MEDIA.filter((c) => !existingUrls.has(c.url));
      setItems([...extracted, ...curatedUnique]);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogMedia();
  }, [loadCatalogMedia]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files (JPEG, PNG, WebP) are supported.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB maximum limit.");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const res = await adminApi.uploadMedia(file, "travelagency/catalog");
      const newItem: MediaItem = {
        id: `upload-${Date.now()}`,
        url: res.url,
        title: file.name.replace(/\.[^/.]+$/, ""),
        folder: "uploads",
        size: `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type,
        source: "uploaded",
      };

      setItems((prev) => [newItem, ...prev]);
      setSuccessMessage(`File "${file.name}" uploaded successfully.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to upload image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const copyToClipboard = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.url.toLowerCase().includes(search.toLowerCase());
    const matchesFolder = folderFilter === "all" || item.folder === folderFilter;
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#24292F] text-white">
              <ImageIcon className="w-5 h-5 text-[#C5A880]" />
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#202124]">
              Centralized Media &amp; Asset Library
            </h1>
          </div>
          <p className="text-xs text-[#70757A] mt-1 font-light">
            Upload, preview, and reuse high-resolution photos across destinations, itineraries, and SEO banners.
          </p>
        </div>

        {canEdit && (
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer self-start sm:self-auto">
            <Upload className="w-4 h-4 text-[#C5A880]" />
            <span>{uploading ? "Uploading..." : "Upload Photo"}</span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[#E4E5E7] rounded-2xl shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#70757A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assets by title or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#70757A]" />
          <select
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
            className="px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none"
          >
            <option value="all">All Categories ({items.length})</option>
            <option value="destinations">Destinations</option>
            <option value="packages">Packages</option>
            <option value="uploads">Direct Uploads</option>
          </select>

          <button
            onClick={loadCatalogMedia}
            title="Reload Assets"
            className="p-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-all shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-4/3 bg-stone-200 rounded-2xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-[#D3D8DF] rounded-3xl">
          <ImageIcon className="w-10 h-10 text-[#C5A880] mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-[#202124]">No media assets found</h3>
          <p className="text-xs text-[#70757A] mt-1">
            Try adjusting your search terms or upload a new image above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative bg-white border border-[#E4E5E7] hover:border-[#C5A880] rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col"
            >
              {/* Image Thumbnail */}
              <div
                className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden cursor-pointer"
                onClick={() => setSelectedPreview(item)}
              >
                <img
                  src={item.url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-bold uppercase tracking-wider backdrop-blur-xs">
                  {item.folder}
                </span>
              </div>

              {/* Card Footer */}
              <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#202124] truncate" title={item.title}>
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-[#70757A] font-mono truncate">{item.url}</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#F3F4F4]">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(item)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5F6368] hover:text-[#202124] cursor-pointer"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#C5A880]" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPreview(item)}
                    className="p-1 text-[#70757A] hover:text-[#202124] cursor-pointer"
                    title="Preview Full Image"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#E4E5E7] animate-in fade-in zoom-in-95 duration-150">
            <div className="relative aspect-16/10 bg-black flex items-center justify-center">
              <img
                src={selectedPreview.url}
                alt={selectedPreview.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#202124]">{selectedPreview.title}</h3>
                  <p className="text-xs text-[#70757A] mt-0.5 font-mono break-all">
                    {selectedPreview.url}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#F7F7F5] border border-[#D3D8DF] text-[10px] font-bold uppercase tracking-wider text-[#3D4450]">
                  {selectedPreview.folder}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E4E5E7]">
                <button
                  type="button"
                  onClick={() => setSelectedPreview(null)}
                  className="px-4 py-2 rounded-xl border border-[#D3D8DF] bg-white text-xs font-semibold text-[#5F6368] hover:bg-[#F7F7F5]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedPreview)}
                  className="px-5 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider shadow-xs flex items-center gap-1.5"
                >
                  {copiedId === selectedPreview.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>URL Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Copy Full URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
