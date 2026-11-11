"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  FileText,
  Send,
  Plus,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  adminCustomersApi,
  adminNotesApi,
  adminOperationsApi,
  CustomerDetailResponse,
} from "@/lib/api";

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<CustomerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // New Note state
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<"bookings" | "payments" | "cancellations" | "inquiries" | "notes">("bookings");

  const fetchCustomer = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await adminCustomersApi.get(customerId);
      setCustomer(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load customer profile.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim()) return;

    try {
      setEmailSending(true);
      setEmailError(null);
      await adminOperationsApi.contactCustomerEmail({
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      });
      setEmailSuccess("Email message dispatched successfully to customer.");
      setEmailSubject("");
      setEmailBody("");
      setTimeout(() => {
        setEmailModalOpen(false);
        setEmailSuccess(null);
      }, 2000);
    } catch (err: unknown) {
      setEmailError((err as Error).message || "Failed to send email.");
    } finally {
      setEmailSending(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !customerId) return;

    try {
      setSubmittingNote(true);
      setNoteError(null);
      const noteItem = await adminNotesApi.create("customer", customerId, newNote.trim());
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              internal_notes: [noteItem, ...prev.internal_notes],
            }
          : prev
      );
      setNewNote("");
    } catch (err: unknown) {
      setNoteError((err as Error).message || "Failed to add internal note.");
    } finally {
      setSubmittingNote(false);
    }
  };

  const getWhatsAppLink = () => {
    if (!customer?.phone) return "#";
    const clean = customer.phone.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(
      `Hello ${customer.first_name}, this is KV Tours & Travels regarding your travel account. How can we assist you today?`
    );
    return `https://wa.me/${clean}?text=${msg}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-6 w-32 bg-slate-800 rounded" />
        <div className="h-40 bg-slate-900 border border-slate-800 rounded-xl" />
        <div className="h-96 bg-slate-900 border border-slate-800 rounded-xl" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl max-w-xl mx-auto my-12">
        <p className="text-rose-400 text-sm mb-4">{error || "Customer profile could not be found."}</p>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Back button */}
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl font-bold flex-shrink-0">
              {customer.first_name[0]}
              {customer.last_name[0]}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-100">
                  {customer.first_name} {customer.last_name}
                </h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    customer.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {customer.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {customer.email}
                </span>

                {customer.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {customer.phone}
                  </span>
                )}

                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Member since {new Date(customer.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </span>

                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  {customer.saved_traveller_count} saved traveller profiles
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {customer.phone && (
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp Customer
              </a>
            )}

            <button
              onClick={() => setEmailModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold transition-colors"
            >
              <Mail className="w-4 h-4" />
              Send Operational Email
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 flex gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "bookings"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Bookings ({customer.bookings.length})
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "payments"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payments ({customer.payments.length})
        </button>

        <button
          onClick={() => setActiveTab("cancellations")}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "cancellations"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Cancellations ({customer.cancellations.length})
        </button>

        <button
          onClick={() => setActiveTab("inquiries")}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "inquiries"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Inquiries ({customer.inquiries.length})
        </button>

        <button
          onClick={() => setActiveTab("notes")}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "notes"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Internal Notes ({customer.internal_notes.length})
        </button>
      </div>

      {/* Tab Panels */}
      {/* 1. Bookings Tab */}
      {activeTab === "bookings" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {customer.bookings.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No bookings recorded for this customer yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {customer.bookings.map((b) => (
                <div key={b.id} className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-100">{b.booking_reference}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          b.status === "confirmed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : b.status === "pending"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {b.status}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        {b.payment_status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{b.package_name}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-200">
                      ₹{Number(b.total_amount).toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(b.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Payments Tab */}
      {activeTab === "payments" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {customer.payments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No payments recorded for this customer.</div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {customer.payments.map((p) => (
                <div key={p.id} className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-200">{p.id}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.status === "captured"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Booking: {p.booking_reference} • Provider: {p.provider} {p.payment_method ? `(${p.payment_method})` : ""}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-200">
                      ₹{Number(p.amount).toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(p.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Cancellations Tab */}
      {activeTab === "cancellations" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {customer.cancellations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No cancellation requests on record.</div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {customer.cancellations.map((c) => (
                <div key={c.id} className="p-4 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-sm text-slate-200">{c.booking_reference}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.status === "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : c.status === "pending"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-1">Reason: {c.reason}</p>
                  <div className="text-[11px] text-slate-500">
                    Requested on {new Date(c.created_at).toLocaleDateString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Inquiries Tab */}
      {activeTab === "inquiries" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {customer.inquiries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No inquiry submissions found.</div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {customer.inquiries.map((inq) => (
                <div key={inq.id} className="p-4 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {inq.status}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(inq.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{inq.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Staff Internal Notes Tab */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          {/* Add note card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Add Confidential Staff Internal Note
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Internal notes are strictly restricted to staff and managers. They are never revealed to customers.
            </p>

            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                rows={3}
                placeholder="Enter operational observations, customer preferences, or travel requirements..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />

              {noteError && <p className="text-xs text-rose-400 font-medium">{noteError}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingNote || !newNote.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {submittingNote ? "Saving..." : "Save Note"}
                </button>
              </div>
            </form>
          </div>

          {/* Notes list */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Note History
            </div>

            {customer.internal_notes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No internal notes added yet.</div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {customer.internal_notes.map((n) => (
                  <div key={n.id} className="p-4 hover:bg-slate-800/40 transition-colors space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-medium text-slate-200">
                        {n.author_name} ({n.author_email})
                      </span>
                      <span>
                        {new Date(n.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{n.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Send Operational Email */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              Dispatch Operational Email
            </h3>
            <p className="text-xs text-slate-400">
              Sending to: <span className="font-semibold text-slate-200">{customer.email}</span>
            </p>

            {emailSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm text-center">
                {emailSuccess}
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="e.g., Update regarding your upcoming travel arrangements"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Message Body</label>
                  <textarea
                    rows={5}
                    required
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Enter message text for the customer..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {emailError && <p className="text-xs text-rose-400 font-medium">{emailError}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEmailModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={emailSending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {emailSending ? "Sending..." : "Send Message"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
