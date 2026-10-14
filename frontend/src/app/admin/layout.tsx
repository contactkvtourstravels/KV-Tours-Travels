"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  Package as PackageIcon,
  Building2,
  Compass,
  CalendarCheck,
  Users,
  MessageSquare,
  Tag,
  Settings,
  ShieldAlert,
  UserCheck,
  LogOut,
  ExternalLink,
  Menu,
  CreditCard,
  TrendingUp,
  Download,
  Calendar,
  FileSpreadsheet,
  Globe,
  Image as ImageIcon,
  MessageCircle,
  Percent,
  Landmark,
  Info,
  PhoneCall,
} from "lucide-react";
import { AdminProvider, useAdmin, AdminRole } from "./AdminContext";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: AdminRole[];
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        name: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
    ],
  },
  {
    title: "Travel Catalog",
    items: [
      {
        name: "Destinations",
        href: "/admin/destinations",
        icon: MapPin,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
      {
        name: "Packages",
        href: "/admin/packages",
        icon: PackageIcon,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
      {
        name: "Best Offers",
        href: "/admin/offers",
        icon: Percent,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
      {
        name: "Hotels",
        href: "/admin/hotels",
        icon: Building2,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
      {
        name: "Activities",
        href: "/admin/activities",
        icon: Compass,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
      {
        name: "Add-ons",
        href: "/admin/add-ons",
        icon: Tag,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
      {
        name: "Group Trips & Departures",
        href: "/admin/departures",
        icon: Calendar,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
      {
        name: "Media Library",
        href: "/admin/media",
        icon: ImageIcon,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        name: "Bookings",
        href: "/admin/bookings",
        icon: CalendarCheck,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
      {
        name: "Customers",
        href: "/admin/customers",
        icon: Users,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
      {
        name: "Inquiries & Leads",
        href: "/admin/inquiries",
        icon: MessageSquare,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
      {
        name: "Departure Manifests",
        href: "/admin/departures?tab=manifest",
        icon: FileSpreadsheet,
        roles: ["staff", "manager", "admin", "super_admin"],
      },
    ],
  },
  {
    title: "Finance & Reports",
    items: [
      {
        name: "Payments & Reconciliation",
        href: "/admin/payments",
        icon: CreditCard,
        roles: ["manager", "admin", "super_admin"],
      },
      {
        name: "Bank Accounts",
        href: "/admin/bank-accounts",
        icon: Landmark,
        roles: ["manager", "admin", "super_admin"],
      },
      {
        name: "Analytics",
        href: "/admin/analytics",
        icon: TrendingUp,
        roles: ["manager", "admin", "super_admin"],
      },
      {
        name: "Exports",
        href: "/admin/exports",
        icon: Download,
        roles: ["manager", "admin", "super_admin"],
      },
    ],
  },
  {
    title: "Website Content",
    items: [
      {
        name: "Main Website",
        href: "/admin/content/main",
        icon: Globe,
        roles: ["admin", "super_admin"],
      },
      {
        name: "Destinations Page",
        href: "/admin/content/destinations",
        icon: MapPin,
        roles: ["admin", "super_admin"],
      },
      {
        name: "Packages Page",
        href: "/admin/content/packages",
        icon: PackageIcon,
        roles: ["admin", "super_admin"],
      },
      {
        name: "Group Trips Page",
        href: "/admin/content/group-trips",
        icon: Calendar,
        roles: ["admin", "super_admin"],
      },
      {
        name: "Custom Trip Page",
        href: "/admin/content/custom-trip",
        icon: Compass,
        roles: ["admin", "super_admin"],
      },
      {
        name: "About Page",
        href: "/admin/content/about",
        icon: Info,
        roles: ["admin", "super_admin"],
      },
      {
        name: "Contact Page",
        href: "/admin/content/contact",
        icon: PhoneCall,
        roles: ["admin", "super_admin"],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        name: "Staff & Roles",
        href: "/admin/users",
        icon: UserCheck,
        roles: ["admin", "super_admin"],
      },
      {
        name: "Settings & Integrations",
        href: "/admin/settings",
        icon: Settings,
        roles: ["admin", "super_admin"],
      },
      {
        name: "Activity Logs",
        href: "/admin/audit-logs",
        icon: ShieldAlert,
        roles: ["admin", "super_admin"],
      },
    ],
  },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, highestRole, hasAnyRole, logout } = useAdmin();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center text-[#202124]">
        <div className="w-10 h-10 border-4 border-[#24292F] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#70757A]">
          Loading KV Tours Admin Portal...
        </p>
      </div>
    );
  }

  // Unauthorized guard: Customer or unauthenticated
  const isAdminOrStaff = hasAnyRole(["staff", "manager", "admin", "super_admin"]);
  if (!user || !isAdminOrStaff) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex flex-col items-center justify-center p-6 text-center text-[#202124]">
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-[#202124] mb-2">Access Denied (403 Forbidden)</h1>
        <p className="text-sm text-[#70757A] max-w-md mb-8">
          Your account ({user?.email || "Guest"}) does not possess administrative staff privileges.
          Only authorized staff, managers, and administrators may access this portal.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full border border-[#D3D8DF] bg-white hover:bg-[#F3F4F4] text-[#24292F] text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
          >
            Return to Public Site
          </Link>
          <button
            onClick={logout}
            className="px-5 py-2.5 rounded-full bg-[#24292F] hover:bg-[#3D4450] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const roleBadgeStyles: Record<string, string> = {
    super_admin: "bg-[#24292F] text-white border-[#24292F]",
    admin: "bg-[#3D4450] text-white border-[#3D4450]",
    manager: "bg-[#ECEFF3] text-[#24292F] border-[#D3D8DF]",
    staff: "bg-white text-[#5F6368] border-[#D3D8DF]",
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E4E5E7] text-[#202124]">
      {/* Brand Header */}
      <div className="h-20 px-6 border-b border-[#E4E5E7] flex items-center justify-between bg-white">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#24292F] flex items-center justify-center text-white font-serif font-bold text-base shadow-xs">
            KV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base tracking-tight text-[#202124]">
                KV TOURS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-[#ECEFF3] text-[#24292F] border border-[#D3D8DF]">
                Admin
              </span>
            </div>
            <p className="text-[10px] text-[#70757A] font-medium tracking-wide">
              Coimbatore Operations Portal
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {NAVIGATION_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => hasAnyRole(item.roles));
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="space-y-1">
              <h2 className="px-3 text-[11px] font-bold text-[#70757A] uppercase tracking-wider mb-2">
                {section.title}
              </h2>
              {visibleItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href.split("?")[0]));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#24292F] text-white shadow-xs font-bold"
                        : "text-[#3D4450] hover:text-[#202124] hover:bg-[#F3F4F4]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#70757A]"}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ECEFF3] text-[#24292F] border border-[#D3D8DF]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-[#E4E5E7] bg-[#F7F7F5]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-white border border-[#D3D8DF] flex items-center justify-center text-xs font-bold text-[#24292F] shrink-0 shadow-2xs">
              {user.first_name[0]}
              {user.last_name[0]}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-[#202124] truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[11px] text-[#70757A] truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-[#70757A] hover:text-rose-600 hover:bg-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              roleBadgeStyles[highestRole] || "bg-white text-[#24292F] border-[#D3D8DF]"
            }`}
          >
            {highestRole.replace("_", " ")}
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Session
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 shadow-xs z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10">
            {navContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[#E4E5E7] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#3D4450] hover:bg-[#F3F4F4]"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#70757A]">
              <span className="hidden sm:inline">KV Tours & Travels Operations</span>
              <span className="hidden sm:inline text-[#D3D8DF]">/</span>
              <span className="text-[#202124] font-bold capitalize">
                {pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D3D8DF] bg-white hover:bg-[#ECEFF3] text-[#24292F] text-xs font-bold transition-all shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-[#5F6368]" />
              <span className="hidden sm:inline">View Public Website</span>
              <ExternalLink className="w-3 h-3 text-[#70757A]" />
            </Link>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
