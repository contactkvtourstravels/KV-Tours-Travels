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
  Check,
  ExternalLink,
  Info,
  Globe,
  Radio,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronUp,
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
  const defaultAgencyName = settings.public_display_name || settings.agency_name || "KV Tours & Travels";

  // Master Toggle & Sender Configuration
  const [emailEnabled, setEmailEnabled] = useState(settings.email_enabled ?? true);
  const [senderName, setSenderName] = useState(settings.email_sender_name || defaultAgencyName);
  const [senderEmail, setSenderEmail] = useState(settings.email_sender_email || "contact.kvtourstravels@gmail.com");
  const [replyToEmail, setReplyToEmail] = useState(
    settings.email_reply_to || settings.reply_to_email || "contact.kvtourstravels@gmail.com"
  );
  const [adminNotificationEmail, setAdminNotificationEmail] = useState(
    settings.admin_notification_email || "contact.kvtourstravels@gmail.com"
  );

  // Protected Resend API Key
  const keyConfigured = Boolean(settings.resend_api_key_configured);
  const keyMasked = settings.resend_api_key_masked || "re_••••••••••••••••••••••••••••••••";
  const [isReplacingKey, setIsReplacingKey] = useState(!keyConfigured);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Test Email State
  const [testRecipient, setTestRecipient] = useState(settings.admin_notification_email || "contact.kvtourstravels@gmail.com");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<EmailSendTestResponse | null>(null);
  const [lastTestStatus, setLastTestStatus] = useState<"success" | "failed" | "not_tested">("not_tested");
  const [lastTestTimestamp, setLastTestTimestamp] = useState<string | null>(null);

  // Sender Domain Verification State
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [domainResult, setDomainResult] = useState<EmailTestConnectionResponse | null>(null);

  // Connection Test State
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<EmailTestConnectionResponse | null>(null);

  // Collapsible Advanced Settings (Optional Webhooks)
  const [showAdvancedWebhooks, setShowAdvancedWebhooks] = useState(false);
  const secretConfigured = Boolean(settings.resend_webhook_signing_secret_configured);
  const secretMasked = settings.resend_webhook_signing_secret_masked || "whsec_••••••••••••••••";
  const [isReplacingSecret, setIsReplacingSecret] = useState(!secretConfigured);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [verifyingWebhook, setVerifyingWebhook] = useState(false);
  const [webhookVerifyResult, setWebhookVerifyResult] = useState<ResendWebhookVerifyResponse | null>(null);
  const [webhookStats, setWebhookStats] = useState<ResendWebhookStatsResponse | null>(null);
  const [loadingWebhookStats, setLoadingWebhookStats] = useState(false);

  // UI Feedback States
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Derive target sender domain
  const senderDomain = senderEmail.includes("@") ? senderEmail.split("@")[1].trim() : "kvtours.in";

  // Production Webhook URL
  const productionWebhookUrl =
    settings.resend_webhook_url || "https://travel-agency-kdrs.onrender.com/api/v1/webhooks/resend";

  // Load webhook delivery statistics on demand
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
    if (showAdvancedWebhooks) {
      loadWebhookStats();
    }
  }, [showAdvancedWebhooks, loadWebhookStats]);

  // Track dirty state
  useEffect(() => {
    const isDirty =
      emailEnabled !== (settings.email_enabled ?? true) ||
      senderName !== (settings.email_sender_name || defaultAgencyName) ||
      senderEmail !== (settings.email_sender_email || "contact.kvtourstravels@gmail.com") ||
      replyToEmail !== (settings.email_reply_to || settings.reply_to_email || "contact.kvtourstravels@gmail.com") ||
      adminNotificationEmail !== (settings.admin_notification_email || "contact.kvtourstravels@gmail.com") ||
      apiKey.trim().length > 0 ||
      webhookSecret.trim().length > 0;

    onDirtyChange(isDirty);
  }, [
    emailEnabled,
    senderName,
    senderEmail,
    replyToEmail,
    adminNotificationEmail,
    apiKey,
    webhookSecret,
    settings,
    defaultAgencyName,
    onDirtyChange,
  ]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleReset = () => {
    setEmailEnabled(settings.email_enabled ?? true);
    setSenderName(settings.email_sender_name || defaultAgencyName);
    setSenderEmail(settings.email_sender_email || "contact.kvtourstravels@gmail.com");
    setReplyToEmail(settings.email_reply_to || settings.reply_to_email || "contact.kvtourstravels@gmail.com");
    setAdminNotificationEmail(settings.admin_notification_email || "contact.kvtourstravels@gmail.com");
    setApiKey("");
    setIsReplacingKey(!keyConfigured);
    setShowApiKey(false);
    setWebhookSecret("");
    setIsReplacingSecret(!secretConfigured);
    setShowWebhookSecret(false);
    setErrors({});
    setConnectionResult(null);
    setDomainResult(null);
    setTestResult(null);
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

  const handleVerifyDomain = async () => {
    try {
      setVerifyingDomain(true);
      setDomainResult(null);
      const res = await adminApi.verifyEmailSender();
      setDomainResult(res);
    } catch (err: unknown) {
      setDomainResult({
        success: false,
        sender_domain: senderDomain,
        status: "provider_error",
        sender_status: "provider_error",
        message: err instanceof Error ? err.message : "Domain verification check failed.",
        provider: "resend",
        api_key_configured: false,
      });
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendingTest) return;

    const recipient = testRecipient.trim();
    if (!recipient || !recipient.includes("@") || !recipient.includes(".")) {
      setTestResult({
        success: false,
        provider: "resend",
        recipient: testRecipient,
        message: "Please enter a valid recipient email address (e.g. contact.kvtourstravels@gmail.com).",
        timestamp: new Date().toISOString(),
      });
      setLastTestStatus("failed");
      return;
    }

    if (!emailEnabled) {
      setTestResult({
        success: false,
        provider: "resend",
        recipient: recipient,
        message: "Email sending is currently disabled. Please enable email delivery and save settings before sending a test.",
        timestamp: new Date().toISOString(),
      });
      setLastTestStatus("failed");
      return;
    }

    try {
      setSendingTest(true);
      setTestResult(null);
      const res = await adminApi.sendTestEmail({
        recipient_email: recipient,
        subject: `${defaultAgencyName} — Email Configuration Test`,
      });
      setTestResult(res);
      setLastTestStatus(res.success ? "success" : "failed");
      setLastTestTimestamp(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to deliver test email.";
      setTestResult({
        success: false,
        provider: "resend",
        recipient: recipient,
        message: errMsg,
        timestamp: new Date().toISOString(),
      });
      setLastTestStatus("failed");
      setLastTestTimestamp(new Date().toLocaleTimeString());
    } finally {
      setSendingTest(false);
    }
  };

  const handleVerifyWebhook = async () => {
    try {
      setVerifyingWebhook(true);
      setWebhookVerifyResult(null);
      const secretToTest = webhookSecret.trim() ? webhookSecret.trim() : undefined;
      const res = await adminApi.verifyEmailWebhook({ signing_secret: secretToTest });
      setWebhookVerifyResult(res);
      loadWebhookStats();
    } catch (err: unknown) {
      setWebhookVerifyResult({
        success: false,
        status: "verification_failed",
        message: err instanceof Error ? err.message : "Webhook signature algorithm verification failed.",
        webhook_url: productionWebhookUrl,
        is_https: true,
        signing_secret_configured: false,
      });
    } finally {
      setVerifyingWebhook(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || saving) return;

    const validationErrors: Record<string, string> = {};

    if (!senderEmail.trim() || !senderEmail.includes("@")) {
      validationErrors.email_sender_email = "Valid sender email address is required.";
    }

    if (apiKey.trim() && !apiKey.trim().startsWith("re_")) {
      validationErrors.resend_api_key = "Resend API keys must begin with 're_'.";
    }

    if (webhookSecret.trim() && !webhookSecret.trim().startsWith("whsec_")) {
      validationErrors.resend_webhook_signing_secret = "Resend Webhook signing secrets typically begin with 'whsec_'.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      const payload: Partial<AdminSiteSettings> = {
        email_environment_mode: "production",
        email_enabled: emailEnabled,
        email_sender_name: senderName.trim(),
        email_sender_email: senderEmail.trim(),
        email_reply_to: replyToEmail.trim() || undefined,
        admin_notification_email: adminNotificationEmail.trim() || undefined,
      };

      // Only pass API key if the user entered a new key; blank preserves existing key!
      if (apiKey.trim()) {
        payload.resend_api_key = apiKey.trim();
      }

      // Only pass webhook secret if the user entered a new secret
      if (webhookSecret.trim()) {
        payload.resend_webhook_signing_secret = webhookSecret.trim();
      }

      const updated = await adminApi.updateSettings(payload);
      onSaved(updated);
      setApiKey("");
      setIsReplacingKey(false);
      setWebhookSecret("");
      setIsReplacingSecret(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setErrors({ global: err instanceof Error ? err.message : "Failed to persist Resend settings." });
    } finally {
      setSaving(false);
    }
  };

  const rawDnsRecords: DomainRecord[] = (domainResult?.dns_records as DomainRecord[]) || [];

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#24292F] text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5 text-[#C5A880]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#202124]">Resend Email Delivery</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Production
                </span>
              </div>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Authoritative transactional email dispatch for bookings, payment receipts, customer inquiries, and admin alerts.
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
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>{saving ? "Saving..." : "Save Configuration"}</span>
              </button>
            )}
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Email configuration securely saved and synchronized across {defaultAgencyName} services.</span>
          </div>
        )}

        {errors.global && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errors.global}</span>
          </div>
        )}
      </div>

      {/* 2. Top Status Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Email Delivery Status */}
        <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Email Delivery</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                emailEnabled
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-stone-100 text-stone-600 border-stone-200"
              }`}
            >
              {emailEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="text-sm font-bold text-[#202124]">
            {emailEnabled ? "Active Dispatch" : "Suspended"}
          </div>
          <p className="text-[11px] text-[#5F6368]">
            Master switch for all customer &amp; admin transactional emails.
          </p>
        </div>

        {/* API Key Status */}
        <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">API Key</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                keyConfigured
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {keyConfigured ? "Configured" : "Not Configured"}
            </span>
          </div>
          <div className="text-xs font-mono text-[#202124] truncate">
            {keyConfigured ? keyMasked : "Missing Resend Key"}
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection || !keyConfigured}
              className="text-[11px] font-semibold text-[#24292F] hover:underline flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <Zap className="w-3 h-3 text-[#C5A880]" />
              <span>{testingConnection ? "Testing..." : "Test Connectivity"}</span>
            </button>
          </div>
        </div>

        {/* Sender Domain Status */}
        <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Sender Domain</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                domainResult?.success
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : domainResult?.status === "pending"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-stone-100 text-stone-600 border-stone-200"
              }`}
            >
              {domainResult?.success
                ? "Verified"
                : domainResult?.status === "pending"
                ? "Pending DNS"
                : domainResult
                ? "Not Verified"
                : "Check Status"}
            </span>
          </div>
          <div className="text-xs font-mono text-[#202124] truncate font-bold">
            {senderDomain}
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleVerifyDomain}
              disabled={verifyingDomain || !keyConfigured}
              className="text-[11px] font-semibold text-[#24292F] hover:underline flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${verifyingDomain ? "animate-spin" : ""}`} />
              <span>{verifyingDomain ? "Checking..." : "Verify Domain"}</span>
            </button>
          </div>
        </div>

        {/* Last Test Email Status */}
        <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5F6368] uppercase tracking-wider">Last Test Email</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                lastTestStatus === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : lastTestStatus === "failed"
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-stone-100 text-stone-600 border-stone-200"
              }`}
            >
              {lastTestStatus === "success" ? "Success" : lastTestStatus === "failed" ? "Failed" : "Not Tested"}
            </span>
          </div>
          <div className="text-xs text-[#202124] truncate font-medium">
            {lastTestTimestamp ? `Tested at ${lastTestTimestamp}` : "No test sent this session"}
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onViewLogs}
              className="text-[11px] font-semibold text-[#5F6368] hover:text-[#202124] flex items-center gap-1 cursor-pointer"
            >
              <span>View Delivery Logs &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* API Connection Test Diagnostic Feedback */}
      {connectionResult && (
        <div
          className={`p-4 rounded-2xl border text-xs font-medium space-y-1.5 animate-fadeIn ${
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
            Provider: <code className="font-mono">Resend API</code> • Authentication status:{" "}
            <code className="font-mono">{connectionResult.status}</code>
          </p>
        </div>
      )}

      {/* Domain Verification Diagnostic Feedback */}
      {domainResult && (
        <div
          className={`p-4 rounded-2xl border text-xs font-medium space-y-3 animate-fadeIn ${
            domainResult.success
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : domainResult.status === "pending"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold">
              {domainResult.success ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : domainResult.status === "pending" ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{domainResult.message}</span>
            </div>

            <a
              href="https://resend.com/domains"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#24292F] hover:underline"
            >
              <span>Resend Domains Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* DNS Records Table for Unverified Domains */}
          {rawDnsRecords.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-current/10">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span>Required DNS Records for {senderDomain}:</span>
                <span className="opacity-80">Add these at your domain registrar (e.g. Cloudflare, GoDaddy)</span>
              </div>

              <div className="border border-current/20 rounded-xl overflow-x-auto bg-white text-[#202124]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F7F5] text-[#5F6368] font-semibold border-b border-[#E4E5E7]">
                    <tr>
                      <th className="px-3 py-2">Record</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Host / Name</th>
                      <th className="px-3 py-2">Value / Target</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E5E7] font-mono text-[11px]">
                    {rawDnsRecords.map((rec, idx) => (
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
        </div>
      )}

      {/* 3. Primary Email Configuration Form */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-6">
        <div>
          <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#C5A880]" />
            <span>Production Email Settings</span>
          </h3>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Configure sender identity, contact routing, and API credentials. Leave key fields blank to preserve existing secrets.
          </p>
        </div>

        {/* Master Dispatch Toggle */}
        <div className="p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#202124] block">Enable Outgoing Transactional Emails</span>
            <p className="text-[11px] text-[#5F6368] mt-0.5">
              Allow the system to dispatch automated booking confirmations, payment receipts, and customer inquiry responses.
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
            {emailEnabled ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-stone-300" />}
          </button>
        </div>

        {/* Resend API Key Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#202124] flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Resend API Key (`re_...`)</span>
            </label>
            {keyConfigured && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Active Key Stored &amp; Encrypted
              </span>
            )}
          </div>

          {!isReplacingKey && keyConfigured ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 font-mono text-xs px-3.5 py-2.5 bg-stone-50 border border-[#D3D8DF] rounded-xl text-[#5F6368] select-none">
                {keyMasked}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsReplacingKey(true)}
                  className="px-3.5 py-2.5 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-xs font-semibold text-[#202124] rounded-xl transition shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  Replace Key
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={!canEdit}
                  placeholder={keyConfigured ? "•••••••••••••••• (Leave blank to keep active key)" : "re_123456789_abcdefghijklmnopqrstuvwxyz"}
                  className={`w-full font-mono text-xs px-3.5 py-2.5 bg-white border rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden pr-10 ${
                    errors.resend_api_key ? "border-rose-400 bg-rose-50/20" : "border-[#D3D8DF]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5F6368] hover:text-[#202124] p-1 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errors.resend_api_key && (
                <p className="text-[11px] text-rose-600">{errors.resend_api_key}</p>
              )}

              <div className="flex items-center justify-between text-[11px] text-[#5F6368]">
                <span>Stored using AES-256-GCM encryption. Never returned in plaintext to the browser.</span>
                {keyConfigured && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplacingKey(false);
                      setApiKey("");
                    }}
                    className="font-semibold text-[#24292F] hover:underline cursor-pointer"
                  >
                    Keep Existing Key
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sender and Routing Configuration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E4E5E7]">
          {/* Sender Display Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#202124]">
              Sender Display Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              disabled={!canEdit}
              placeholder={defaultAgencyName}
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden"
            />
            <p className="text-[11px] text-[#5F6368]">Shown as the sender name in the customer&apos;s email client.</p>
          </div>

            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#202124]">
                Outbound Sender Email Address <span className="text-rose-500">*</span>
              </label>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setSenderEmail("onboarding@resend.dev")}
                  className="text-[11px] font-semibold text-[#0D7A53] hover:underline cursor-pointer"
                  title="Use Resend Sandbox (no DNS required)"
                >
                  Use onboarding@resend.dev (No DNS)
                </button>
              )}
            </div>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              disabled={!canEdit}
              placeholder="onboarding@resend.dev"
              className={`w-full text-xs px-3.5 py-2.5 bg-white border rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden ${
                errors.email_sender_email ? "border-rose-400 bg-rose-50/20" : "border-[#D3D8DF]"
              }`}
            />
            {errors.email_sender_email && (
              <p className="text-[11px] text-rose-600">{errors.email_sender_email}</p>
            )}
            <p className="text-[11px] text-[#5F6368]">
              Verified custom domain address or <code className="font-mono text-[#202124]">onboarding@resend.dev</code> for testing without DNS.
            </p>

          {/* Customer Reply-To */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#202124]">
              Customer Reply-To Address
            </label>
            <input
              type="email"
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
              disabled={!canEdit}
              placeholder="contact.kvtourstravels@gmail.com"
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden"
            />
            <p className="text-[11px] text-[#5F6368]">Where customer replies are delivered when they hit &apos;Reply&apos;.</p>
          </div>

          {/* Admin Notification Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#202124]">
              Admin Notification Email
            </label>
            <input
              type="email"
              value={adminNotificationEmail}
              onChange={(e) => setAdminNotificationEmail(e.target.value)}
              disabled={!canEdit}
              placeholder="contact.kvtourstravels@gmail.com"
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden"
            />
            <p className="text-[11px] text-[#5F6368]">Receives automated internal alerts for bookings and customer inquiries.</p>
          </div>
        </div>

        {/* Save Button */}
        {canEdit && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>{saving ? "Persisting Settings..." : "Save Configuration"}</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Send Test Email Section */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#C5A880]" />
              <span>Send Transactional Test Email</span>
            </h3>
            <p className="text-xs text-[#5F6368] mt-0.5">
              Verify real outbound delivery and HTML rendering through Resend. Does not modify customer records.
            </p>
          </div>

          <div className="text-[11px] text-[#5F6368]">
            Rate limit: 5 test emails per minute
          </div>
        </div>

        <form onSubmit={handleSendTestEmail} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="Recipient email address (e.g. contact.kvtourstravels@gmail.com)..."
              disabled={sendingTest}
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden disabled:bg-stone-50"
            />
            <button
              type="submit"
              disabled={sendingTest || !testRecipient.trim() || !emailEnabled}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-xs whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>{sendingTest ? "Delivering..." : "Send Test Email"}</span>
            </button>
          </div>

          {adminNotificationEmail && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-[#5F6368]">Quick recipient:</span>
              <button
                type="button"
                onClick={() => setTestRecipient(adminNotificationEmail)}
                className="px-2.5 py-0.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md text-[11px] font-mono text-[#202124] transition cursor-pointer"
              >
                {adminNotificationEmail}
              </button>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium space-y-1 animate-fadeIn ${
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
              {testResult.message_id && (
                <p className="font-mono text-[11px] opacity-80">
                  Resend Message ID: {testResult.message_id} &bull; Delivered to: {testResult.recipient}
                </p>
              )}
            </div>
          )}
        </form>
      </div>

      {/* 5. Collapsible Advanced Settings (Optional Real-Time Webhooks) */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvancedWebhooks(!showAdvancedWebhooks)}
          className="w-full p-6 text-left flex items-center justify-between hover:bg-[#F7F7F5] transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-[#C5A880]" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#202124]">Advanced Settings — Real-Time Delivery Webhooks</h3>
                <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 uppercase">
                  Optional
                </span>
              </div>
              <p className="text-xs text-[#5F6368] mt-0.5">
                Track delivery confirmations, bounces, and complaints in real time using Svix HMAC-SHA256 signatures.
              </p>
            </div>
          </div>
          {showAdvancedWebhooks ? (
            <ChevronUp className="w-4 h-4 text-[#5F6368]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#5F6368]" />
          )}
        </button>

        {showAdvancedWebhooks && (
          <div className="p-6 pt-0 space-y-5 border-t border-[#E4E5E7] mt-2">
            <div className="p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl space-y-4">
              {/* Informational Guidance */}
              <div className="flex items-start gap-2.5 text-xs text-[#5F6368]">
                <Info className="w-4 h-4 text-[#C5A880] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Webhooks are <strong className="text-[#202124]">optional</strong> for transactional email delivery. Outbound emails work completely without webhooks. Configuring a webhook enables live delivery status logs (delivered, opened, bounced).
                </p>
              </div>

              {/* Production Webhook URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#202124]">
                    Production Webhook Endpoint URL (HTTPS):
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    HTTPS Production Ready
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={productionWebhookUrl}
                    className="w-full font-mono text-xs px-3.5 py-2.5 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(productionWebhookUrl, "prod_webhook_url")}
                    className="px-4 py-2.5 text-xs font-semibold bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] rounded-xl flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer text-[#202124]"
                  >
                    {copiedKey === "prod_webhook_url" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>Copy URL</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#5F6368]">
                  Paste this exact URL into your Resend Dashboard &rarr; Webhooks.
                </p>
              </div>

              {/* Webhook Signing Secret */}
              <div className="space-y-2 pt-2 border-t border-[#E4E5E7]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#202124] flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>Webhook Signing Secret (`whsec_...`)</span>
                  </label>
                  {secretConfigured && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Configured &amp; Encrypted
                    </span>
                  )}
                </div>

                {!isReplacingSecret && secretConfigured ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 font-mono text-xs px-3.5 py-2.5 bg-stone-50 border border-[#D3D8DF] rounded-xl text-[#5F6368] select-none">
                      {secretMasked}
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setIsReplacingSecret(true)}
                        className="px-3.5 py-2.5 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-xs font-semibold text-[#202124] rounded-xl transition shadow-2xs cursor-pointer whitespace-nowrap"
                      >
                        Change Secret
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <input
                        type={showWebhookSecret ? "text" : "password"}
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        disabled={!canEdit}
                        placeholder={secretConfigured ? "•••••••••••••••• (Leave blank to keep active secret)" : "whsec_123456789_abcdefghijklmnopqrstuvwxyz"}
                        className={`w-full font-mono text-xs px-3.5 py-2.5 bg-white border rounded-xl text-[#202124] focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden pr-10 ${
                          errors.resend_webhook_signing_secret ? "border-rose-400 bg-rose-50/20" : "border-[#D3D8DF]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5F6368] hover:text-[#202124] p-1 cursor-pointer"
                      >
                        {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {errors.resend_webhook_signing_secret && (
                      <p className="text-[11px] text-rose-600">{errors.resend_webhook_signing_secret}</p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[#5F6368]">
                      <span>Obtain this signing secret from Resend Dashboard &rarr; Webhooks.</span>
                      {secretConfigured && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsReplacingSecret(false);
                            setWebhookSecret("");
                          }}
                          className="font-semibold text-[#24292F] hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Verify Webhook Algorithm Button */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleVerifyWebhook}
                    disabled={verifyingWebhook || (!secretConfigured && !webhookSecret.trim())}
                    className="px-3.5 py-2 bg-white hover:bg-[#F7F7F5] border border-[#D3D8DF] text-[#202124] text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{verifyingWebhook ? "Testing..." : "Verify Webhook Signature Algorithm"}</span>
                  </button>

                  <span className="text-[11px] text-[#5F6368] italic">
                    Email webhooks never alter payment or booking transaction state.
                  </span>
                </div>
              </div>

              {/* Webhook Verification Result */}
              {webhookVerifyResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-medium space-y-1.5 animate-fadeIn ${
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
            </div>

            {/* Webhook Statistics Summary */}
            {webhookStats && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#202124] uppercase tracking-wide">
                    Live Webhook Event Statistics:
                  </span>
                  <button
                    type="button"
                    onClick={loadWebhookStats}
                    disabled={loadingWebhookStats}
                    className="p-1 hover:bg-[#F7F7F5] rounded text-[#5F6368] hover:text-[#202124] transition cursor-pointer"
                    title="Refresh stats"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingWebhookStats ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl">
                    <span className="text-[10px] text-[#5F6368] uppercase font-semibold">Total Events</span>
                    <div className="text-lg font-bold text-[#202124] mt-0.5">
                      {webhookStats.total_events_received}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold">Delivered</span>
                    <div className="text-lg font-bold text-emerald-700 mt-0.5">
                      {webhookStats.delivered_count}
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <span className="text-[10px] text-rose-700 uppercase font-semibold">Bounced</span>
                    <div className="text-lg font-bold text-rose-700 mt-0.5">
                      {webhookStats.bounced_count}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-[10px] text-amber-700 uppercase font-semibold">Complaints</span>
                    <div className="text-lg font-bold text-amber-700 mt-0.5">
                      {webhookStats.complained_count}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
