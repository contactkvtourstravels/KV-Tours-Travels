"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  Filter,
  RefreshCw,
  Eye,
  X,
  FileCode,
} from "lucide-react";
import { adminApi, AuditLogItem, PaginatedResponse } from "@/lib/api";
import { useAdmin } from "../AdminContext";

export default function AuditLogsAdminPage() {
  const { hasAnyRole } = useAdmin();
  const isAdmin = hasAnyRole(["admin", "super_admin"]);

  const [logs, setLogs] = useState<PaginatedResponse<AuditLogItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterEntityType, setFilterEntityType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected Log for JSON Metadata View
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const action = filterAction === "all" ? undefined : filterAction;
      const entityType = filterEntityType === "all" ? undefined : filterEntityType;

      const data = await adminApi.getAuditLogs({
        page,
        page_size: pageSize,
        action,
        entity_type: entityType,
      });
      setLogs(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterEntityType]);

  useEffect(() => {
    if (isAdmin) {
      fetchAuditLogs();
    }
  }, [isAdmin, fetchAuditLogs]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl max-w-md mx-auto my-12">
        <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h2 className="text-base font-bold text-white mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-400">
          Viewing security audit logs requires administrator or super_admin privileges.
        </p>
      </div>
    );
  }

  const actionBadgeColors: Record<string, string> = {
    destination_created: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    destination_updated: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    destination_deactivated: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    package_created: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    package_updated: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    package_deactivated: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    user_status_updated: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    user_roles_updated: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    super_admin_bootstrapped: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            <span>Audit Log Explorer</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable system activity ledger recording administrative mutations and security events.
          </p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Feed</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter Action:</span>
        </div>

        <select
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 bg-slate-850 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Actions</option>
          <option value="destination_created">destination_created</option>
          <option value="destination_updated">destination_updated</option>
          <option value="destination_deactivated">destination_deactivated</option>
          <option value="package_created">package_created</option>
          <option value="package_updated">package_updated</option>
          <option value="package_deactivated">package_deactivated</option>
          <option value="user_status_updated">user_status_updated</option>
          <option value="user_roles_updated">user_roles_updated</option>
          <option value="super_admin_bootstrapped">super_admin_bootstrapped</option>
        </select>

        <div className="flex items-center gap-2 text-xs text-slate-400 ml-2">
          <span>Entity Type:</span>
        </div>

        <select
          value={filterEntityType}
          onChange={(e) => {
            setFilterEntityType(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 bg-slate-850 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Entities</option>
          <option value="destination">destination</option>
          <option value="package">package</option>
          <option value="user">user</option>
          <option value="system">system</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : !logs || logs.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No audit records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                logs.items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{log.actor_name || "System"}</div>
                      {log.actor_email && (
                        <div className="text-[11px] text-slate-500">{log.actor_email}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          actionBadgeColors[log.action] ||
                          "bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-medium border border-slate-700/60">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {log.entity_id ? log.entity_id.slice(0, 8) + "..." : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {log.ip_address || "internal"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.metadata_json && Object.keys(log.metadata_json).length > 0 ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Inspect Metadata"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {logs && logs.total_pages > 1 && (
          <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <span className="font-semibold text-white">{logs.page}</span> of{" "}
              <span className="font-semibold text-white">{logs.total_pages}</span> ({logs.total} total
              entries)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= logs.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>Audit Metadata: {selectedLog.action}</span>
              </h2>
              <button onClick={() => setSelectedLog(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div className="flex justify-between text-slate-400">
                <span>Record ID:</span>
                <span className="font-mono text-slate-300">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Entity:</span>
                <span className="text-slate-300">
                  {selectedLog.entity_type} ({selectedLog.entity_id})
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto">
              <pre>{JSON.stringify(selectedLog.metadata_json, null, 2)}</pre>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
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
