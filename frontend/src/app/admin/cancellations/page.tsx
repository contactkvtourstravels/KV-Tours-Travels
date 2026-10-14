"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  X,
} from "lucide-react";
import {
  adminCancellationApi,
  CancellationRequestDetail,
} from "@/lib/api";

const STATUS_FILTERS = [
  { label: "All Requests", value: "" },
  { label: "Pending Review", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export default function AdminCancellationsPage() {
  const [requests, setRequests] = useState<CancellationRequestDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  // Review Modal State
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequestDetail | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchCancellations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminCancellationApi.listCancellations(statusFilter || undefined);
      setRequests(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load cancellation requests.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCancellations();
  }, [fetchCancellations]);

  const openReviewModal = (req: CancellationRequestDetail, action: "approve" | "reject") => {
    setSelectedRequest(req);
    setReviewAction(action);
    setReviewNotes(req.admin_notes || "");
    setReviewError(null);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      setReviewSubmitting(true);
      setReviewError(null);
      await adminCancellationApi.reviewCancellation(selectedRequest.id, {
        action: reviewAction,
        review_notes: reviewNotes.trim() || undefined,
      });
      setSelectedRequest(null);
      await fetchCancellations();
    } catch (err: unknown) {
      setReviewError((err as Error).message || "Failed to process review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Pending Review
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
            Operations & Governance
          </div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
            Booking Cancellation Requests
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review and govern customer cancellation claims according to KV Tours & Travels refund policy.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((f) => {
            const isSelected = statusFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-amber-400 text-black font-semibold shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Governance Notice */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white">Strict Business Policy:</strong> Cancellation requests do not automatically issue bank refunds. Approving a request marks the reservation as cancelled. Any approved refund must be executed authoritatively via the Payments refund pipeline.
        </p>
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mb-4" />
          <p className="text-xs uppercase tracking-widest text-slate-400">
            Loading cancellation requests...
          </p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs">
          {error}
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          No cancellation requests match the selected filter.
        </div>
      ) : (
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-850">
                <tr>
                  <th className="py-3.5 px-4">Booking Ref</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Requested Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {r.booking_reference}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{r.customer_name}</div>
                      <div className="text-[11px] text-slate-500">{r.customer_email}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-300">{r.reason}</p>
                      {r.admin_notes && (
                        <p className="text-[10px] text-amber-400/80 mt-1 italic">
                          Staff Note: {r.admin_notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      {new Date(r.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {r.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openReviewModal(r, "approve")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openReviewModal(r, "reject")}
                            className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          Reviewed {r.resolved_at ? new Date(r.resolved_at).toLocaleDateString("en-IN") : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white capitalize">
                {reviewAction} Cancellation Request
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p>
                <strong>Booking:</strong>{" "}
                <span className="font-mono text-amber-400">{selectedRequest.booking_reference}</span>
              </p>
              <p>
                <strong>Customer:</strong> {selectedRequest.customer_name} ({selectedRequest.customer_email})
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
                <strong>Customer Reason:</strong>
                <p className="mt-1 text-slate-300">{selectedRequest.reason}</p>
              </div>
            </div>

            {reviewError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
                  Staff Review Note (Communicated to Customer)
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter policy justification or administrative notes..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white ${
                    reviewAction === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {reviewSubmitting ? "Processing..." : `Confirm ${reviewAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
