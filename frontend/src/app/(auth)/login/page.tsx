"use client";

import Link from "next/link";
import React, { Suspense, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { authApi, SafeUser } from "@/lib/api";
import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { useBranding } from "@/context/BrandingContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect");
  const {
    settings,
    displayName,
    shortName,
    initials,
    city,
    state,
    logoUrl,
    phone,
    email: contactEmail,
    getWhatsAppUrl,
    whatsappEnabled,
  } = useBranding();

  // Dynamic branding strings with graceful fallbacks
  const resolvedBrandName = displayName || settings?.agency_name || "Luxury Travel Concierge";
  const locationText = [city, state].filter(Boolean).join(", ") || settings?.agency_location || "";
  const whatsappHelpUrl = getWhatsAppUrl("Hello, I need assistance accessing my member account.");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      setCurrentUser(response.user);

      const isStaffOrAdmin = response.user.roles.some((r) =>
        ["staff", "manager", "admin", "super_admin"].includes(r)
      );

      if (redirectTarget && redirectTarget !== "/dashboard") {
        router.push(redirectTarget);
      } else if (isStaffOrAdmin) {
        router.push("/admin");
      } else {
        router.push(redirectTarget || "/dashboard");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (
          err.message.includes("Not Found") ||
          err.message.includes("404") ||
          err.message.includes("Unable to connect")
        ) {
          setError(
            "Backend server is waking up or connecting to the cloud database. Please wait a few moments and try signing in again."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("An unexpected error occurred during login.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSuccess = useCallback(
    (user: SafeUser) => {
      setCurrentUser(user);
      const isStaffOrAdmin = user.roles.some((r) =>
        ["staff", "manager", "admin", "super_admin"].includes(r)
      );

      if (redirectTarget && redirectTarget !== "/dashboard") {
        router.push(redirectTarget);
      } else if (isStaffOrAdmin) {
        router.push("/admin");
      } else {
        router.push(redirectTarget || "/dashboard");
      }
    },
    [redirectTarget, router]
  );

  const handleSocialError = useCallback((errorMessage: string) => {
    if (
      errorMessage.includes("Not Found") ||
      errorMessage.includes("404") ||
      errorMessage.includes("Unable to connect")
    ) {
      setError(
        "Backend server is waking up or connecting to the cloud database. Please wait a few moments and try signing in again."
      );
    } else {
      setError(errorMessage);
    }
  }, []);

  const handleCheckMe = async () => {
    setError(null);
    try {
      const user = await authApi.getMe();
      setCurrentUser(user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
      setCurrentUser(null);
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await authApi.logout();
      setCurrentUser(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const isStaffOrAdmin =
    currentUser?.roles.some((r) =>
      ["staff", "manager", "admin", "super_admin"].includes(r)
    ) ?? false;

  return (
    <div className="w-full">
      {/* Top back navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#636A64] hover:text-[#1C2420] transition-colors font-medium rounded-lg p-1 -m-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Homepage</span>
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A7659]">
          <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
          <span>Member Access</span>
        </div>
      </div>

      {/* Segmented Auth Switcher (Full-width, equal 50/50 distribution) */}
      <div className="w-full grid grid-cols-2 p-1.5 bg-[#F2F0E8] rounded-full mb-6 border border-[#E5E2D8]">
        <span className="py-2.5 text-center text-xs uppercase tracking-wider font-semibold rounded-full bg-[#1C2420] text-[#FAF9F5] shadow-xs flex items-center justify-center">
          Sign In
        </span>
        <Link
          href="/register"
          className="py-2.5 text-center text-xs uppercase tracking-wider font-medium rounded-full text-[#636A64] hover:text-[#1C2420] transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880]"
        >
          Create Account
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#1C2420] tracking-tight">
          Welcome Back
        </h1>
        <p className="text-xs sm:text-sm text-[#636A64] mt-1.5 leading-relaxed">
          Sign in to access your curated bookings, luxury itineraries, and dedicated concierge services with{" "}
          <span className="font-medium text-[#1C2420]">{resolvedBrandName}</span>.
        </p>

        {redirectTarget === "/admin" && (
          <div className="mt-3.5 flex items-start gap-2.5 p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
            <span>Administrative privileges required. Please sign in with an authorized team credential.</span>
          </div>
        )}
      </div>

      {error && (
        <div
          id="auth-error-message"
          role="alert"
          aria-live="polite"
          className="mb-6 p-4 bg-[#FDF2F2] border border-[#F8D7D7] text-[#9E2A2B] text-xs sm:text-sm rounded-2xl leading-relaxed flex items-start gap-3"
        >
          <ShieldAlert className="w-4 h-4 text-[#9E2A2B] shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {currentUser ? (
        <div className="space-y-6 bg-[#FAF9F6] border border-[#E8E6DF] rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-start gap-3.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#1C2420]">Authenticated Session Active</p>
              <p className="text-xs text-[#636A64] mt-1">
                Signed in as:{" "}
                <span className="font-mono text-[#1C2420] font-medium">{currentUser.email}</span>
              </p>
              <p className="text-xs text-[#636A64] mt-0.5">
                Traveller: {currentUser.first_name} {currentUser.last_name}
              </p>
              <p className="text-xs text-[#636A64] mt-0.5">
                Privileges:{" "}
                <span className="font-medium text-[#1C2420]">{currentUser.roles.join(", ")}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-3 border-t border-[#E8E6DF]">
            {isStaffOrAdmin ? (
              <Link
                href="/admin"
                className="w-full h-11 flex items-center justify-center bg-[#1C2420] hover:bg-[#28352F] text-[#FAF9F5] font-semibold rounded-full text-xs uppercase tracking-widest transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880]"
              >
                Go to Admin Portal →
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="w-full h-11 flex items-center justify-center bg-[#1C2420] hover:bg-[#28352F] text-[#FAF9F5] font-semibold rounded-full text-xs uppercase tracking-widest transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880]"
              >
                Go to Customer Dashboard →
              </Link>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCheckMe}
                className="flex-1 h-10 bg-white hover:bg-[#F2F0E8] border border-[#E5E2D8] text-[#1C2420] rounded-full text-xs font-semibold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880]"
              >
                Verify Session
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="h-10 px-5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-full text-xs font-semibold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Social Sign-In (Google & Apple) */}
          <SocialAuthButtons
            onSuccess={handleSocialSuccess}
            onError={handleSocialError}
            disabled={loading}
          />



          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#525754] mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A908B]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAF9F6] border border-[#DDD9CF] text-[#1C2420] placeholder-[#8A908B] text-sm focus:bg-white focus:border-[#C5A880] focus:outline-none focus:ring-2 focus:ring-[#C5A880]/30 transition-all duration-200"
                  placeholder="traveller@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#525754]"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#8A7659] hover:text-[#1C2420] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880] rounded"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A908B]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#FAF9F6] border border-[#DDD9CF] text-[#1C2420] placeholder-[#8A908B] text-sm focus:bg-white focus:border-[#C5A880] focus:outline-none focus:ring-2 focus:ring-[#C5A880]/30 transition-all duration-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8A908B] hover:text-[#1C2420] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880] rounded"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-3 rounded-full bg-[#1C2420] hover:bg-[#26332C] active:scale-[0.99] text-[#FAF9F5] text-xs uppercase tracking-widest font-semibold shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:transform-none cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C5A880]" />
                  <span>Authenticating Session...</span>
                </>
              ) : (
                <span>Sign In to Account</span>
              )}
            </button>
          </form>

          {/* Trust Details & Concierge Helpline */}
          <div className="pt-4 border-t border-[#E8E6DF] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-[#636A64]">
            <div className="inline-flex items-center gap-1.5 text-[#586851]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#586851]" />
              <span className="font-medium">256-Bit SSL Encrypted Session</span>
            </div>

            {whatsappEnabled && Boolean(whatsappHelpUrl) && (
              <a
                href={whatsappHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#8A7659] hover:text-[#1C2420] font-medium transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Concierge Desk Assistance</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Account toggle footer */}
      <div className="mt-8 pt-6 border-t border-[#E8E6DF] text-center text-xs text-[#636A64]">
        <span>New to {resolvedBrandName}? </span>
        <Link
          href="/register"
          className="font-semibold text-[#1C2420] hover:text-[#8A7659] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A880] rounded"
        >
          Create an Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { displayName, settings, city, state, logoUrl } = useBranding();
  const resolvedBrandName = displayName || settings?.agency_name || "KV Tours & Travels";
  const locationText = [city, state].filter(Boolean).join(", ") || settings?.agency_location || "";

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
              alt={resolvedBrandName}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="text-base sm:text-lg font-serif font-bold uppercase tracking-[0.14em] text-[#1C2420] group-hover:text-[#A88045] transition-colors leading-tight">
            {resolvedBrandName}
          </span>
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#8A7659] font-semibold mt-1">
            {locationText ? `${locationText} • Bespoke Journeys` : "Bespoke Journeys & Luxury Travel"}
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

          <Suspense
            fallback={
              <div className="p-12 text-center text-[#636A64] text-sm flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#C5A880]" />
                <span>Loading secure sign-in...</span>
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </main>

      {/* Accessible Footer */}
      <footer className="relative z-10 w-full max-w-md mx-auto pt-6 sm:pt-8 text-center text-[11px] text-[#8A908B] flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <span>© {new Date().getFullYear()} {resolvedBrandName}. All rights reserved.</span>
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
