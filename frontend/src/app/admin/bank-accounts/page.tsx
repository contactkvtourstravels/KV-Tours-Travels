"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Landmark,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Star,
  Edit,
  Trash2,
  Shield,
  RefreshCw,
  X,
  Building,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  Server,
} from "lucide-react";
import {
  adminBankAccountApi,
  getApiBaseUrl,
  BankAccount,
  BankAccountCreateRequest,
  BankAccountUpdateRequest,
  BankAccountRevealResponse,
} from "@/lib/api";

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [revealedData, setRevealedData] = useState<BankAccountRevealResponse | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states for Add / Edit
  const [formData, setFormData] = useState<{
    account_holder_name: string;
    bank_name: string;
    account_number: string;
    confirm_account_number: string;
    ifsc_code: string;
    branch_name: string;
    account_type: string;
    upi_id: string;
    swift_code: string;
    bank_address: string;
    currency: string;
    status: string;
    is_default: boolean;
    is_public: boolean;
    transfer_instructions: string;
    branch_cash_instructions: string;
    effective_date: string;
  }>({
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    confirm_account_number: "",
    ifsc_code: "",
    branch_name: "",
    account_type: "Current",
    upi_id: "",
    swift_code: "",
    bank_address: "",
    currency: "INR",
    status: "active",
    is_default: false,
    is_public: true,
    transfer_instructions:
      "Please transfer the exact booking amount via NEFT / RTGS / IMPS or UPI. Note your Booking Reference in the remarks.",
    branch_cash_instructions:
      "Visit our office branch to deposit cash directly with official receipt acknowledgment.",
    effective_date: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminBankAccountApi.listBankAccounts({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setAccounts(res.items);
      setTotal(res.total);
      setBackendConnected(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load bank accounts.";
      setError(msg);
      setBackendConnected(false);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleCopy = (text: string, fieldName: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const validateForm = (isEdit: boolean) => {
    const errors: Record<string, string> = {};
    if (!formData.account_holder_name.trim()) errors.account_holder_name = "Account holder name is required.";
    if (!formData.bank_name.trim()) errors.bank_name = "Bank name is required.";
    if (!formData.branch_name.trim()) errors.branch_name = "Branch name is required.";

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!formData.ifsc_code.trim()) {
      errors.ifsc_code = "IFSC code is required.";
    } else if (!ifscRegex.test(formData.ifsc_code.trim().toUpperCase())) {
      errors.ifsc_code = "Invalid IFSC code (format: 4 letters, 0, 6 characters, e.g. HDFC0001234).";
    }

    if (!isEdit) {
      if (!formData.account_number.trim()) {
        errors.account_number = "Account number is required.";
      } else if (formData.account_number.trim().length < 8) {
        errors.account_number = "Account number must be at least 8 digits.";
      }

      if (formData.account_number.trim() !== formData.confirm_account_number.trim()) {
        errors.confirm_account_number = "Account numbers do not match.";
      }
    } else if (formData.account_number.trim()) {
      if (
        formData.confirm_account_number.trim() &&
        formData.account_number.trim() !== formData.confirm_account_number.trim()
      ) {
        errors.confirm_account_number = "Account numbers do not match.";
      }
    }

    if (formData.upi_id.trim() && !formData.upi_id.includes("@")) {
      errors.upi_id = "Invalid UPI ID format (must contain '@').";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAdd = () => {
    setFormData({
      account_holder_name: "KV TOURS & TRAVELS PVT LTD",
      bank_name: "",
      account_number: "",
      confirm_account_number: "",
      ifsc_code: "",
      branch_name: "",
      account_type: "Current",
      upi_id: "",
      swift_code: "",
      bank_address: "",
      currency: "INR",
      status: "active",
      is_default: accounts.length === 0,
      is_public: true,
      transfer_instructions:
        "Please transfer the exact booking amount via NEFT / RTGS / IMPS or UPI. Note your Booking Reference in the remarks.",
      branch_cash_instructions:
        "Visit our office branch to deposit cash directly with official receipt acknowledgment.",
      effective_date: "",
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (acc: BankAccount) => {
    setSelectedAccount(acc);
    setFormData({
      account_holder_name: acc.account_holder_name,
      bank_name: acc.bank_name,
      account_number: "",
      confirm_account_number: "",
      ifsc_code: acc.ifsc_code,
      branch_name: acc.branch_name,
      account_type: acc.account_type,
      upi_id: acc.upi_id || "",
      swift_code: acc.swift_code || "",
      bank_address: acc.bank_address || "",
      currency: acc.currency,
      status: acc.status,
      is_default: acc.is_default,
      is_public: acc.is_public,
      transfer_instructions: acc.transfer_instructions || "",
      branch_cash_instructions: acc.branch_cash_instructions || "",
      effective_date: acc.effective_date || "",
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleOpenReveal = (acc: BankAccount) => {
    setSelectedAccount(acc);
    setRevealedData(null);
    setIsRevealModalOpen(true);
  };

  const handleOpenDelete = (acc: BankAccount) => {
    setSelectedAccount(acc);
    setIsDeleteModalOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    setIsSubmitting(true);
    try {
      const payload: BankAccountCreateRequest = {
        account_holder_name: formData.account_holder_name.trim(),
        bank_name: formData.bank_name.trim(),
        account_number: formData.account_number.trim(),
        confirm_account_number: formData.confirm_account_number.trim(),
        ifsc_code: formData.ifsc_code.trim().toUpperCase(),
        branch_name: formData.branch_name.trim(),
        account_type: formData.account_type,
        upi_id: formData.upi_id.trim() || undefined,
        swift_code: formData.swift_code.trim() || undefined,
        bank_address: formData.bank_address.trim() || undefined,
        currency: formData.currency,
        status: formData.status,
        is_default: formData.is_default,
        is_public: formData.is_public,
        transfer_instructions: formData.transfer_instructions.trim() || undefined,
        branch_cash_instructions: formData.branch_cash_instructions.trim() || undefined,
        effective_date: formData.effective_date || undefined,
      };

      await adminBankAccountApi.createBankAccount(payload);
      setIsAddModalOpen(false);
      setSuccessMessage("Bank account created and synchronized with payment gateway settings.");
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchAccounts();
    } catch (err: unknown) {
      setFormErrors({ submit: err instanceof Error ? err.message : "Failed to create bank account." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    if (!validateForm(true)) return;

    setIsSubmitting(true);
    try {
      const payload: BankAccountUpdateRequest = {
        account_holder_name: formData.account_holder_name.trim(),
        bank_name: formData.bank_name.trim(),
        ifsc_code: formData.ifsc_code.trim().toUpperCase(),
        branch_name: formData.branch_name.trim(),
        account_type: formData.account_type,
        upi_id: formData.upi_id.trim() || undefined,
        swift_code: formData.swift_code.trim() || undefined,
        bank_address: formData.bank_address.trim() || undefined,
        currency: formData.currency,
        status: formData.status,
        is_default: formData.is_default,
        is_public: formData.is_public,
        transfer_instructions: formData.transfer_instructions.trim() || undefined,
        branch_cash_instructions: formData.branch_cash_instructions.trim() || undefined,
        effective_date: formData.effective_date || undefined,
      };

      if (formData.account_number.trim()) {
        payload.account_number = formData.account_number.trim();
        payload.confirm_account_number = formData.confirm_account_number.trim();
      }

      await adminBankAccountApi.updateBankAccount(selectedAccount.id, payload);
      setIsEditModalOpen(false);
      setSuccessMessage("Bank account updated successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchAccounts();
    } catch (err: unknown) {
      setFormErrors({ submit: err instanceof Error ? err.message : "Failed to update bank account." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (acc: BankAccount) => {
    try {
      await adminBankAccountApi.setDefault(acc.id);
      setSuccessMessage(`${acc.bank_name} marked as the authoritative default bank account.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchAccounts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update default account.");
    }
  };

  const handleConfirmReveal = async () => {
    if (!selectedAccount) return;
    setIsRevealing(true);
    try {
      const res = await adminBankAccountApi.revealAccount(selectedAccount.id);
      setRevealedData(res);
    } catch (err: unknown) {
      setFormErrors({ reveal: err instanceof Error ? err.message : "Failed to reveal bank details." });
    } finally {
      setIsRevealing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAccount) return;
    setIsSubmitting(true);
    try {
      const res = await adminBankAccountApi.deleteBankAccount(selectedAccount.id);
      setIsDeleteModalOpen(false);
      setSuccessMessage(res.message || "Bank account removed successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchAccounts();
    } catch (err: unknown) {
      setFormErrors({ delete: err instanceof Error ? err.message : "Cannot remove bank account." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const url = adminBankAccountApi.exportCsvUrl({
      search: search.trim() || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    });
    window.open(url, "_blank");
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const baseUrl = getApiBaseUrl();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E4E5E7] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#F7F7F5] rounded-xl text-[#24292F] border border-[#E4E5E7]">
            <Landmark className="w-6 h-6 text-[#C5A880]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-serif text-[#202124]">
                Bank Accounts Management
              </h1>
              {backendConnected !== null && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    backendConnected
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                  title={`API Host: ${baseUrl}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      backendConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                    }`}
                  />
                  {backendConnected ? "Backend Connected" : "Backend Disconnected"}
                </span>
              )}
            </div>
            <p className="text-xs text-[#5F6368] mt-0.5">
              Authoritative accounts for NEFT/RTGS bank transfers, UPI collections, and branch deposits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAccounts}
            disabled={loading}
            title="Refresh database records"
            className="p-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#3D4450] hover:text-[#202124] transition-all shadow-2xs flex items-center gap-1.5 text-xs font-semibold px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#3D4450] bg-white border border-[#D3D8DF] rounded-xl hover:bg-[#F7F7F5] transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#5F6368]" />
            Export CSV
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#24292F] hover:bg-[#3D4450] rounded-xl transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Bank Account
          </button>
        </div>
      </div>

      {/* Synchronized Financial Core Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3 shadow-2xs text-xs">
        <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Synchronized Financial Core: </span>
          <span>
            Bank accounts configured here automatically synchronize with{" "}
            <Link
              href="/admin/settings?tab=payments"
              className="underline font-bold text-amber-950 hover:text-black"
            >
              Settings → Payment Gateway → Bank Wire &amp; Branch Cash
            </Link>
            . The active default account serves as the verified source for checkout wire instructions and finance staff reconciliation queues.
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-medium shadow-2xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between text-xs font-medium shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAccounts}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition shadow-xs inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Connection
            </button>
            <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E4E5E7] shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#70757A]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search bank name, IFSC, holder, UPI..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] placeholder-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-[#24292F]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#70757A] hover:text-[#202124]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#5F6368]" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-[#D3D8DF] rounded-xl px-3 py-2 text-[#202124] font-medium focus:outline-none focus:ring-2 focus:ring-[#24292F]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bank Accounts Table */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#202124]">
            <thead className="bg-[#F7F7F5] text-[11px] uppercase font-bold text-[#3D4450] border-b border-[#E4E5E7] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Bank &amp; Branch</th>
                <th className="px-5 py-3.5">Account Holder</th>
                <th className="px-5 py-3.5">Account Number (Masked)</th>
                <th className="px-5 py-3.5">IFSC / UPI</th>
                <th className="px-5 py-3.5">Type &amp; Currency</th>
                <th className="px-5 py-3.5">Checkout Visibility</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F1F3]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-[#70757A]">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#24292F]" />
                    <span className="font-semibold">Loading registered bank accounts from database...</span>
                  </td>
                </tr>
              ) : error && accounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
                        <Server className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-[#202124]">Unable to Load Bank Accounts</h3>
                      <p className="text-xs text-[#5F6368] leading-relaxed">{error}</p>
                      <button
                        onClick={fetchAccounts}
                        className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold rounded-xl transition shadow-xs inline-flex items-center gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Request
                      </button>
                    </div>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-[#70757A]">
                    <Landmark className="w-10 h-10 mx-auto mb-2 text-[#D3D8DF]" />
                    <p className="font-bold text-sm text-[#202124]">No bank accounts found</p>
                    <p className="text-xs text-[#5F6368] mt-1">
                      No accounts matched the current filter or search criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[#FAF9F7] transition-all">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[#F7F7F5] rounded-xl text-[#24292F] border border-[#E4E5E7] shrink-0 mt-0.5">
                          <Building className="w-4 h-4 text-[#C5A880]" />
                        </div>
                        <div>
                          <div className="font-bold text-[#202124] flex items-center gap-2">
                            <span>{acc.bank_name}</span>
                            {acc.is_default && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#24292F] text-white rounded-full">
                                <Star className="w-3 h-3 fill-white" />
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#5F6368] font-medium mt-0.5">
                            {acc.branch_name}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-bold text-[#202124]">
                      {acc.account_holder_name}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#24292F] bg-[#F7F7F5] border border-[#E4E5E7] px-2.5 py-1 rounded-lg">
                          {acc.account_number_masked}
                        </span>
                        <button
                          onClick={() => handleOpenReveal(acc)}
                          title="Reveal full account number (Logged for compliance)"
                          className="p-1 text-[#70757A] hover:text-[#202124] hover:bg-[#F3F4F4] rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#202124]">
                          <span>{acc.ifsc_code}</span>
                          <button
                            onClick={() => handleCopy(acc.ifsc_code, `ifsc_${acc.id}`)}
                            className="text-[#70757A] hover:text-[#202124]"
                            title="Copy IFSC code"
                          >
                            {copiedField === `ifsc_${acc.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {acc.upi_id && (
                          <div className="text-[11px] text-[#5F6368] flex items-center gap-1">
                            <span className="font-mono">{acc.upi_id}</span>
                            <button
                              onClick={() => handleCopy(acc.upi_id || "", `upi_${acc.id}`)}
                              className="text-[#70757A] hover:text-[#202124]"
                              title="Copy UPI ID"
                            >
                              {copiedField === `upi_${acc.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-xs text-[#3D4450] font-semibold">
                        {acc.currency} • {acc.account_type}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {acc.is_public ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <Globe className="w-3 h-3 text-emerald-600" />
                          Public Checkout
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5F6368] bg-[#F7F7F5] px-2.5 py-0.5 rounded-full border border-[#D3D8DF]">
                          <Lock className="w-3 h-3" />
                          Internal Only
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          acc.status === "active"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : acc.status === "suspended"
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-[#ECEFF3] text-[#3D4450] border-[#D3D8DF]"
                        }`}
                      >
                        {acc.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!acc.is_default && acc.status === "active" && (
                          <button
                            onClick={() => handleSetDefault(acc)}
                            title="Set as Default Account"
                            className="p-1.5 text-[#70757A] hover:text-[#202124] hover:bg-[#F3F4F4] rounded-lg transition"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(acc)}
                          title="Edit Account Details"
                          className="p-1.5 text-[#70757A] hover:text-[#202124] hover:bg-[#F3F4F4] rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(acc)}
                          title="Deactivate / Remove Account"
                          className="p-1.5 text-[#70757A] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {total > pageSize && (
          <div className="px-5 py-3.5 bg-[#F7F7F5] border-t border-[#E4E5E7] flex items-center justify-between text-xs text-[#5F6368]">
            <div>
              Showing <span className="font-bold text-[#202124]">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-bold text-[#202124]">{Math.min(page * pageSize, total)}</span> of{" "}
              <span className="font-bold text-[#202124]">{total}</span> accounts
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F3F4F4] disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-[#202124]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F3F4F4] disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD BANK ACCOUNT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E4E5E7] space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#C5A880]" />
                <h3 className="text-base font-bold text-[#202124]">Add Bank Account</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#70757A] hover:text-[#202124]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formErrors.submit && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {formErrors.submit}
              </div>
            )}

            <form onSubmit={handleSaveNew} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Account Holder Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.account_holder_name}
                    onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#24292F]"
                  />
                  {formErrors.account_holder_name && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.account_holder_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="e.g. HDFC Bank, ICICI Bank"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#24292F]"
                  />
                  {formErrors.bank_name && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.bank_name}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] font-mono focus:ring-2 focus:ring-[#24292F]"
                  />
                  {formErrors.account_number && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.account_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Confirm Account Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.confirm_account_number}
                    onChange={(e) => setFormData({ ...formData, confirm_account_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] font-mono focus:ring-2 focus:ring-[#24292F]"
                  />
                  {formErrors.confirm_account_number && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.confirm_account_number}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] font-mono uppercase focus:ring-2 focus:ring-[#24292F]"
                  />
                  {formErrors.ifsc_code && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.ifsc_code}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    placeholder="e.g. Coimbatore Main"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#24292F]"
                  />
                  {formErrors.branch_name && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.branch_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">Account Type</label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#24292F]"
                  >
                    <option value="Current">Current</option>
                    <option value="Savings">Savings</option>
                    <option value="Overdraft">Overdraft</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    UPI ID <span className="text-[#70757A] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.upi_id}
                    onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                    placeholder="e.g. kvtours@hdfcbank"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] font-mono focus:ring-2 focus:ring-[#24292F]"
                  />
                  {formErrors.upi_id && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.upi_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    SWIFT / BIC <span className="text-[#70757A] font-normal">(International Transfers)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.swift_code}
                    onChange={(e) => setFormData({ ...formData, swift_code: e.target.value.toUpperCase() })}
                    placeholder="e.g. HDFCINBB"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] font-mono uppercase focus:ring-2 focus:ring-[#24292F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">Transfer Instructions for Customers</label>
                <textarea
                  rows={2}
                  value={formData.transfer_instructions}
                  onChange={(e) => setFormData({ ...formData, transfer_instructions: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-[#24292F]"
                  />
                  <span>Authoritative Default Account</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-[#24292F]"
                  />
                  <span>Display on Customer Checkout</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0F1F3]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#3D4450] bg-white border border-[#D3D8DF] rounded-xl hover:bg-[#F7F7F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#24292F] hover:bg-[#3D4450] rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Bank Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT BANK ACCOUNT */}
      {isEditModalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E4E5E7] space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#C5A880]" />
                <h3 className="text-base font-bold text-[#202124]">Edit Bank Account</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-[#70757A] hover:text-[#202124]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formErrors.submit && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {formErrors.submit}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Account Holder Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.account_holder_name}
                    onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#24292F]"
                  />
                  {formErrors.account_holder_name && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.account_holder_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Bank Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#24292F]"
                  />
                  {formErrors.bank_name && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.bank_name}</p>
                  )}
                </div>
              </div>

              {/* Changing Account Number is Optional during Edit */}
              <div className="p-3 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl space-y-3">
                <div className="text-xs font-bold text-[#202124]">
                  Update Account Number{" "}
                  <span className="font-normal text-[#70757A]">
                    (Leave blank to keep existing masked number: {selectedAccount.account_number_masked})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5F6368] mb-1">New Account Number</label>
                    <input
                      type="password"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="•••• •••• ••••"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#D3D8DF] rounded-lg text-[#202124] font-mono focus:ring-2 focus:ring-[#24292F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5F6368] mb-1">Confirm New Account Number</label>
                    <input
                      type="password"
                      value={formData.confirm_account_number}
                      onChange={(e) => setFormData({ ...formData, confirm_account_number: e.target.value })}
                      placeholder="•••• •••• ••••"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#D3D8DF] rounded-lg text-[#202124] font-mono focus:ring-2 focus:ring-[#24292F]"
                    />
                    {formErrors.confirm_account_number && (
                      <p className="text-[11px] text-rose-600 mt-1">{formErrors.confirm_account_number}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    IFSC Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                    maxLength={11}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] font-mono uppercase focus:ring-2 focus:ring-[#24292F]"
                  />
                  {formErrors.ifsc_code && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.ifsc_code}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#24292F]"
                  />
                  {formErrors.branch_name && (
                    <p className="text-[11px] text-rose-600 mt-1">{formErrors.branch_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#24292F]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={formData.upi_id}
                    onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] font-mono focus:ring-2 focus:ring-[#24292F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">SWIFT / BIC Code</label>
                  <input
                    type="text"
                    value={formData.swift_code}
                    onChange={(e) => setFormData({ ...formData, swift_code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] font-mono uppercase focus:ring-2 focus:ring-[#24292F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">Transfer Instructions</label>
                <textarea
                  rows={2}
                  value={formData.transfer_instructions}
                  onChange={(e) => setFormData({ ...formData, transfer_instructions: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:ring-2 focus:ring-[#24292F]"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-[#24292F]"
                  />
                  <span>Authoritative Default Account</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#202124] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="rounded border-[#D3D8DF] text-[#24292F] focus:ring-[#24292F]"
                  />
                  <span>Display on Customer Checkout</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0F1F3]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#3D4450] bg-white border border-[#D3D8DF] rounded-xl hover:bg-[#F7F7F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#24292F] hover:bg-[#3D4450] rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Update Bank Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDITED REVEAL */}
      {isRevealModalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E4E5E7] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#C5A880]" />
                <h3 className="text-base font-bold text-[#202124]">Security Authorization</h3>
              </div>
              <button onClick={() => setIsRevealModalOpen(false)} className="text-[#70757A] hover:text-[#202124]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!revealedData ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
                  <p className="font-bold">Compliance Audit Notice:</p>
                  <p className="text-amber-800 leading-relaxed">
                    Account numbers are protected under financial compliance policies. Requesting this unmasked detail
                    generates a permanent audit log entry with your user ID and timestamp.
                  </p>
                </div>

                <div className="text-xs text-[#3D4450] space-y-1 bg-[#F7F7F5] p-3 rounded-xl border border-[#E4E5E7]">
                  <p>
                    <span className="font-semibold text-[#202124]">Bank:</span> {selectedAccount.bank_name}
                  </p>
                  <p>
                    <span className="font-semibold text-[#202124]">Holder:</span> {selectedAccount.account_holder_name}
                  </p>
                  <p>
                    <span className="font-semibold text-[#202124]">Masked:</span>{" "}
                    <span className="font-mono">{selectedAccount.account_number_masked}</span>
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRevealModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#3D4450] bg-white border border-[#D3D8DF] rounded-xl hover:bg-[#F7F7F5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReveal}
                    disabled={isRevealing}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#24292F] hover:bg-[#3D4450] rounded-xl transition shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {isRevealing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>Confirm &amp; Reveal Details</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Authoritative Full Account Number
                    </span>
                    <button
                      onClick={() => handleCopy(revealedData.account_number, "revealed_acc")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950"
                    >
                      {copiedField === "revealed_acc" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === "revealed_acc" ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="text-xl font-mono font-bold text-emerald-950 tracking-wider">
                    {revealedData.account_number}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-mono">
                    IFSC: {revealedData.ifsc_code}
                  </div>
                </div>

                <p className="text-[10px] text-[#70757A] text-center">
                  Audit action recorded at {new Date(revealedData.revealed_at).toLocaleTimeString()}.
                </p>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRevealModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#24292F] hover:bg-[#3D4450] rounded-xl"
                  >
                    Close Secure View
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE / DEACTIVATE PROTECTION */}
      {isDeleteModalOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E4E5E7] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0F1F3] pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-[#202124]">Remove Bank Account</h3>
              </div>
              <button onClick={() => setIsDeleteModalOpen(false)} className="text-[#70757A] hover:text-[#202124]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formErrors.delete && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                {formErrors.delete}
              </div>
            )}

            <div className="space-y-3 text-xs text-[#3D4450]">
              <p>
                Are you sure you want to remove{" "}
                <span className="font-bold text-[#202124]">{selectedAccount.bank_name}</span> (
                <span className="font-mono">{selectedAccount.account_number_masked}</span>)?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] leading-relaxed">
                <strong>Financial Integrity Safeguard:</strong> If this account has associated payment records or wire submissions, deletion will be blocked by the server to preserve transaction integrity. You may mark the account as <strong>Inactive</strong> instead.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0F1F3]">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#3D4450] bg-white border border-[#D3D8DF] rounded-xl hover:bg-[#F7F7F5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Processing..." : "Remove Account"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
