"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  X,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import {
  customerApi,
  SavedTraveller,
  SavedTravellerCreate,
} from "@/lib/api";

const RELATIONSHIP_OPTIONS = ["Self", "Spouse", "Child", "Parent", "Sibling", "Friend", "Companion", "Other"];
const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
  { label: "Prefer not to say", value: "undisclosed" },
];

export default function SavedTravellersPage() {
  const [travellers, setTravellers] = useState<SavedTraveller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTraveller, setEditingTraveller] = useState<SavedTraveller | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<SavedTravellerCreate>({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "undisclosed",
    contact_phone: "",
    contact_email: "",
    relationship_label: "Companion",
    nationality: "IND",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadTravellers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await customerApi.getTravellers();
      setTravellers(res);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load saved travellers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTravellers();
  }, []);

  const openAddModal = () => {
    setEditingTraveller(null);
    setFormData({
      first_name: "",
      last_name: "",
      date_of_birth: "",
      gender: "undisclosed",
      contact_phone: "",
      contact_email: "",
      relationship_label: "Companion",
      nationality: "IND",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (t: SavedTraveller) => {
    setEditingTraveller(t);
    setFormData({
      first_name: t.first_name,
      last_name: t.last_name,
      date_of_birth: t.date_of_birth || "",
      gender: t.gender || "undisclosed",
      contact_phone: t.contact_phone || "",
      contact_email: t.contact_email || "",
      relationship_label: t.relationship_label || "Companion",
      nationality: t.nationality || "IND",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (editingTraveller) {
        await customerApi.updateTraveller(editingTraveller.id, formData);
      } else {
        await customerApi.createTraveller(formData);
      }
      setModalOpen(false);
      await loadTravellers();
    } catch (err: unknown) {
      setFormError((err as Error).message || "Failed to save traveller.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await customerApi.deleteTraveller(id);
      setDeleteConfirmId(null);
      await loadTravellers();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to delete traveller.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E4E5E7] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124] tracking-tight">
            Saved Travellers
          </h1>
          <p className="text-xs sm:text-sm text-[#70757A] mt-1">
            Store companion profiles to accelerate future trip checkouts. Historical bookings remain immutable.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#24292F]/15 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Traveller</span>
        </button>
      </div>

      {/* Immutability & Privacy Callout */}
      <div className="p-4 rounded-3xl bg-white border border-[#E4E5E7] flex items-start gap-3 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-[#24292F] shrink-0 mt-0.5" />
        <p className="text-xs text-[#70757A] leading-relaxed">
          <strong className="text-[#202124]">Data Isolation Policy:</strong> Saved traveller profiles are used to streamline checkout. Updating or deleting profiles here will never alter or corrupt previous confirmed booking records or ticket manifests.
        </p>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#70757A]">
          <div className="w-8 h-8 border-2 border-[#E4E5E7] border-t-[#24292F] rounded-full animate-spin mb-4" />
          <p className="text-xs uppercase tracking-widest text-[#70757A]">
            Loading your travellers roster...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-red-700 text-xs shadow-sm">
          {error}
        </div>
      ) : travellers.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-[#E4E5E7] text-center space-y-4 shadow-sm">
          <Users className="w-10 h-10 text-[#70757A]/60 mx-auto" />
          <h3 className="text-base font-serif font-bold text-[#202124]">No Saved Travellers</h3>
          <p className="text-xs text-[#70757A] max-w-sm mx-auto">
            You haven&apos;t saved any traveller profiles yet. Add your family members or travel companions to breeze through checkout.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="px-5 py-2 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
          >
            Add Your First Companion
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {travellers.map((t) => (
            <div
              key={t.id}
              className="p-6 rounded-3xl bg-white border border-[#E4E5E7] hover:border-[#24292F]/40 transition-all flex flex-col justify-between gap-4 shadow-sm hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#ECEFF3] text-[#24292F] border border-[#D3D8DF]">
                    {t.relationship_label || "Companion"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(t)}
                      className="p-1.5 rounded-full text-[#70757A] hover:text-[#202124] hover:bg-[#F3F4F4] transition-colors"
                      aria-label="Edit Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(t.id)}
                      className="p-1.5 rounded-full text-[#70757A] hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Delete Profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#202124]">
                    {t.first_name} {t.last_name}
                  </h3>
                  <p className="text-xs text-[#70757A] capitalize">
                    {t.gender || "undisclosed"} &bull; {t.nationality || "IND"}
                  </p>
                </div>

                <div className="text-xs text-[#70757A] space-y-1.5 pt-3 border-t border-[#E4E5E7]">
                  {t.date_of_birth && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#24292F]" />
                      <span>DOB: {t.date_of_birth}</span>
                    </div>
                  )}
                  {t.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#24292F]" />
                      <span>{t.contact_phone}</span>
                    </div>
                  )}
                  {t.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#24292F]" />
                      <span className="truncate">{t.contact_email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E5E7]">
              <h3 className="text-lg font-serif font-bold text-[#202124]">
                {editingTraveller ? "Edit Traveller Profile" : "Add Saved Traveller"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F3F4F4] text-[#70757A] hover:text-[#202124] hover:bg-[#E4E5E7] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Relationship
                  </label>
                  <select
                    value={formData.relationship_label || "Companion"}
                    onChange={(e) => setFormData({ ...formData, relationship_label: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all cursor-pointer"
                  >
                    {RELATIONSHIP_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender || "undisclosed"}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all cursor-pointer"
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth || ""}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formData.nationality || "IND"}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone || ""}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A] mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email || ""}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="companion@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4E5E7]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#F3F4F4] text-[#70757A] hover:text-[#202124] hover:bg-[#E4E5E7] text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#24292F]/15 disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? "Saving..." : editingTraveller ? "Update Profile" : "Save Traveller"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-red-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h4 className="text-sm font-bold text-[#202124]">Delete Saved Traveller?</h4>
            <p className="text-xs text-[#70757A]">
              Are you sure you want to remove this profile? Existing bookings with this traveller will remain completely unaffected.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-full bg-[#F3F4F4] text-[#70757A] text-xs font-semibold hover:bg-[#E4E5E7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
