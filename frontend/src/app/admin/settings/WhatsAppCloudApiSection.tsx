"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Key,
  Server,
  Lock,
  Save,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  Info,
  Clock,
} from "lucide-react";
import { adminApi, AdminSiteSettings, WhatsAppTestConnectionResponse } from "@/lib/api";

interface WhatsAppCloudApiSectionProps {
  settings: AdminSiteSettings;
  canEdit: boolean;
  onSaved: (updated: AdminSiteSettings) => void;
  onDirtyChange: (isDirty: boolean) => void;
  onViewLogs: () => void;
}

export default function WhatsAppCloudApiSection({
  settings,
  canEdit,
  onSaved,
  onDirtyChange,
  onViewLogs,
}: WhatsAppCloudApiSectionProps) {
  // Master Toggle
  const [waCloudApiEnabled, setWaCloudApiEnabled] = useState(
    settings.whatsapp_cloud_api_enabled ?? false
  );

  // Meta Credentials
  const [phoneNumberId, setPhoneNumberId] = useState(settings.whatsapp_phone_number_id || "");
  const [businessAccountId, setBusinessAccountId] = useState(
    settings.whatsapp_business_account_id || ""
  );
  const [apiVersion, setApiVersion] = useState(settings.whatsapp_api_version || "v19.0");

  // Protected Token handling
  const [changeTokenMode, setChangeTokenMode] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const tokenConfigured = Boolean(settings.whatsapp_access_token_configured);
  const tokenMasked = settings.whatsapp_access_token_masked;

  // Webhook Configuration
  const [verifyToken, setVerifyToken] = useState(settings.whatsapp_verify_token || "");
  const [appSecret, setAppSecret] = useState(settings.whatsapp_app_secret || "");
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  // UI States
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Test Connection Diagnostics
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<WhatsAppTestConnectionResponse | null>(null);

  // Track dirty changes
  useEffect(() => {
    const isDirty =
      waCloudApiEnabled !== (settings.whatsapp_cloud_api_enabled ?? false) ||
      phoneNumberId !== (settings.whatsapp_phone_number_id || "") ||
      businessAccountId !== (settings.whatsapp_business_account_id || "") ||
      apiVersion !== (settings.whatsapp_api_version || "v19.0") ||
      verifyToken !== (settings.whatsapp_verify_token || "") ||
      appSecret !== (settings.whatsapp_app_secret || "") ||
      (changeTokenMode && accessToken.trim().length > 0);

    onDirtyChange(isDirty);
  }, [
    waCloudApiEnabled,
    phoneNumberId,
    businessAccountId,
    apiVersion,
    verifyToken,
    appSecret,
    changeTokenMode,
    accessToken,
    settings,
    onDirtyChange,
  ]);

  const webhookCallbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/webhooks/whatsapp`
      : "https://your-domain.com/api/v1/webhooks/whatsapp";

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookCallbackUrl);
    setCopiedWebhookUrl(true);
    setTimeout(() => setCopiedWebhookUrl(false), 2500);
  };

  const handleReset = () => {
    setWaCloudApiEnabled(settings.whatsapp_cloud_api_enabled ?? false);
    setPhoneNumberId(settings.whatsapp_phone_number_id || "");
    setBusinessAccountId(settings.whatsapp_business_account_id || "");
    setApiVersion(settings.whatsapp_api_version || "v19.0");
    setVerifyToken(settings.whatsapp_verify_token || "");
    setAppSecret(settings.whatsapp_app_secret || "");
    setChangeTokenMode(false);
    setAccessToken("");
    setShowTokenInput(false);
    setErrors({});
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      const res = await adminApi.testWhatsAppConnection();
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        status: "error",
        message: (err as Error).message || "Connection test failed.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    try {
      setSaving(true);
      setErrors({});

      const payload: Partial<AdminSiteSettings> = {
        whatsapp_cloud_api_enabled: waCloudApiEnabled,
        whatsapp_phone_number_id: phoneNumberId.trim() || undefined,
        whatsapp_business_account_id: businessAccountId.trim() || undefined,
        whatsapp_api_version: apiVersion.trim() || undefined,
        whatsapp_verify_token: verifyToken.trim() || undefined,
        whatsapp_app_secret: appSecret.trim() || undefined,
      };

      if (changeTokenMode && accessToken.trim()) {
        payload.whatsapp_access_token = accessToken.trim();
      }

      const updated = await adminApi.updateSettings(payload);
      onSaved(updated);
      setChangeTokenMode(false);
      setAccessToken("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setErrors({ global: (err as Error).message || "Failed to save Meta Cloud API settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-[#202124]">
                  WhatsApp Cloud API (Meta Graph API)
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    waCloudApiEnabled && tokenConfigured
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {waCloudApiEnabled && tokenConfigured ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-[#5F6368] mt-1 max-w-2xl font-light">
                Enterprise programmatic messaging via Meta Graph API for automated booking confirmations,
                itinerary dispatch, and transactional updates. If Cloud API is not configured, ordinary
                Click-to-Chat continues to work seamlessly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {canEdit && (
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#202124] hover:bg-[#2F3337] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Configuration"}</span>
              </button>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Meta Cloud API settings saved securely with AES-256-GCM authenticated encryption.</span>
          </div>
        )}

        {errors.global && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errors.global}</span>
          </div>
        )}
      </div>

      {/* Cloud API Master Toggle */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
          <div>
            <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-600" />
              <span>Enable Cloud API Dispatch</span>
            </h3>
            <p className="text-xs text-[#5F6368] mt-0.5">
              When enabled, automated booking notifications will attempt delivery via Meta Graph API.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWaCloudApiEnabled(!waCloudApiEnabled)}
            disabled={!canEdit}
            className={`p-1.5 rounded-xl transition-all ${
              waCloudApiEnabled ? "text-sky-600 hover:text-sky-700" : "text-stone-400 hover:text-stone-500"
            }`}
          >
            {waCloudApiEnabled ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
          </button>
        </div>

        {/* Diagnostic Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-4 py-2 bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-800 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-sky-600" />
              <span>{testingConnection ? "Verifying Meta API..." : "Test Connection"}</span>
            </button>

            <button
              type="button"
              onClick={onViewLogs}
              className="px-3.5 py-2 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>View Delivery Logs</span>
            </button>
          </div>

          <div className="text-[11px] text-[#5F6368]">
            Status:{" "}
            {tokenConfigured ? (
              <span className="font-bold text-emerald-700">Token Configured (Encrypted)</span>
            ) : (
              <span className="font-bold text-amber-700">No Access Token Set</span>
            )}
          </div>
        </div>

        {/* Diagnostic Results Display */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs font-medium space-y-1.5 ${
              testResult.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
            {testResult.display_phone_number && (
              <p className="font-mono text-[11px] opacity-80">
                Verified Phone: {testResult.display_phone_number} {testResult.verified_name && `(${testResult.verified_name})`}
              </p>
            )}
            {testResult.details && (
              <pre className="text-[11px] font-mono opacity-80 mt-1 whitespace-pre-wrap">{JSON.stringify(testResult.details, null, 2)}</pre>
            )}
            <p className="text-[10px] opacity-60">Status: {testResult.status}</p>
          </div>
        )}
      </div>

      {/* Meta Graph API Credentials */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-[#202124]">Meta Developer Credentials</h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Values from your Meta for Developers App Dashboard &gt; WhatsApp &gt; API Setup.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Phone Number ID
            </label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              disabled={!canEdit}
              placeholder="e.g. 109842212345678"
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
            <p className="text-[10px] text-[#5F6368] mt-1">Unique ID for your business phone number</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              WhatsApp Business Account ID (WABA)
            </label>
            <input
              type="text"
              value={businessAccountId}
              onChange={(e) => setBusinessAccountId(e.target.value)}
              disabled={!canEdit}
              placeholder="e.g. 104523198765432"
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
            <p className="text-[10px] text-[#5F6368] mt-1">Found in Meta Business Manager settings</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Graph API Version
            </label>
            <input
              type="text"
              value={apiVersion}
              onChange={(e) => setApiVersion(e.target.value)}
              disabled={!canEdit}
              placeholder="v19.0"
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
          </div>
        </div>

        {/* Secure Access Token Card */}
        <div className="p-4 bg-[#F9F9F8] border border-[#E4E5E7] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#C5A880]" />
              <span className="text-xs font-bold text-[#202124]">Meta System User Permanent Access Token</span>
            </div>
            {tokenConfigured && !changeTokenMode && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                Saved &amp; Protected
              </span>
            )}
          </div>

          {!changeTokenMode && tokenConfigured ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="font-mono text-xs text-[#5F6368] bg-white px-3 py-2 border border-[#D3D8DF] rounded-lg flex-1">
                {tokenMasked || "••••••••••••••••••••••••••••••••"}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setChangeTokenMode(true)}
                  className="px-3 py-2 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-xs font-semibold text-[#202124] rounded-lg transition-all shadow-2xs whitespace-nowrap"
                >
                  Change Token
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showTokenInput ? "text" : "password"}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Paste new EAAG... permanent token"
                  className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                >
                  {showTokenInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#5F6368]">
                  Token is encrypted with AES-256-GCM before storage. It is never returned in plaintext.
                </p>
                {tokenConfigured && (
                  <button
                    type="button"
                    onClick={() => {
                      setChangeTokenMode(false);
                      setAccessToken("");
                    }}
                    className="text-[11px] font-semibold text-[#5F6368] hover:text-[#202124]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Webhook Configuration Section */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#202124]">Inbound Webhook Verification</h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Configure Webhooks in Meta App Dashboard &gt; WhatsApp &gt; Configuration &gt; Edit Webhook.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Callback URL (Provide to Meta)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookCallbackUrl}
                className="flex-1 px-3 py-2 bg-stone-50 border border-[#D3D8DF] rounded-xl text-xs font-mono text-[#5F6368] outline-hidden select-all"
              />
              <button
                type="button"
                onClick={handleCopyWebhookUrl}
                className="px-3.5 py-2 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-xs font-semibold text-[#202124] rounded-xl transition-all shadow-2xs flex items-center gap-1.5 whitespace-nowrap"
              >
                {copiedWebhookUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhookUrl ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-[#202124] mb-1.5">
                Webhook Verify Token
              </label>
              <input
                type="text"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                disabled={!canEdit}
                placeholder="Secret string matched in Meta Dashboard"
                className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202124] mb-1.5">
                App Secret (Payload Signature Verification)
              </label>
              <input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                disabled={!canEdit}
                placeholder="Meta App Secret for HMAC-SHA256"
                className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
