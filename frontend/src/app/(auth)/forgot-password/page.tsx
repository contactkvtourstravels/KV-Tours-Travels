"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { authApi } from "@/lib/api";
import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";
import { useBranding } from "@/context/BrandingContext";

export default function ForgotPasswordPage() {
  const { displayName } = useBranding();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      setMessage(response.message);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to request password reset.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F4] flex flex-col lg:flex-row items-stretch">
      {/* Left Branding Panel */}
      <AuthBrandingPanel
        title="Secure account recovery."
        tagline="We will send a single-use verification link to reset your password and restore access to your itinerary."
      />

      {/* Right Content Panel */}
      <div className="flex-1 flex items-center justify-center bg-white lg:bg-[#F3F4F4] p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white lg:rounded-3xl lg:border lg:border-[#E4E5E7] lg:shadow-xl overflow-hidden p-6 sm:p-10">
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
              Forgot Password
            </h1>
            <p className="text-sm text-[#70757A] mt-1.5">
              Enter the email address registered with your {displayName || "account"} to receive reset instructions.
            </p>
          </div>

          {error && (
            <div
              id="forgot-pwd-error-message"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl leading-relaxed"
            >
              {error}
            </div>
          )}

          {message ? (
            <div className="space-y-5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-serif font-bold text-[#202124]">
                    Recovery Instructions Sent
                  </h3>
                  <p className="text-xs text-[#70757A] mt-1 leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>

              <Link
                href="/reset-password"
                className="w-full h-11 flex items-center justify-center bg-[#24292F] hover:bg-[#3D4450] text-white font-bold rounded-full text-xs uppercase tracking-widest transition shadow-xs"
              >
                Proceed to Reset Password →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#70757A] mb-1.5"
                >
                  Registered Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#70757A]/60">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/50 text-sm focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                    placeholder="traveller@example.com"
                  />
                </div>
              </div>

              <button
                id="forgot-pwd-submit-button"
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-2 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? "Sending Instructions..." : "Send Reset Instructions"}
              </button>
            </form>
          )}

          {/* Footer links */}
          <div className="mt-8 pt-6 border-t border-[#E4E5E7] flex flex-col gap-2 text-xs text-[#70757A]">
            <Link href="/login" className="hover:text-[#202124] font-medium">
              Remember your password? Sign in
            </Link>
            <Link href="/reset-password" className="hover:text-[#202124]">
              Already have a reset token? Enter it here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
