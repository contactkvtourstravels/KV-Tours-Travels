"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  Shield,
  Activity,
  X,
  AlertCircle,
} from "lucide-react";
import { adminApi, AdminUser, PaginatedResponse } from "@/lib/api";
import { useAdmin } from "../AdminContext";

const ALL_ROLES = ["customer", "staff", "manager", "admin", "super_admin"] as const;

export default function UsersAdminPage() {
  const { user: currentAdmin, highestRole } = useAdmin();
  const isSuperAdmin = highestRole === "super_admin";

  const [users, setUsers] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals
  const [statusModalUser, setStatusModalUser] = useState<AdminUser | null>(null);
  const [newStatus, setNewStatus] = useState<string>("active");
  const [statusReason, setStatusReason] = useState("");

  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getUsers({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        role: filterRole === "all" ? undefined : filterRole,
        status: filterStatus === "all" ? undefined : filterStatus,
      });
      setUsers(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load user accounts.");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterRole, filterStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openStatusModal = (user: AdminUser) => {
    setStatusModalUser(user);
    setNewStatus(user.status);
    setStatusReason("");
    setModalError(null);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalUser) return;
    setModalError(null);
    setModalSubmitting(true);

    try {
      await adminApi.updateUserStatus(statusModalUser.id, {
        status: newStatus,
        reason: statusReason.trim() || undefined,
      });
      setSuccessMessage(`Account status for ${statusModalUser.email} updated to "${newStatus}".`);
      setStatusModalUser(null);
      fetchUsers();
    } catch (err: unknown) {
      setModalError((err as Error).message || "Failed to update user status.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const openRoleModal = (user: AdminUser) => {
    setRoleModalUser(user);
    setSelectedRoles([...user.roles]);
    setModalError(null);
  };

  const toggleRoleSelection = (role: string) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length === 1) {
        setModalError("A user must have at least one role assigned.");
        return;
      }
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModalUser) return;
    if (selectedRoles.length === 0) {
      setModalError("At least one role must be selected.");
      return;
    }
    setModalError(null);
    setModalSubmitting(true);

    try {
      await adminApi.updateUserRoles(roleModalUser.id, {
        roles: selectedRoles,
      });
      setSuccessMessage(`Roles updated for ${roleModalUser.email}.`);
      setRoleModalUser(null);
      fetchUsers();
    } catch (err: unknown) {
      setModalError((err as Error).message || "Failed to update roles.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "suspended":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "inactive":
        return "bg-slate-800 text-slate-400 border-slate-700";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-indigo-400" />
            <span>User Accounts</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Directory of registered customer identities, role allocations, and security statuses.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by user name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-850 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-850 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customer</option>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-850 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Roles</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    Loading user directory...
                  </td>
                </tr>
              ) : !users || users.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    No accounts match the current query.
                  </td>
                </tr>
              ) : (
                users.items.map((u) => {
                  const isCurrentSelf = currentAdmin?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">
                          {u.first_name} {u.last_name}
                          {isCurrentSelf && (
                            <span className="ml-2 text-[10px] text-indigo-400 font-normal">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                        {u.phone && <div className="text-[11px] text-slate-500">{u.phone}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span
                              key={r}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60 uppercase"
                            >
                              {r.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border capitalize ${statusBadge(
                            u.status
                          )}`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openStatusModal(u)}
                            disabled={isCurrentSelf}
                            title={isCurrentSelf ? "Cannot modify own status" : "Update Account Status"}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => openRoleModal(u)}
                              title="Modify Assigned Roles"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-400 transition-colors"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {users && users.total_pages > 1 && (
          <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <span className="font-semibold text-white">{users.page}</span> of{" "}
              <span className="font-semibold text-white">{users.total_pages}</span> ({users.total} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= users.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Modal */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Update Account Status: {statusModalUser.email}</span>
              </h2>
              <button onClick={() => setStatusModalUser(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="active">Active (Full access)</option>
                  <option value="suspended">Suspended (Sessions immediately revoked)</option>
                  <option value="inactive">Inactive (Disabled)</option>
                  <option value="pending_verification">Pending Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Reason for Audit Record (optional)
                </label>
                <input
                  type="text"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="e.g. Terms of service violation, customer request"
                  className="w-full px-3 py-2 bg-slate-850 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusModalUser(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50"
                >
                  {modalSubmitting ? "Saving..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Assignment Modal (Super Admin only) */}
      {roleModalUser && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Modify Roles: {roleModalUser.email}</span>
              </h2>
              <button onClick={() => setRoleModalUser(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[11px] text-purple-300 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Role changes are audited and grant immediate backend capabilities upon next request.
              </span>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-4 text-xs">
              <div className="space-y-2">
                {ALL_ROLES.map((role) => {
                  const isRoleSuperAdmin = role === "super_admin";
                  const isEligibleForSuperAdmin =
                    ["athulsuresh4466@gmail.com", "athulsuresh446@gmail.com"].includes(
                      roleModalUser.email.toLowerCase().trim()
                    );
                  const isDisabled = isRoleSuperAdmin && !isEligibleForSuperAdmin;

                  return (
                    <label
                      key={role}
                      className={`flex items-center justify-between p-2.5 rounded-lg border border-slate-800 transition-colors ${
                        isDisabled
                          ? "bg-slate-900/40 text-slate-500 cursor-not-allowed opacity-60"
                          : "bg-slate-850 hover:bg-slate-800/80 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="capitalize text-slate-200">{role.replace("_", " ")}</span>
                        {isDisabled && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                            Authorized Super Admin Only
                          </span>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        disabled={isDisabled}
                        checked={selectedRoles.includes(role)}
                        onChange={() => !isDisabled && toggleRoleSelection(role)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-0 disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold disabled:opacity-50"
                >
                  {modalSubmitting ? "Updating..." : "Save Assigned Roles"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
