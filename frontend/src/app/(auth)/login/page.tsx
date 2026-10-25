"use client";

import Link from "next/link";
import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldAlert } from "lucide-react";
import { authApi, SafeUser } from "@/lib/api";
import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { useBranding } from "@/context/BrandingContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect");
  const { displayName } = useBranding();

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
        setError(err.message);
      } else {
        setError("An unexpected error occurred during login.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSuccess = (user: SafeUser) => {
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
  };

  const handleSocialError = (errorMessage: string) => {
    setError(errorMessage);
  };

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
    <div className="w-full max-w-lg mx-auto p-6 sm:p-10">
      {/* Top back navigation */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#70757A] hover:text-[#202124] transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Auth Toggle Tabs */}
      <div className="flex items-center p-1 bg-[#F3F4F4] rounded-full mb-8 border border-[#E4E5E7] max-w-xs">
        <span className="flex-1 py-2 text-center text-xs uppercase tracking-wider font-bold rounded-full bg-white text-[#202124] shadow-sm">
          Sign In
        </span>
        <Link
          href="/register"
          className="flex-1 py-2 text-center text-xs uppercase tracking-wider font-semibold rounded-full text-[#70757A] hover:text-[#202124] transition-colors"
        >
          Create Account
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-[#202124] tracking-tight">
          Welcome Back
        </h1>
        <p className="text-sm text-[#70757A] mt-1.5">
          Sign in to access your curated bookings, itineraries, and concierge services.
        </p>

        {redirectTarget === "/admin" && (
          <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>Administrative access required. Please sign in with an authorized team account.</span>
          </div>
        )}
      </div>

      {error && (
        <div
          id="auth-error-message"
          className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl leading-relaxed"
        >
          {error}
        </div>
      )}

      {currentUser ? (
        <div className="space-y-5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#202124]">Authenticated Session Active</p>
              <p className="text-xs text-[#70757A] mt-1">
                Signed in as: <span className="font-mono text-[#202124] font-medium">{currentUser.email}</span>
              </p>
              <p className="text-xs text-[#70757A]">
                Traveller: {currentUser.first_name} {currentUser.last_name}
              </p>
              <p className="text-xs text-[#70757A]">
                Roles: <span className="font-semibold text-[#24292F]">{currentUser.roles.join(", ")}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2 border-t border-[#E4E5E7]">
            {isStaffOrAdmin ? (
              <Link
                href="/admin"
                className="w-full h-11 flex items-center justify-center bg-[#24292F] hover:bg-[#3D4450] text-white font-semibold rounded-full text-xs uppercase tracking-widest transition shadow-xs"
              >
                Go to Admin Portal →
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="w-full h-11 flex items-center justify-center bg-[#24292F] hover:bg-[#3D4450] text-white font-bold rounded-full text-xs uppercase tracking-widest transition shadow-xs"
              >
                Go to Customer Dashboard →
              </Link>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCheckMe}
                className="flex-1 h-10 bg-white hover:bg-[#F3F4F4] border border-[#E4E5E7] text-[#202124] rounded-full text-xs font-semibold uppercase tracking-wider transition"
              >
                Verify Session
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="h-10 px-5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-full text-xs font-semibold uppercase tracking-wider transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <SocialAuthButtons
            onSuccess={handleSocialSuccess}
            onError={handleSocialError}
            disabled={loading}
          />

          <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold uppercase tracking-wider text-[#70757A] mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#70757A]/60">
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
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/50 text-sm focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#70757A]"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#5F6368] hover:text-[#202124] font-medium transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#70757A]/60">
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
                className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/50 text-sm focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#70757A] hover:text-[#202124] transition-colors"
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
            className="w-full h-11 mt-2 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? "Authenticating..." : "Sign In to Account"}
          </button>
        </form>
      </div>
      )}

      {/* Footer link to register */}
      <div className="mt-8 pt-6 border-t border-[#E4E5E7] text-center text-xs text-[#70757A]">
        <span>New to {displayName || "our platform"}? </span>
        <Link
          href="/register"
          className="font-semibold text-[#202124] hover:text-[#3D4450] transition-colors"
        >
          Create an Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { city } = useBranding();
  return (
    <div className="min-h-screen bg-[#F3F4F4] flex flex-col lg:flex-row items-stretch">
      {/* Left 38% Branding Panel */}
      <AuthBrandingPanel
        title="Every journey, thoughtfully designed."
        tagline={`Sign in to manage your bookings, download luxury travel itineraries, and contact your dedicated ${city || "travel"} concierge.`}
      />

      {/* Right Content Panel */}
      <div className="flex-1 flex items-center justify-center bg-white lg:bg-[#F3F4F4] p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white lg:rounded-3xl lg:border lg:border-[#E4E5E7] lg:shadow-xl overflow-hidden">
          <Suspense fallback={<div className="p-12 text-center text-[#70757A] text-sm">Loading sign in...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
