"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Mail,
  MessageCircle,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import {
  adminNotificationApi,
  NotificationLog,
  NotificationLogList,
} from "@/lib/api";

const CHANNEL_FILTERS = [
  { label: "All Channels", value: "" },
  { label: "Email", value: "email" },
  { label: "WhatsApp", value: "whatsapp" },
];

const STATUS_FILTERS = [
  { label: "All Statuses", value: "" },
  { label: "Sent", value: "sent" },
  { label: "Failed", value: "failed" },
  { label: "Mocked", value: "mocked" },
];

export default function AdminNotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Retrying state
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res: NotificationLogList = await adminNotificationApi.listNotifications({
        page,
        page_size: perPage,
        channel: channel || undefined,
        status: status || undefined,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load notification logs.");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, channel, status]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRetry = async (id: string) => {
    try {
      setRetryingId(id);
      setRetryMessage(null);
      const updated = await adminNotificationApi.retryNotification(id);
      setRetryMessage(`Notification ${id.substring(0, 8)} retried: ${updated.status}`);
      await fetchLogs();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to retry notification.");
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (logStatus: string) => {
    switch (logStatus.toLowerCase()) {
      case "sent":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Sent
          </span>
        );
      case "mocked":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30">
            Mocked
          </span>
        );
      case "failed":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 capitalize">
            {logStatus}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1.5">
            Communication Architecture
          </div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
            Outbound Notification Logs {total > 0 ? `(${total})` : ""}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit transactional emails, WhatsApp dispatch events, idempotency keys, and delivery statuses.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:border-amber-400 focus:outline-none"
          >
            {CHANNEL_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:border-amber-400 focus:outline-none"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {retryMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs">
          {retryMessage}
        </div>
      )}

      {/* Security & Masking Notice */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white">Security & Audit Compliance:</strong> Passwords, session tokens, CSRF tokens, and Razorpay/Meta secrets are strictly excluded from logging. Notification events are recorded with idempotent hash references.
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mb-4" />
          <p className="text-xs uppercase tracking-widest text-slate-400">
            Loading notification logs...
          </p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          No notification logs match your filters.
        </div>
      ) : (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-850">
                <tr>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Provider Ref</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 capitalize">
                        {l.channel === "email" ? (
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>{l.channel}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-amber-400/90 whitespace-nowrap">
                      {l.notification_type}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">{l.recipient}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(l.status)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {l.provider_message_id || "None"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      {new Date(l.created_at).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {l.status === "failed" ? (
                        <button
                          type="button"
                          disabled={retryingId === l.id}
                          onClick={() => handleRetry(l.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold"
                        >
                          <RotateCw
                            className={`w-3 h-3 ${retryingId === l.id ? "animate-spin" : ""}`}
                          />
                          <span>Retry</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Delivered</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
