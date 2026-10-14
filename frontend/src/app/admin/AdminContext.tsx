"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, SafeUser } from "@/lib/api";

export type AdminRole = "customer" | "staff" | "manager" | "admin" | "super_admin";

interface AdminContextType {
  user: SafeUser | null;
  loading: boolean;
  highestRole: AdminRole;
  hasRole: (role: AdminRole) => boolean;
  hasAnyRole: (roles: AdminRole[]) => boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ROLE_RANKS: Record<AdminRole, number> = {
  customer: 10,
  staff: 20,
  manager: 30,
  admin: 40,
  super_admin: 50,
};

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const profile = await authApi.getMe();
      setUser(profile);
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      if (error.status === 401) {
        router.push("/login?redirect=/admin");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const highestRole: AdminRole = (() => {
    if (!user || !user.roles.length) return "customer";
    let highest: AdminRole = "customer";
    let maxRank = 0;
    for (const r of user.roles as AdminRole[]) {
      const rank = ROLE_RANKS[r] || 0;
      if (rank > maxRank) {
        maxRank = rank;
        highest = r;
      }
    }
    return highest;
  })();

  const hasRole = (role: AdminRole): boolean => {
    if (!user) return false;
    if (user.roles.includes("super_admin")) return true;
    return user.roles.includes(role);
  };

  const hasAnyRole = (roles: AdminRole[]): boolean => {
    if (!user) return false;
    if (user.roles.includes("super_admin")) return true;
    return roles.some((r) => user.roles.includes(r));
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AdminContext.Provider
      value={{
        user,
        loading,
        highestRole,
        hasRole,
        hasAnyRole,
        refreshUser: fetchUser,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
