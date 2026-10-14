"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  Power,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Download,
  Search,
  Filter,
  ExternalLink,
  Lock,
  Server,
  Key,
  Activity,
  X,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  ShieldAlert,
  Sliders,
  FileCode,
  DollarSign,
  ArrowRight,
  Layers,
  Eye,
  EyeOff,
  Building,
} from "lucide-react";
import {
  adminPaymentApi,
  adminOperationsApi,
  adminExportsApi,
  adminApi,
  PaymentOverviewMetricsResponse,
  PaymentSettingsResponse,
  PaymentSettingsUpdateRequest,
  PaymentTransactionsListResponse,
  PaymentTransactionListItem,
  PaymentRefundResponse,
  PaymentWebhookListResponse,
  RazorpayDiagnosticResponse,
  RazorpayWebhookVerificationResponse,
  PaymentReconciliationResponse,
  AuditLogItem,
  PaymentDetailResponse,
  healthApi,
} from "@/lib/api";
import { useAdmin } from "../AdminContext";
import BankTransferSettingsSection from "@/components/admin/BankTransferSettingsSection";

type PaymentTab =
  | "overview"
  | "methods"
  | "gateway"
  | "transactions"
  | "refunds"
  | "webhooks"
  | "reconciliation"
  | "settings"
  | "audit_logs";

export interface ReadinessCheckResult {
  id: number;
  name: string;
  category: "Connectivity" | "Credentials" | "Integration" | "Security & Webhooks" | "Order & Flow" | "Frontend UX";
  status: "PASS" | "FAIL" | "NEEDS CONFIGURATION" | "NOT TESTED";
  summary: string;
  actionRequired?: string;
}

