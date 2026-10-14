"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Download,
  ArrowRight,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  UserCheck,
} from "lucide-react";
import {
  adminCustomersApi,
  adminExportsApi,
  CustomerListItem,
  PaginatedResponse,
} from "@/lib/api";

export default function CustomersAdminPage() {
  const [customers, setCustomers] = useState<PaginatedResponse<CustomerListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminCustomersApi.list({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
      });
      setCustomers(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-400" />
            Customer Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Registered customer accounts, travel histories, and cumulative spending.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCustomers()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <a
            href={adminExportsApi.getCustomersUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Search
        </button>
      </form>

      {/* Table & Content */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-900 border border-slate-800 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-rose-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchCustomers()}
            className="px-4 py-2 bg-slate-800 text-slate-200 text-sm rounded-lg"
          >
            Try Again
          </button>
        </div>
      ) : !customers || customers.items.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <UserCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No Customers Found</h3>
          <p className="text-sm text-slate-400 mt-1">
            {search ? "No matching records found for your search query." : "No customers registered yet."}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Bookings</th>
                  <th className="py-3.5 px-4 text-center">Upcoming Trips</th>
                  <th className="py-3.5 px-4 text-right">Total Paid</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {customers.items.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-100">
                        {cust.first_name} {cust.last_name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {cust.email}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-xs">
                      {cust.phone ? (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {cust.phone}
                        </div>
                      ) : (
                        <span className="text-slate-500">No phone</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          cust.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {cust.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center font-mono font-medium">
                      {cust.total_bookings}
                    </td>

                    <td className="py-4 px-4 text-center">
                      {cust.upcoming_trips > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-medium">
                          <Calendar className="w-3 h-3" />
                          {cust.upcoming_trips}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">0</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-right font-medium text-slate-200">
                      ₹{Number(cust.total_paid).toLocaleString("en-IN")}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <Link
                        href={`/admin/customers/${cust.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-medium transition-colors"
                      >
                        Profile <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {customers.total_pages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div>
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, customers.total)} of {customers.total} customers
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(customers.total_pages, p + 1))}
                  disabled={page >= customers.total_pages}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
