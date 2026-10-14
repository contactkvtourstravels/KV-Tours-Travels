"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Building,
  MessageCircle,
  Shield,
  Mail,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { adminApi, ConfigurationHealthResponse } from "@/lib/api";

interface ConfigurationHealthSectionProps {
  onSelectTab: (tab: string) => void;
}

export default function ConfigurationHealthSection({
  onSelectTab,
}: ConfigurationHealthSectionProps) {
  const [health, setHealth] = useState<ConfigurationHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getConfigurationHealth();
      setHealth(res);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load system configuration health.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
      case "complete":
      case "configured":
      case "active":
      case "connected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Optimal</span>
          </span>
        );
      case "warning":
      case "partial":
      case "default_test":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3" />
            <span>Action Required</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
            <AlertCircle className="w-3 h-3" />
            <span>Incomplete</span>
          </span>
        );
    }
  };

  const score = health?.overall_score ?? health?.health_score ?? 0;
  const status = health?.overall_status ?? health?.status ?? "action_required";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#C5A880]" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#202124]">
                Global System Configuration Health
              </h2>
              <p className="text-xs text-[#5F6368] mt-1 max-w-2xl font-light">
                Comprehensive diagnostic summary evaluating authoritative business profile completeness,
                Click-to-Chat routing, Meta Cloud API, Resend transactional email, and payment gateway readiness.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchHealth}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Recheck Health</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {loading && !health ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-white border border-[#E4E5E7] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : health ? (
        <>
          {/* Overall Health Score Card */}
          <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div
                className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-bold font-mono text-2xl border ${
                  score >= 80
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : score >= 50
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                <span>{score}%</span>
                <span className="text-[9px] uppercase tracking-wider font-sans font-normal opacity-75">
                  Score
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#202124]">
                    System Preparedness: <span className="capitalize">{status}</span>
                  </h3>
                  {getStatusBadge(status)}
                </div>
                <p className="text-xs text-[#5F6368] mt-1 max-w-xl font-light">
                  {score >= 80
                    ? "All essential business profile details and customer notification channels are configured and operational."
                    : "Some integration channels or business contact details require administrator attention before going live."}
                </p>
                <div className="text-[10px] text-[#5F6368] mt-1 font-mono">
                  Agency Profile: {health.agency_profile_completed_percentage}% complete
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Module Health Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Agency Profile */}
            <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E4E5E7]">
                  <div className="flex items-center gap-2.5">
                    <Building className="w-5 h-5 text-[#C5A880]" />
                    <h4 className="text-xs font-bold text-[#202124]">Agency Profile &amp; Identity</h4>
                  </div>
                  {getStatusBadge(health.agency_profile_status)}
                </div>

                <div className="pt-3 space-y-2 text-xs">
                  <p className="text-[#5F6368]">
                    Authoritative profile used for public storefront headers, footers, PDF vouchers, and email footers.
                  </p>
                  {health.missing_profile_fields && health.missing_profile_fields.length > 0 ? (
                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                      <span className="text-[11px] font-bold text-amber-900 block mb-1">
                        Missing Recommended Fields:
                      </span>
                      <ul className="text-[10px] text-amber-800 list-disc list-inside space-y-0.5 font-mono">
                        {health.missing_profile_fields.map((f: string) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>All business identity and contact details complete!</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab("profile")}
                className="w-full py-2 px-3 bg-[#F9F9F8] hover:bg-stone-100 text-[#202124] text-xs font-bold rounded-xl border border-[#D3D8DF] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Edit Agency Profile</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C5A880]" />
              </button>
            </div>

            {/* 2. WhatsApp Click-to-Chat */}
            <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E4E5E7]">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-xs font-bold text-[#202124]">WhatsApp Click-to-Chat</h4>
                  </div>
                  {getStatusBadge(health.whatsapp_click_to_chat_status)}
                </div>

                <div className="pt-3 space-y-2 text-xs">
                  <p className="text-[#5F6368]">
                    Direct chat links on public itinerary pages, concierge floating button, and header CTAs.
                  </p>
                  <div className="p-2.5 bg-stone-50 rounded-lg text-[11px]">
                    Status: <span className="font-bold text-[#202124] capitalize">{health.whatsapp_click_to_chat_status}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab("whatsapp")}
                className="w-full py-2 px-3 bg-[#F9F9F8] hover:bg-stone-100 text-[#202124] text-xs font-bold rounded-xl border border-[#D3D8DF] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Configure Click-to-Chat</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            </div>

            {/* 3. WhatsApp Cloud API */}
            <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E4E5E7]">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-5 h-5 text-sky-600" />
                    <h4 className="text-xs font-bold text-[#202124]">WhatsApp Cloud API (Meta)</h4>
                  </div>
                  {getStatusBadge(health.whatsapp_cloud_api_status)}
                </div>

                <div className="pt-3 space-y-2 text-xs">
                  <p className="text-[#5F6368]">
                    Automated programmatic messaging for instant itinerary confirmations. If unconfigured,
                    standard Click-to-Chat operates without disruption.
                  </p>
                  <div className="p-2.5 bg-stone-50 rounded-lg text-[11px]">
                    Status: <span className="font-bold text-[#202124] capitalize">{health.whatsapp_cloud_api_status}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab("whatsapp_cloud")}
                className="w-full py-2 px-3 bg-[#F9F9F8] hover:bg-stone-100 text-[#202124] text-xs font-bold rounded-xl border border-[#D3D8DF] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Manage Meta Cloud API</span>
                <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
              </button>
            </div>

            {/* 4. Resend Transactional Email */}
            <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E4E5E7]">
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-5 h-5 text-violet-600" />
                    <h4 className="text-xs font-bold text-[#202124]">Resend Transactional Email</h4>
                  </div>
                  {getStatusBadge(health.resend_email_status)}
                </div>

                <div className="pt-3 space-y-2 text-xs">
                  <p className="text-[#5F6368]">
                    Dispatches booking vouchers, customer invoices, payment reminders, and contact lead notices.
                  </p>
                  <div className="p-2.5 bg-stone-50 rounded-lg text-[11px]">
                    Status: <span className="font-bold text-[#202124] capitalize">{health.resend_email_status}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab("email")}
                className="w-full py-2 px-3 bg-[#F9F9F8] hover:bg-stone-100 text-[#202124] text-xs font-bold rounded-xl border border-[#D3D8DF] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Manage Resend Email</span>
                <ArrowRight className="w-3.5 h-3.5 text-violet-600" />
              </button>
            </div>

            {/* 5. Payment Gateway */}
            <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4 md:col-span-2">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E4E5E7]">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-5 h-5 text-[#C5A880]" />
                    <h4 className="text-xs font-bold text-[#202124]">Payments &amp; Reconciliation Readiness</h4>
                  </div>
                  {getStatusBadge(health.payment_gateway_status)}
                </div>

                <div className="pt-3 space-y-2 text-xs">
                  <p className="text-[#5F6368]">
                    Dual-channel payments: Online cards, UPI &amp; NetBanking via Razorpay + Manual NEFT/IMPS bank transfers &amp; branch cash deposits.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-[#5F6368] block font-semibold mb-0.5">Online Gateway (Razorpay)</span>
                      <span className="font-bold text-[#202124] capitalize">{health.payment_gateway_status}</span>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl">
                      <span className="text-[#5F6368] block font-semibold mb-0.5">Direct Bank Wire / Branch</span>
                      <span className="font-bold text-[#202124] capitalize">{health.bank_transfer_status}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab("payments")}
                className="w-full py-2 px-3 bg-[#F9F9F8] hover:bg-stone-100 text-[#202124] text-xs font-bold rounded-xl border border-[#D3D8DF] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>View Payment Gateways &amp; Bank Settings</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C5A880]" />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
