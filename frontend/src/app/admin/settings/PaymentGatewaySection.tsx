"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Building,
  Shield,
  Zap,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Lock,
} from "lucide-react";
import Link from "next/link";
import BankTransferSettingsSection from "@/components/admin/BankTransferSettingsSection";
import { adminPaymentApi, PaymentSettingsResponse } from "@/lib/api";

export default function PaymentGatewaySection() {
  const [activeSubTab, setActiveSubTab] = useState<"gateway" | "bank">("bank");
  const [gatewaySettings, setGatewaySettings] = useState<PaymentSettingsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadGateway() {
      try {
        setLoading(true);
        const res = await adminPaymentApi.getSettings();
        setGatewaySettings(res);
      } catch {
        // Non-blocking
      } finally {
        setLoading(false);
      }
    }
    loadGateway();
  }, []);

  return (
    <div className="space-y-6">
      {/* Sub-tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E4E5E7] pb-3 text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab("bank")}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeSubTab === "bank"
              ? "bg-[#202124] text-white shadow-xs"
              : "bg-white text-[#5F6368] border border-[#D3D8DF] hover:bg-[#F7F7F5]"
          }`}
        >
          <Building className="w-4 h-4 text-[#C5A880]" />
          <span>Bank Wire &amp; Branch Cash</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("gateway")}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeSubTab === "gateway"
              ? "bg-[#202124] text-white shadow-xs"
              : "bg-white text-[#5F6368] border border-[#D3D8DF] hover:bg-[#F7F7F5]"
          }`}
        >
          <CreditCard className="w-4 h-4 text-[#C5A880]" />
          <span>Online Gateway (Razorpay)</span>
        </button>
      </div>

      {activeSubTab === "bank" ? (
        <BankTransferSettingsSection />
      ) : (
        <div className="space-y-6">
          {/* Gateway Status Header */}
          <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-serif font-bold text-[#202124]">
                      Razorpay Online Payment Gateway
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        gatewaySettings?.razorpay_enabled
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {gatewaySettings?.razorpay_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-[#5F6368] mt-1 max-w-2xl font-light">
                    Accept domestic and international credit/debit cards, UPI, net banking, and digital wallets.
                    Razorpay credentials and webhook secret are secured using AES-256-GCM encryption.
                  </p>
                </div>
              </div>

              <Link
                href="/admin/payments?tab=gateway"
                className="px-4 py-2 rounded-xl bg-[#202124] hover:bg-[#2F3337] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs self-start sm:self-auto shrink-0"
              >
                <span>Manage Razorpay Gateway</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Gateway Overview */}
          <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#202124]">Gateway Status &amp; Environment</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-stone-50 rounded-xl space-y-1">
                <span className="text-[#5F6368] text-[11px] block">Operating Mode</span>
                <span className="font-bold text-[#202124] text-sm capitalize">
                  {gatewaySettings?.razorpay_environment === "test" ? "Test Mode (Sandbox)" : "Live Production"}
                </span>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl space-y-1">
                <span className="text-[#5F6368] text-[11px] block">Key ID Status</span>
                <span className="font-bold text-[#202124] text-sm">
                  {gatewaySettings?.razorpay_key_id_masked ? `Configured (${gatewaySettings.razorpay_key_id_masked})` : "Not Set"}
                </span>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl space-y-1">
                <span className="text-[#5F6368] text-[11px] block">Webhook Verification</span>
                <span className="font-bold text-[#202124] text-sm">
                  {gatewaySettings?.webhook_secret_configured ? "Secret Configured" : "Pending Webhook Secret"}
                </span>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
              <span>
                To rotate live API keys, update webhook URLs, or run live test charge simulations, access the dedicated Payments &amp; Reconciliation console.
              </span>
              <Link
                href="/admin/payments?tab=gateway"
                className="font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 shrink-0 ml-4"
              >
                <span>Open Gateway Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
