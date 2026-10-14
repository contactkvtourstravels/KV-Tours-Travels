"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  RefreshCw,
  Mail,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
  Filter,
  Eye,
  X,
  Send,
} from "lucide-react";
import { adminNotificationApi, NotificationLog } from "@/lib/api";

export default function DeliveryLogsSection() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect modal
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminNotificationApi.listNotifications({ page: 1, page_size: 50 });
      setLogs(res.items || []);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load notification delivery logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRetry = async (logId: string) => {
    try {
      setRetryingLogId(logId);
      setMessage(null);
      setError(null);
      await adminNotificationApi.retryNotification(logId);
      setMessage("Delivery retry dispatched successfully.");
      await fetchLogs();
      setTimeout(() => setMessage(null), 3500);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to retry delivery.");
    } finally {
      setRetryingLogId(null);
    }
  };

  const filteredLogs = logs.filter((item) => {
    if (channelFilter !== "all" && item.channel?.toLowerCase() !== channelFilter.toLowerCase()) {
      return false;
    }
    if (statusFilter !== "all" && item.status?.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRecipient = item.recipient?.toLowerCase().includes(q);
      const matchSubject = item.subject?.toLowerCase().includes(q);
      const matchTemplate = item.template_name?.toLowerCase().includes(q);
      if (!matchRecipient && !matchSubject && !matchTemplate) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-[#202124]" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#202124]">
                Transactional Delivery Logs
              </h2>
              <p className="text-xs text-[#5F6368] mt-1 max-w-2xl font-light">
                Audited dispatch logs for customer emails (Resend) and messaging (WhatsApp). Track provider
                message IDs, delivery status, latency, and retry failed transmissions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search recipient, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#F9F9F8] border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] focus:border-[#C5A880] outline-hidden w-56"
            />
          </div>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#F9F9F8] border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] outline-hidden text-[#202124]"
          >
            <option value="all">All Channels</option>
            <option value="email">Email (Resend)</option>
            <option value="whatsapp">WhatsApp</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#F9F9F8] border border-[#D3D8DF] rounded-xl text-xs focus:ring-2 focus:ring-[#C5A880] outline-hidden text-[#202124]"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="text-[11px] text-[#5F6368]">
          Showing <span className="font-bold text-[#202124]">{filteredLogs.length}</span> of {logs.length} records
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-stone-400">Loading delivery records...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500">
            No delivery records match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F9F9F8] border-b border-[#E4E5E7] text-[11px] uppercase tracking-wider text-[#5F6368]">
                <tr>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject / Template</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Provider ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E5E7]">
                {filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {item.channel?.toLowerCase() === "whatsapp" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-semibold text-[11px]">
                          <Mail className="w-3 h-3" />
                          <span>Resend Email</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-[#202124] max-w-xs truncate">
                      {item.recipient}
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-[#5F6368]">
                      {item.subject || item.template_name || "Notification"}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "sent" || item.status === "delivered"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "failed"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-[#5F6368] max-w-[120px] truncate">
                      {item.provider_message_id || "—"}
                    </td>

                    <td className="py-3 px-4 text-[#5F6368] whitespace-nowrap text-[11px]">
                      {new Date(item.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(item)}
                          title="Inspect delivery payload & errors"
                          className="p-1.5 rounded-lg border border-[#D3D8DF] hover:bg-stone-100 text-[#5F6368] hover:text-[#202124] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {item.status === "failed" && (
                          <button
                            type="button"
                            onClick={() => handleRetry(item.id)}
                            disabled={retryingLogId === item.id}
                            title="Retry delivery transmission"
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${retryingLogId === item.id ? "animate-spin" : ""}`} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4E5E7]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#C5A880]" />
                <h3 className="text-sm font-bold text-[#202124]">Notification Log Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg hover:bg-stone-100 text-[#5F6368]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl">
                <div>
                  <span className="text-[10px] uppercase text-[#5F6368] block">Log ID</span>
                  <span className="font-mono text-[#202124]">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#5F6368] block">Channel</span>
                  <span className="font-bold text-[#202124]">{selectedLog.channel}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#5F6368] block">Recipient</span>
                  <span className="font-mono text-[#202124]">{selectedLog.recipient}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#5F6368] block">Status</span>
                  <span className="font-bold text-[#202124]">{selectedLog.status}</span>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl space-y-1">
                  <span className="font-bold text-[11px] block">Error Details</span>
                  <p className="font-mono text-[11px] break-all">{selectedLog.error_message}</p>
                </div>
              )}

              {selectedLog.payload && (
                <div className="space-y-1">
                  <span className="font-bold text-[#202124] block">Dispatched Metadata / Payload</span>
                  <pre className="p-3 bg-stone-900 text-stone-100 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E5E7]">
              {selectedLog.status === "failed" && (
                <button
                  type="button"
                  onClick={() => {
                    handleRetry(selectedLog.id);
                    setSelectedLog(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Dispatch Now</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-xs font-semibold text-[#5F6368] rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
