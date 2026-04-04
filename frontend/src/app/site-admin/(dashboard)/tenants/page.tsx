"use client";

import { useEffect, useState, useCallback } from "react";
import platformApi from "@/lib/platform/platform-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  subdomainSlug: string;
  plan: string;
  status: string;
  createdAt: string;
}

interface PageResponse {
  content: Tenant[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

const STATUS_OPTIONS = ["active", "suspended", "deactivated"] as const;

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  suspended: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  deactivated: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await platformApi.get("/api/v1/platform/tenants", {
        params: { page, size: 20, sort: "createdAt,desc" },
      });
      const pg: PageResponse = data.data;
      setTenants(pg.content);
      setTotalElements(pg.totalElements);
      setTotalPages(pg.totalPages);
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const updateStatus = async (id: string, status: string) => {
    setStatusUpdating(id);
    try {
      await platformApi.patch(`/api/v1/platform/tenants/${id}/status`, { status });
      await fetchTenants();
    } catch {
      // ignore
    } finally {
      setStatusUpdating(null);
    }
  };

  const filtered = search
    ? tenants.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.subdomainSlug.toLowerCase().includes(search.toLowerCase())
      )
    : tenants;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Tenants</h1>
          <p className="text-sm text-slate-400">
            {totalElements} organization{totalElements !== 1 ? "s" : ""} on the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchTenants}
            className="text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            className="bg-amber-500 text-slate-950 hover:bg-amber-400"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Tenant
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-slate-700 bg-slate-900 pl-10 text-slate-50 placeholder:text-slate-500 focus-visible:ring-amber-500"
        />
      </div>

      {/* Table */}
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="px-6 py-3 font-medium">Organization</th>
                  <th className="px-6 py-3 font-medium">Slug</th>
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No tenants found
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-amber-500">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-200">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                          {t.subdomainSlug}
                        </code>
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-300">{t.plan || "—"}</td>
                      <td className="px-6 py-4">
                        <select
                          value={t.status}
                          disabled={statusUpdating === t.id}
                          onChange={(e) => updateStatus(t.id, e.target.value)}
                          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${
                            statusColor[t.status] || "border-slate-700 bg-slate-800 text-slate-400"
                          } bg-transparent focus:outline-none focus:ring-1 focus:ring-amber-500`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s} className="bg-slate-900 text-slate-300">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          onClick={() => {
                            /* future: tenant detail */
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800 px-6 py-3">
              <p className="text-xs text-slate-500">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-slate-400 hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-slate-400 hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Tenant Modal */}
      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchTenants();
          }}
        />
      )}
    </div>
  );
}

function CreateTenantModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    subdomainSlug: "",
    plan: "starter",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "name" && !form.subdomainSlug) {
      setForm((prev) => ({
        ...prev,
        [field]: value,
        subdomainSlug: value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await platformApi.post("/api/v1/platform/tenants", form);
      onCreated();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || "Failed to create tenant";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-lg border-slate-800 bg-slate-900 text-slate-50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-slate-50">Create Tenant</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Organization Name</label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="border-slate-700 bg-slate-800 text-slate-50 placeholder:text-slate-500 focus-visible:ring-amber-500"
                  placeholder="Acme Architecture"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Slug</label>
                <Input
                  required
                  value={form.subdomainSlug}
                  onChange={(e) => setForm((p) => ({ ...p, subdomainSlug: e.target.value }))}
                  className="border-slate-700 bg-slate-800 text-slate-50 placeholder:text-slate-500 focus-visible:ring-amber-500"
                  placeholder="acme-architecture"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Plan</label>
              <select
                value={form.plan}
                onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <p className="mb-3 text-sm font-medium text-slate-300">Tenant Admin Account</p>
              <div className="space-y-3">
                <Input
                  required
                  placeholder="Admin full name"
                  value={form.adminName}
                  onChange={(e) => setForm((p) => ({ ...p, adminName: e.target.value }))}
                  className="border-slate-700 bg-slate-800 text-slate-50 placeholder:text-slate-500 focus-visible:ring-amber-500"
                />
                <Input
                  required
                  type="email"
                  placeholder="admin@company.com"
                  value={form.adminEmail}
                  onChange={(e) => setForm((p) => ({ ...p, adminEmail: e.target.value }))}
                  className="border-slate-700 bg-slate-800 text-slate-50 placeholder:text-slate-500 focus-visible:ring-amber-500"
                />
                <Input
                  required
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={form.adminPassword}
                  onChange={(e) => setForm((p) => ({ ...p, adminPassword: e.target.value }))}
                  className="border-slate-700 bg-slate-800 text-slate-50 placeholder:text-slate-500 focus-visible:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                {submitting ? "Creating..." : "Create Tenant"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