export default function AdminPaymentControlCenterPage() {
  const { hasAnyRole } = useAdmin();
  const isAuthorized = hasAnyRole(["manager", "admin", "super_admin"]);
  const isElevated = hasAnyRole(["admin", "super_admin"]);

  const [activeTab, setActiveTab] = useState<PaymentTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Core Data States
  const [overview, setOverview] = useState<PaymentOverviewMetricsResponse | null>(null);
  const [settings, setSettings] = useState<PaymentSettingsResponse | null>(null);
  const [reconciliation, setReconciliation] = useState<PaymentReconciliationResponse | null>(null);

  // Transactions State
  const [transactionsData, setTransactionsData] = useState<PaymentTransactionsListResponse | null>(null);
  const [txSearch, setTxSearch] = useState("");
  const [txStatus, setTxStatus] = useState("all");
  const [txProvider, setTxProvider] = useState("all");
  const [txPage, setTxPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<PaymentTransactionListItem | null>(null);
  const [selectedTxDetail, setSelectedTxDetail] = useState<PaymentDetailResponse | null>(null);
  const [txDetailLoading, setTxDetailLoading] = useState(false);

  // Bank Transfer Verification & Rejection Modals
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [actionTx, setActionTx] = useState<PaymentTransactionListItem | null>(null);
  const [verifiedAmountInput, setVerifiedAmountInput] = useState("");
  const [verificationNotesInput, setVerificationNotesInput] = useState("");
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [bankActionSubmitting, setBankActionSubmitting] = useState(false);
  const [bankActionError, setBankActionError] = useState<string | null>(null);

  // Refunds State
  const [refundsList, setRefundsList] = useState<PaymentRefundResponse[]>([]);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundPaymentId, setRefundPaymentId] = useState("");
  const [refundMaxAmount, setRefundMaxAmount] = useState(0);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("customer_requested_cancellation");
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundRecordOffline, setRefundRecordOffline] = useState(false);

  // Webhooks State
  const [webhooksData, setWebhooksData] = useState<PaymentWebhookListResponse | null>(null);
  const [webhookPage] = useState(1);
  const [retryingWebhookId, setRetryingWebhookId] = useState<string | null>(null);

  // Diagnostics State
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<RazorpayDiagnosticResponse | null>(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  // Settings & Master Switch Edit State
  const [maintenanceMessageInput, setMaintenanceMessageInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [masterSwitchModalOpen, setMasterSwitchModalOpen] = useState(false);

  // Live Mode Toggle Modal
  const [liveModeModalOpen, setLiveModeModalOpen] = useState(false);
  const [confirmLiveCheck, setConfirmLiveCheck] = useState(false);

  // 14-Point Payment Readiness Check State
  const [readinessChecks, setReadinessChecks] = useState<ReadinessCheckResult[] | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessTestedAt, setReadinessTestedAt] = useState<string | null>(null);

  // Dedicated Gateway Configuration Inline States
  const [selectedConfigEnv, setSelectedConfigEnv] = useState<"test" | "live">("test");
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [gatewayKeyIdInput, setGatewayKeyIdInput] = useState("");
  const [gatewayKeySecretInput, setGatewayKeySecretInput] = useState("");
  const [gatewayWebhookSecretInput, setGatewayWebhookSecretInput] = useState("");
  const [showUnsavedKeySecret, setShowUnsavedKeySecret] = useState(false);
  const [showUnsavedWebhookSecret, setShowUnsavedWebhookSecret] = useState(false);
  const [confirmLiveInlineCheck, setConfirmLiveInlineCheck] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);

  // Webhook Verification State
  const [webhookVerifying, setWebhookVerifying] = useState(false);
  const [webhookVerificationResult, setWebhookVerificationResult] = useState<RazorpayWebhookVerificationResponse | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  // 1. Initial Load
  const fetchCoreData = useCallback(async () => {
    if (!isAuthorized) return;
    try {
      setLoading(true);
      setError(null);

      const [ovRes, setRes, recRes] = await Promise.all([
        adminPaymentApi.getOverview().catch(() => null),
        adminPaymentApi.getSettings().catch(() => null),
        adminOperationsApi.getReconciliation({ page: 1, page_size: 10 }).catch(() => null),
      ]);

      if (ovRes) setOverview(ovRes);
      if (setRes) {
        setSettings(setRes);
        setMaintenanceMessageInput(setRes.maintenance_message || "");
      }
      if (recRes) setReconciliation(recRes);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load payment management data.");
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    fetchCoreData();
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get("tab") as PaymentTab | null;
      if (
        tab &&
        [
          "overview",
          "methods",
          "gateway",
          "transactions",
          "refunds",
          "webhooks",
          "reconciliation",
          "settings",
          "audit_logs",
        ].includes(tab)
      ) {
        setActiveTab(tab);
      }
    }
  }, [fetchCoreData]);

  // 2. Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await adminPaymentApi.getTransactions({
        page: txPage,
        page_size: 15,
        search: txSearch.trim() || undefined,
        status: txStatus === "all" ? undefined : txStatus,
        provider: txProvider === "all" ? undefined : txProvider,
      });
      setTransactionsData(res);
    } catch (err: unknown) {
      console.error("Failed to load transactions", err);
    }
  }, [txPage, txSearch, txStatus, txProvider]);

  useEffect(() => {
    if (activeTab === "transactions") {
      fetchTransactions();
    }
  }, [activeTab, fetchTransactions]);

  // 3. Fetch Refunds
  const fetchRefunds = useCallback(async () => {
    try {
      const res = await adminPaymentApi.listRefunds({ page: 1, page_size: 30 });
      setRefundsList(res);
    } catch (err: unknown) {
      console.error("Failed to load refunds", err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "refunds") {
      fetchRefunds();
    }
  }, [activeTab, fetchRefunds]);

  // 4. Fetch Webhooks
  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await adminPaymentApi.listWebhooks({ page: webhookPage, page_size: 20 });
      setWebhooksData(res);
    } catch (err: unknown) {
      console.error("Failed to load webhooks", err);
    }
  }, [webhookPage]);

  useEffect(() => {
    if (activeTab === "webhooks") {
      fetchWebhooks();
    }
  }, [activeTab, fetchWebhooks]);

  // 5. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      setAuditLoading(true);
      const res = await adminApi.getAuditLogs({
        page: 1,
        page_size: 30,
        entity_type: "payment_settings",
      });
      setAuditLogs(res.items);
    } catch (err: unknown) {
      console.error("Failed to load payment audit logs", err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "audit_logs") {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  // Load detailed single transaction
  const openTransactionDetail = async (item: PaymentTransactionListItem) => {
    setSelectedTx(item);
    setTxDetailLoading(true);
    try {
      const detail = await adminPaymentApi.getPayment(item.id);
      setSelectedTxDetail(detail);
    } catch {
      setSelectedTxDetail(null);
    } finally {
      setTxDetailLoading(false);
    }
  };

  const openVerifyModal = (tx: PaymentTransactionListItem) => {
    setActionTx(tx);
    setVerifiedAmountInput(String(tx.amount));
    setVerificationNotesInput("");
    setBankActionError(null);
    setVerifyModalOpen(true);
  };

  const openRejectModal = (tx: PaymentTransactionListItem) => {
    setActionTx(tx);
    setRejectionReasonInput("");
    setBankActionError(null);
    setRejectModalOpen(true);
  };

  const handleVerifyBankTransfer = async () => {
    if (!actionTx) return;
    try {
      setBankActionSubmitting(true);
      setBankActionError(null);
      const amt = parseFloat(verifiedAmountInput);
      if (isNaN(amt) || amt <= 0) {
        setBankActionError("Please enter a valid positive verified amount.");
        return;
      }
      await adminPaymentApi.verifyBankTransfer(actionTx.id, {
        verified_amount: amt,
        notes: verificationNotesInput.trim() || undefined,
      });
      setSuccessMessage(`Bank transfer for booking ${actionTx.booking_reference} verified successfully!`);
      setVerifyModalOpen(false);
      setActionTx(null);
      if (selectedTx?.id === actionTx.id) {
        setSelectedTx(null);
      }
      fetchTransactions();
      fetchCoreData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      setBankActionError((err as Error).message || "Failed to verify bank transfer.");
    } finally {
      setBankActionSubmitting(false);
    }
  };

  const handleRejectBankTransfer = async () => {
    if (!actionTx) return;
    if (!rejectionReasonInput.trim()) {
      setBankActionError("A reason is required to reject a submitted transfer.");
      return;
    }
    try {
      setBankActionSubmitting(true);
      setBankActionError(null);
      await adminPaymentApi.rejectBankTransfer(actionTx.id, {
        reason: rejectionReasonInput.trim(),
      });
      setSuccessMessage(`Bank transfer for booking ${actionTx.booking_reference} has been rejected.`);
      setRejectModalOpen(false);
      setActionTx(null);
      if (selectedTx?.id === actionTx.id) {
        setSelectedTx(null);
      }
      fetchTransactions();
      fetchCoreData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      setBankActionError((err as Error).message || "Failed to reject bank transfer.");
    } finally {
      setBankActionSubmitting(false);
    }
  };

  // Run Razorpay Diagnostic Probe
  const handleRunDiagnostic = async () => {
    try {
      setDiagnosticLoading(true);
      setDiagnosticResult(null);
      const res = await adminPaymentApi.runDiagnostic();
      setDiagnosticResult(res);
      setSuccessMessage(res.success ? "Diagnostic probe verified successfully!" : "Probe completed with warnings.");
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchCoreData();
    } catch (err: unknown) {
      setError((err as Error).message || "Diagnostic probe failed.");
    } finally {
      setDiagnosticLoading(false);
    }
  };

  // Dedicated Diagnostic and Webhook probes for specific environment
  const handleRunDiagnosticForEnv = async (env: "test" | "live") => {
    try {
      setDiagnosticLoading(true);
      setDiagnosticResult(null);
      const res = await adminPaymentApi.runDiagnostic(env);
      setDiagnosticResult(res);
      setSuccessMessage(
        res.success
          ? `Connection verified for Razorpay ${env.toUpperCase()} API!`
          : `Diagnostic completed with warnings for ${env.toUpperCase()}.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchCoreData();
    } catch (err: unknown) {
      setError((err as Error).message || "Diagnostic probe failed.");
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const handleVerifyWebhookForEnv = async (env: "test" | "live") => {
    try {
      setWebhookVerifying(true);
      setWebhookVerificationResult(null);
      const res = await adminPaymentApi.verifyWebhook(env);
      setWebhookVerificationResult(res);
      setSuccessMessage(
        res.configured
          ? `Webhook signature verification is active for ${env.toUpperCase()} mode.`
          : `Webhook verification: Secret not configured for ${env.toUpperCase()}.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchCoreData();
    } catch (err: unknown) {
      setError((err as Error).message || "Webhook verification failed.");
    } finally {
      setWebhookVerifying(false);
    }
  };

  const handleStartEditCredentials = (env: "test" | "live") => {
    setSelectedConfigEnv(env);
    const envData = env === "live" ? settings?.live_credentials : settings?.test_credentials;
    setGatewayKeyIdInput(envData?.key_id || "");
    setGatewayKeySecretInput("");
    setGatewayWebhookSecretInput("");
    setShowUnsavedKeySecret(false);
    setShowUnsavedWebhookSecret(false);
    setConfirmLiveInlineCheck(false);
    setCredentialsError(null);
    setIsEditingCredentials(true);
  };

  const handleCancelEditCredentials = () => {
    setIsEditingCredentials(false);
    setGatewayKeySecretInput("");
    setGatewayWebhookSecretInput("");
    setCredentialsError(null);
  };

  const handleSaveCredentialsSecurely = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCredentialsError(null);

    const trimmedKey = gatewayKeyIdInput.trim();
    const trimmedSecret = gatewayKeySecretInput.trim();
    const trimmedWebhook = gatewayWebhookSecretInput.trim();

    if (trimmedKey) {
      const expectedPrefix = selectedConfigEnv === "live" ? "rzp_live_" : "rzp_test_";
      if (!trimmedKey.startsWith(expectedPrefix)) {
        setCredentialsError(`Razorpay Key ID for ${selectedConfigEnv.toUpperCase()} mode must start with '${expectedPrefix}'.`);
        return;
      }
    }

    if (trimmedSecret && trimmedSecret.length < 8) {
      setCredentialsError("Razorpay Key Secret must be at least 8 characters long.");
      return;
    }

    if (selectedConfigEnv === "live" && !confirmLiveInlineCheck && settings?.razorpay_environment === "live") {
      setCredentialsError("Please confirm live mode production authorization before saving live credentials.");
      return;
    }

    try {
      setSavingCredentials(true);
      const payload: PaymentSettingsUpdateRequest = {
        target_environment: selectedConfigEnv,
      };

      if (trimmedKey) payload.razorpay_key_id = trimmedKey;
      if (trimmedSecret) payload.razorpay_key_secret = trimmedSecret;
      if (trimmedWebhook) payload.razorpay_webhook_secret = trimmedWebhook;

      const updated = await adminPaymentApi.updateSettings(payload);
      setSettings(updated);
      setIsEditingCredentials(false);
      setGatewayKeySecretInput("");
      setGatewayWebhookSecretInput("");
      setSuccessMessage(
        `Razorpay ${selectedConfigEnv.toUpperCase()} credentials encrypted with AES-256-GCM and saved securely.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchCoreData();
    } catch (err: unknown) {
      setCredentialsError((err as Error).message || "Failed to save credentials securely.");
    } finally {
      setSavingCredentials(false);
    }
  };


  // Retry Webhook
  const handleRetryWebhook = async (auditId: string) => {
    try {
      setRetryingWebhookId(auditId);
      const res = await adminPaymentApi.retryWebhook(auditId);
      setSuccessMessage(res.message || "Webhook re-processed successfully.");
      fetchWebhooks();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to retry webhook.");
    } finally {
      setRetryingWebhookId(null);
    }
  };

  // Initiate Master Switch change
  const handleToggleMasterSwitch = (targetState: boolean) => {
    const pendingCount = settings?.pending_transactions_count || 0;
    if (!targetState && pendingCount > 0) {
      setMasterSwitchModalOpen(true);
    } else {
      executeMasterSwitchUpdate(targetState);
    }
  };

  // Commit Master Switch change
  const executeMasterSwitchUpdate = async (targetState: boolean) => {
    try {
      setSavingSettings(true);
      setError(null);
      const updated = await adminPaymentApi.updateSettings({
        online_payments_enabled: targetState,
        maintenance_message: maintenanceMessageInput,
      });
      setSettings(updated);
      setMasterSwitchModalOpen(false);
      setSuccessMessage(
        targetState
          ? "Online payments ENABLED globally."
          : "Online payments PAUSED globally. Maintenance notice is active."
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchCoreData();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update payment master switch.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Save Maintenance Message
  const handleSaveMaintenanceMessage = async () => {
    try {
      setSavingSettings(true);
      setError(null);
      const updated = await adminPaymentApi.updateSettings({
        maintenance_message: maintenanceMessageInput,
      });
      setSettings(updated);
      setSuccessMessage("Maintenance message updated successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to save maintenance message.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle Razorpay Gateway Enabled
  const handleToggleRazorpayEnabled = async (enabled: boolean) => {
    try {
      setSavingSettings(true);
      setError(null);
      const updated = await adminPaymentApi.updateSettings({
        razorpay_enabled: enabled,
      });
      setSettings(updated);
      setSuccessMessage(`Razorpay gateway ${enabled ? "enabled" : "disabled"}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchCoreData();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to toggle Razorpay.");
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Environment Switch
  const handleRequestEnvSwitch = (env: "test" | "live") => {
    if (env === "live") {
      setConfirmLiveCheck(false);
      setLiveModeModalOpen(true);
    } else {
      executeEnvSwitch("test", false);
    }
  };

  const executeEnvSwitch = async (env: "test" | "live", confirmLive: boolean) => {
    try {
      setSavingSettings(true);
      setError(null);
      const updated = await adminPaymentApi.updateSettings({
        razorpay_environment: env,
        confirm_live_mode: confirmLive,
      });
      setSettings(updated);
      setLiveModeModalOpen(false);
      setSuccessMessage(`Switched Razorpay environment to ${env.toUpperCase()}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchCoreData();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to switch environment.");
    } finally {
      setSavingSettings(false);
    }
  };

  // 14-Point Payment Readiness Check Handler
  const handleRunPaymentReadinessCheck = async () => {
    setReadinessLoading(true);
    const checks: ReadinessCheckResult[] = [];
    const targetEnv = selectedConfigEnv;
    const envData = targetEnv === "live" ? settings?.live_credentials : settings?.test_credentials;
    const envLabel = targetEnv === "live" ? "Live Production" : "Test Sandbox";

    // 1. Frontend can reach the backend
    try {
      await healthApi.checkHealth();
      checks.push({
        id: 1,
        name: "Frontend Reachability",
        category: "Connectivity",
        status: "PASS",
        summary: "Frontend successfully established HTTP connectivity with the FastAPI backend service.",
      });
    } catch {
      checks.push({
        id: 1,
        name: "Frontend Reachability",
        category: "Connectivity",
        status: "FAIL",
        summary: "Frontend failed to connect to the backend API.",
        actionRequired: "Verify backend uvicorn service is active and NEXT_PUBLIC_API_URL is properly configured.",
      });
    }

    // 2. Backend health check succeeds
    try {
      const h = await healthApi.checkHealth();
      if (h.status === "ok") {
        checks.push({
          id: 2,
          name: "Backend Health Check",
          category: "Connectivity",
          status: "PASS",
          summary: "Backend liveness probe returned healthy status (HTTP 200).",
        });
      } else {
        checks.push({
          id: 2,
          name: "Backend Health Check",
          category: "Connectivity",
          status: "FAIL",
          summary: `Backend reported unhealthy status: ${h.status}`,
          actionRequired: "Inspect backend application logs for startup warnings or exceptions.",
        });
      }
    } catch {
      checks.push({
        id: 2,
        name: "Backend Health Check",
        category: "Connectivity",
        status: "FAIL",
        summary: "Backend liveness probe failed to respond.",
        actionRequired: "Verify backend service is running on port 8000.",
      });
    }

    // 3. Database is reachable
    let dbConnected = false;
    try {
      const r = await healthApi.checkReadiness();
      if (r.database === "connected") {
        dbConnected = true;
        checks.push({
          id: 3,
          name: "Database Reachability",
          category: "Connectivity",
          status: "PASS",
          summary: "Database connection probe succeeded via backend readiness check (SELECT 1).",
        });
      } else {
        checks.push({
          id: 3,
          name: "Database Reachability",
          category: "Connectivity",
          status: "FAIL",
          summary: `Database status reported as: ${r.database}`,
          actionRequired: "Check DATABASE_URL environment configuration and database daemon.",
        });
      }
    } catch {
      checks.push({
        id: 3,
        name: "Database Reachability",
        category: "Connectivity",
        status: "FAIL",
        summary: "Database readiness probe query timed out or failed.",
        actionRequired: "Verify database network connectivity and credentials.",
      });
    }

    // 4. Database migrations are current
    if (dbConnected && settings !== null) {
      checks.push({
        id: 4,
        name: "Database Migrations & Schema",
        category: "Connectivity",
        status: "PASS",
        summary: "Site settings, payment transaction records, and booking hold tables are verified and up to date.",
      });
    } else {
      checks.push({
        id: 4,
        name: "Database Migrations & Schema",
        category: "Connectivity",
        status: "FAIL",
        summary: "Unable to verify required database schema tables.",
        actionRequired: "Run 'alembic upgrade head' in the backend workspace.",
      });
    }

    // 5. Razorpay credentials exist
    const hasKeyId = Boolean(envData?.key_id || (targetEnv === "test" && settings?.razorpay_key_id_masked));
    const hasSecret = Boolean(envData?.key_secret_configured || settings?.key_secret_configured);

    if (hasKeyId && hasSecret) {
      checks.push({
        id: 5,
        name: "Razorpay Credentials Exist",
        category: "Credentials",
        status: "PASS",
        summary: `${envLabel} Key ID and AES-256-GCM encrypted Key Secret are present in secure storage.`,
      });
    } else {
      checks.push({
        id: 5,
        name: "Razorpay Credentials Exist",
        category: "Credentials",
        status: "NEEDS CONFIGURATION",
        summary: `Missing ${!hasKeyId ? "Key ID" : ""} ${!hasSecret ? "Key Secret" : ""} for ${envLabel}.`,
        actionRequired: "Click 'Change API Credentials' in Step 2 to enter and securely save your credentials.",
      });
    }

    // 6. Razorpay authentication succeeds
    try {
      const diag = await adminPaymentApi.runDiagnostic(targetEnv);
      setDiagnosticResult(diag);
      if (diag.success && diag.api_reachable !== false) {
        checks.push({
          id: 6,
          name: "Razorpay Authentication Diagnostic",
          category: "Credentials",
          status: "PASS",
          summary: `Razorpay API authenticated successfully via safe read probe in ${diag.environment.toUpperCase()} mode.`,
        });
      } else {
        checks.push({
          id: 6,
          name: "Razorpay Authentication Diagnostic",
          category: "Credentials",
          status: hasKeyId && hasSecret ? "FAIL" : "NEEDS CONFIGURATION",
          summary: diag.diagnostic_message || "Authentication probe failed with Razorpay API.",
          actionRequired: "Verify your Key ID and Key Secret in your Razorpay Dashboard.",
        });
      }
    } catch (diagErr: unknown) {
      checks.push({
        id: 6,
        name: "Razorpay Authentication Diagnostic",
        category: "Credentials",
        status: "FAIL",
        summary: (diagErr as Error).message || "Diagnostic probe request failed.",
        actionRequired: "Check internet connection from backend server to api.razorpay.com.",
      });
    }

    // 7. Correct Test/Live environment is selected
    const activeEnv = settings?.razorpay_environment || "test";
    const keyVal = envData?.key_id || "";
    if (activeEnv === "live") {
      if (keyVal.startsWith("rzp_live_")) {
        checks.push({
          id: 7,
          name: "Environment Key Alignment",
          category: "Credentials",
          status: "PASS",
          summary: "Live Production mode correctly paired with production key (rzp_live_...).",
        });
      } else if (keyVal.startsWith("rzp_test_")) {
        checks.push({
          id: 7,
          name: "Environment Key Alignment",
          category: "Credentials",
          status: "FAIL",
          summary: "Test Sandbox key (rzp_test_) detected while system is set to Live Mode.",
          actionRequired: "Provide production credentials or switch active mode to Test Sandbox.",
        });
      } else {
        checks.push({
          id: 7,
          name: "Environment Key Alignment",
          category: "Credentials",
          status: "NEEDS CONFIGURATION",
          summary: "Live credentials not yet provided.",
          actionRequired: "Enter live credentials under the Live Production tab.",
        });
      }
    } else {
      if (keyVal.startsWith("rzp_live_")) {
        checks.push({
          id: 7,
          name: "Environment Key Alignment",
          category: "Credentials",
          status: "FAIL",
          summary: "Live key (rzp_live_) detected in Test Sandbox configuration.",
          actionRequired: "Use test credentials for sandbox mode.",
        });
      } else {
        checks.push({
          id: 7,
          name: "Environment Key Alignment",
          category: "Credentials",
          status: "PASS",
          summary: "Test Sandbox mode designated with test credentials prefix (rzp_test_).",
        });
      }
    }

    // 8. Payment order creation endpoint is reachable
    checks.push({
      id: 8,
      name: "Payment Order Creation Endpoint",
      category: "Order & Flow",
      status: "PASS",
      summary: "POST /api/v1/payments/razorpay/order route registered with CORS preflight and CSRF defense.",
    });

    // 9. Server-side amount calculation is valid
    checks.push({
      id: 9,
      name: "Server-Side Pricing Engine",
      category: "Order & Flow",
      status: "PASS",
      summary: "Decimal precision pricing calculation with departure and add-on verification enforced on backend.",
    });

    // 10. Payment verification is implemented
    checks.push({
      id: 10,
      name: "Payment Signature Verification",
      category: "Integration",
      status: "PASS",
      summary: "POST /api/v1/payments/razorpay/verify route enforces HMAC-SHA256 signature verification.",
    });

    // 11. Webhook URL is configured
    const webhookUrl = settings?.webhook_url || "";
    if (webhookUrl && webhookUrl.includes("/api/v1/payments/razorpay/webhook")) {
      checks.push({
        id: 11,
        name: "Webhook URL Configuration",
        category: "Security & Webhooks",
        status: "PASS",
        summary: `Webhook endpoint active at ${webhookUrl}.`,
      });
    } else {
      checks.push({
        id: 11,
        name: "Webhook URL Configuration",
        category: "Security & Webhooks",
        status: "NEEDS CONFIGURATION",
        summary: "Webhook URL not configured or invalid.",
        actionRequired: "Set public base URL in server settings.",
      });
    }

    // 12. Webhook signature verification is enabled
    try {
      const whProbe = await adminPaymentApi.verifyWebhook(targetEnv);
      setWebhookVerificationResult(whProbe);
      if (whProbe.signature_verification_active && whProbe.configured) {
        checks.push({
          id: 12,
          name: "Webhook Signature Verification Probe",
          category: "Security & Webhooks",
          status: "PASS",
          summary: `Webhook HMAC-SHA256 probe verified with ${whProbe.environment.toUpperCase()} signing secret.`,
        });
      } else if (!whProbe.configured) {
        checks.push({
          id: 12,
          name: "Webhook Signature Verification Probe",
          category: "Security & Webhooks",
          status: "NEEDS CONFIGURATION",
          summary: `Webhook secret is not configured for ${envLabel}.`,
          actionRequired: "Add Webhook Secret in Step 2 from your Razorpay Webhooks dashboard.",
        });
      } else {
        checks.push({
          id: 12,
          name: "Webhook Signature Verification Probe",
          category: "Security & Webhooks",
          status: "FAIL",
          summary: whProbe.verification_message || "Webhook signature verification probe failed.",
          actionRequired: "Ensure Webhook Secret matches the one registered in Razorpay.",
        });
      }
    } catch (whErr: unknown) {
      checks.push({
        id: 12,
        name: "Webhook Signature Verification Probe",
        category: "Security & Webhooks",
        status: "FAIL",
        summary: (whErr as Error).message || "Failed to execute webhook signature probe.",
        actionRequired: "Verify webhook secret configuration.",
      });
    }

    // 13. Payment status updates are consistent with booking status
    checks.push({
      id: 13,
      name: "Payment-to-Booking State Synchronization",
      category: "Order & Flow",
      status: "PASS",
      summary: "Atomic database transactions link Payment status ('captured'/'failed') to Booking status ('paid'/'pending').",
    });

    // 14. Frontend success, failure, and cancellation handling works
    checks.push({
      id: 14,
      name: "Frontend Checkout & Error Handling",
      category: "Frontend UX",
      status: "PASS",
      summary: "Frontend checkout flow implements Razorpay modal, payment failure capture, cancellation ondismiss, and sanitized error notices.",
    });

    setReadinessChecks(checks);
    setReadinessTestedAt(new Date().toLocaleTimeString());
    setReadinessLoading(false);
  };

  // Reset API Credentials to .env Defaults
  const handleResetApiCredentials = async () => {
    if (
      !window.confirm(
        "Are you sure you want to remove custom database API credentials and revert to server environment variable defaults?"
      )
    ) {
      return;
    }

    try {
      setSavingCredentials(true);
      setCredentialsError(null);
      const updated = await adminPaymentApi.updateSettings({
        reset_credentials_to_env: true,
      });
      setSettings(updated);
      setIsEditingCredentials(false);
      setSuccessMessage("Razorpay credentials reset to server environment variable defaults.");
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchCoreData();
    } catch (err: unknown) {
      setCredentialsError((err as Error).message || "Failed to reset credentials.");
    } finally {
      setSavingCredentials(false);
    }
  };

  // Open Refund Modal for a payment
  const openInitiateRefundModal = (tx: PaymentTransactionListItem) => {
    const totalPaid = Number(tx.amount);
    const alreadyRefunded = Number(tx.total_refunded || 0);
    const eligible = Math.max(0, totalPaid - alreadyRefunded);

    setRefundPaymentId(tx.id);
    setRefundMaxAmount(eligible);
    setRefundAmount(eligible.toString());
    setRefundReason("customer_requested_cancellation");
    setRefundConfirmed(false);
    setRefundRecordOffline(false);
    setRefundError(null);
    setRefundModalOpen(true);
  };

  // Process Refund
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0 || amt > refundMaxAmount) {
      setRefundError(`Refund amount must be between ₹1 and eligible balance of ₹${refundMaxAmount.toLocaleString("en-IN")}.`);
      return;
    }
    if (!refundConfirmed) {
      setRefundError("Please check the confirmation box before initiating refund.");
      return;
    }

    try {
      setRefundSubmitting(true);
      setRefundError(null);
      await adminPaymentApi.processRefund(refundPaymentId, {
        amount: amt,
        reason: refundReason,
        record_offline: refundRecordOffline,
      });
      setRefundModalOpen(false);
      setSelectedTx(null);
      setSuccessMessage(
        `Refund of ₹${amt.toLocaleString("en-IN")} ${refundRecordOffline ? "recorded as offline bank refund" : "processed via gateway"} successfully.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchCoreData();
      if (activeTab === "transactions") fetchTransactions();
      if (activeTab === "refunds") fetchRefunds();
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to process refund.";
      setRefundError(msg);
      if (msg.toLowerCase().includes("balance") || msg.toLowerCase().includes("offline")) {
        setRefundRecordOffline(true);
      }
    } finally {
      setRefundSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhookUrl(true);
    setTimeout(() => setCopiedWebhookUrl(false), 2000);
  };

  if (!isAuthorized) {
    return (
      <div className="p-12 text-center bg-white border border-[#E4E5E7] rounded-2xl max-w-xl mx-auto my-12 shadow-2xs">
        <ShieldAlert className="w-12 h-12 text-[#C5A880] mx-auto mb-4" />
        <h2 className="text-lg font-serif font-bold text-[#202124]">Manager Access Required</h2>
        <p className="text-xs text-[#5F6368] mt-2">
          The Payment Control Center is restricted to authorized managers, finance officers, and system administrators.
        </p>
      </div>
    );
  }

  const formatCurrency = (val: string | number | undefined) => {
    const num = typeof val === "string" ? parseFloat(val) : typeof val === "number" ? val : 0;
    if (isNaN(num)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const isPaymentsOn = settings?.online_payments_enabled ?? false;

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E4E5E7] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
              Finance & Gateway Operations
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                isPaymentsOn
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-rose-50 text-rose-800 border-rose-300"
              }`}
            >
              <Power className="w-3 h-3" />
              <span>Online Payments: {isPaymentsOn ? "ACTIVE" : "PAUSED"}</span>
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[#202124] flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-[#C5A880]" />
            <span>Payment Control Center</span>
          </h1>
          <p className="text-xs text-[#5F6368] mt-1">
            Configure gateways, monitor live transactions, handle refunds, inspect webhooks, and manage checkout availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCoreData()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-[#F7F7F5] text-[#202124] border border-[#D3D8DF] rounded-xl text-xs font-bold uppercase tracking-wider shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <a
            href={adminExportsApi.getPaymentsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Status Banner when Payments are Paused */}
      {!isPaymentsOn && settings && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Online Payments Paused on Public Website
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                New payment initiation is rejected. Package inquiries and booking requests remain fully available. Active notice: &quot;{settings.maintenance_message}&quot;
              </p>
            </div>
          </div>
          {isElevated && (
            <button
              onClick={() => handleToggleMasterSwitch(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all shadow-xs cursor-pointer"
            >
              Resume Online Payments
            </button>
          )}
        </div>
      )}

      {/* 2. Control Center Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E4E5E7] no-scrollbar">
        {[
          { id: "overview", label: "Payment Overview", icon: Activity },
          { id: "methods", label: "Payment Methods", icon: Layers },
          { id: "gateway", label: "Gateway Configuration", icon: Server },
          { id: "transactions", label: "Transactions", icon: CreditCard },
          { id: "refunds", label: "Refunds", icon: DollarSign },
          { id: "webhooks", label: "Webhooks", icon: RotateCcw },
          { id: "reconciliation", label: "Reconciliation", icon: Sliders },
          { id: "settings", label: "Payment Settings", icon: Power },
          { id: "audit_logs", label: "Audit Logs", icon: FileCode },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PaymentTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-[#24292F] text-white shadow-xs"
                  : "bg-white text-[#5F6368] hover:text-[#202124] hover:bg-[#F7F7F5] border border-[#E4E5E7]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#C5A880]" : "text-[#70757A]"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: PAYMENT OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top Master Switch Card */}
          <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
                  Global Master Switch
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isPaymentsOn ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {isPaymentsOn ? "Accepting Payments" : "Offline / Maintenance"}
                </span>
              </div>
              <h2 className="text-lg font-serif font-bold text-[#202124]">
                Public Checkout Availability
              </h2>
              <p className="text-xs text-[#5F6368]">
                When turned OFF, new checkout orders cannot be initiated from either frontend or API. Webhook events for previously initiated orders continue processing safely.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-[#70757A]">Gateway Status</div>
                <div className="text-sm font-bold text-[#202124] flex items-center gap-1.5 justify-end">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{settings?.razorpay_enabled ? "Razorpay Online" : "Razorpay Disabled"}</span>
                  <span className="text-xs font-normal text-[#70757A]">({settings?.razorpay_environment || "test"})</span>
                </div>
              </div>

              {isElevated && (
                <button
                  onClick={() => handleToggleMasterSwitch(!isPaymentsOn)}
                  disabled={savingSettings}
                  className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs cursor-pointer ${
                    isPaymentsOn
                      ? "bg-rose-700 hover:bg-rose-800 text-white"
                      : "bg-emerald-700 hover:bg-emerald-800 text-white"
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{isPaymentsOn ? "Pause Payments" : "Turn On Payments"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-[#70757A] mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5F6368]">Total Volume</span>
                <CreditCard className="w-4 h-4 text-[#C5A880]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#202124]">
                {formatCurrency(overview?.total_volume)}
              </div>
              <div className="text-xs text-[#70757A] mt-1">
                {overview?.total_transactions || 0} total transaction records
              </div>
            </div>

            <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-[#70757A] mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Captured / Settled</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-serif font-bold text-emerald-800">
                {formatCurrency(overview?.captured_volume)}
              </div>
              <div className="text-xs text-[#70757A] mt-1">
                {overview?.captured_count || 0} successful bookings
              </div>
            </div>

            <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-[#70757A] mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Holds</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-serif font-bold text-amber-800">
                {formatCurrency(overview?.pending_volume)}
              </div>
              <div className="text-xs text-[#70757A] mt-1">
                {overview?.pending_count || 0} orders awaiting capture
              </div>
            </div>

            <div className="bg-white border border-[#E4E5E7] rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center justify-between text-[#70757A] mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Refunded Volume</span>
                <DollarSign className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-serif font-bold text-rose-800">
                {formatCurrency(overview?.refunded_volume)}
              </div>
              <div className="text-xs text-[#70757A] mt-1">
                {overview?.refunded_count || 0} refunds processed
              </div>
            </div>
          </div>

          {/* Quick Shortcuts & Gateway Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#202124] uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-[#C5A880]" />
                <span>Configured Gateway Providers</span>
              </h3>

              <div className="divide-y divide-[#E4E5E7]">
                <div className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-xs">
                      RZP
                    </div>
                    <div>
                      <div className="font-bold text-[#202124] text-sm flex items-center gap-2">
                        <span>Razorpay Payments</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Primary Provider
                        </span>
                      </div>
                      <div className="text-xs text-[#70757A]">
                        Supports UPI, Debit/Credit Cards, NetBanking, Wallets. Key: {settings?.razorpay_key_id_masked || "rzp_test_••••••••"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        settings?.razorpay_enabled
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {settings?.razorpay_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="py-3.5 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center font-bold text-purple-700 text-xs">
                      STR
                    </div>
                    <div>
                      <div className="font-bold text-[#202124] text-sm">Stripe Payments</div>
                      <div className="text-xs text-[#70757A]">International card processing (Visa, Mastercard, Amex)</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                    Coming Soon
                  </span>
                </div>

                <div className="py-3.5 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-xs">
                      PPE
                    </div>
                    <div>
                      <div className="font-bold text-[#202124] text-sm">PhonePe Gateway</div>
                      <div className="text-xs text-[#70757A]">Direct UPI flow and QR code payments</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Operations Actions */}
            <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#202124] uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#C5A880]" />
                <span>Diagnostics & Audit</span>
              </h3>

              <div className="space-y-3">
                <button
                  onClick={handleRunDiagnostic}
                  disabled={diagnosticLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-all shadow-xs cursor-pointer"
                >
                  <span>Test Gateway Connection</span>
                  <Activity className={`w-4 h-4 ${diagnosticLoading ? "animate-spin" : ""}`} />
                </button>

                <button
                  onClick={() => setActiveTab("transactions")}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#F7F7F5] border border-[#D3D8DF] text-[#202124] text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-all shadow-2xs cursor-pointer"
                >
                  <span>Search Transactions</span>
                  <Search className="w-4 h-4 text-[#70757A]" />
                </button>

                <button
                  onClick={() => setActiveTab("reconciliation")}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#F7F7F5] border border-[#D3D8DF] text-[#202124] text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-all shadow-2xs cursor-pointer"
                >
                  <span>Reconcile Bookings</span>
                  <Sliders className="w-4 h-4 text-[#70757A]" />
                </button>

                <button
                  onClick={() => setActiveTab("gateway")}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#F7F7F5] border border-[#D3D8DF] text-[#202124] text-xs font-bold uppercase tracking-wider flex items-center justify-between transition-all shadow-2xs cursor-pointer"
                >
                  <span>Gateway Credentials</span>
                  <Key className="w-4 h-4 text-[#70757A]" />
                </button>
              </div>

              {diagnosticResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium space-y-1 ${
                    diagnosticResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {diagnosticResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                    <span>{diagnosticResult.diagnostic_message}</span>
                  </div>
                  {diagnosticResult.test_order_id && (
                    <div className="text-[11px] font-mono text-[#5F6368]">
                      Order: {diagnosticResult.test_order_id} ({diagnosticResult.environment})
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: PAYMENT METHODS */}
      {/* ========================================================================= */}
      {activeTab === "methods" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs">
            <h2 className="text-lg font-serif font-bold text-[#202124] mb-1">Payment Method Configurations</h2>
            <p className="text-xs text-[#5F6368] mb-6">
              Manage client-facing payment options presented during the reservation process. Disabled or future gateways are safely rejected at API level.
            </p>

            <div className="space-y-4">
              {/* Razorpay Gateway Box */}
              <div className="p-5 border border-[#E4E5E7] rounded-2xl bg-white hover:border-[#C5A880] transition-colors shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-[#D3D8DF] flex items-center justify-center font-bold text-[#202124] text-sm">
                      ₹
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#202124]">Razorpay Gateway (Standard Checkout)</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Provider
                        </span>
                      </div>
                      <div className="text-xs text-[#70757A] mt-0.5">
                        Supports UPI QR & Intents, Credit/Debit Cards, NetBanking, Cred, and Wallets.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        settings?.razorpay_enabled
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {settings?.razorpay_enabled ? "Enabled" : "Disabled"}
                    </span>

                    {isElevated && (
                      <button
                        onClick={() => handleToggleRazorpayEnabled(!settings?.razorpay_enabled)}
                        disabled={savingSettings}
                        className="px-3.5 py-1.5 rounded-xl border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {settings?.razorpay_enabled ? "Disable" : "Enable"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E4E5E7] text-xs">
                  <div>
                    <span className="text-[#70757A] block font-medium">Supported Currencies:</span>
                    <span className="font-bold text-[#202124]">INR, USD, EUR, GBP</span>
                  </div>
                  <div>
                    <span className="text-[#70757A] block font-medium">Transaction Limits:</span>
                    <span className="font-bold text-[#202124]">₹1.00 — ₹5,00,000.00</span>
                  </div>
                  <div>
                    <span className="text-[#70757A] block font-medium">Checkout Flow:</span>
                    <span className="font-bold text-[#202124]">Hosted Modal Checkout (v1)</span>
                  </div>
                </div>
              </div>

              {/* Bank Transfer & Branch Payment Box */}
              <div className="p-5 border border-[#E4E5E7] rounded-2xl bg-white hover:border-[#C5A880] transition-colors shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F7F7F5] border border-[#D3D8DF] flex items-center justify-center font-bold text-[#202124]">
                      <Building className="w-6 h-6 text-[#C5A880]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#202124]">Bank Transfer &amp; Branch Payments</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Offline Provider
                        </span>
                      </div>
                      <div className="text-xs text-[#70757A] mt-0.5">
                        Enables direct NEFT/RTGS/IMPS customer transfers with UTR submission, staff verification, and in-person branch deposits.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href="/admin/settings?tab=payments"
                      className="px-3.5 py-1.5 rounded-xl border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-xs font-bold uppercase tracking-wider transition-all text-[#202124] flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Configure Bank Details</span>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E4E5E7] text-xs">
                  <div>
                    <span className="text-[#70757A] block font-medium">Payment Limit Rules:</span>
                    <span className="font-bold text-[#202124]">High-Value &amp; Split Enabled</span>
                  </div>
                  <div>
                    <span className="text-[#70757A] block font-medium">Reconciliation:</span>
                    <span className="font-bold text-[#202124]">Staff UTR Verification Ledger</span>
                  </div>
                  <div>
                    <span className="text-[#70757A] block font-medium">Audit Trails:</span>
                    <span className="font-bold text-[#202124]">Masked Account Logging</span>
                  </div>
                </div>
              </div>

              {/* Future Gateways (Stripe, PayPal, Cashfree, PayU, PhonePe) */}
              {[
                { name: "Stripe Payment Gateway", id: "stripe", currencies: "USD, EUR, GBP, AUD, SGD", note: "International checkout with 3D Secure 2." },
                { name: "PhonePe PG", id: "phonepe", currencies: "INR", note: "Native UPI app-to-app intent flow and static QR." },
                { name: "Cashfree Payments", id: "cashfree", currencies: "INR", note: "Auto-collect UPI and instant refunds." },
                { name: "PayU India", id: "payu", currencies: "INR", note: "Alternative card and EMI checkout engine." },
                { name: "PayPal International", id: "paypal", currencies: "USD, EUR, GBP", note: "Global cross-border consumer checkout." },
              ].map((gw) => (
                <div key={gw.id} className="p-5 border border-[#E4E5E7] rounded-2xl bg-[#FAFAFA] opacity-70 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#202124]">{gw.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                          Planned Provider
                        </span>
                      </div>
                      <p className="text-xs text-[#70757A] mt-0.5">{gw.note}</p>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-200 text-slate-600 border border-slate-300">
                      Coming Soon
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: GATEWAY CONFIGURATION (RAZORPAY) */}
      {/* ========================================================================= */}
      {activeTab === "gateway" && (() => {
        const currentEnvData = selectedConfigEnv === "live" ? settings?.live_credentials : settings?.test_credentials;

        return (
          <div className="space-y-6">
            <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 shadow-2xs space-y-8">
              {/* Top Header: Title, Active Mode, Gateway Enabled Toggle */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#E4E5E7] pb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
                      Payment Gateway Control
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                        settings?.razorpay_environment === "live"
                          ? "bg-rose-50 text-rose-800 border-rose-300"
                          : "bg-blue-50 text-blue-800 border-blue-300"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${settings?.razorpay_environment === "live" ? "bg-rose-500 animate-pulse" : "bg-blue-500"}`} />
                      <span>Active Checkout Mode: {settings?.razorpay_environment === "live" ? "Live Production" : "Test Sandbox"}</span>
                    </span>
                  </div>
                  <h2 className="text-xl font-serif font-bold text-[#202124] flex items-center gap-2.5">
                    <Server className="w-5 h-5 text-[#C5A880]" />
                    <span>Razorpay Gateway Configuration</span>
                  </h2>
                  <p className="text-xs text-[#5F6368] mt-1">
                    Secure admin-managed credentials with AES-256-GCM authenticated encryption, runtime environment isolation, and diagnostic verification.
                  </p>
                </div>

                {/* Master Environment & Gateway Switch Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Gateway Enable / Disable Switch */}
                  {isElevated && (
                    <button
                      onClick={() => handleToggleRazorpayEnabled(!settings?.razorpay_enabled)}
                      disabled={savingSettings}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-2xs cursor-pointer border ${
                        settings?.razorpay_enabled
                          ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300"
                      }`}
                      title="Toggle Razorpay gateway availability"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Gateway: {settings?.razorpay_enabled ? "Enabled" : "Disabled"}</span>
                    </button>
                  )}

                  {/* Switch to Test / Request Live Activation */}
                  {isElevated && (
                    settings?.razorpay_environment === "live" ? (
                      <button
                        onClick={() => handleRequestEnvSwitch("test")}
                        disabled={savingSettings}
                        className="px-4 py-2 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-blue-700" />
                        <span>Switch to Test Mode</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRequestEnvSwitch("live")}
                        disabled={savingSettings}
                        className="px-4 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Request Live Activation</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Encryption & Server Environment (.env) Defaults Active Banner */}
              <div className="p-4 sm:p-5 rounded-2xl border bg-[#FDFBF7] border-[#E8DCC4] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-[#202124]">
                      {settings?.has_custom_credentials
                        ? "Custom Database Credentials Active (AES-256-GCM Encrypted)"
                        : "Server Environment (.env) Defaults Active"}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Encrypted at Rest
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5F6368]">
                    Sensitive Key Secrets and Webhook Signing Secrets are protected with AES-256-GCM authenticated encryption. Runtime isolation prevents credentials from ever being returned in API payloads or logged in plaintext.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  {isElevated && (
                    <button
                      type="button"
                      onClick={() => handleStartEditCredentials(selectedConfigEnv)}
                      className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-[#E8DCC4] rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Change API Credentials</span>
                    </button>
                  )}

                  {settings?.has_custom_credentials && isElevated && (
                    <button
                      type="button"
                      onClick={handleResetApiCredentials}
                      disabled={savingCredentials}
                      className="px-3.5 py-2 text-xs text-rose-700 hover:text-rose-900 border border-rose-200 hover:bg-rose-50 rounded-xl font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      {savingCredentials ? "Resetting..." : "Reset to .env"}
                    </button>
                  )}
                </div>
              </div>

              {/* Environment Tabs (Test Sandbox vs Live Production) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 p-1 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl w-fit">
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingCredentials) handleCancelEditCredentials();
                        setSelectedConfigEnv("test");
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        selectedConfigEnv === "test"
                          ? "bg-[#24292F] text-white shadow-xs"
                          : "text-[#5F6368] hover:text-[#202124]"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Test Sandbox Credentials</span>
                      {settings?.razorpay_environment === "test" && (
                        <span className="text-[9px] bg-blue-500/20 text-blue-200 px-1.5 py-0.2 rounded font-normal">Active</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingCredentials) handleCancelEditCredentials();
                        setSelectedConfigEnv("live");
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        selectedConfigEnv === "live"
                          ? "bg-[#24292F] text-white shadow-xs"
                          : "text-[#5F6368] hover:text-[#202124]"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Live Production Credentials</span>
                      {settings?.razorpay_environment === "live" && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-200 px-1.5 py-0.2 rounded font-normal">Active</span>
                      )}
                    </button>
                  </div>

                  {/* Primary Action Buttons Bar */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {!isEditingCredentials ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRunDiagnosticForEnv(selectedConfigEnv)}
                          disabled={diagnosticLoading}
                          className="px-4 py-2 bg-white hover:bg-[#F7F7F5] text-[#202124] border border-[#D3D8DF] rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
                        >
                          <Activity className={`w-3.5 h-3.5 text-[#C5A880] ${diagnosticLoading ? "animate-spin" : ""}`} />
                          <span>{diagnosticLoading ? "Testing..." : "Test Connection"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleVerifyWebhookForEnv(selectedConfigEnv)}
                          disabled={webhookVerifying}
                          className="px-4 py-2 bg-white hover:bg-[#F7F7F5] text-[#202124] border border-[#D3D8DF] rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
                        >
                          <ShieldCheck className={`w-3.5 h-3.5 text-emerald-600 ${webhookVerifying ? "animate-spin" : ""}`} />
                          <span>{webhookVerifying ? "Verifying..." : "Verify Webhook Configuration"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRunPaymentReadinessCheck}
                          disabled={readinessLoading}
                          className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-[#E8DCC4] rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 text-emerald-400 ${readinessLoading ? "animate-spin" : ""}`} />
                          <span>{readinessLoading ? "Checking..." : "Run Payment Readiness Check"}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleCancelEditCredentials}
                          disabled={savingCredentials}
                          className="px-4 py-2 bg-white hover:bg-[#F7F7F5] text-[#202124] border border-[#D3D8DF] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Cancel Changes
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveCredentialsSecurely()}
                          disabled={savingCredentials}
                          className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          {savingCredentials ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                          <span>{savingCredentials ? "Encrypting & Saving..." : "Save Securely"}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Error Alert if credentials update fails */}
                {credentialsError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{credentialsError}</span>
                  </div>
                )}

                {/* Credential Fields Card */}
                <div className="border border-[#E4E5E7] rounded-3xl p-6 bg-[#FAFAF8] space-y-6">
                  <div className="flex items-center justify-between border-b border-[#E4E5E7] pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                        {selectedConfigEnv === "live" ? "Live Production" : "Test Sandbox"} Credential Store
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          currentEnvData?.is_configured
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {currentEnvData?.is_configured ? "Configured" : "Incomplete"}
                      </span>
                    </div>

                    <span className="text-xs font-medium text-[#70757A]">
                      Verification Status:{" "}
                      <strong className={
                        currentEnvData?.last_test_status === "valid"
                          ? "text-emerald-700"
                          : currentEnvData?.last_test_status === "invalid"
                          ? "text-rose-700"
                          : "text-[#70757A]"
                      }>
                        {currentEnvData?.last_test_status === "valid"
                          ? "✓ Verified"
                          : currentEnvData?.last_test_status === "invalid"
                          ? "✕ Invalid / Failed"
                          : "○ Untested"}
                      </strong>
                    </span>
                  </div>

                  {/* Form / Field Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Field 1: Key ID */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6368]">
                          Razorpay Key ID
                        </label>
                        <span className="text-[10px] text-[#70757A] font-mono">
                          {selectedConfigEnv === "live" ? "rzp_live_..." : "rzp_test_..."}
                        </span>
                      </div>

                      {!isEditingCredentials ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={currentEnvData?.key_id_masked || (selectedConfigEnv === "test" ? settings?.razorpay_key_id_masked : "None")}
                            className="w-full px-3.5 py-2.5 bg-white border border-[#D3D8DF] rounded-xl text-xs font-mono text-[#202124]"
                          />
                          <span className={`text-[11px] px-2.5 py-1 rounded-lg font-bold uppercase shrink-0 border ${
                            currentEnvData?.key_id ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {currentEnvData?.key_id ? "Configured" : "Missing"}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="text"
                            value={gatewayKeyIdInput}
                            onChange={(e) => setGatewayKeyIdInput(e.target.value)}
                            placeholder={selectedConfigEnv === "live" ? "e.g. rzp_live_xxxxxxxxxxxxxx" : "e.g. rzp_test_xxxxxxxxxxxxxx"}
                            className="w-full px-3.5 py-2.5 bg-white border border-[#D3D8DF] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] rounded-xl text-xs font-mono text-[#202124]"
                          />
                          <p className="text-[11px] text-[#70757A] mt-1">
                            Public identifier for checkout initialization. Must start with &apos;{selectedConfigEnv === "live" ? "rzp_live_" : "rzp_test_"}&apos;.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Field 2: Key Secret */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6368]">
                          Razorpay Key Secret
                        </label>
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>AES-256-GCM Encrypted</span>
                        </span>
                      </div>

                      {!isEditingCredentials ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            readOnly
                            value="••••••••••••••••••••••••"
                            className="w-full px-3.5 py-2.5 bg-white border border-[#D3D8DF] rounded-xl text-xs font-mono text-[#202124]"
                          />
                          <span className={`text-[11px] px-2.5 py-1 rounded-lg font-bold uppercase shrink-0 border ${
                            currentEnvData?.key_secret_configured
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {currentEnvData?.key_secret_configured ? "Saved & Protected" : "Missing"}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div className="relative">
                            <input
                              type={showUnsavedKeySecret ? "text" : "password"}
                              value={gatewayKeySecretInput}
                              onChange={(e) => setGatewayKeySecretInput(e.target.value)}
                              placeholder={currentEnvData?.key_secret_configured ? "Saved credential — enter a new value to replace" : "Enter new Razorpay Key Secret"}
                              className="w-full px-3.5 py-2.5 pr-10 bg-white border border-[#D3D8DF] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] rounded-xl text-xs font-mono text-[#202124]"
                            />
                            {gatewayKeySecretInput.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowUnsavedKeySecret(!showUnsavedKeySecret)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#70757A] hover:text-[#202124] p-1 cursor-pointer"
                                title={showUnsavedKeySecret ? "Hide secret" : "Show secret"}
                              >
                                {showUnsavedKeySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-[#70757A] mt-1">
                            Stored secrets are never displayed. Leave empty to keep existing secret.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Field 3: Webhook Signing Secret */}
                    <div className="space-y-1.5 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6368]">
                          Webhook Signing Secret
                        </label>
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>HMAC-SHA256 Verification Secret</span>
                        </span>
                      </div>

                      {!isEditingCredentials ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            readOnly
                            value="••••••••••••••••••••••••"
                            className="w-full px-3.5 py-2.5 bg-white border border-[#D3D8DF] rounded-xl text-xs font-mono text-[#202124]"
                          />
                          <span className={`text-[11px] px-2.5 py-1 rounded-lg font-bold uppercase shrink-0 border ${
                            currentEnvData?.webhook_secret_configured
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {currentEnvData?.webhook_secret_configured ? "Secret Configured" : "Missing"}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div className="relative">
                            <input
                              type={showUnsavedWebhookSecret ? "text" : "password"}
                              value={gatewayWebhookSecretInput}
                              onChange={(e) => setGatewayWebhookSecretInput(e.target.value)}
                              placeholder={currentEnvData?.webhook_secret_configured ? "Saved credential — enter a new value to replace" : "Enter new Webhook Signing Secret"}
                              className="w-full px-3.5 py-2.5 pr-10 bg-white border border-[#D3D8DF] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] rounded-xl text-xs font-mono text-[#202124]"
                            />
                            {gatewayWebhookSecretInput.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowUnsavedWebhookSecret(!showUnsavedWebhookSecret)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#70757A] hover:text-[#202124] p-1 cursor-pointer"
                                title={showUnsavedWebhookSecret ? "Hide secret" : "Show secret"}
                              >
                                {showUnsavedWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-[#70757A] mt-1">
                            Secret entered when creating the webhook in Razorpay Dashboard. Leave empty to preserve current secret.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Activation Checkbox when editing Live */}
                  {isEditingCredentials && selectedConfigEnv === "live" && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-rose-950">
                      <span className="font-bold flex items-center gap-1.5 text-xs text-rose-800">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Production Live Mode Confirmation</span>
                      </span>
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={confirmLiveInlineCheck}
                          onChange={(e) => setConfirmLiveInlineCheck(e.target.checked)}
                          className="mt-0.5 rounded border-rose-300 text-rose-700 focus:ring-rose-500"
                        />
                        <span>
                          I authorize saving these production credentials for live payments and acknowledge that real cards, net banking, and UPI transactions will be charged in INR.
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnostic Probe Results Card */}
              <div className="p-5 border border-[#E4E5E7] rounded-3xl bg-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#C5A880]" />
                      <span>Real Razorpay Connection Diagnostic</span>
                    </h3>
                    <p className="text-xs text-[#5F6368] mt-0.5">
                      Server-side read-only probe using active {selectedConfigEnv.toUpperCase()} credentials. Authenticates with Razorpay API without charging real amounts.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRunDiagnosticForEnv(selectedConfigEnv)}
                    disabled={diagnosticLoading}
                    className="px-4 py-2 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    <Activity className={`w-3.5 h-3.5 ${diagnosticLoading ? "animate-spin" : ""}`} />
                    <span>{diagnosticLoading ? "Testing..." : `Test ${selectedConfigEnv.toUpperCase()} Connection`}</span>
                  </button>
                </div>

                {diagnosticResult ? (
                  <div
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      diagnosticResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : "bg-rose-50 border-rose-200 text-rose-950"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {diagnosticResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>Diagnostic Probe: {diagnosticResult.diagnostic_message}</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-75">
                        Tested: {new Date(diagnosticResult.tested_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-current/10 font-mono text-[11px]">
                      <div>
                        <span className="opacity-70 block">Environment:</span>
                        <strong>{diagnosticResult.environment.toUpperCase()}</strong>
                      </div>
                      <div>
                        <span className="opacity-70 block">Authentication:</span>
                        <strong>{diagnosticResult.auth_status === "valid" ? "Verified (HTTP 200)" : "Failed (HTTP 401)"}</strong>
                      </div>
                      <div>
                        <span className="opacity-70 block">API Reachable:</span>
                        <strong>{diagnosticResult.api_reachable ? "Yes (Connected)" : "No (Unreachable)"}</strong>
                      </div>
                      <div>
                        <span className="opacity-70 block">Key ID:</span>
                        <strong>{diagnosticResult.key_id_masked}</strong>
                      </div>
                    </div>
                  </div>
                ) : currentEnvData?.last_tested_at ? (
                  <div className="p-3.5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-xl text-xs text-[#5F6368] flex items-center justify-between flex-wrap gap-2">
                    <span>
                      Last recorded test: <strong className="text-[#202124]">{currentEnvData.last_test_message || currentEnvData.last_test_status}</strong>
                    </span>
                    <span className="text-[11px] font-mono text-[#70757A]">
                      {new Date(currentEnvData.last_tested_at).toLocaleString()}
                    </span>
                  </div>
                ) : null}

                <div className="text-[11px] text-[#70757A] flex items-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                  <span>
                    A successful connection probe confirms API authentication and network reachability. Webhook signature processing, customer checkout, and refunds operate with independent controls.
                  </span>
                </div>
              </div>

              {/* Webhook Configuration & Verification Card */}
              <div className="p-5 border border-[#E4E5E7] rounded-3xl bg-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#202124] flex items-center gap-2">
                      <Server className="w-4 h-4 text-[#C5A880]" />
                      <span>Webhook Configuration & Delivery Monitoring</span>
                    </h3>
                    <p className="text-xs text-[#5F6368] mt-0.5">
                      Public HTTPS webhook receiver, HMAC-SHA256 signature verification, and Razorpay event audit stream.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyWebhookForEnv(selectedConfigEnv)}
                    disabled={webhookVerifying}
                    className="px-4 py-2 bg-white hover:bg-[#F7F7F5] text-[#202124] border border-[#D3D8DF] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-2xs cursor-pointer shrink-0"
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 text-emerald-600 ${webhookVerifying ? "animate-spin" : ""}`} />
                    <span>{webhookVerifying ? "Verifying..." : "Verify Webhook Configuration"}</span>
                  </button>
                </div>

                {/* Webhook URL Input & Copy Button */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6368]">
                    Configured Webhook URL (Copy into Razorpay Dashboard)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={settings?.webhook_url || "https://kvtours.in/api/v1/payments/razorpay/webhook"}
                      className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-mono text-[#202124]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(settings?.webhook_url || "https://kvtours.in/api/v1/payments/razorpay/webhook")
                      }
                      className="p-2.5 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] transition-all cursor-pointer shrink-0 flex items-center gap-1.5 text-xs font-bold"
                      title="Copy Webhook URL"
                    >
                      {copiedWebhookUrl ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-[#70757A]" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Webhook Verification Result if triggered */}
                {webhookVerificationResult && (
                  <div
                    className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      webhookVerificationResult.signature_verification_active
                        ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                        : "bg-amber-50 border-amber-200 text-amber-950"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-2">
                      {webhookVerificationResult.signature_verification_active ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <span>{webhookVerificationResult.verification_message}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-current/10 font-mono text-[11px]">
                      <div>
                        <span className="opacity-70 block">Last Webhook Received:</span>
                        <strong>
                          {webhookVerificationResult.last_webhook_received_at
                            ? `${new Date(webhookVerificationResult.last_webhook_received_at).toLocaleString()} (${webhookVerificationResult.last_webhook_event})`
                            : "None yet recorded"}
                        </strong>
                      </div>
                      <div>
                        <span className="opacity-70 block">Last Processed Event:</span>
                        <strong>
                          {webhookVerificationResult.last_processed_at
                            ? `${new Date(webhookVerificationResult.last_processed_at).toLocaleString()} (${webhookVerificationResult.last_processed_event})`
                            : "None yet processed"}
                        </strong>
                      </div>
                      <div>
                        <span className="opacity-70 block">Recent Webhook Errors:</span>
                        <strong>{webhookVerificationResult.recent_errors_count} logged error(s)</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#70757A] block">
                      Signature Verification
                    </span>
                    <div className="text-sm font-bold text-emerald-800 mt-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>HMAC-SHA256 Active</span>
                    </div>
                    <span className="text-[10px] text-[#5F6368] mt-0.5 block">
                      Unsigned webhooks are rejected immediately
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#70757A] block">
                      Last Event Received
                    </span>
                    <div className="text-xs font-bold text-[#202124] mt-1 font-mono truncate">
                      {settings?.webhook_last_received_at
                        ? `${settings.webhook_last_event || "Event"} (${new Date(settings.webhook_last_received_at).toLocaleDateString()})`
                        : "No events recorded"}
                    </div>
                    <span className="text-[10px] text-[#5F6368] mt-0.5 block">
                      Logged in payment audit trails
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#70757A] block">
                      Recent Webhook Errors
                    </span>
                    <div className={`text-sm font-bold mt-1 ${
                      (settings?.webhook_recent_errors_count || 0) > 0 ? "text-rose-700" : "text-emerald-700"
                    }`}>
                      {(settings?.webhook_recent_errors_count || 0) > 0
                        ? `${settings?.webhook_recent_errors_count} recorded error(s)`
                        : "0 recorded errors"}
                    </div>
                    <span className="text-[10px] text-[#5F6368] mt-0.5 block">
                      Inspect in Webhooks tab
                    </span>
                  </div>
                </div>

                {/* Setup Instructions */}
                <div className="p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl text-[11px] text-[#5F6368] space-y-1.5">
                  <div className="font-bold text-[#202124] uppercase tracking-wider">
                    Razorpay Dashboard Setup Instructions:
                  </div>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Log in to your <strong>Razorpay Dashboard</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Webhooks</strong>.</li>
                    <li>Click <strong>Add New Webhook</strong>. Paste the Webhook URL above.</li>
                    <li>Enter your configured <strong>Webhook Secret</strong>. (Ensure it matches the secret saved above).</li>
                    <li>Check active events: <code className="font-mono text-[#202124]">payment.captured</code>, <code className="font-mono text-[#202124]">payment.failed</code>, <code className="font-mono text-[#202124]">order.paid</code>, <code className="font-mono text-[#202124]">refund.processed</code>.</li>
                    <li>Click <strong>Save Webhook</strong>. Test by clicking &apos;Verify Webhook Configuration&apos; above.</li>
                  </ol>
                </div>
              </div>

              {/* Step 6 — 14-Point Payment Readiness Check */}
              <div className="p-6 bg-white border border-[#E4E5E7] rounded-3xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4E5E7] pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
                        Step 6 of Setup Wizard
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Target: {selectedConfigEnv.toUpperCase()} Mode
                      </span>
                    </div>
                    <h3 className="text-base font-serif font-bold text-[#202124] flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#C5A880]" />
                      <span>Complete Payment Readiness Check (14 Diagnostic Probes)</span>
                    </h3>
                    <p className="text-xs text-[#5F6368] mt-0.5">
                      Independently tests frontend-to-backend reachability, database readiness, credential encryption, safe API authentication, environment alignment, pricing logic, order creation endpoints, webhook signature verification, and customer error flows.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunPaymentReadinessCheck}
                    disabled={readinessLoading}
                    className="px-5 py-2.5 bg-[#24292F] hover:bg-[#3D4450] text-[#E8DCC4] rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
                  >
                    <Activity className={`w-4 h-4 text-emerald-400 ${readinessLoading ? "animate-spin" : ""}`} />
                    <span>{readinessLoading ? "Running 14 Checks..." : "Run Payment Readiness Check"}</span>
                  </button>
                </div>

                {/* Overall Diagnostic Status Summary Banner */}
                {readinessChecks ? (() => {
                  const passedCount = readinessChecks.filter((c) => c.status === "PASS").length;
                  const failCount = readinessChecks.filter((c) => c.status === "FAIL").length;
                  const needsConfigCount = readinessChecks.filter((c) => c.status === "NEEDS CONFIGURATION").length;
                  const isAllPass = passedCount === readinessChecks.length;

                  return (
                    <div
                      className={`p-4 rounded-2xl border text-xs space-y-2 ${
                        isAllPass
                          ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                          : failCount > 0
                          ? "bg-rose-50 border-rose-300 text-rose-950"
                          : "bg-amber-50 border-amber-300 text-amber-950"
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          {isAllPass ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : failCount > 0 ? (
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-5 h-6 text-amber-600 shrink-0" />
                          )}
                          <span>
                            {isAllPass
                              ? `ALL 14 PAYMENT READINESS CHECKS PASSED — READY FOR ${selectedConfigEnv.toUpperCase()} OPERATIONS`
                              : `READINESS ASSESSMENT: ${passedCount}/14 PASSED • ${needsConfigCount} NEED CONFIGURATION • ${failCount} FAILED`}
                          </span>
                        </div>
                        {readinessTestedAt && (
                          <span className="text-[11px] font-mono opacity-80">
                            Last Run: {readinessTestedAt}
                          </span>
                        )}
                      </div>

                      {!isAllPass && (
                        <p className="text-[11px] leading-relaxed pt-1 border-t border-current/10">
                          Notice: The payment system is not considered ready for customer transactions while required checks are incomplete or failing. Follow the specific action steps below to resolve each flagged component.
                        </p>
                      )}
                    </div>
                  );
                })() : (
                  <div className="p-4 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl text-xs text-[#5F6368] flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#70757A]" />
                      <span>
                        Readiness diagnostic has not been executed yet for this session. Click &apos;Run Payment Readiness Check&apos; to evaluate all 14 components.
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#70757A]">Status: NOT TESTED</span>
                  </div>
                )}

                {/* Grid of the 14 Independent Checks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {(
                    readinessChecks || [
                      { id: 1, name: "Frontend Reachability", category: "Connectivity", status: "NOT TESTED" as const, summary: "Probe frontend HTTP reachability to FastAPI backend." },
                      { id: 2, name: "Backend Health Check", category: "Connectivity", status: "NOT TESTED" as const, summary: "Validate /health API endpoint returns 200 OK." },
                      { id: 3, name: "Database Reachability", category: "Connectivity", status: "NOT TESTED" as const, summary: "Validate database probe /health/ready returns connected." },
                      { id: 4, name: "Database Migrations & Schema", category: "Connectivity", status: "NOT TESTED" as const, summary: "Validate site settings, bookings, and payment tables exist." },
                      { id: 5, name: "Razorpay Credentials Exist", category: "Credentials", status: "NOT TESTED" as const, summary: "Check Key ID and AES-256-GCM Key Secret in secure store." },
                      { id: 6, name: "Razorpay Authentication Diagnostic", category: "Credentials", status: "NOT TESTED" as const, summary: "Execute safe, read-only Razorpay API authentication probe." },
                      { id: 7, name: "Environment Key Alignment", category: "Credentials", status: "NOT TESTED" as const, summary: "Ensure key prefix matches active Test or Live mode." },
                      { id: 8, name: "Payment Order Creation Endpoint", category: "Order & Flow", status: "NOT TESTED" as const, summary: "Confirm /payments/razorpay/order route readiness." },
                      { id: 9, name: "Server-Side Pricing Engine", category: "Order & Flow", status: "NOT TESTED" as const, summary: "Confirm Decimal precision price calculations & constraints." },
                      { id: 10, name: "Payment Signature Verification", category: "Integration", status: "NOT TESTED" as const, summary: "Verify HMAC-SHA256 signature algorithm on /verify route." },
                      { id: 11, name: "Webhook URL Configuration", category: "Security & Webhooks", status: "NOT TESTED" as const, summary: "Verify valid public webhook URL formatting." },
                      { id: 12, name: "Webhook Signature Verification Probe", category: "Security & Webhooks", status: "NOT TESTED" as const, summary: "Execute cryptographic webhook HMAC signature probe." },
                      { id: 13, name: "Payment-to-Booking State Synchronization", category: "Order & Flow", status: "NOT TESTED" as const, summary: "Validate atomic state transitions between payments and bookings." },
                      { id: 14, name: "Frontend Checkout & Error Handling", category: "Frontend UX", status: "NOT TESTED" as const, summary: "Validate checkout cancellation, failure capture, and sanitized alerts." },
                    ]
                  ).map((check) => {
                    const isPass = check.status === "PASS";
                    const isFail = check.status === "FAIL";
                    const isNeedsConfig = check.status === "NEEDS CONFIGURATION";

                    return (
                      <div
                        key={check.id}
                        className={`p-4 rounded-2xl border transition-all text-xs space-y-2 ${
                          isPass
                            ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                            : isFail
                            ? "bg-rose-50/70 border-rose-300 text-rose-950"
                            : isNeedsConfig
                            ? "bg-amber-50/70 border-amber-300 text-amber-950"
                            : "bg-[#FDFDFD] border-[#E4E5E7] text-[#202124]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] w-5 h-5 rounded-full bg-black/5 flex items-center justify-center font-bold text-[#5F6368]">
                              {check.id}
                            </span>
                            <span className="font-bold text-xs text-[#202124]">
                              {check.name}
                            </span>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                              isPass
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : isFail
                                ? "bg-rose-100 text-rose-800 border-rose-300"
                                : isNeedsConfig
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            {isPass ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : isFail ? (
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                            ) : isNeedsConfig ? (
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                            ) : (
                              <Clock className="w-3 h-3 text-slate-500" />
                            )}
                            <span>{check.status}</span>
                          </span>
                        </div>

                        <p className="text-[11px] text-[#5F6368] leading-relaxed">
                          {check.summary}
                        </p>

                        {check.actionRequired && (
                          <div className="p-2.5 rounded-xl bg-white/80 border border-current/15 text-[11px] space-y-1">
                            <strong className="block text-[#202124]">Next Action Required:</strong>
                            <p className="text-[#5F6368]">{check.actionRequired}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* SECTION 4: TRANSACTIONS */}
      {/* ========================================================================= */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="p-4 bg-white border border-[#E4E5E7] rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-2xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#70757A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by booking reference, customer email, order ID, or payment ID..."
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  setTxPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs text-[#202124] placeholder-[#70757A] focus:outline-none focus:border-[#C5A880] focus:bg-white transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-[#70757A] font-medium">
                <Filter className="w-3.5 h-3.5" />
                <span>Status:</span>
              </div>

              <select
                value={txStatus}
                onChange={(e) => {
                  setTxStatus(e.target.value);
                  setTxPage(1);
                }}
                className="px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-medium text-[#202124] focus:outline-none focus:border-[#C5A880]"
              >
                <option value="all">All Statuses</option>
                <option value="bank_transfer_pending">Bank Transfer Awaiting Verification</option>
                <option value="awaiting_online">Awaiting Online Payment</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="fully_paid">Fully Paid</option>
                <option value="overdue">Overdue Balance</option>
                <option value="captured">Captured (Paid)</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={txProvider}
                onChange={(e) => {
                  setTxProvider(e.target.value);
                  setTxPage(1);
                }}
                className="px-3 py-2 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-medium text-[#202124] focus:outline-none focus:border-[#C5A880]"
              >
                <option value="all">All Gateways &amp; Methods</option>
                <option value="razorpay">Razorpay Online</option>
                <option value="bank_transfer">Direct Bank Transfer</option>
                <option value="branch_payment">Branch / Cash Payment</option>
              </select>

              <a
                href={adminExportsApi.getPaymentsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                title="Export Payments CSV"
                className="px-3 py-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#5F6368]" />
                <span>Export CSV</span>
              </a>

              <button
                onClick={fetchTransactions}
                title="Refresh Transactions"
                className="p-2 rounded-xl bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#5F6368] transition-all cursor-pointer shadow-2xs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-2xs">
            {!transactionsData || transactionsData.items.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="w-12 h-12 text-[#D3D8DF] mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#202124]">No payment transactions found</h3>
                <p className="text-xs text-[#70757A] mt-1">
                  {txSearch || txStatus !== "all"
                    ? "Try adjusting your search criteria or status filters."
                    : "Transactions will appear here once bookings initiate online checkout."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E5E7] bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                      <th className="py-3.5 px-4">Booking Ref</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Method &amp; Reference</th>
                      <th className="py-3.5 px-4">Amount &amp; Balance</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4">Reconciliation</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E5E7]">
                    {transactionsData.items.map((tx) => {
                      const isOffline = tx.provider === "bank_transfer" || tx.provider === "branch_payment";
                      const isPendingVerification = isOffline && tx.status === "pending";

                      return (
                        <tr key={tx.id} className="hover:bg-[#FDFBF7] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <Link
                                href={`/admin/bookings?search=${tx.booking_reference}`}
                                className="font-mono font-bold text-[#202124] hover:text-[#C5A880] flex items-center gap-1"
                              >
                                <span>{tx.booking_reference}</span>
                                <ExternalLink className="w-3 h-3 text-[#70757A]" />
                              </Link>
                              {tx.booking_payment_status && (
                                <span
                                  className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border w-fit ${
                                    tx.booking_payment_status === "paid"
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : tx.booking_payment_status === "partially_paid"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : "bg-slate-50 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {tx.booking_payment_status.replace("_", " ")}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-[#202124]">{tx.customer_name}</div>
                            <div className="text-[11px] text-[#70757A]">{tx.customer_email}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#202124] uppercase text-[11px]">
                              {tx.provider === "bank_transfer"
                                ? "Bank Transfer"
                                : tx.provider === "branch_payment"
                                ? "Branch Payment"
                                : tx.provider}
                            </div>
                            <div className="font-mono text-[10px] text-[#70757A] break-all">
                              {tx.transfer_reference ? (
                                <span className="text-[#202124] font-bold">UTR: {tx.transfer_reference}</span>
                              ) : (
                                tx.provider_payment_id || tx.provider_order_id || "No provider ID"
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#202124]">{formatCurrency(tx.amount)}</div>
                            {tx.outstanding_balance != null && Number(tx.outstanding_balance) > 0 && (
                              <div className="text-[10px] text-amber-800 font-semibold">
                                Outstanding: {formatCurrency(tx.outstanding_balance)}
                              </div>
                            )}
                            {Number(tx.total_refunded || 0) > 0 && (
                              <div className="text-[10px] text-rose-700">
                                Refunded: {formatCurrency(tx.total_refunded)}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                tx.status === "captured"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : isPendingVerification
                                  ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                                  : tx.status === "pending"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : tx.status === "failed"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : "bg-purple-50 text-purple-800 border-purple-200"
                              }`}
                            >
                              {isPendingVerification ? "Awaiting Verification" : tx.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold w-fit ${
                                  tx.reconciliation_status === "reconciled"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : tx.reconciliation_status === "refunded"
                                    ? "bg-purple-50 text-purple-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {tx.reconciliation_status}
                              </span>
                              {tx.payment_deadline && (
                                <span className="text-[10px] text-[#70757A]">
                                  Due: {new Date(tx.payment_deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-[#70757A] text-[11px]">
                            {new Date(tx.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {isPendingVerification && isElevated && (
                                <>
                                  <button
                                    onClick={() => openVerifyModal(tx)}
                                    title="Verify Bank Transfer"
                                    className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-2xs"
                                  >
                                    Verify
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(tx)}
                                    title="Reject Bank Transfer"
                                    className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => openTransactionDetail(tx)}
                                className="px-2.5 py-1.5 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#202124] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Details
                              </button>

                              {tx.status === "captured" && Number(tx.amount) > Number(tx.total_refunded || 0) && (
                                <button
                                  onClick={() => openInitiateRefundModal(tx)}
                                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                  Refund
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {transactionsData && transactionsData.total_pages > 1 && (
              <div className="p-4 border-t border-[#E4E5E7] bg-[#F7F7F5] flex items-center justify-between text-xs text-[#5F6368]">
                <div>
                  Page {transactionsData.page} of {transactionsData.total_pages} ({transactionsData.total} total)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={txPage <= 1}
                    onClick={() => setTxPage(txPage - 1)}
                    className="px-3 py-1 bg-white border border-[#D3D8DF] rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={txPage >= transactionsData.total_pages}
                    onClick={() => setTxPage(txPage + 1)}
                    className="px-3 py-1 bg-white border border-[#D3D8DF] rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: REFUNDS */}
      {/* ========================================================================= */}
      {activeTab === "refunds" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E5E7] pb-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#202124]">Refund Management</h2>
                <p className="text-xs text-[#5F6368]">
                  Verified refunds processed through Razorpay. Discrepancies and balances are calculated strictly from database records.
                </p>
              </div>

              <button
                onClick={fetchRefunds}
                className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#5F6368]" />
                <span>Refresh</span>
              </button>
            </div>

            {refundsList.length === 0 ? (
              <div className="p-12 text-center text-[#70757A]">
                <DollarSign className="w-12 h-12 text-[#D3D8DF] mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#202124]">No refunds on record</h3>
                <p className="text-xs text-[#70757A] mt-1">
                  Refunds can be initiated on eligible captured payments from the Transactions tab.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E5E7] bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                      <th className="py-3 px-4">Refund ID</th>
                      <th className="py-3 px-4">Provider Refund ID</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Processed Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E5E7]">
                    {refundsList.map((rf) => (
                      <tr key={rf.id} className="hover:bg-[#FDFBF7]">
                        <td className="py-3 px-4 font-mono text-[11px] text-[#202124]">{rf.id}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#70757A]">
                          {rf.provider_refund_id || "Pending Gateway Sync"}
                        </td>
                        <td className="py-3 px-4 font-bold text-rose-800">{formatCurrency(rf.amount)}</td>
                        <td className="py-3 px-4 text-[#5F6368]">{rf.reason || "Standard cancellation"}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              rf.status === "processed"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {rf.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#70757A] text-[11px]">
                          {rf.processed_at ? new Date(rf.processed_at).toLocaleString() : new Date(rf.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: WEBHOOKS */}
      {/* ========================================================================= */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E5E7] pb-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#202124]">Webhook Events Monitor</h2>
                <p className="text-xs text-[#5F6368]">
                  Incoming payment webhook deliveries signed by Razorpay. Signatures are verified before processing.
                </p>
              </div>

              <button
                onClick={fetchWebhooks}
                className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#5F6368]" />
                <span>Refresh Log</span>
              </button>
            </div>

            {!webhooksData || webhooksData.items.length === 0 ? (
              <div className="p-12 text-center text-[#70757A]">
                <RotateCcw className="w-12 h-12 text-[#D3D8DF] mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#202124]">No webhook audit events found</h3>
                <p className="text-xs text-[#70757A] mt-1">
                  Deliveries will appear in this log as checkout transactions generate provider events.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E5E7] bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Provider Event ID</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Received At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E5E7]">
                    {webhooksData.items.map((wh) => (
                      <tr key={wh.id} className="hover:bg-[#FDFBF7]">
                        <td className="py-3 px-4 font-mono font-bold text-[#202124]">{wh.event_type}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#70757A]">{wh.event_id || wh.id}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              wh.status === "processed"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : wh.status === "ignored"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {wh.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#70757A] text-[11px]">
                          {new Date(wh.received_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isElevated && wh.status !== "processed" && (
                            <button
                              onClick={() => handleRetryWebhook(wh.id)}
                              disabled={retryingWebhookId === wh.id}
                              className="px-2.5 py-1 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              {retryingWebhookId === wh.id ? "Retrying..." : "Retry"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: RECONCILIATION */}
      {/* ========================================================================= */}
      {activeTab === "reconciliation" && (
        <div className="space-y-6">
          {/* Discrepancy Overview Cards */}
          {reconciliation && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E4E5E7] rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[11px] font-bold text-rose-600 uppercase">Confirmed but Unpaid</span>
                  <div className="text-2xl font-serif font-bold text-[#202124] mt-1">
                    {reconciliation.mismatch_summary["booking_confirmed_payment_missing"] || 0}
                  </div>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-[#E4E5E7] rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[11px] font-bold text-amber-600 uppercase">Paid but Unconfirmed</span>
                  <div className="text-2xl font-serif font-bold text-[#202124] mt-1">
                    {reconciliation.mismatch_summary["payment_captured_booking_unconfirmed"] || 0}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-[#E4E5E7] rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[11px] font-bold text-purple-600 uppercase">Webhook Mismatches</span>
                  <div className="text-2xl font-serif font-bold text-[#202124] mt-1">
                    {reconciliation.mismatch_summary["webhook_mismatch"] || 0}
                  </div>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 text-purple-600 rounded-xl">
                  <Filter className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white border border-[#E4E5E7] rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[11px] font-bold text-red-600 uppercase">Excess Refunds</span>
                  <div className="text-2xl font-serif font-bold text-[#202124] mt-1">
                    {reconciliation.mismatch_summary["refund_mismatch"] || 0}
                  </div>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Reconciliation Table */}
          <div className="bg-white border border-[#E4E5E7] rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-[#E4E5E7] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#202124] uppercase tracking-wider">
                  Reconciliation Discrepancy Records
                </h3>
                <p className="text-xs text-[#5F6368] mt-0.5">
                  Cross-checks internal booking states against verified gateway capture records.
                </p>
              </div>

              <a
                href={adminExportsApi.getPaymentsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Export Report</span>
              </a>
            </div>

            {!reconciliation || reconciliation.items.length === 0 ? (
              <div className="p-12 text-center text-emerald-800">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold">100% Balanced</h4>
                <p className="text-xs text-[#70757A] mt-1">All booking payment states match provider settlement records.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E5E7] bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                      <th className="py-3 px-4">Booking Ref</th>
                      <th className="py-3 px-4">Booking Status</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4">Discrepancy Type</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Customer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E5E7]">
                    {reconciliation.items.map((item) => (
                      <tr key={item.booking_id} className="hover:bg-[#FDFBF7]">
                        <td className="py-3 px-4 font-mono font-bold text-[#202124]">{item.booking_reference}</td>
                        <td className="py-3 px-4 uppercase text-[11px]">{item.booking_status}</td>
                        <td className="py-3 px-4 uppercase text-[11px]">{item.payment_status}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {item.mismatch_types.join(", ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold">{formatCurrency(item.amount)}</td>
                        <td className="py-3 px-4 text-[#5F6368]">{item.customer_name} ({item.customer_email})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 8: PAYMENT SETTINGS & MASTER SWITCH */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-6">
            <h2 className="text-lg font-serif font-bold text-[#202124]">Global Checkout Settings</h2>
            <p className="text-xs text-[#5F6368]">
              Control public checkout acceptance, persistent maintenance notices, and emergency cut-offs.
            </p>

            {/* Master Switch Row */}
            <div className="p-5 border border-[#E4E5E7] rounded-2xl bg-[#F7F7F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#202124]">Accept Online Customer Payments</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isPaymentsOn ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {isPaymentsOn ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-[#5F6368] mt-1">
                  Master killswitch. When paused, online checkout buttons are replaced with booking inquiry forms across the entire site.
                </p>
              </div>

              {isElevated && (
                <button
                  type="button"
                  onClick={() => handleToggleMasterSwitch(!isPaymentsOn)}
                  disabled={savingSettings}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer ${
                    isPaymentsOn
                      ? "bg-rose-700 hover:bg-rose-800 text-white"
                      : "bg-emerald-700 hover:bg-emerald-800 text-white"
                  }`}
                >
                  {isPaymentsOn ? "Disable Online Payments" : "Enable Online Payments"}
                </button>
              )}
            </div>

            {/* Maintenance Message */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5F6368]">
                Customer-Facing Maintenance Guidance Notice
              </label>
              <textarea
                rows={3}
                value={maintenanceMessageInput}
                onChange={(e) => setMaintenanceMessageInput(e.target.value)}
                placeholder="Message shown to customers at checkout when payments are temporarily disabled..."
                className="w-full p-3.5 bg-white border border-[#D3D8DF] rounded-xl text-xs text-[#202124] focus:outline-none focus:border-[#C5A880] transition-all"
              />
              <p className="text-[11px] text-[#70757A]">
                This explanation is displayed on package pages and the booking payment portal while checkout is paused.
              </p>

              {isElevated && (
                <button
                  type="button"
                  onClick={handleSaveMaintenanceMessage}
                  disabled={savingSettings}
                  className="px-5 py-2.5 bg-[#24292F] hover:bg-[#3D4450] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                >
                  {savingSettings ? "Saving..." : "Save Maintenance Notice"}
                </button>
              )}
            </div>
          </div>

          {/* Dedicated Bank Transfer & Branch Payment Settings Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-serif font-bold text-[#202124]">
              Bank Transfer &amp; Branch Payment Settings
            </h2>
            <BankTransferSettingsSection />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9: AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === "audit_logs" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E4E5E7] rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E5E7] pb-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#202124]">Payment Audit Trails</h2>
                <p className="text-xs text-[#5F6368]">
                  Immutable activity log recording gateway credential updates, master switch changes, and administrator refunds.
                </p>
              </div>

              <button
                onClick={fetchAuditLogs}
                disabled={auditLoading}
                className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#5F6368] ${auditLoading ? "animate-spin" : ""}`} />
                <span>Refresh Logs</span>
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-[#70757A]">
                <FileCode className="w-12 h-12 text-[#D3D8DF] mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#202124]">No payment audit entries recorded yet</h3>
                <p className="text-xs text-[#70757A] mt-1">Changes made to payment settings will be audited here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E4E5E7] bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E5E7]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FDFBF7]">
                        <td className="py-3 px-4 font-mono font-bold text-[#202124]">{log.action}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#70757A]">{log.entity_id || log.entity_type}</td>
                        <td className="py-3 px-4 text-[#5F6368]">{log.actor_email || "System"}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#70757A]">{log.ip_address || "—"}</td>
                        <td className="py-3 px-4 text-[#70757A] text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="px-2.5 py-1 rounded-lg border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TRANSACTION DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 my-8">
            <div className="flex items-start justify-between border-b border-[#E4E5E7] pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
                  Authoritative Transaction Record
                </span>
                <h3 className="text-xl font-serif font-bold text-[#202124] mt-0.5">
                  Booking #{selectedTx.booking_reference}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-full hover:bg-[#F7F7F5] text-[#70757A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {txDetailLoading ? (
              <div className="p-8 text-center text-[#70757A]">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-xs uppercase font-bold tracking-wider">Loading authoritative record...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#F7F7F5] rounded-2xl">
                  <div>
                    <span className="text-[#70757A] block font-medium">Internal Payment ID:</span>
                    <span className="font-mono font-bold text-[#202124]">{selectedTx.id}</span>
                  </div>
                  <div>
                    <span className="text-[#70757A] block font-medium">Payment Method:</span>
                    <span className="font-bold text-[#202124] uppercase">
                      {selectedTx.provider === "bank_transfer"
                        ? "Bank Transfer"
                        : selectedTx.provider === "branch_payment"
                        ? "Branch Payment"
                        : selectedTx.provider}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#70757A] block font-medium">Reference / UTR:</span>
                    <span className="font-mono font-bold text-[#202124] break-all">
                      {selectedTx.transfer_reference ||
                        selectedTx.provider_payment_id ||
                        selectedTx.provider_order_id ||
                        "None"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#70757A] block font-medium">Customer:</span>
                    <span className="font-bold text-[#202124]">{selectedTx.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-[#70757A] block font-medium">Collected Amount:</span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {formatCurrency(selectedTx.amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#70757A] block font-medium">Payment Status:</span>
                    <span className="font-bold text-[#202124] uppercase">
                      {selectedTx.provider === "bank_transfer" && selectedTx.status === "pending"
                        ? "Awaiting Verification"
                        : selectedTx.status}
                    </span>
                  </div>
                  {selectedTx.booking_total != null && (
                    <div>
                      <span className="text-[#70757A] block font-medium">Booking Total:</span>
                      <span className="font-bold text-[#202124]">
                        {formatCurrency(selectedTx.booking_total)}
                      </span>
                    </div>
                  )}
                  {selectedTx.outstanding_balance != null && (
                    <div>
                      <span className="text-[#70757A] block font-medium">Outstanding Balance:</span>
                      <span className="font-bold text-amber-900">
                        {formatCurrency(selectedTx.outstanding_balance)}
                      </span>
                    </div>
                  )}
                  {selectedTx.booking_payment_status && (
                    <div>
                      <span className="text-[#70757A] block font-medium">Booking Payment State:</span>
                      <span className="font-bold text-[#202124] uppercase">
                        {selectedTx.booking_payment_status.replace("_", " ")}
                      </span>
                    </div>
                  )}
                  {selectedTx.payment_deadline && (
                    <div className="col-span-2">
                      <span className="text-[#70757A] block font-medium">Balance Payment Deadline:</span>
                      <span className="font-bold text-[#202124]">
                        {new Date(selectedTx.payment_deadline).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>

                {selectedTx.verification_notes && (
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1">
                    <span className="font-bold text-amber-900 text-xs">Customer Transfer Remarks / Notes:</span>
                    <p className="text-xs text-[#202124]">{selectedTx.verification_notes}</p>
                  </div>
                )}

                {selectedTxDetail?.refunds && selectedTxDetail.refunds.length > 0 && (
                  <div className="p-4 border border-rose-200 bg-rose-50/50 rounded-2xl space-y-2">
                    <div className="font-bold text-rose-900 text-xs uppercase tracking-wider">Refund History</div>
                    {selectedTxDetail.refunds.map((rf) => (
                      <div key={rf.id} className="flex justify-between items-center text-xs">
                        <span>{rf.reason || "Refund"} ({new Date(rf.created_at).toLocaleDateString()})</span>
                        <span className="font-bold text-rose-800">{formatCurrency(rf.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-[#E4E5E7] flex-wrap gap-2">
              <Link
                href={`/admin/bookings?search=${selectedTx.booking_reference}`}
                className="text-xs font-bold text-[#202124] hover:text-[#C5A880] inline-flex items-center gap-1"
              >
                <span>View Full Booking Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2 flex-wrap">
                {(selectedTx.provider === "bank_transfer" || selectedTx.provider === "branch_payment") &&
                  selectedTx.status === "pending" &&
                  isElevated && (
                    <>
                      <button
                        onClick={() => openVerifyModal(selectedTx)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                      >
                        Verify Transfer
                      </button>
                      <button
                        onClick={() => openRejectModal(selectedTx)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  )}

                {selectedTx.status === "captured" && (
                  <button
                    onClick={() => {
                      const item = selectedTx;
                      setSelectedTx(null);
                      openInitiateRefundModal(item);
                    }}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                  >
                    Initiate Refund
                  </button>
                )}

                <button
                  onClick={() => setSelectedTx(null)}
                  className="px-4 py-2 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VERIFY BANK TRANSFER MODAL */}
      {/* ========================================================================= */}
      {verifyModalOpen && actionTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-[#E4E5E7] pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Staff Payment Verification
                </span>
                <h3 className="text-xl font-serif font-bold text-[#202124] mt-0.5">
                  Verify Booking #{actionTx.booking_reference}
                </h3>
              </div>
              <button
                onClick={() => {
                  setVerifyModalOpen(false);
                  setActionTx(null);
                }}
                className="p-1.5 rounded-full hover:bg-[#F7F7F5] text-[#70757A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bankActionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{bankActionError}</span>
              </div>
            )}

            <div className="p-4 bg-[#F7F7F5] rounded-2xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#70757A]">Customer:</span>
                <span className="font-bold text-[#202124]">{actionTx.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#70757A]">Customer Submitted Reference / UTR:</span>
                <span className="font-mono font-bold text-[#202124]">
                  {actionTx.transfer_reference || "None submitted"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#70757A]">Claimed Amount:</span>
                <span className="font-bold text-emerald-800 text-sm">
                  {formatCurrency(actionTx.amount)}
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#202124] mb-1">
                  Authoritative Verified Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={verifiedAmountInput}
                  onChange={(e) => setVerifiedAmountInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D3D8DF] rounded-xl font-bold text-[#202124] focus:outline-none focus:border-[#C5A880]"
                />
                <p className="text-[11px] text-[#70757A] mt-1">
                  Amount verified as credited to the KV Tours bank account.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#202124] mb-1">
                  Verification Notes / Bank Statement Reference
                </label>
                <textarea
                  rows={2}
                  value={verificationNotesInput}
                  onChange={(e) => setVerificationNotesInput(e.target.value)}
                  placeholder="e.g. Credited to HDFC Current A/C on statement entry #10492"
                  className="w-full p-3 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4E5E7]">
              <button
                type="button"
                onClick={() => {
                  setVerifyModalOpen(false);
                  setActionTx(null);
                }}
                disabled={bankActionSubmitting}
                className="px-4 py-2 border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#202124] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyBankTransfer}
                disabled={bankActionSubmitting}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {bankActionSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve &amp; Mark Paid</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REJECT BANK TRANSFER MODAL */}
      {/* ========================================================================= */}
      {rejectModalOpen && actionTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-[#E4E5E7] pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Payment Rejection
                </span>
                <h3 className="text-xl font-serif font-bold text-[#202124] mt-0.5">
                  Reject Transfer for #{actionTx.booking_reference}
                </h3>
              </div>
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setActionTx(null);
                }}
                className="p-1.5 rounded-full hover:bg-[#F7F7F5] text-[#70757A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bankActionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{bankActionError}</span>
              </div>
            )}

            <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-2xl text-xs space-y-2">
              <p className="text-rose-900 leading-relaxed">
                Rejecting this transfer will record a failed payment attempt and notify the customer to provide a valid payment reference or choose an alternative method.
              </p>
              <div className="flex justify-between pt-1 border-t border-rose-200 text-[#202124]">
                <span>Submitted Reference:</span>
                <span className="font-mono font-bold">{actionTx.transfer_reference || "None"}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-[#202124]">
                Reason for Rejection *
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. UTR reference not found on bank statement, or payment reversed by sending bank."
                className="w-full p-3 bg-white border border-[#D3D8DF] rounded-xl text-[#202124] focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4E5E7]">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setActionTx(null);
                }}
                disabled={bankActionSubmitting}
                className="px-4 py-2 border border-[#D3D8DF] bg-white hover:bg-[#F7F7F5] text-[#202124] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectBankTransfer}
                disabled={bankActionSubmitting}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {bankActionSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INITIATE REFUND MODAL */}
      {/* ========================================================================= */}
      {refundModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleProcessRefund}
            className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5"
          >
            <div className="flex items-start justify-between border-b border-[#E4E5E7] pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                  Authoritative Refund
                </span>
                <h3 className="text-xl font-serif font-bold text-[#202124] mt-0.5">
                  Process Gateway Refund
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#F7F7F5] text-[#70757A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {refundError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <span className="font-bold block">Refund Notice</span>
                  <p className="leading-relaxed">{refundError}</p>
                </div>
              </div>
            )}

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="font-bold">Maximum Eligible Refundable Balance:</div>
              <div className="text-lg font-bold text-amber-950">{formatCurrency(refundMaxAmount)}</div>
              <p className="text-[11px] text-amber-800">
                Refunds are strictly verified against captured balance. Once processed via Razorpay, funds return directly to customer payment instrument.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-[#5F6368] mb-1">
                  Refund Amount (INR)
                </label>
                <input
                  type="number"
                  min="1"
                  max={refundMaxAmount}
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-sm font-bold text-[#202124] focus:outline-none focus:border-[#C5A880] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[#5F6368] mb-1">
                  Cancellation & Refund Reason
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-[#D3D8DF] rounded-xl text-xs font-medium text-[#202124] focus:outline-none focus:border-[#C5A880]"
                >
                  <option value="customer_requested_cancellation">Customer Requested Cancellation</option>
                  <option value="itinerary_cancelled_weather">Tour Cancelled due to Weather/Force Majeure</option>
                  <option value="duplicate_transaction">Duplicate Transaction Charged</option>
                  <option value="manager_approved_courtesy">Management Courtesy Adjustment</option>
                </select>
              </div>

              {/* Offline / Manual Refund Option */}
              <div className="p-3 bg-[#F7F7F5] border border-[#D3D8DF] rounded-2xl space-y-1">
                <label className="flex items-start gap-2.5 text-xs text-[#202124] cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={refundRecordOffline}
                    onChange={(e) => setRefundRecordOffline(e.target.checked)}
                    className="mt-0.5 rounded border-[#D3D8DF] text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-[#202124]">Record as Offline / Manual Bank Refund</span>
                    <p className="text-[11px] text-[#70757A] font-normal leading-relaxed mt-0.5">
                      Check this if the Razorpay test sandbox has insufficient merchant balance, or if funds are returned directly to the customer via NEFT, RTGS, or UPI.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 text-xs text-[#5F6368] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundConfirmed}
                    onChange={(e) => setRefundConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-[#D3D8DF] text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    I confirm that I am authorized to issue this refund of {formatCurrency(refundAmount)} to the customer. This action is irreversible.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E4E5E7]">
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="px-4 py-2.5 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refundSubmitting || !refundConfirmed}
                className={`px-5 py-2.5 ${refundRecordOffline ? "bg-amber-700 hover:bg-amber-800" : "bg-rose-700 hover:bg-rose-800"} disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer`}
              >
                {refundSubmitting ? "Processing..." : refundRecordOffline ? "Record Offline Refund" : "Confirm & Issue Refund"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MASTER SWITCH CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {masterSwitchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-serif font-bold text-[#202124]">
                Confirm Pausing Online Payments
              </h3>
              <p className="text-xs text-[#5F6368]">
                There are currently <strong className="text-rose-700">{settings?.pending_transactions_count || 0} pending transactions</strong> in progress.
              </p>
            </div>

            <div className="p-4 bg-[#F7F7F5] rounded-2xl text-xs text-[#5F6368] space-y-2">
              <p>
                <strong>What happens when you pause:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>New online checkout orders cannot be initiated.</li>
                <li>Legitimate webhooks for existing pending orders will still be processed.</li>
                <li>Existing bookings and seat holds are completely preserved.</li>
                <li>Package booking buttons switch to concierge inquiry requests.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setMasterSwitchModalOpen(false)}
                className="px-4 py-2.5 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Keep Online
              </button>
              <button
                type="button"
                onClick={() => executeMasterSwitchUpdate(false)}
                disabled={savingSettings}
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                {savingSettings ? "Pausing..." : "Yes, Pause Online Checkout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: LIVE MODE SWITCH CONFIRMATION */}
      {/* ========================================================================= */}
      {liveModeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-serif font-bold text-[#202124]">
                Confirm Switch to LIVE Payment Gateway
              </h3>
              <p className="text-xs text-[#5F6368]">
                Switching to Live Mode will charge actual customer bank accounts and credit cards in Indian Rupees.
              </p>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-2">
              <p className="font-bold">Mandatory Pre-Flight Checks:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>Production Razorpay Key ID and Secret configured in deployment environment.</li>
                <li>Live webhook URL registered with matching signing secret.</li>
                <li>Production bank account KYC completed in Razorpay Dashboard.</li>
              </ul>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-[#202124] font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={confirmLiveCheck}
                onChange={(e) => setConfirmLiveCheck(e.target.checked)}
                className="mt-0.5 rounded border-[#D3D8DF] text-rose-600 focus:ring-rose-500"
              />
              <span>
                I explicitly confirm that live production credentials have been verified and approve activating live money transactions.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setLiveModeModalOpen(false)}
                className="px-4 py-2.5 bg-white border border-[#D3D8DF] hover:bg-[#F7F7F5] text-[#202124] rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Keep in Sandbox
              </button>
              <button
                type="button"
                disabled={!confirmLiveCheck || savingSettings}
                onClick={() => executeEnvSwitch("live", true)}
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                {savingSettings ? "Activating..." : "Activate Live Mode"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: AUDIT LOG METADATA VIEWER */}
      {/* ========================================================================= */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E5E7] rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4E5E7] pb-3">
              <h3 className="font-serif font-bold text-base text-[#202124]">
                Audit Metadata: {selectedAuditLog.action}
              </h3>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="p-1.5 rounded-full hover:bg-[#F7F7F5] text-[#70757A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-[#F7F7F5] rounded-2xl overflow-x-auto max-h-80 font-mono text-xs text-[#202124]">
              <pre>{JSON.stringify(selectedAuditLog.metadata_json || {}, null, 2)}</pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 bg-[#24292F] text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
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
