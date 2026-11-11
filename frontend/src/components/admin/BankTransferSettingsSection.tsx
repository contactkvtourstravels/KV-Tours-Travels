"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Building,
  CreditCard,
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  DollarSign,
  HelpCircle,
  Save,
} from "lucide-react";
import {
  adminPaymentApi,
  BankSettingsAdminResponse,
  BankSettingsUpdateRequest,
  PaymentSettingsUpdateRequest,
} from "@/lib/api";
import { useAdmin } from "@/app/admin/AdminContext";

export default function BankTransferSettingsSection() {
  const { hasAnyRole } = useAdmin();
  const canEdit = hasAnyRole(["admin", "super_admin"]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Bank Account Settings
  const [bankSettings, setBankSettings] = useState<BankSettingsAdminResponse | null>(null);
  const [bankTransferEnabled, setBankTransferEnabled] = useState(false);
  const [branchPaymentEnabled, setBranchPaymentEnabled] = useState(false);
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountType, setAccountType] = useState("current");
  const [upiId, setUpiId] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [requiredReferenceFormat, setRequiredReferenceFormat] = useState(
    "12-digit UTR or Bank Transaction Reference"
  );
  const [proofUploadRequired, setProofUploadRequired] = useState(false);
  const [assistancePhone, setAssistancePhone] = useState("");
  const [assistanceEmail, setAssistanceEmail] = useState("");
  const [packageAvailability, setPackageAvailability] = useState("all_packages");

  // Gateway Limits & Staged Payments Settings
  const [maxOnlineLimit, setMaxOnlineLimit] = useState("500000");
  const [splitPaymentEnabled, setSplitPaymentEnabled] = useState(true);
  const [defaultDepositPercentage, setDefaultDepositPercentage] = useState("30");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [bankRes, payRes] = await Promise.all([
        adminPaymentApi.getBankSettings().catch(() => null),
        adminPaymentApi.getSettings().catch(() => null),
      ]);

      if (bankRes) {
        setBankSettings(bankRes);
        setBankTransferEnabled(bankRes.bank_transfer_enabled);
        setBranchPaymentEnabled(bankRes.branch_payment_enabled);
        setAccountHolderName(bankRes.account_holder_name || "");
        setBankName(bankRes.bank_name || "");
        setIfscCode(bankRes.ifsc_code || "");
        setBranchName(bankRes.branch_name || "");
        setAccountType(bankRes.account_type || "current");
        setUpiId(bankRes.upi_id || "");
        setPaymentInstructions(bankRes.payment_instructions || "");
        setRequiredReferenceFormat(
          bankRes.required_reference_format || "12-digit UTR or Bank Transaction Reference"
        );
        setProofUploadRequired(Boolean(bankRes.proof_upload_required));
        setAssistancePhone(bankRes.payment_assistance_phone || "");
        setAssistanceEmail(bankRes.payment_assistance_email || "");
        setPackageAvailability(bankRes.package_availability || "all_packages");
      }

      if (payRes) {
        setMaxOnlineLimit(String(payRes.max_online_single_payment_limit || "500000"));
        setSplitPaymentEnabled(payRes.split_payment_enabled ?? true);
        setDefaultDepositPercentage(String(payRes.default_deposit_percentage || "30"));
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load payment settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setError(null);
    setSuccessMessage(null);

    // Validation
    if (accountNumber || confirmAccountNumber) {
      if (accountNumber !== confirmAccountNumber) {
        setError("Account number and confirmation account number do not match.");
        return;
      }
      if (accountNumber.trim().length < 8) {
        setError("Account number must be at least 8 digits.");
        return;
      }
    }

    if (ifscCode.trim()) {
      const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscPattern.test(ifscCode.trim().toUpperCase())) {
        setError(
          "Invalid IFSC Code format. Must be 11 characters starting with 4 letters, then 0, followed by 6 alphanumeric characters (e.g. HDFC0001234)."
        );
        return;
      }
    }

    const limitNum = parseFloat(maxOnlineLimit);
    if (isNaN(limitNum) || limitNum < 1) {
      setError("Please specify a valid maximum online payment threshold (minimum ₹1).");
      return;
    }

    const depositPct = parseInt(defaultDepositPercentage, 10);
    if (isNaN(depositPct) || depositPct < 5 || depositPct > 95) {
      setError("Deposit percentage must be between 5% and 95%.");
      return;
    }

    try {
      setSaving(true);

      const bankPayload: BankSettingsUpdateRequest = {
        bank_transfer_enabled: bankTransferEnabled,
        branch_payment_enabled: branchPaymentEnabled,
        account_holder_name: accountHolderName.trim() || undefined,
        bank_name: bankName.trim() || undefined,
        ifsc_code: ifscCode.trim().toUpperCase() || undefined,
        branch_name: branchName.trim() || undefined,
        account_type: accountType,
        upi_id: upiId.trim() || undefined,
        payment_instructions: paymentInstructions.trim() || undefined,
        required_reference_format: requiredReferenceFormat.trim() || undefined,
        proof_upload_required: proofUploadRequired,
        payment_assistance_phone: assistancePhone.trim() || undefined,
        payment_assistance_email: assistanceEmail.trim() || undefined,
        package_availability: packageAvailability,
      };

      if (accountNumber.trim()) {
        bankPayload.account_number = accountNumber.trim();
        bankPayload.confirm_account_number = confirmAccountNumber.trim();
      }

      const paymentPayload: PaymentSettingsUpdateRequest = {
        max_online_single_payment_limit: limitNum,
        split_payment_enabled: splitPaymentEnabled,
        default_deposit_percentage: depositPct,
      };

      await Promise.all([
        adminPaymentApi.updateBankSettings(bankPayload),
        adminPaymentApi.updateSettings(paymentPayload),
      ]);

      setAccountNumber("");
      setConfirmAccountNumber("");
      setSuccessMessage("Bank transfer and payment limit settings updated successfully.");
      await fetchData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to save bank settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-white border border-[#E4E5E7] rounded-2xl flex items-center justify-center text-xs text-[#70757A]">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading Bank Transfer &amp; Payment Limit Configurations...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Multi-Bank Account Management Synchronization Link */}
      <div className="p-4 bg-white border border-[#E4E5E7] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#F7F7F5] border border-[#E4E5E7] text-[#24292F] rounded-xl shrink-0">
            <Building className="w-5 h-5 text-[#C5A880]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#202124]">
              Authoritative Organization Bank Accounts
            </h4>
            <p className="text-[11px] text-[#5F6368]">
              Both this page and Finance &rarr; Bank Accounts share the same authoritative database records. Manage multiple accounts, audit reveal actions, and default selection directly in the dedicated Finance section.
            </p>
          </div>
        </div>
        <Link
          href="/admin/bank-accounts"
          className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition shadow-xs text-center"
        >
          Manage All Accounts &rarr;
        </Link>
      </div>

      {/* Overview Notice */}
      <div className="p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl text-xs space-y-2">
        <div className="flex items-center gap-2 text-[#202124] font-bold">
          <Shield className="w-4 h-4 text-[#C5A880]" />
          <span>Bank Transfer &amp; Branch Payment Security Protocol</span>
        </div>
        <p className="text-[#5F6368] leading-relaxed">
          Customer-submitted bank transfers remain in{" "}
          <strong className="text-[#202124]">pending verification</strong> status until authorized staff
          verify the UTR/reference on authoritative bank statements. Account numbers are masked in audit
          logs and general API payloads. Bank account ownership is not automatically verified by external
          APIs; ensure your details match your bank documentation exactly.
        </p>
      </div>

      {/* Payment Limits & Staged Payment Thresholds */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E4E5E7] pb-3">
          <DollarSign className="w-5 h-5 text-[#C5A880]" />
          <h3 className="font-serif font-bold text-base text-[#202124]">
            Payment Limits &amp; Split Payment Controls
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-[#202124] mb-1">
              Maximum Single Online Payment Limit (₹)
            </label>
            <input
              type="number"
              step="1000"
              min="1000"
              value={maxOnlineLimit}
              onChange={(e) => setMaxOnlineLimit(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl font-bold text-[#202124] focus:outline-none focus:border-[#C5A880]"
            />
            <p className="text-[11px] text-[#70757A] mt-1">
              Initial requested threshold is ₹5,00,000. Bookings above this will automatically offer Split
              Deposit and Direct Bank Transfer.
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#202124] mb-1">
              Allow Split / Staged Payments
            </label>
            <div className="flex items-center gap-3 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={splitPaymentEnabled}
                  onChange={(e) => setSplitPaymentEnabled(e.target.checked)}
                  disabled={!canEdit}
                  className="rounded text-[#C5A880] focus:ring-[#C5A880]"
                />
                <span className="font-medium text-[#202124]">Enable deposit + balance payment</span>
              </label>
            </div>
            <p className="text-[11px] text-[#70757A] mt-1">
              Customers can pay an initial deposit online, with remaining balance paid subsequently.
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#202124] mb-1">
              Default Minimum Deposit Percentage (%)
            </label>
            <input
              type="number"
              min="5"
              max="95"
              value={defaultDepositPercentage}
              onChange={(e) => setDefaultDepositPercentage(e.target.value)}
              disabled={!canEdit || !splitPaymentEnabled}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl font-bold text-[#202124] focus:outline-none focus:border-[#C5A880] disabled:opacity-50"
            />
            <p className="text-[11px] text-[#70757A] mt-1">
              Default required initial deposit percentage (e.g., 30% of total package amount).
            </p>
          </div>
        </div>
      </div>

      {/* Payment Method Availability Toggles */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E4E5E7] pb-3">
          <Building className="w-5 h-5 text-[#C5A880]" />
          <h3 className="font-serif font-bold text-base text-[#202124]">
            Method Activation &amp; Package Scope
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="p-4 border border-[#E4E5E7] rounded-xl bg-[#FAFAFA] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#202124]">Direct Bank Transfer (NEFT/RTGS/IMPS)</span>
              <input
                type="checkbox"
                checked={bankTransferEnabled}
                onChange={(e) => setBankTransferEnabled(e.target.checked)}
                disabled={!canEdit}
                className="w-4 h-4 rounded text-[#C5A880] focus:ring-[#C5A880]"
              />
            </div>
            <p className="text-[11px] text-[#70757A]">
              Shows agency bank credentials on checkout with customer UTR submission.
            </p>
          </div>

          <div className="p-4 border border-[#E4E5E7] rounded-xl bg-[#FAFAFA] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#202124]">Branch Payment (Cash / Cheque)</span>
              <input
                type="checkbox"
                checked={branchPaymentEnabled}
                onChange={(e) => setBranchPaymentEnabled(e.target.checked)}
                disabled={!canEdit}
                className="w-4 h-4 rounded text-[#C5A880] focus:ring-[#C5A880]"
              />
            </div>
            <p className="text-[11px] text-[#70757A]">
              Allows in-person payment at the KV Tours & Travels headquarters.
            </p>
          </div>

          <div className="p-4 border border-[#E4E5E7] rounded-xl bg-[#FAFAFA] space-y-2">
            <label className="block font-bold text-[#202124] mb-1">Package Availability</label>
            <select
              value={packageAvailability}
              onChange={(e) => setPackageAvailability(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 bg-white border border-[#D3D8DF] rounded-xl font-medium text-[#202124] focus:outline-none focus:border-[#C5A880]"
            >
              <option value="all_packages">Available for all packages</option>
              <option value="selected_packages">High-value packages only (&gt; ₹5,00,000)</option>
            </select>
            <p className="text-[11px] text-[#70757A]">
              Restricts whether offline bank transfer appears on all trips or only high-value bookings.
            </p>
          </div>
        </div>
      </div>

      {/* Agency Bank Account Details */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4E5E7] pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#C5A880]" />
            <h3 className="font-serif font-bold text-base text-[#202124]">
              Official Agency Bank Account
            </h3>
          </div>
          {bankSettings?.account_number_configured && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-bold">
              Account Configured: {bankSettings.account_number_masked}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-[#202124] mb-1">
              Account Holder / Legal Business Name *
            </label>
            <input
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="e.g. KV TOURS & TRAVELS"
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-[#202124] focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#202124] mb-1">Bank Name *</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-[#202124] focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#202124] mb-1">
              Account Number {bankSettings?.account_number_configured && "(Leave blank to keep existing)"}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={
                bankSettings?.account_number_configured
                  ? `Keep current (${bankSettings.account_number_masked})`
                  : "Enter bank account number"
              }
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl font-mono text-[#202124] focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#202124] mb-1">
              Confirm Account Number
            </label>
            <input
              type="text"
              autoComplete="off"
              value={confirmAccountNumber}
              onChange={(e) => setConfirmAccountNumber(e.target.value)}
              placeholder="Re-enter bank account number exactly"
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl font-mono text-[#202124] focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#202124] mb-1">IFSC Code *</label>
            <input
              type="text"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              placeholder="e.g. HDFC0001234 (11 characters)"
              maxLength={11}
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl font-mono uppercase text-[#202124] focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#202124] mb-1">Branch Name</label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="e.g. Cross Cut Road Branch, Gandhipuram, Coimbatore"
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-[#202124] focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#202124] mb-1">Account Type</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-[#202124] focus:outline-none focus:border-[#C5A880]"
            >
              <option value="current">Current Account (Corporate / Business)</option>
              <option value="savings">Savings Account</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#202124] mb-1">UPI ID / VPA (Optional)</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. kvtours@hdfcbank"
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl font-mono text-[#202124] focus:outline-none focus:border-[#C5A880]"
            />
          </div>
        </div>
      </div>

      {/* Customer Guidance & Reference Format */}
      <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E4E5E7] pb-3">
          <HelpCircle className="w-5 h-5 text-[#C5A880]" />
          <h3 className="font-serif font-bold text-base text-[#202124]">
            Customer Payment Instructions &amp; Assistance
          </h3>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#202124] mb-1">
              Customer Payment Instructions
            </label>
            <textarea
              rows={3}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Guidance shown on checkout, e.g.: Transfer using NEFT/RTGS/IMPS from your net banking app. Mention your Booking Reference in the transfer remarks."
              disabled={!canEdit}
              className="w-full p-3 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-[#202124] focus:outline-none focus:border-[#C5A880]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#202124] mb-1">
                Required Payment Reference Format
              </label>
              <input
                type="text"
                value={requiredReferenceFormat}
                onChange={(e) => setRequiredReferenceFormat(e.target.value)}
                placeholder="e.g. 12-digit UTR or Bank Transaction Reference"
                disabled={!canEdit}
                className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-[#202124] focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={proofUploadRequired}
                  onChange={(e) => setProofUploadRequired(e.target.checked)}
                  disabled={!canEdit}
                  className="rounded text-[#C5A880] focus:ring-[#C5A880]"
                />
                <span className="font-medium text-[#202124]">
                  Require customer payment proof receipt / screenshot
                </span>
              </label>
            </div>

            <div>
              <label className="block font-bold text-[#202124] mb-1">
                Payment Assistance Phone
              </label>
              <input
                type="text"
                value={assistancePhone}
                onChange={(e) => setAssistancePhone(e.target.value)}
                placeholder="+91 98422 12345"
                disabled={!canEdit}
                className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-[#202124] focus:outline-none focus:border-[#C5A880]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#202124] mb-1">
                Payment Assistance Email
              </label>
              <input
                type="email"
                value={assistanceEmail}
                onChange={(e) => setAssistanceEmail(e.target.value)}
                placeholder="contact.kvtourstravels@gmail.com"
                disabled={!canEdit}
                className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-[#202124] focus:outline-none focus:border-[#C5A880]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {canEdit && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Configurations...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Bank Transfer &amp; Payment Settings</span>
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
}
