"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  ShieldCheck,
  Lock,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { customerApi, CustomerProfile } from "@/lib/api";
import { useCustomer } from "../CustomerContext";

export default function CustomerProfilePage() {
  const { user, refreshUser } = useCustomer();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        const res = await customerApi.getProfile();
        setProfile(res);
        setFirstName(res.first_name);
        setLastName(res.last_name);
        setPhone(res.phone || "");
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setUpdateError(null);
      setSuccessMessage(null);

      const updated = await customerApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || undefined,
      });

      setProfile(updated);
      setFirstName(updated.first_name);
      setLastName(updated.last_name);
      setPhone(updated.phone || "");
      setSuccessMessage("Your profile information has been securely updated.");
      await refreshUser();
    } catch (err: unknown) {
      setUpdateError((err as Error).message || "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-[#70757A]">
        <div className="w-8 h-8 border-2 border-[#E4E5E7] border-t-[#24292F] rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest text-[#70757A]">
          Loading security profile...
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-red-700 text-xs shadow-sm">
        {error || "Failed to load account profile."}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Page Header */}
      <div className="border-b border-[#E4E5E7] pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#202124] tracking-tight">
          Profile & Security
        </h1>
        <p className="text-xs sm:text-sm text-[#70757A] mt-1">
          Review your personal travel contact details and account security configuration.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {updateError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{updateError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Editable Profile Form (7 Cols) */}
        <section className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-white border border-[#E4E5E7] space-y-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-[#E4E5E7]">
            <User className="w-5 h-5 text-[#24292F]" />
            <h2 className="text-lg font-serif font-bold text-[#202124]">Personal Information</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A] mb-1.5">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#70757A]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F7F7F5] border border-[#E4E5E7] text-[#202124] text-xs focus:border-[#24292F] focus:bg-white focus:outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-[#70757A] mt-1.5 leading-relaxed">
                Used for instant WhatsApp booking confirmations and departure updates.
              </p>
            </div>

            {/* Email Field (Immutable) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#70757A]">
                  Email Address
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] text-[#24292F] font-semibold uppercase">
                  <Lock className="w-3 h-3" />
                  Immutable
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#70757A]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#F3F4F4] border border-[#E4E5E7] text-[#70757A] text-xs cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-[#70757A] mt-2 bg-[#F7F7F5] p-3 rounded-xl border border-[#E4E5E7] leading-relaxed">
                {profile.email_immutability_notice ||
                  "Direct email modification is disabled to protect your account against hijacking. Contact KV Tours & Travels to request a verified email migration."}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E4E5E7] flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 h-11 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#24292F]/15 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </section>

        {/* Right Column: Account Security & Governance (5 Cols) */}
        <section className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-[#E4E5E7] space-y-4 shadow-sm">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E4E5E7]">
              <ShieldCheck className="w-5 h-5 text-[#24292F]" />
              <h3 className="text-base font-serif font-bold text-[#202124]">Security & Status</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-[#70757A]">Account Status:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {profile.status}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-[#70757A]">Email Verification:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Verified
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-[#70757A]">System Role:</span>
                <span className="font-mono text-[#202124] font-medium">
                  {user?.roles?.join(", ") || "customer"}
                </span>
              </div>

              {profile.created_at && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#70757A]">Member Since:</span>
                  <span className="text-[#202124] font-medium">
                    {new Date(profile.created_at).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Privacy & IDOR Notice */}
          <div className="p-6 rounded-3xl bg-white border border-[#E4E5E7] space-y-2 shadow-sm">
            <div className="flex items-center gap-2 text-[#202124] font-bold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-[#24292F]" />
              <span>Session Isolation</span>
            </div>
            <p className="text-[11px] text-[#70757A] leading-relaxed">
              Your session is authenticated via secure HTTP cookies. Role elevation, mass assignment, and cross-account data leaks are actively blocked at the database engine and API gateway levels.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
