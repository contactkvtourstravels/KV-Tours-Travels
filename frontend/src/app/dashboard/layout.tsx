"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  User,
  LogOut,
  Menu,
  X,
  Compass,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { getWhatsAppClickToChatUrl } from "@/lib/constants";
import { CustomerProvider, useCustomer } from "./CustomerContext";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const CUSTOMER_NAV: NavItem[] = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Bookings", href: "/dashboard/bookings", icon: CalendarCheck },
  { name: "Saved Travellers", href: "/dashboard/travellers", icon: Users },
  { name: "Profile & Security", href: "/dashboard/profile", icon: User },
];

function CustomerPortalShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useCustomer();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F4] flex flex-col items-center justify-center text-[#70757A]">
        <div className="w-10 h-10 border-2 border-[#E4E5E7] border-t-[#24292F] rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase tracking-widest text-[#24292F] font-semibold">
          Loading KV Tours Customer Portal...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "KV";

  return (
    <div className="min-h-screen bg-[#F3F4F4] text-[#202124] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E5E7] py-3 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="group flex items-center gap-3">
              <div className="h-9 px-3 rounded-full bg-[#24292F] text-white flex items-center justify-center gap-1.5 border border-[#3D4450] shadow-sm group-hover:bg-[#1B1E23] transition-all">
                <Compass className="w-3.5 h-3.5 text-white/90" />
                <span className="font-serif font-black text-xs tracking-wider">KV</span>
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[#202124] font-serif tracking-widest text-sm sm:text-base uppercase font-bold group-hover:text-[#3D4450] transition-colors leading-none">
                  KV Tours & Travels
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#5F6368] font-semibold mt-1">
                  Customer Portal
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5 pl-6 border-l border-[#E4E5E7]">
              {CUSTOMER_NAV.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                      isActive
                        ? "bg-[#24292F] text-white border border-[#24292F] shadow-sm font-bold"
                        : "text-[#70757A] hover:text-[#202124] hover:bg-[#F0F2F5]"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#70757A]"}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Direct WhatsApp Concierge Link */}
            <a
              href={getWhatsAppClickToChatUrl(null, "Hi KV Tours & Travels, I need assistance with my account.")}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#A7E2CB] bg-[#EBF7F2] text-[#0D7A53] text-xs font-semibold hover:bg-[#DCF3EA] transition-all"
              title="Concierge WhatsApp Support"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Concierge</span>
            </a>

            {/* Public Catalog Link */}
            <Link
              href="/packages"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E4E5E7] bg-white text-[#202124] hover:bg-[#F7F7F5] text-xs font-semibold transition-all shadow-sm"
            >
              <Compass className="w-3.5 h-3.5 text-[#24292F]" />
              <span>Explore Packages</span>
            </Link>

            {/* User Profile Badge */}
            <div className="flex items-center gap-2.5 pl-2 sm:pl-3 sm:border-l border-[#E4E5E7]">
              <div className="w-8 h-8 rounded-full bg-[#F7F7F5] border border-[#E4E5E7] flex items-center justify-center text-[#202124] text-xs font-bold shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs text-[#202124] font-semibold truncate max-w-[120px]">
                  {user.first_name || user.email.split("@")[0]}
                </span>
                <span className="text-[10px] text-[#70757A] uppercase font-medium">Customer</span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => logout()}
              type="button"
              className="p-2 rounded-full text-[#70757A] hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full text-[#70757A] hover:text-[#202124] hover:bg-white"
              aria-label="Toggle Portal Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-[#202124]" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E4E5E7] bg-white px-4 pt-3 pb-4 space-y-2 shadow-lg">
            {CUSTOMER_NAV.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? "bg-[#24292F] text-white border border-[#24292F] font-bold"
                      : "text-[#70757A] hover:text-[#202124] hover:bg-[#F3F4F4]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-2 border-t border-[#E4E5E7] flex flex-col gap-2">
              <Link
                href="/packages"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#202124] hover:text-[#3D4450]"
              >
                <Compass className="w-4 h-4 text-[#24292F]" />
                <span>Explore Packages</span>
              </Link>
              <a
                href={getWhatsAppClickToChatUrl(null, "Hi KV Tours & Travels, I need concierge assistance with my account.")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#0D7A53] font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Concierge</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer Note */}
      <footer className="border-t border-[#E4E5E7] bg-white py-6 text-center text-xs text-[#70757A]">
        <p className="tracking-wider uppercase">
          KV Tours & Travels &bull; Coimbatore, Tamil Nadu &bull; Official Customer Portal
        </p>
      </footer>
    </div>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerProvider>
      <CustomerPortalShell>{children}</CustomerPortalShell>
    </CustomerProvider>
  );
}
