"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Download,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Package as PackageIcon,
  ShieldCheck,
  Send,
  X,
} from "lucide-react";
import {
  adminInquiriesApi,
  adminNotesApi,
  adminOperationsApi,
  adminExportsApi,
  InquiryListItem,
  InquiryDetailResponse,
  PaginatedResponse,
} from "@/lib/api";

export default function InquiriesAdminPage() {
  const [inquiries, setInquiries] = useState<PaginatedResponse<InquiryListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Drawer / Detail modal
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [inquiryDetail, setInquiryDetail] = useState<InquiryDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Status/Priority updates
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [newPriority, setNewPriority] = useState<string>("");

  // Email modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Add Note
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminInquiriesApi.list({
        page,
        page_size: pageSize,
        status: filterStatus === "all" ? undefined : filterStatus,
        priority: filterPriority === "all" ? undefined : filterPriority,
        search: search.trim() || undefined,
      });
      setInquiries(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load customer inquiries.");
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterPriority, search]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const openDetail = async (id: string) => {
    setSelectedInquiryId(id);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await adminInquiriesApi.get(id);
      setInquiryDetail(data);
      setNewStatus(data.status);
      setNewPriority(data.priority);
    } catch (err: unknown) {
      setDetailError((err as Error).message || "Failed to load inquiry details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedInquiryId(null);
    setInquiryDetail(null);
    setEmailModalOpen(false);
  };

  const handleUpdateInquiry = async () => {
    if (!selectedInquiryId) return;
    try {
      setUpdating(true);
      const updated = await adminInquiriesApi.update(selectedInquiryId, {
        status: newStatus,
        priority: newPriority,
      });
      setInquiryDetail(updated);
      fetchInquiries();
    } catch (err: unknown) {
      setDetailError((err as Error).message || "Failed to update inquiry.");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiryId || !noteText.trim()) return;

    try {
      setSavingNote(true);
      setNoteError(null);
      const created = await adminNotesApi.create("inquiry", selectedInquiryId, noteText.trim());
      setInquiryDetail((prev) =>
        prev
          ? {
              ...prev,
              internal_notes: [created, ...prev.internal_notes],
            }
          : prev
      );
      setNoteText("");
    } catch (err: unknown) {
      setNoteError((err as Error).message || "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiryId || !emailSubject.trim() || !emailBody.trim()) return;

    try {
      setEmailSending(true);
      setEmailError(null);
      await adminOperationsApi.contactCustomerEmail({
        inquiry_id: selectedInquiryId,
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      });
      setEmailSuccess("Email sent to lead.");
      setEmailSubject("");
      setEmailBody("");
      setTimeout(() => {
        setEmailModalOpen(false);
        setEmailSuccess(null);
      }, 2000);
    } catch (err: unknown) {
      setEmailError((err as Error).message || "Failed to dispatch email.");
    } finally {
      setEmailSending(false);
    }
  };

  const getWhatsAppLink = (inquiry: InquiryDetailResponse | InquiryListItem) => {
    if (!inquiry.phone) return "#";
    const clean = inquiry.phone.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(
      `Hello ${inquiry.name}, this is KV Tours & Travels regarding your recent travel inquiry. How can we assist you today?`
    );
    return `https://wa.me/${clean}?text=${msg}`;
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case "high":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "medium":
        return "bg-sky-500/10 text-sky-400 border border-sky-500/20";
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "new":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "contacted":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "follow_up":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "converted":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "closed":
        return "bg-slate-800 text-slate-500 border border-slate-700";
      default:
        return "bg-slate-800 text-slate-300";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-purple-400" />
            Inquiries & Lead Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track, prioritize, and respond to incoming customer leads from web channels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchInquiries()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <a
            href={adminExportsApi.getInquiriesUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by name, email, phone, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="follow_up">Follow Up</option>
          <option value="converted">Converted</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => {
            setFilterPriority(e.target.value);
            setPage(1);
          }}
          className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-900 border border-slate-800 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-rose-400 text-sm mb-4">{error}</p>
          <button onClick={() => fetchInquiries()} className="px-4 py-2 bg-slate-800 text-slate-200 text-sm rounded-lg">
            Try Again
          </button>
        </div>
      ) : !inquiries || inquiries.items.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No Inquiries Found</h3>
          <p className="text-sm text-slate-400 mt-1">
            {search || filterStatus !== "all" || filterPriority !== "all"
              ? "No records matching the selected criteria."
              : "No customer inquiries submitted yet."}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Customer Lead</th>
                  <th className="py-3.5 px-4">Interest</th>
                  <th className="py-3.5 px-4">Message Preview</th>
                  <th className="py-3.5 px-4 text-center">Priority</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {inquiries.items.map((inq) => (
                  <tr key={inq.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-100">{inq.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" /> {inq.email}
                      </div>
                      {inq.phone && (
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" /> {inq.phone}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-xs space-y-1">
                      {inq.destination_name && (
                        <div className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-slate-500" /> {inq.destination_name}
                        </div>
                      )}
                      {inq.package_name && (
                        <div className="flex items-center gap-1 text-slate-400">
                          <PackageIcon className="w-3 h-3 text-slate-500" /> {inq.package_name}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 max-w-xs">
                      <p className="text-xs text-slate-300 line-clamp-2">{inq.message}</p>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getPriorityBadgeClass(inq.priority)}`}>
                        {inq.priority}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getStatusBadgeClass(inq.status)}`}>
                        {inq.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-400">
                      {new Date(inq.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => openDetail(inq.id)}
                        className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-medium transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {inquiries.total_pages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, inquiries.total)} of {inquiries.total} leads
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(inquiries.total_pages, p + 1))}
                  disabled={page >= inquiries.total_pages}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal / Drawer for Lead Details */}
      {selectedInquiryId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                Customer Lead Information
              </h2>
              <button onClick={closeDetail} className="text-slate-400 hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading lead details...</div>
            ) : detailError || !inquiryDetail ? (
              <div className="p-4 text-center text-rose-400 text-sm">{detailError || "Failed to load lead."}</div>
            ) : (
              <div className="space-y-6">
                {/* Contact & Interest Card */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-slate-100">{inquiryDetail.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{inquiryDetail.email}</span>
                        {inquiryDetail.phone && <span>• {inquiryDetail.phone}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {inquiryDetail.phone && (
                        <a
                          href={getWhatsAppLink(inquiryDetail)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                      <button
                        onClick={() => setEmailModalOpen(true)}
                        className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" /> Email
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/60 flex flex-wrap gap-4">
                    <span>
                      <strong>Destination:</strong> {inquiryDetail.destination_name || "General"}
                    </span>
                    <span>
                      <strong>Package:</strong> {inquiryDetail.package_name || "Custom"}
                    </span>
                    <span>
                      <strong>Submitted:</strong> {new Date(inquiryDetail.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Inquiry Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Customer Message</label>
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {inquiryDetail.message}
                  </div>
                </div>

                {/* Status & Priority Management */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 border border-slate-800 rounded-xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Operational Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="converted">Converted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Lead Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      onClick={handleUpdateInquiry}
                      disabled={updating || (newStatus === inquiryDetail.status && newPriority === inquiryDetail.priority)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                    >
                      {updating ? "Updating..." : "Update Status & Priority"}
                    </button>
                  </div>
                </div>

                {/* Internal Notes Section */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Internal Staff Notes (Restricted)
                  </div>

                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Add an internal note about client conversation or follow-up schedule..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    {noteError && <p className="text-xs text-rose-400">{noteError}</p>}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingNote || !noteText.trim()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium disabled:opacity-50"
                      >
                        {savingNote ? "Saving..." : "Add Note"}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {inquiryDetail.internal_notes.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No internal staff notes on this inquiry.</p>
                    ) : (
                      inquiryDetail.internal_notes.map((n) => (
                        <div key={n.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                          <div className="flex justify-between text-slate-400 text-[11px]">
                            <span>{n.author_name}</span>
                            <span>{new Date(n.created_at).toLocaleString("en-IN")}</span>
                          </div>
                          <p className="text-slate-300">{n.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Email Dispatch Sub-form */}
                {emailModalOpen && (
                  <div className="bg-slate-950 p-4 border border-indigo-500/30 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-indigo-400" /> Dispatch Email to Lead
                      </h4>
                      <button onClick={() => setEmailModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {emailSuccess ? (
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20 text-center">
                        {emailSuccess}
                      </div>
                    ) : (
                      <form onSubmit={handleSendEmail} className="space-y-3">
                        <input
                          type="text"
                          required
                          placeholder="Subject"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        <textarea
                          rows={4}
                          required
                          placeholder="Compose reply message..."
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                        {emailError && <p className="text-xs text-rose-400">{emailError}</p>}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEmailModalOpen(false)}
                            className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={emailSending}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            {emailSending ? "Sending..." : "Send"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
