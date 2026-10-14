"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Mail,
  Lock,
  Save,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Send,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Clock,
  Check,
  ExternalLink,
  Info,
  Globe,
  Radio,
  Copy,
  RefreshCw,
  Terminal,
  ShieldAlert,
} from "lucide-react";
import {
  adminApi,
  AdminSiteSettings,
  EmailTestConnectionResponse,
  EmailSendTestResponse,
  ResendWebhookStatsResponse,
  ResendWebhookVerifyResponse,
} from "@/lib/api";

interface ResendEmailSectionProps {
  settings: AdminSiteSettings;
  canEdit: boolean;
  onSaved: (updated: AdminSiteSettings) => void;
  onDirtyChange: (isDirty: boolean) => void;
  onViewLogs: () => void;
}

interface DomainRecord {
  record: string;
  name: string;
  value: string;
  type: string;
  ttl?: string;
  status?: string;
  priority?: number;
}

export default function ResendEmailSection({
  settings,
  canEdit,
  onSaved,
  onDirtyChange,
  onViewLogs,
}: ResendEmailSectionProps) {
  // Environment Mode (Development / Test Sandbox vs Production)
  const [emailEnvironmentMode, setEmailEnvironmentMode] = useState<"development" | "production">(
    settings.email_environment_mode === "production" ? "production" : "development"
  );

  // Master Toggle & Sender Configuration
  const [emailEnabled, setEmailEnabled] = useState(settings.email_enabled ?? true);
  const [senderName, setSenderName] = useState(settings.email_sender_name || "KV Tours & Travels");
  const [senderEmail, setSenderEmail] = useState(
    settings.email_sender_email || (settings.email_environment_mode === "production" ? "bookings@kvtours.in" : "onboarding@resend.dev")
  );
  const [replyToEmail, setReplyToEmail] = useState(
    settings.email_reply_to || settings.reply_to_email || "concierge@kvtours.in"
  );
  const [adminNotificationEmail, setAdminNotificationEmail] = useState(
    settings.admin_notification_email || "admin@kvtours.in"
  );

  // Protected Resend API Key
  const [changeKeyMode, setChangeKeyMode] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const keyConfigured = Boolean(settings.resend_api_key_configured);
  const keyMasked = settings.resend_api_key_masked;

  // Development Webhook Tunnel URL & Webhook Secret
  const [tunnelUrl, setTunnelUrl] = useState(settings.resend_webhook_tunnel_url || "");
  const [changeSecretMode, setChangeSecretMode] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showSecretInput, setShowSecretInput] = useState(false);
  const secretConfigured = Boolean(settings.resend_webhook_signing_secret_configured);
  const secretMasked = settings.resend_webhook_signing_secret_masked;

  // Individual Notification Preferences
  const [notifyBookingConfirm, setNotifyBookingConfirm] = useState(
    settings.email_booking_confirmation_enabled ?? true
  );
  const [notifyInquiryAck, setNotifyInquiryAck] = useState(
    settings.email_inquiry_ack_enabled ?? true
  );
  const [notifyPaymentReceipt, setNotifyPaymentReceipt] = useState(
    settings.email_payment_receipt_enabled ?? true
  );
  const [notifyCancellationAck, setNotifyCancellationAck] = useState(
    settings.email_cancellation_updates_enabled ?? true
  );
  const [notifyPaymentReminder, setNotifyPaymentReminder] = useState(
    settings.email_trip_reminders_enabled ?? true
  );

  // Editable Template Subjects
  const [subjectBooking, setSubjectBooking] = useState(
    settings.email_subject_booking_confirmation || "Your Booking Confirmation — KV Tours & Travels"
  );
  const [subjectReceipt, setSubjectReceipt] = useState(
    settings.email_subject_payment_receipt || "Payment Receipt — KV Tours & Travels"
  );
  const [subjectInquiry, setSubjectInquiry] = useState(
    settings.email_subject_inquiry_ack || "Inquiry Received — KV Tours & Travels"
  );
  const [subjectReminder, setSubjectReminder] = useState(
    settings.email_subject_trip_reminder || "Your Upcoming Journey with KV Tours & Travels"
  );

  // UI Feedback States
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Diagnostics States
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<EmailTestConnectionResponse | null>(null);

  const [verifyingSender, setVerifyingSender] = useState(false);
  const [senderVerifyResult, setSenderVerifyResult] = useState<EmailTestConnectionResponse | null>(null);

  // Webhook Verification & Stats
  const [verifyingWebhook, setVerifyingWebhook] = useState(false);
  const [webhookVerifyResult, setWebhookVerifyResult] = useState<ResendWebhookVerifyResponse | null>(null);
  const [webhookStats, setWebhookStats] = useState<ResendWebhookStatsResponse | null>(null);
  const [loadingWebhookStats, setLoadingWebhookStats] = useState(false);

  // Send Test Email State
  const [testRecipient, setTestRecipient] = useState(
    settings.email_environment_mode === "production" ? settings.admin_notification_email || "" : "delivered@resend.dev"
  );
  const [sendingTest, setSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<EmailSendTestResponse | null>(null);

  const loadWebhookStats = useCallback(async () => {
    setLoadingWebhookStats(true);
    try {
      const stats = await adminApi.getEmailWebhookStats();
      setWebhookStats(stats);
    } catch {
      // Non-critical background fetch
    } finally {
      setLoadingWebhookStats(false);
    }
  }, []);

  useEffect(() => {
    loadWebhookStats();
  }, [loadWebhookStats]);

  // Track dirty state
  useEffect(() => {
    const isDirty =
      emailEnvironmentMode !== (settings.email_environment_mode === "production" ? "production" : "development") ||
      emailEnabled !== (settings.email_enabled ?? true) ||
      senderName !== (settings.email_sender_name || "KV Tours & Travels") ||
      senderEmail !== (settings.email_sender_email || "bookings@kvtours.in") ||
      replyToEmail !== (settings.email_reply_to || settings.reply_to_email || "concierge@kvtours.in") ||
      adminNotificationEmail !== (settings.admin_notification_email || "admin@kvtours.in") ||
      tunnelUrl !== (settings.resend_webhook_tunnel_url || "") ||
      notifyBookingConfirm !== (settings.email_booking_confirmation_enabled ?? true) ||
      notifyInquiryAck !== (settings.email_inquiry_ack_enabled ?? true) ||
      notifyPaymentReceipt !== (settings.email_payment_receipt_enabled ?? true) ||
      notifyCancellationAck !== (settings.email_cancellation_updates_enabled ?? true) ||
      notifyPaymentReminder !== (settings.email_trip_reminders_enabled ?? true) ||
      subjectBooking !== (settings.email_subject_booking_confirmation || "Your Booking Confirmation — KV Tours & Travels") ||
      subjectReceipt !== (settings.email_subject_payment_receipt || "Payment Receipt — KV Tours & Travels") ||
      subjectInquiry !== (settings.email_subject_inquiry_ack || "Inquiry Received — KV Tours & Travels") ||
      subjectReminder !== (settings.email_subject_trip_reminder || "Your Upcoming Journey with KV Tours & Travels") ||
      (changeKeyMode && apiKey.trim().length > 0) ||
      (changeSecretMode && webhookSecret.trim().length > 0);

    onDirtyChange(isDirty);
  }, [
    emailEnvironmentMode,
    emailEnabled,
    senderName,
    senderEmail,
    replyToEmail,
    adminNotificationEmail,
    tunnelUrl,
    notifyBookingConfirm,
    notifyInquiryAck,
    notifyPaymentReceipt,
    notifyCancellationAck,
    notifyPaymentReminder,
    subjectBooking,
    subjectReceipt,
    subjectInquiry,
    subjectReminder,
    changeKeyMode,
    apiKey,
    changeSecretMode,
    webhookSecret,
    settings,
    onDirtyChange,
  ]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleReset = () => {
    setEmailEnvironmentMode(settings.email_environment_mode === "production" ? "production" : "development");
    setEmailEnabled(settings.email_enabled ?? true);
    setSenderName(settings.email_sender_name || "KV Tours & Travels");
    setSenderEmail(settings.email_sender_email || "bookings@kvtours.in");
    setReplyToEmail(settings.email_reply_to || settings.reply_to_email || "concierge@kvtours.in");
    setAdminNotificationEmail(settings.admin_notification_email || "admin@kvtours.in");
    setTunnelUrl(settings.resend_webhook_tunnel_url || "");
    setNotifyBookingConfirm(settings.email_booking_confirmation_enabled ?? true);
    setNotifyInquiryAck(settings.email_inquiry_ack_enabled ?? true);
    setNotifyPaymentReceipt(settings.email_payment_receipt_enabled ?? true);
    setNotifyCancellationAck(settings.email_cancellation_updates_enabled ?? true);
    setNotifyPaymentReminder(settings.email_trip_reminders_enabled ?? true);
    setSubjectBooking(settings.email_subject_booking_confirmation || "Your Booking Confirmation — KV Tours & Travels");
    setSubjectReceipt(settings.email_subject_payment_receipt || "Payment Receipt — KV Tours & Travels");
    setSubjectInquiry(settings.email_subject_inquiry_ack || "Inquiry Received — KV Tours & Travels");
    setSubjectReminder(settings.email_subject_trip_reminder || "Your Upcoming Journey with KV Tours & Travels");
    setChangeKeyMode(false);
    setApiKey("");
    setShowKeyInput(false);
    setChangeSecretMode(false);
    setWebhookSecret("");
    setShowSecretInput(false);
    setErrors({});
    setConnectionResult(null);
    setSenderVerifyResult(null);
    setWebhookVerifyResult(null);
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionResult(null);
      const res = await adminApi.testEmailConnection();
      setConnectionResult(res);
    } catch (err: unknown) {
      setConnectionResult({
        success: false,
        status: "api_error",
        message: err instanceof Error ? err.message : "Resend API connection test failed.",
        provider: "resend",
        api_key_configured: false,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleVerifySender = async () => {
    try {
      setVerifyingSender(true);
      setSenderVerifyResult(null);
      const res = await adminApi.verifyEmailSender();
      setSenderVerifyResult(res);
    } catch (err: unknown) {
      setSenderVerifyResult({
        success: false,
        sender_domain: senderEmail.split("@")[1] || "unknown",
        status: "provider_error",
        sender_status: "provider_error",
        message: err instanceof Error ? err.message : "Sender domain verification failed.",
        provider: "resend",
        api_key_configured: false,
      });
    } finally {
      setVerifyingSender(false);
    }
  };

  const handleVerifyWebhook = async () => {
    try {
      setVerifyingWebhook(true);
      setWebhookVerifyResult(null);
      const secretToTest = changeSecretMode && webhookSecret.trim() ? webhookSecret.trim() : undefined;
      const res = await adminApi.verifyEmailWebhook({ signing_secret: secretToTest });
      setWebhookVerifyResult(res);
      loadWebhookStats();
    } catch (err: unknown) {
      setWebhookVerifyResult({
        success: false,
        status: "verification_failed",
        message: err instanceof Error ? err.message : "Webhook signature algorithm verification failed.",
        webhook_url: `/api/v1/webhooks/resend`,
        is_https: false,
        signing_secret_configured: false,
      });
    } finally {
      setVerifyingWebhook(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) return;

    try {
      setSendingTest(true);
      setTestSendResult(null);
      const res = await adminApi.sendTestEmail(testRecipient.trim());
      setTestSendResult(res);
    } catch (err: unknown) {
      setTestSendResult({
        success: false,
        provider: "resend",
        recipient: testRecipient,
        message: err instanceof Error ? err.message : "Failed to deliver test email.",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const validationErrors: Record<string, string> = {};
    if (!senderEmail.trim()) {
      validationErrors.email_sender_email = "Sender email address is required.";
    }

    if (tunnelUrl.trim() && !tunnelUrl.trim().startsWith("https://")) {
      validationErrors.resend_webhook_tunnel_url =
        "Webhook tunnel URL must begin with 'https://' (Resend requires HTTPS).";
    }

    if (changeKeyMode && apiKey.trim() && !apiKey.trim().startsWith("re_")) {
      validationErrors.resend_api_key = "Resend API keys must begin with 're_'.";
    }

    if (changeSecretMode && webhookSecret.trim() && !webhookSecret.trim().startsWith("whsec_")) {
      validationErrors.resend_webhook_signing_secret = "Resend Webhook secrets typically begin with 'whsec_'.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      const payload: Partial<AdminSiteSettings> = {
        email_environment_mode: emailEnvironmentMode,
        email_enabled: emailEnabled,
        email_sender_name: senderName.trim(),
        email_sender_email: senderEmail.trim(),
        email_reply_to: replyToEmail.trim() || undefined,
        reply_to_email: replyToEmail.trim() || undefined,
        admin_notification_email: adminNotificationEmail.trim() || undefined,
        resend_webhook_tunnel_url: tunnelUrl.trim() || undefined,
        email_booking_confirmation_enabled: notifyBookingConfirm,
        email_inquiry_ack_enabled: notifyInquiryAck,
        email_payment_receipt_enabled: notifyPaymentReceipt,
        email_cancellation_updates_enabled: notifyCancellationAck,
        email_trip_reminders_enabled: notifyPaymentReminder,
        email_subject_booking_confirmation: subjectBooking.trim(),
        email_subject_payment_receipt: subjectReceipt.trim(),
        email_subject_inquiry_ack: subjectInquiry.trim(),
        email_subject_trip_reminder: subjectReminder.trim(),
      };

      if (changeKeyMode && apiKey.trim()) {
        payload.resend_api_key = apiKey.trim();
      }

      if (changeSecretMode && webhookSecret.trim()) {
        payload.resend_webhook_signing_secret = webhookSecret.trim();
      }

      const updated = await adminApi.updateSettings(payload);
      onSaved(updated);
      setChangeKeyMode(false);
      setApiKey("");
      setChangeSecretMode(false);
      setWebhookSecret("");
      setSaveSuccess(true);
      loadWebhookStats();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setErrors({ global: err instanceof Error ? err.message : "Failed to persist Resend settings." });
    } finally {
      setSaving(false);
    }
  };

  // Determine active effective webhook URL
  const localBackendUrl = "http://localhost:8000/api/v1/webhooks/resend";
  const activeWebhookUrl =
    tunnelUrl.trim() ||
    webhookStats?.webhook_url ||
    (typeof window !== "undefined" && window.location.protocol === "https:"
      ? `${window.location.origin}/api/v1/webhooks/resend`
      : null);

  const isWebhookHttps = Boolean(
    activeWebhookUrl && activeWebhookUrl.startsWith("https://")
  );

  // Extract DNS records returned by Resend /domains
  const domainDetails = senderVerifyResult?.details as Record<string, unknown> | undefined;
  const rawRecords = (senderVerifyResult?.dns_records || (domainDetails?.records as DomainRecord[]) || []) as DomainRecord[];

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 1. Header Card */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-[#E4E5E7] flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-[#C5A880]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-[#202124]">
                  Resend Transactional Email Engine
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    emailEnabled && keyConfigured
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-stone-100 text-stone-600 border-stone-200"
                  }`}
                >
                  {emailEnabled && keyConfigured ? "Engine Active" : "Engine Suspended"}
                </span>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    emailEnvironmentMode === "development"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  {emailEnvironmentMode === "development" ? "Dev / Sandbox Mode" : "Production Mode"}
                </span>
              </div>
              <p className="text-xs text-[#5F6368] mt-1 max-w-2xl font-light">
                High-deliverability customer transactional communications exclusively powered by the official Resend API.
                Dispatches booking vouchers, PDF receipts, inquiry acknowledgments, and operational alerts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] text-xs font-semibold flex items-center gap-2 transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#5F6368]" />
              <span>Reset</span>
            </button>

            {canEdit && (
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>{saving ? "Saving..." : "Save Settings"}</span>
              </button>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Resend configuration securely saved and synchronized across KV Tours services.</span>
          </div>
        )}

        {errors.global && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errors.global}</span>
          </div>
        )}
      </div>

      {/* 2. Environment Mode Selector (Development vs Production) */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E5E7]">
          <div>
            <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#C5A880]" />
              <span>Email Environment &amp; Custom Domain Strategy</span>
            </h3>
            <p className="text-xs text-[#5F6368] mt-0.5">
              Select whether you are testing without a custom domain or operating with a verified production domain.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setEmailEnvironmentMode("development");
                if (senderEmail === "bookings@kvtours.in") {
                  setSenderEmail("onboarding@resend.dev");
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                emailEnvironmentMode === "development"
                  ? "bg-white text-[#202124] shadow-2xs border border-[#D3D8DF]"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
            >
              Development / Test Mode
            </button>
            <button
              type="button"
              onClick={() => {
                setEmailEnvironmentMode("production");
                if (senderEmail === "onboarding@resend.dev") {
                  setSenderEmail("bookings@kvtours.in");
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                emailEnvironmentMode === "production"
                  ? "bg-[#24292F] text-white shadow-2xs"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
            >
              Production Mode
            </button>
          </div>
        </div>

        {/* Development Mode Guidance */}
        {emailEnvironmentMode === "development" ? (
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-amber-900 block">
                  Development Mode: Testing Without a Custom Domain
                </span>
                <p className="text-xs text-amber-800 leading-relaxed font-light">
                  You do not need to purchase or configure a custom domain yet. In this mode, Resend permits outbound email delivery using their official onboarding sender:
                  <code className="mx-1 px-1.5 py-0.5 bg-white border border-amber-200 rounded text-amber-900 font-mono font-bold">
                    onboarding@resend.dev
                  </code>
                </p>
                <div className="text-[11px] text-amber-800 bg-white/70 border border-amber-200/80 p-2.5 rounded-lg space-y-1">
                  <div className="font-semibold text-amber-900">Resend Free Account / Sandbox Restrictions:</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Outbound emails can only be delivered to your registered Resend account owner email address.</li>
                    <li>Official test sinks: Use <code className="font-mono font-bold">delivered@resend.dev</code> to verify successful delivery (returns 200 OK), or <code className="font-mono font-bold">bounced@resend.dev</code> to simulate a bounce event.</li>
                    <li>Sending to arbitrary customer email addresses will be rejected with <code className="font-mono">403 Forbidden</code> until a custom domain is verified.</li>
                  </ul>
                </div>
              </div>
            </div>

            {senderEmail !== "onboarding@resend.dev" && (
              <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                <span className="text-[11px] text-amber-800">
                  Current sender is set to <code className="font-mono font-bold">{senderEmail}</code>.
                </span>
                <button
                  type="button"
                  onClick={() => setSenderEmail("onboarding@resend.dev")}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Switch Sender to onboarding@resend.dev
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-blue-900 block">
                  Production Mode: Verified Custom Domain Required
                </span>
                <p className="text-xs text-blue-800 leading-relaxed font-light">
                  Production transactional email delivery requires a custom domain configured in your Resend account with valid SPF, DKIM, and MX DNS records.
                  We never mark a domain as verified until confirmed by the Resend Domains API.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Master Toggle & Connection Actions */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-[#E4E5E7]">
          <div>
            <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#C5A880]" />
              <span>Master Transactional Email Toggle</span>
            </h3>
            <p className="text-xs text-[#5F6368] mt-0.5">
              Enable or suspend outbound transactional email dispatch globally across the application.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEmailEnabled(!emailEnabled)}
            disabled={!canEdit}
            className={`p-1.5 rounded-xl transition-all cursor-pointer ${
              emailEnabled ? "text-[#24292F] hover:text-[#1A1D21]" : "text-stone-400 hover:text-stone-500"
            }`}
          >
            {emailEnabled ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9" />}
          </button>
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 border border-[#D3D8DF] text-[#202124] text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>{testingConnection ? "Testing Resend API..." : "Test API Connection"}</span>
            </button>

            <button
              type="button"
              onClick={handleVerifySender}
              disabled={verifyingSender}
              className="px-3.5 py-2 bg-white hover:bg-[#F7F7F5] border border-[#D3D8DF] text-[#202124] text-xs font-semibold rounded-xl transition shadow-2xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{verifyingSender ? "Checking Status..." : "Verify Domain & DNS"}</span>
            </button>

            <button
              type="button"
              onClick={onViewLogs}
              className="px-3.5 py-2 bg-white hover:bg-[#F7F7F5] border border-[#D3D8DF] text-[#5F6368] hover:text-[#202124] text-xs font-semibold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>View Delivery Logs</span>
            </button>
          </div>

          <div className="text-[11px] text-[#5F6368]">
            API Key:{" "}
            {keyConfigured ? (
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Encrypted ({keyMasked || "re_••••"})
              </span>
            ) : (
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Not Configured
              </span>
            )}
          </div>
        </div>

        {/* API Connection Result Card */}
        {connectionResult && (
          <div
            className={`p-4 rounded-xl border text-xs font-medium space-y-1.5 animate-fadeIn ${
              connectionResult.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {connectionResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{connectionResult.message}</span>
            </div>
            <p className="text-[11px] opacity-80">
              Provider status: <code className="font-mono">{connectionResult.status}</code> • Tested via authenticated Resend API endpoint.
            </p>
            {connectionResult.permitted_recipients_note && (
              <p className="text-[11px] text-amber-800 bg-white/70 p-2 rounded border border-amber-200">
                {connectionResult.permitted_recipients_note}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 4. Resend API Key Credentials Card */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-[#202124]">API Key &amp; Secure Storage</h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Your secret API key from the Resend Dashboard (resend.com/api-keys). Stored encrypted with AES-256-GCM.
          </p>
        </div>

        <div className="p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#C5A880]" />
              <span className="text-xs font-bold text-[#202124]">Resend API Key (`re_...`)</span>
            </div>
            {keyConfigured && !changeKeyMode && (
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                Saved &amp; Encrypted
              </span>
            )}
          </div>

          {!changeKeyMode && keyConfigured ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="font-mono text-xs text-[#5F6368] bg-white px-3 py-2 border border-[#D3D8DF] rounded-xl flex-1">
                {keyMasked || "re_••••••••••••••••••••••••••••••••"}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setChangeKeyMode(true)}
                  className="px-3 py-2 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-xs font-semibold text-[#202124] rounded-xl transition shadow-2xs whitespace-nowrap cursor-pointer"
                >
                  Change Key
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showKeyInput ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={!canEdit}
                  placeholder="re_123456789_abcdefghijklmnopqrstuvwxyz"
                  className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden pr-10 text-[#202124]"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5F6368] hover:text-[#202124] p-1 cursor-pointer"
                >
                  {showKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.resend_api_key && (
                <p className="text-[11px] text-rose-600">{errors.resend_api_key}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-[#5F6368]">
                  Stored with AES-256-GCM authenticated encryption. The plaintext key is never returned to the frontend.
                </p>
                {keyConfigured && (
                  <button
                    type="button"
                    onClick={() => {
                      setChangeKeyMode(false);
                      setApiKey("");
                    }}
                    className="text-[11px] font-semibold text-[#5F6368] hover:text-[#202124] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sender Identity Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Sender Display Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              disabled={!canEdit}
              placeholder="KV Tours & Travels"
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
            <p className="text-[10px] text-[#5F6368] mt-1">Appears as the From display name in emails</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Outbound Sender Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              disabled={!canEdit}
              placeholder={emailEnvironmentMode === "development" ? "onboarding@resend.dev" : "bookings@kvtours.in"}
              className={`w-full px-3 py-2 bg-white border rounded-xl text-xs text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50 ${
                errors.email_sender_email ? "border-rose-400 bg-rose-50/30" : "border-[#D3D8DF]"
              }`}
            />
            {errors.email_sender_email && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.email_sender_email}</p>
            )}
            <p className="text-[10px] text-[#5F6368] mt-1">
              {emailEnvironmentMode === "development"
                ? "In development mode, use onboarding@resend.dev (no custom domain needed)."
                : "Must match a verified domain configured in Resend Domains."}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Customer Reply-To Address
            </label>
            <input
              type="email"
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
              disabled={!canEdit}
              placeholder="concierge@kvtours.in"
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
            <p className="text-[10px] text-[#5F6368] mt-1">Where direct customer replies are routed</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5">
              Administrator Notification Email
            </label>
            <input
              type="email"
              value={adminNotificationEmail}
              onChange={(e) => setAdminNotificationEmail(e.target.value)}
              disabled={!canEdit}
              placeholder="admin@kvtours.in"
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
            <p className="text-[10px] text-[#5F6368] mt-1">Receives administrative alerts for bookings &amp; payments</p>
          </div>
        </div>
      </div>

      {/* 5. Domain Verification Status & DNS Records */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E4E5E7]">
          <div>
            <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#C5A880]" />
              <span>Sender Domain Verification &amp; DNS Records</span>
            </h3>
            <p className="text-xs text-[#5F6368] mt-0.5">
              Live domain verification queried directly from the Resend API.
            </p>
          </div>

          <a
            href="https://resend.com/domains"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#24292F] hover:underline font-semibold"
          >
            <span>Resend Domains Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Sender Domain Verification Status Card */}
        <div className="p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-[#202124]">
                Target Domain:{" "}
                <span className="font-mono font-bold text-[#202124]">
                  {senderEmail.split("@")[1] || "resend.dev"}
                </span>
              </span>
              <p className="text-[11px] text-[#5F6368]">
                Sender: <code className="font-mono">{senderEmail}</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleVerifySender}
                disabled={verifyingSender}
                className="px-3 py-1.5 text-xs bg-white border border-[#D3D8DF] rounded-lg hover:bg-[#F7F7F5] font-semibold text-[#202124] flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifyingSender ? "animate-spin" : ""}`} />
                <span>Check Domain Status</span>
              </button>

              {senderVerifyResult ? (
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider border ${
                    senderVerifyResult.status === "sandbox_ready" || senderVerifyResult.status === "verified"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : senderVerifyResult.status === "pending"
                      ? "bg-amber-50 text-amber-800 border-amber-300"
                      : "bg-rose-50 text-rose-800 border-rose-300"
                  }`}
                >
                  {senderVerifyResult.status === "sandbox_ready"
                    ? "Sandbox Ready (resend.dev)"
                    : senderVerifyResult.status === "verified"
                    ? "Domain Verified"
                    : senderVerifyResult.status === "pending"
                    ? "Pending DNS Verification"
                    : senderVerifyResult.status === "not_configured"
                    ? "Not Configured in Resend"
                    : "Unverified / Error"}
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-stone-100 text-[#5F6368] border border-stone-200">
                  Click Check Status
                </span>
              )}
            </div>
          </div>

          {senderVerifyResult && (
            <p className="text-xs text-[#202124] pt-2 border-t border-[#E4E5E7] leading-relaxed">
              {senderVerifyResult.message}
            </p>
          )}
        </div>

        {/* DNS Records Table */}
        {rawRecords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#202124] uppercase tracking-wide">
                Required DNS Records from Resend:
              </h4>
              <span className="text-[11px] text-[#5F6368]">
                Configure these at your domain registrar (Cloudflare / GoDaddy / Namecheap)
              </span>
            </div>

            <div className="border border-[#E4E5E7] rounded-xl overflow-x-auto bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F7F5] text-[#5F6368] font-semibold border-b border-[#E4E5E7]">
                  <tr>
                    <th className="px-3 py-2">Record</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Host / Name</th>
                    <th className="px-3 py-2">Value / Content</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E5E7] font-mono text-[#202124]">
                  {rawRecords.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-[#F7F7F5]">
                      <td className="px-3 py-2 font-semibold">{rec.record || "TXT"}</td>
                      <td className="px-3 py-2 text-[#5F6368]">{rec.type}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-xs">{rec.name}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(rec.name, `dns_name_${idx}`)}
                            className="text-[#5F6368] hover:text-[#202124] cursor-pointer"
                          >
                            {copiedKey === `dns_name_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-xs">{rec.value}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(rec.value, `dns_val_${idx}`)}
                            className="text-[#5F6368] hover:text-[#202124] cursor-pointer"
                          >
                            {copiedKey === `dns_val_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            rec.status === "verified"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          {rec.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Send Direct Test Email Form */}
        <div className="p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-bold text-[#202124] flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Send Transactional Test Email</span>
            </span>
            <span className="text-[11px] text-[#5F6368]">
              Performs real API delivery dispatch through Resend
            </span>
          </div>

          {/* Quick Recipient Preset Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] text-[#5F6368] font-semibold">Quick Recipient:</span>
            <button
              type="button"
              onClick={() => setTestRecipient("delivered@resend.dev")}
              className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-[#D3D8DF] rounded-lg text-[11px] font-mono text-[#202124] transition cursor-pointer"
              title="Resend official delivery test sink (simulates 200 OK delivery without needing custom domain)"
            >
              delivered@resend.dev (Sandbox 200 OK)
            </button>
            <button
              type="button"
              onClick={() => setTestRecipient("bounced@resend.dev")}
              className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-[#D3D8DF] rounded-lg text-[11px] font-mono text-[#202124] transition cursor-pointer"
              title="Resend bounce test sink (simulates bounce event)"
            >
              bounced@resend.dev (Bounce Test)
            </button>
            {adminNotificationEmail && (
              <button
                type="button"
                onClick={() => setTestRecipient(adminNotificationEmail)}
                className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-[#D3D8DF] rounded-lg text-[11px] font-mono text-[#202124] transition cursor-pointer"
                title="Your admin notification email"
              >
                Admin Email ({adminNotificationEmail})
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="Enter test recipient (e.g. delivered@resend.dev or your account email)..."
              className="w-full text-xs px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden"
            />
            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={sendingTest || !testRecipient.trim()}
              className="w-full sm:w-auto px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-xs whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>{sendingTest ? "Sending..." : "Send Test Email"}</span>
            </button>
          </div>

          {testSendResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium space-y-1 animate-fadeIn ${
                testSendResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {testSendResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testSendResult.message}</span>
              </div>
              {testSendResult.message_id && (
                <p className="font-mono text-[11px] opacity-80">
                  Resend Message ID: {testSendResult.message_id} • Target Recipient: {testSendResult.recipient}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 6. Resend Webhook Configuration & Development Tunnel */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E4E5E7]">
          <div>
            <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#C5A880]" />
              <span>Resend Webhook Configuration &amp; Event Delivery</span>
            </h3>
            <p className="text-xs text-[#5F6368] mt-0.5">
              Processes real-time delivery notifications (delivered, bounced, opened, clicked) using Svix HMAC-SHA256 signature verification.
            </p>
          </div>

          <a
            href="https://resend.com/webhooks"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#24292F] hover:underline font-semibold"
          >
            <span>Resend Webhooks Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Webhook HTTPS Guidance & Local vs Tunnel Distinction */}
        <div className="p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl space-y-4">
          {/* Active Webhook Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E4E5E7]">
            <div>
              <span className="text-xs font-bold text-[#202124] block">
                Active Webhook Endpoint Registration Status:
              </span>
              <p className="text-[11px] text-[#5F6368]">
                Resend requires public HTTPS endpoints. It strictly rejects local HTTP URLs.
              </p>
            </div>
            <div>
              {isWebhookHttps ? (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>HTTPS Ready for Resend</span>
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Not Configured (Requires HTTPS)</span>
                </span>
              )}
            </div>
          </div>

          {/* Local Reference URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#5F6368]">
                Local Backend URL (Reference only — Incompatible with Resend Webhooks):
              </label>
              <span className="text-[10px] font-bold text-stone-500 bg-stone-200 px-2 py-0.5 rounded">
                Local HTTP (Rejected by Resend)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={localBackendUrl}
                className="w-full font-mono text-xs px-3 py-2 bg-stone-100 border border-[#D3D8DF] rounded-xl text-stone-600 select-all"
              />
              <button
                type="button"
                onClick={() => handleCopy(localBackendUrl, "local_url")}
                className="px-3 py-2 text-xs font-semibold bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] rounded-xl flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer text-[#202124]"
              >
                {copiedKey === "local_url" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Development Tunnel URL Input */}
          <div className="space-y-2 pt-2 border-t border-[#E4E5E7]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#202124] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Development Webhook Tunnel URL (Public HTTPS):</span>
              </label>
              <span className="text-[10px] text-[#5F6368]">
                Paste your ngrok / cloudflared HTTPS URL here
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tunnelUrl}
                onChange={(e) => setTunnelUrl(e.target.value)}
                disabled={!canEdit}
                placeholder="https://your-tunnel.ngrok-free.app/api/v1/webhooks/resend"
                className={`w-full font-mono text-xs px-3 py-2 bg-white border rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden ${
                  errors.resend_webhook_tunnel_url ? "border-rose-400 bg-rose-50/30" : "border-[#D3D8DF]"
                }`}
              />
              {tunnelUrl.trim() && (
                <button
                  type="button"
                  onClick={() => handleCopy(tunnelUrl.trim(), "tunnel_url")}
                  className="px-3 py-2 text-xs font-semibold bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] rounded-xl flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer text-[#202124]"
                >
                  {copiedKey === "tunnel_url" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>Copy</span>
                </button>
              )}
            </div>
            {errors.resend_webhook_tunnel_url && (
              <p className="text-[11px] text-rose-600">{errors.resend_webhook_tunnel_url}</p>
            )}

            {/* Tunnel Instructions Box */}
            <div className="p-3 bg-white border border-[#D3D8DF] rounded-xl text-xs space-y-1.5 text-[#5F6368]">
              <div className="font-semibold text-[#202124] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>How to test webhooks in local development:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                1. Start a secure HTTPS tunnel pointing to your FastAPI port (8000):
              </p>
              <pre className="font-mono text-[11px] bg-stone-100 p-2 rounded border border-stone-200 text-[#202124] overflow-x-auto">
                ngrok http 8000
              </pre>
              <p className="text-[11px] leading-relaxed">
                2. Copy the resulting forwarding URL (e.g. <code className="font-mono text-emerald-700">https://xyz.ngrok-free.app</code>), append <code className="font-mono">/api/v1/webhooks/resend</code>, paste it above and save settings.
              </p>
              <p className="text-[11px] leading-relaxed">
                3. Add this URL to your Resend Webhooks Dashboard and copy the Signing Secret below.
              </p>
            </div>
          </div>

          {/* Webhook Signing Secret Input */}
          <div className="space-y-3 pt-2 border-t border-[#E4E5E7]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#C5A880]" />
                <span className="text-xs font-bold text-[#202124]">
                  Webhook Signing Secret (`whsec_...`)
                </span>
              </div>
              {secretConfigured && !changeSecretMode && (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  Encrypted &amp; Configured
                </span>
              )}
            </div>

            {!changeSecretMode && secretConfigured ? (
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-xs text-[#5F6368] bg-white px-3 py-2 border border-[#D3D8DF] rounded-xl flex-1">
                  {secretMasked || "whsec_••••••••••••••••••••••••"}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setChangeSecretMode(true)}
                    className="px-3 py-2 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-xs font-semibold text-[#202124] rounded-xl transition shadow-2xs cursor-pointer"
                  >
                    Change Secret
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showSecretInput ? "text" : "password"}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    disabled={!canEdit}
                    placeholder="whsec_123456789_abcdefghijklmnopqrstuvwxyz"
                    className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-xs font-mono text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretInput(!showSecretInput)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5F6368] hover:text-[#202124] p-1 cursor-pointer"
                  >
                    {showSecretInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.resend_webhook_signing_secret && (
                  <p className="text-[11px] text-rose-600">{errors.resend_webhook_signing_secret}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#5F6368]">
                    Resend signs webhooks using Svix HMAC-SHA256. Retrieve this from Resend Dashboard &gt; Webhooks &gt; Signing Secret.
                  </p>
                  {secretConfigured && (
                    <button
                      type="button"
                      onClick={() => {
                        setChangeSecretMode(false);
                        setWebhookSecret("");
                      }}
                      className="text-[11px] font-semibold text-[#5F6368] hover:text-[#202124] cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleVerifyWebhook}
                disabled={verifyingWebhook}
                className="px-3.5 py-2 bg-white hover:bg-[#F7F7F5] border border-[#D3D8DF] text-[#202124] text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{verifyingWebhook ? "Testing Algorithm..." : "Verify Webhook Signature Algorithm"}</span>
              </button>

              <span className="text-[11px] text-[#5F6368] italic">
                Email webhooks track delivery events only — never payment status.
              </span>
            </div>
          </div>
        </div>

        {/* Webhook Signature Verification Result */}
        {webhookVerifyResult && (
          <div
            className={`p-4 rounded-xl border text-xs font-medium space-y-1.5 animate-fadeIn ${
              webhookVerifyResult.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {webhookVerifyResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{webhookVerifyResult.message}</span>
            </div>
            {webhookVerifyResult.diagnostics && (
              <pre className="text-[11px] font-mono opacity-80 whitespace-pre-wrap bg-white/70 p-2 rounded border border-current/20">
                {JSON.stringify(webhookVerifyResult.diagnostics, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Webhook Event Statistics Cards */}
        {webhookStats && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#202124] uppercase tracking-wide">
                Webhook Delivery Statistics &amp; Event Activity:
              </h4>
              <button
                type="button"
                onClick={loadWebhookStats}
                disabled={loadingWebhookStats}
                className="p-1 hover:bg-[#F7F7F5] rounded text-[#5F6368] hover:text-[#202124] transition cursor-pointer"
                title="Refresh webhook statistics"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingWebhookStats ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl">
                <span className="text-[10px] text-[#5F6368] uppercase font-semibold">Total Events</span>
                <div className="text-xl font-bold text-[#202124] mt-0.5">
                  {webhookStats.total_events_received}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold">Delivered</span>
                <div className="text-xl font-bold text-emerald-700 mt-0.5">
                  {webhookStats.delivered_count}
                </div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-[10px] text-rose-700 uppercase font-semibold">Bounced</span>
                <div className="text-xl font-bold text-rose-700 mt-0.5">
                  {webhookStats.bounced_count}
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[10px] text-amber-700 uppercase font-semibold">Complaints</span>
                <div className="text-xl font-bold text-amber-700 mt-0.5">
                  {webhookStats.complained_count}
                </div>
              </div>
            </div>

            {/* Recent Webhook Events */}
            {webhookStats.recent_events.length > 0 && (
              <div className="border border-[#E4E5E7] rounded-xl overflow-hidden mt-3 bg-white">
                <div className="px-4 py-2.5 bg-[#F7F7F5] text-xs font-semibold text-[#202124] border-b border-[#E4E5E7]">
                  Recent Processed Webhook Events (Idempotent deduplication by Svix ID)
                </div>
                <div className="divide-y divide-[#E4E5E7] max-h-48 overflow-y-auto">
                  {webhookStats.recent_events.map((evt, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between text-xs hover:bg-[#F7F7F5]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            evt.event_type === "email.delivered"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : evt.event_type === "email.bounced"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-stone-100 text-stone-700 border-stone-200"
                          }`}
                        >
                          {evt.event_type}
                        </span>
                        <span className="font-mono text-[#5F6368] truncate max-w-xs">
                          {evt.recipient || evt.email_id || evt.event_id}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#5F6368]">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Individual Notification Triggers */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#202124]">Individual Notification Triggers</h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Fine-grained toggles for specific transactional customer events.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <label className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl flex items-center justify-between cursor-pointer hover:bg-stone-100 transition">
            <div>
              <span className="text-xs font-bold text-[#202124] block">Booking Confirmation</span>
              <span className="text-[11px] text-[#5F6368]">Dispatched upon itinerary booking creation</span>
            </div>
            <input
              type="checkbox"
              checked={notifyBookingConfirm}
              onChange={(e) => setNotifyBookingConfirm(e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded text-[#24292F] focus:ring-[#C5A880] cursor-pointer"
            />
          </label>

          <label className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl flex items-center justify-between cursor-pointer hover:bg-stone-100 transition">
            <div>
              <span className="text-xs font-bold text-[#202124] block">Inquiry Acknowledgment</span>
              <span className="text-[11px] text-[#5F6368]">Immediate acknowledgment when lead submits form</span>
            </div>
            <input
              type="checkbox"
              checked={notifyInquiryAck}
              onChange={(e) => setNotifyInquiryAck(e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded text-[#24292F] focus:ring-[#C5A880] cursor-pointer"
            />
          </label>

          <label className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl flex items-center justify-between cursor-pointer hover:bg-stone-100 transition">
            <div>
              <span className="text-xs font-bold text-[#202124] block">Payment Receipt</span>
              <span className="text-[11px] text-[#5F6368]">Delivered after authorized payment verification with PDF</span>
            </div>
            <input
              type="checkbox"
              checked={notifyPaymentReceipt}
              onChange={(e) => setNotifyPaymentReceipt(e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded text-[#24292F] focus:ring-[#C5A880] cursor-pointer"
            />
          </label>

          <label className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl flex items-center justify-between cursor-pointer hover:bg-stone-100 transition">
            <div>
              <span className="text-xs font-bold text-[#202124] block">Cancellation Updates</span>
              <span className="text-[11px] text-[#5F6368]">Sent when a booking is modified or canceled</span>
            </div>
            <input
              type="checkbox"
              checked={notifyCancellationAck}
              onChange={(e) => setNotifyCancellationAck(e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded text-[#24292F] focus:ring-[#C5A880] cursor-pointer"
            />
          </label>

          <label className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl flex items-center justify-between cursor-pointer hover:bg-stone-100 transition sm:col-span-2">
            <div>
              <span className="text-xs font-bold text-[#202124] block">Trip Reminders &amp; Due Notices</span>
              <span className="text-[11px] text-[#5F6368]">Automated departure reminder and balance notice 3 days prior</span>
            </div>
            <input
              type="checkbox"
              checked={notifyPaymentReminder}
              onChange={(e) => setNotifyPaymentReminder(e.target.checked)}
              disabled={!canEdit}
              className="w-4 h-4 rounded text-[#24292F] focus:ring-[#C5A880] cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* 8. Editable Template Subjects */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#202124]">Supported Email Template Subjects</h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Customize transactional email subject headers sent to customers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1">
              Booking Confirmation Subject
            </label>
            <input
              type="text"
              value={subjectBooking}
              onChange={(e) => setSubjectBooking(e.target.value)}
              disabled={!canEdit}
              className="w-full text-xs px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1">
              Payment Receipt Subject
            </label>
            <input
              type="text"
              value={subjectReceipt}
              onChange={(e) => setSubjectReceipt(e.target.value)}
              disabled={!canEdit}
              className="w-full text-xs px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1">
              Inquiry Acknowledgment Subject
            </label>
            <input
              type="text"
              value={subjectInquiry}
              onChange={(e) => setSubjectInquiry(e.target.value)}
              disabled={!canEdit}
              className="w-full text-xs px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202124] mb-1">
              Trip Reminder Subject
            </label>
            <input
              type="text"
              value={subjectReminder}
              onChange={(e) => setSubjectReminder(e.target.value)}
              disabled={!canEdit}
              className="w-full text-xs px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* 9. Security & Infrastructure Guidance */}
      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-[#202124] space-y-2">
        <div className="flex items-center gap-2 font-bold">
          <ShieldAlert className="w-4 h-4 text-[#C5A880] shrink-0" />
          <span>Security &amp; Encryption Architecture</span>
        </div>
        <p className="text-[11px] text-[#5F6368] leading-relaxed">
          The database securely stores the runtime Resend API key and webhook secret encrypted with AES-256-GCM.
          For production deployments on Render, ensure the master encryption key{" "}
          <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-stone-300 text-[#202124]">
            PAYMENT_CREDENTIALS_ENCRYPTION_KEY
          </code>{" "}
          is configured in the Render Dashboard environment settings. Saving settings here updates runtime operations immediately without redeploying.
        </p>
      </div>
    </form>
  );
}
