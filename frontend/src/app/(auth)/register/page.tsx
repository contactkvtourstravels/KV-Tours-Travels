"use client";

import Link from "next/link";
import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import { authApi, SafeUser } from "@/lib/api";
import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<SafeUser | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authApi.register({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || undefined,
        password,
      });
      setRegisteredUser(response.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F4] flex flex-col lg:flex-row items-stretch">
      {/* Left 38% Branding Panel */}
      <AuthBrandingPanel
        title="Begin your bespoke journey."
        tagline="Create your KV Tours profile to reserve luxury packages, coordinate custom itineraries, and stay connected with our Coimbatore team."
      />

      {/* Right Content Panel */}
      <div className="flex-1 flex items-center justify-center bg-white lg:bg-[#F3F4F4] p-4 sm:p-8">
        <div className="w-full max-w-lg bg-white lg:rounded-3xl lg:border lg:border-[#E4E5E7] lg:shadow-xl overflow-hidden p-6 sm:p-10">
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
            <Link
              href="/login"
              className="flex-1 py-2 text-center text-xs uppercase tracking-wider font-semibold rounded-full text-[#70757A] hover:text-[#202124] transition-colors"
            >
              Sign In
            </Link>
            <span className="flex-1 py-2 text-center text-xs uppercase tracking-wider font-bold rounded-full bg-white text-[#202124] shadow-sm">
              Create Account
            </span>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-serif font-bold text-[#202124] tracking-tight">
              Create Your Account
            </h1>
            <p className="text-sm text-[#70757A] mt-1.5">
              Join KV Tours & Travels to explore luxury getaways and manage your travel bookings.
            </p>
          </div>

          {error && (
            <div
              id="register-error-message"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl leading-relaxed"
            >
              {error}
            </div>
          )}

          {registeredUser ? (
            <div className="space-y-5 bg-[#F7F7F5] border border-[#E4E5E7] rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-serif font-bold text-[#202124]">
                    Registration Successful!
                  </h3>
                  <p className="text-xs text-[#70757A] mt-1">
                    Account created for: <span className="font-mono text-[#202124] font-medium">{registeredUser.email}</span>
                  </p>
                  <p className="text-xs text-[#70757A]">
                    Welcome, {registeredUser.first_name}! You can now sign in to start planning your dream journey.
                  </p>
                </div>
              </div>

              <Link
                href="/login"
                className="w-full h-11 flex items-center justify-center bg-[#24292F] hover:bg-[#3D4450] text-white font-bold rounded-full text-xs uppercase tracking-widest transition shadow-sm"
              >
                Continue to Sign In →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="reg-first-name"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#70757A] mb-1.5"
                  >
                    First Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#70757A]/60">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-first-name"
                      name="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/50 text-sm focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                      placeholder="Jane"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-last-name"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#70757A] mb-1.5"
                  >
                    Last Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#70757A]/60">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-last-name"
                      name="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/50 text-sm focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#70757A] mb-1.5"
                >
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#70757A]/60">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/50 text-sm focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                    placeholder="jane.doe@example.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-phone"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#70757A] mb-1.5"
                >
                  Phone / WhatsApp (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#70757A]/60">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/50 text-sm focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                    placeholder="+91 94420 00000"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#70757A] mb-1.5"
                >
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#70757A]/60">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-white border border-[#E4E5E7] text-[#202124] placeholder-[#70757A]/50 text-sm focus:border-[#24292F] focus:outline-none focus:ring-1 focus:ring-[#24292F] transition-all"
                    placeholder="Min 8 chars, Aa, 1, @"
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
                <p className="text-[11px] text-[#70757A] mt-1.5 leading-tight">
                  Must contain at least 8 characters, with uppercase, lowercase, numbers, and special symbols.
                </p>
              </div>

              <button
                id="register-submit-button"
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-2 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs uppercase tracking-widest font-bold shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          )}

          {/* Footer link to sign in */}
          <div className="mt-8 pt-6 border-t border-[#E4E5E7] text-center text-xs text-[#70757A]">
            <span>Already have an account? </span>
            <Link
              href="/login"
              className="font-semibold text-[#202124] hover:text-[#3D4450] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
