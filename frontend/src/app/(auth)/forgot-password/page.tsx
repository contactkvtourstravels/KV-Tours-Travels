"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { authApi } from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";

export default function ForgotPasswordPage() {
  const { displayName, city, state, logoUrl } = useBranding();
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
    <div className="min-h-screen bg-[#F8F7F3] flex flex-col justify-between py-8 sm:py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Ambient Luxury Gradients */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-[#EDE8DC]/50 via-transparent to-transparent" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[radial-gradient(circle,rgba(217,186,134,0.18)_0%,transparent_70%)] blur-2xl" />
      </div>

      {/* Top Centered Brand Crest & Return Link */}
      <header className="relative z-10 w-full max-w-md mx-auto mb-6 sm:mb-7 flex flex-col items-center text-center">
        <Link
          href="/"
          className="group inline-flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880] rounded-2xl p-2 transition-all"
        >
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[#1B1E22] ring-2 ring-[#DFBA73]/70 group-hover:ring-[#DFBA73] shadow-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 mb-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl || "/logo.png"}
              alt={displayName}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="text-base sm:text-lg font-serif font-bold uppercase tracking-[0.14em] text-[#1C2420] group-hover:text-[#A88045] transition-colors leading-tight">
            {displayName}
          </span>
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#8A7659] font-semibold mt-1">
            {[city, state].filter(Boolean).join(", ") ? `${[city, state].filter(Boolean).join(", ")} • Bespoke Journeys` : "Bespoke Journeys & Luxury Travel"}
          </span>
        </Link>
      </header>

      {/* Main Single Centered Card */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto">
        <div className="w-full bg-white rounded-3xl border border-[#E5E1D5] shadow-[0_20px_60px_-15px_rgba(28,36,32,0.08)] p-6 sm:p-9 relative overflow-hidden">
          {/* Subtle luxury soft gold hairline accent */}
          <div
            className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#C5A880] to-transparent"
            aria-hidden="true"
          />

          {/* Top back navigation */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#636A64] hover:text-[#1C2420] transition-colors font-medium rounded-lg p-1 -m-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A7659]">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Account Recovery</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#1C2420] tracking-tight">
              Forgot Password
            </h1>
            <p className="text-xs sm:text-sm text-[#636A64] mt-1.5 leading-relaxed">
              Enter your registered email address to receive password reset instructions.
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
                className="w-full h-11 flex items-center justify-center bg-[#1C2420] hover:bg-[#28352F] text-white font-bold rounded-full text-xs uppercase tracking-widest transition shadow-xs"
              >
                Proceed to Reset Password →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#525754] mb-1.5"
                >
                  Registered Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A908B]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#DDD9CF] text-[#1C2420] placeholder-[#8A908B] text-sm focus:bg-white focus:border-[#C5A880] focus:outline-none focus:ring-2 focus:ring-[#C5A880]/30 transition-all duration-200"
                    placeholder="traveller@example.com"
                  />
                </div>
              </div>

              <button
                id="forgot-pwd-submit-button"
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-2 rounded-full bg-[#1C2420] hover:bg-[#28352F] text-white text-xs uppercase tracking-widest font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.005] active:scale-[0.995]"
              >
                {loading ? "Sending Instructions..." : "Send Reset Instructions"}
              </button>
            </form>
          )}

          {/* Footer links */}
          <div className="mt-8 pt-6 border-t border-[#E8E6DF] flex flex-col gap-2 text-xs text-[#636A64]">
            <Link href="/login" className="hover:text-[#1C2420] font-medium transition-colors">
              Remember your password? Sign in
            </Link>
            <Link href="/reset-password" className="hover:text-[#1C2420] transition-colors">
              Already have a reset token? Enter it here
            </Link>
          </div>
        </div>
      </main>

      {/* Accessible Footer */}
      <footer className="relative z-10 w-full max-w-md mx-auto pt-6 sm:pt-8 text-center text-[11px] text-[#8A908B] flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <span>© {new Date().getFullYear()} {displayName}. All rights reserved.</span>
        <div className="flex items-center gap-3 font-medium">
          <Link href="/" className="hover:text-[#1C2420] transition-colors">
            Home
          </Link>
          <span>•</span>
          <Link href="/packages" className="hover:text-[#1C2420] transition-colors">
            Packages
          </Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-[#1C2420] transition-colors">
            Concierge
          </Link>
        </div>
      </footer>
    </div>
  );
}
