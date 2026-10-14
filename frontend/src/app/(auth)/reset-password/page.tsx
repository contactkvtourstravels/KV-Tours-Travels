"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Lock } from "lucide-react";
import { authApi } from "@/lib/api";
import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams.get("token") || "";
  const [token, setToken] = useState(tokenFromQuery);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword({
        token: token.trim(),
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to reset password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-6 sm:p-10">
      {/* Top back navigation */}
      <div className="mb-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#70757A] hover:text-[#202124] transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-[#202124] tracking-tight">
          Set New Password
        </h1>
        <p className="text-sm text-[#70757A] mt-1.5">
          Enter your recovery token and create a new secure password for your account.
        </p>
      </div>

      {error && (
        <div
          id="reset-pwd-error-message"
          className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl leading-relaxed"
        >
          {error}
        </div>
      )}

      {success ? (
        <div className="space-y-5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-serif font-bold text-[#202124]">
                Password Successfully Reset!
              </h3>
              <p className="text-xs text-[#70757A] mt-1 leading-relaxed">
                Your password has been updated and prior active sessions were revoked.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="w-full h-11 flex items-center justify-center bg-[#24292F] hover:bg-[#3D4450] text-white font-bold rounded-full text-xs uppercase tracking-widest transition shadow-sm"
          >
            Sign In with New Password →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reset-token"
              className="block text-xs font-semibold uppercase tracking-wider text-[#70757A] mb-1.5"
            >
              Reset Token *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#70757A]/60">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="reset-token"
                name="token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/50 text-sm font-mono focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                placeholder="Paste recovery token"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reset-new-password"
              className="block text-xs font-semibold uppercase tracking-wider text-[#70757A] mb-1.5"
            >
              New Password *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#70757A]/60">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="reset-new-password"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/50 text-sm focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                placeholder="Min 8 chars, Aa, 1, @"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reset-confirm-password"
              className="block text-xs font-semibold uppercase tracking-wider text-[#70757A] mb-1.5"
            >
              Confirm New Password *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#70757A]/60">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="reset-confirm-password"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/50 text-sm focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <button
            id="reset-pwd-submit-button"
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-2 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? "Updating Password..." : "Update Password"}
          </button>
        </form>
      )}

      {/* Footer link to sign in */}
      <div className="mt-8 pt-6 border-t border-[#E4E5E7] text-center text-xs text-[#70757A]">
        <span>Remember your credentials? </span>
        <Link
          href="/login"
          className="font-semibold text-[#202124] hover:text-[#3D4450] transition-colors"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#F3F4F4] flex flex-col lg:flex-row items-stretch">
      {/* Left Branding Panel */}
      <AuthBrandingPanel
        title="Update your password."
        tagline="Restore full access to your personalized itineraries, upcoming departures, and customer services."
      />

      {/* Right Content Panel */}
      <div className="flex-1 flex items-center justify-center bg-white lg:bg-[#F3F4F4] p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white lg:rounded-3xl lg:border lg:border-[#E4E5E7] lg:shadow-xl overflow-hidden">
          <Suspense fallback={<div className="p-12 text-center text-[#70757A] text-sm">Loading form...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
