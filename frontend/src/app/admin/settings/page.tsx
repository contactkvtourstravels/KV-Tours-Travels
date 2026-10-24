"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  RefreshCw,
  MessageCircle,
  Mail,
  Shield,
  Clock,
  Sparkles,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  X,
  Printer,
  FileText,
} from "lucide-react";
import { adminApi, AdminSiteSettings } from "@/lib/api";
import { useAdmin } from "../AdminContext";

import WhatsAppClickToChatSection from "./WhatsAppClickToChatSection";
import WhatsAppCloudApiSection from "./WhatsAppCloudApiSection";
import ResendEmailSection from "./ResendEmailSection";
import PaymentGatewaySection from "./PaymentGatewaySection";
import PdfVoucherSettingsSection from "./PdfVoucherSettingsSection";
import DeliveryLogsSection from "./DeliveryLogsSection";
import ConfigurationHealthSection from "./ConfigurationHealthSection";

export type SettingsTab =
  | "whatsapp"
  | "whatsapp_cloud"
  | "email"
  | "payments"
  | "pdf"
  | "logs"
  | "health";

export default function AdminSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["admin", "super_admin"]);

  const [activeTab, setActiveTab] = useState<SettingsTab>("whatsapp");
  const [settings, setSettings] = useState<AdminSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Unsaved changes tracking
  const [isDirty, setIsDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Read URL tab query parameter and seamlessly redirect consolidated tabs
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      if (tabParam === "homepage") {
        router.replace("/admin/content/main");
        return;
      }
      if (tabParam === "profile" || tabParam === "business") {
        router.replace("/admin/content/main?tab=branding");
        return;
      }
      if (tabParam === "notification_logs") {
        setActiveTab("logs");
      } else if (tabParam === "voucher") {
        setActiveTab("pdf");
      } else if (
        [
          "whatsapp",
          "whatsapp_cloud",
          "email",
          "payments",
          "pdf",
          "logs",
          "health",
        ].includes(tabParam)
      ) {
        setActiveTab(tabParam as SettingsTab);
      }
    }
  }, [searchParams, router]);

  // Warn on browser unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const fetchSettings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await adminApi.getSettings();
      setSettings(data);
      setIsDirty(false);
      if (isRefresh) {
        setToastMessage("Settings refreshed from authoritative database.");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load authoritative site settings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleTabChange = (targetTab: SettingsTab) => {
    if (targetTab === activeTab) return;

    if (isDirty) {
      setPendingTab(targetTab);
      setShowUnsavedModal(true);
      return;
    }

    proceedToTab(targetTab);
  };

  const proceedToTab = (targetTab: SettingsTab) => {
    setIsDirty(false);
    setShowUnsavedModal(false);
    setPendingTab(null);
    setActiveTab(targetTab);

    // Update query params without full page reload
    const url = new URL(window.location.href);
    url.searchParams.set("tab", targetTab);
    window.history.pushState({}, "", url.toString());
  };

  const handleSettingsSaved = (updated: AdminSiteSettings) => {
    setSettings(updated);
    setIsDirty(false);
    setToastMessage("Settings successfully saved and synchronized.");
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl">
        <div className="h-10 w-72 bg-stone-200 rounded-xl" />
        <div className="h-12 bg-white border border-[#E4E5E7] rounded-2xl" />
        <div className="h-96 bg-white border border-[#E4E5E7] rounded-2xl" />
      </div>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "whatsapp", label: "WhatsApp Click-to-Chat", icon: MessageCircle },
    { id: "whatsapp_cloud", label: "WhatsApp Cloud API", icon: Shield },
    { id: "email", label: "Resend Email", icon: Mail },
    { id: "payments", label: "Payment Gateway", icon: CreditCard },
    { id: "pdf", label: "Travel Voucher & PDF", icon: Printer },
    { id: "logs", label: "Delivery Logs", icon: Clock },
    { id: "health", label: "Configuration Health", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E4E5E7] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
              Administration &amp; Integrations
            </span>
            {settings.currency && (
              <span className="text-[10px] font-mono font-bold bg-stone-100 text-[#5F6368] px-2 py-0.5 rounded-md">
                {settings.currency}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[#202124] flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[#C5A880]" />
            <span>Settings &amp; Integrations</span>
          </h1>
          <p className="text-xs text-[#5F6368] mt-1 font-light">
            Unified control center for authoritative business identity, WhatsApp channels, Resend transactional
            email, payment routing, and storefront content.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isDirty && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Unsaved Changes</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => fetchSettings(true)}
            disabled={refreshing}
            title="Reload authoritative database settings"
            className="p-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] hover:text-[#202124] transition-all shadow-2xs disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh Configuration</span>
          </button>
        </div>
      </div>

      {/* Consolidated Homepage & Profile Notice Banner */}
      <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-[#C5A880] shrink-0" />
          <span className="text-[#5F6368]">
            <strong className="text-[#202124] font-semibold">Homepage and Agency Identity controls are consolidated:</strong> Manage agency branding, contact information, hero headline, and featured catalog curation in Website Content &rarr; Main Website.
          </span>
        </div>
        <Link
          href="/admin/content/main"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#202124] hover:bg-[#3D4450] text-white font-semibold text-xs transition-colors shrink-0 shadow-2xs"
        >
          <span>Open Main Website</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Toast & Error Banners */}
      {toastMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation Ribbon */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E4E5E7] pb-3 text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-[#202124] text-white shadow-xs"
                  : "bg-white text-[#5F6368] border border-[#D3D8DF] hover:bg-[#F7F7F5] hover:text-[#202124]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#C5A880]" : ""}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === "whatsapp" && (
          <WhatsAppClickToChatSection
            settings={settings}
            canEdit={canEdit}
            onSaved={handleSettingsSaved}
            onDirtyChange={setIsDirty}
          />
        )}

        {activeTab === "whatsapp_cloud" && (
          <WhatsAppCloudApiSection
            settings={settings}
            canEdit={canEdit}
            onSaved={handleSettingsSaved}
            onDirtyChange={setIsDirty}
            onViewLogs={() => proceedToTab("logs")}
          />
        )}

        {activeTab === "email" && (
          <ResendEmailSection
            settings={settings}
            canEdit={canEdit}
            onSaved={handleSettingsSaved}
            onDirtyChange={setIsDirty}
            onViewLogs={() => proceedToTab("logs")}
          />
        )}

        {activeTab === "payments" && <PaymentGatewaySection />}

        {activeTab === "pdf" && (
          <PdfVoucherSettingsSection
            settings={settings}
            canEdit={canEdit}
            onSaved={handleSettingsSaved}
            onDirtyChange={setIsDirty}
          />
        )}

        {activeTab === "logs" && <DeliveryLogsSection />}

        {activeTab === "health" && (
          <ConfigurationHealthSection onSelectTab={(t) => proceedToTab(t as SettingsTab)} />
        )}
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedModal && pendingTab && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-scaleIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#202124]">Unsaved Changes</h3>
                <p className="text-xs text-[#5F6368]">
                  You have unsaved edits in this section. Switching tabs now will discard them.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E5E7]">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedModal(false);
                  setPendingTab(null);
                }}
                className="px-4 py-2 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-xs font-semibold text-[#5F6368] rounded-xl transition-all"
              >
                Stay Here
              </button>
              <button
                type="button"
                onClick={() => proceedToTab(pendingTab)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Discard &amp; Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
