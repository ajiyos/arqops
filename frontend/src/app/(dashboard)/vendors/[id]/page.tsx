"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { ApiResponse, Vendor, VendorScorecard, WorkOrder } from "@/types";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShoppingCart,
  Star,
  Trash2,
  X,
} from "lucide-react";

const EMPTY_FORM = {
  name: "",
  category: "",
  specialty: "",
  gstin: "",
  pan: "",
  address: "",
  phone: "",
  email: "",
};

function vendorStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "active") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (s === "inactive") return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  if (s === "suspended") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
  return "bg-muted text-muted-foreground";
}

function averageRating(s: VendorScorecard): number {
  return (s.qualityRating + s.timelinessRating + s.costRating) / 3;
}

function RatingCell({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5" title={`${value}/5`}>
      <div className="flex text-amber-500">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn("h-3.5 w-3.5", i < Math.round(value) ? "fill-current" : "fill-none opacity-25")}
          />
        ))}
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{value}/5</span>
    </div>
  );
}

function woStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "draft") return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
  if (s === "pending") return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  if (s === "approved") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (s === "rejected") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
  if (s === "completed") return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200";
  return "bg-muted text-muted-foreground";
}

function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className={cn("w-full max-w-md shadow-lg", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl">{title}</CardTitle>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm", mono && "font-mono", !value && "text-muted-foreground")}>
        {value || "—"}
      </p>
    </div>
  );
}

export default function VendorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const vendorId = params.id;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sectionTab, setSectionTab] = useState<"work-orders" | "scorecards">("work-orders");
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);
  const [scorecardForm, setScorecardForm] = useState({
    qualityRating: 3,
    timelinessRating: 3,
    costRating: 3,
    notes: "",
  });

  const vendorQuery = useQuery({
    queryKey: ["vendor", "vendors", vendorId],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Vendor>>(`/api/v1/vendor/vendors/${vendorId}`);
      return res.data!;
    },
  });

  const workOrdersQuery = useQuery({
    queryKey: ["vendor", "work-orders", { vendorId }],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<WorkOrder[]>>("/api/v1/vendor/work-orders", {
        params: { vendorId, size: 100 },
      });
      return res.data ?? [];
    },
  });

  const scorecardsQuery = useQuery({
    queryKey: ["vendor", "scorecards", vendorId],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<VendorScorecard[]>>(
        `/api/v1/vendor/vendors/${vendorId}/scorecards`,
      );
      return res.data ?? [];
    },
    enabled: Boolean(vendorId),
  });

  const createScorecardMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/v1/vendor/vendors/${vendorId}/scorecards`, {
        qualityRating: scorecardForm.qualityRating,
        timelinessRating: scorecardForm.timelinessRating,
        costRating: scorecardForm.costRating,
        notes: scorecardForm.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "scorecards", vendorId] });
      setScorecardModalOpen(false);
      setScorecardForm({ qualityRating: 3, timelinessRating: 3, costRating: 3, notes: "" });
    },
  });

  const deleteScorecardMutation = useMutation({
    mutationFn: async (scorecardId: string) => {
      await apiClient.delete(`/api/v1/vendor/vendors/${vendorId}/scorecards/${scorecardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "scorecards", vendorId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        specialty: form.specialty.trim() || null,
        gstin: form.gstin.trim() || null,
        pan: form.pan.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
      };
      await apiClient.put(`/api/v1/vendor/vendors/${vendorId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "vendors", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["vendor", "vendors"] });
      setEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/v1/vendor/vendors/${vendorId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", "vendors"] });
      router.push("/vendors");
    },
  });

  function openEdit() {
    const v = vendorQuery.data;
    if (!v) return;
    setForm({
      name: v.name,
      category: v.category || "",
      specialty: v.specialty || "",
      gstin: v.gstin || "",
      pan: v.pan || "",
      address: v.address || "",
      phone: v.phone || "",
      email: v.email || "",
    });
    setEditOpen(true);
  }

  const vendor = vendorQuery.data;

  if (vendorQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Loading vendor…</p>
      </div>
    );
  }

  if (vendorQuery.isError || !vendor) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive">Failed to load vendor details.</p>
        <Button variant="outline" onClick={() => router.push("/vendors")}>
          Back to Vendors
        </Button>
      </div>
    );
  }

  const workOrders = workOrdersQuery.data ?? [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push("/vendors")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Vendors
      </button>

      {/* Vendor info header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">{vendor.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[vendor.category, vendor.specialty].filter(Boolean).join(" · ") || "Vendor"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                      vendorStatusClass(vendor.status)
                    )}
                  >
                    {vendor.status}
                  </span>
                  <Button variant="outline" size="sm" onClick={openEdit}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem label="Category" value={vendor.category} />
            <InfoItem label="Specialty" value={vendor.specialty} />
            <InfoItem label="GSTIN" value={vendor.gstin} mono />
            <InfoItem label="PAN" value={vendor.pan} mono />
          </div>
          <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendor.address && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm">{vendor.address}</p>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="text-sm">{vendor.phone}</p>
              </div>
            )}
            {vendor.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a href={`mailto:${vendor.email}`} className="text-sm text-primary hover:underline">
                  {vendor.email}
                </a>
              </div>
            )}
            {!vendor.address && !vendor.phone && !vendor.email && (
              <p className="text-sm text-muted-foreground">No contact information on file.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Work orders & scorecards */}
      <div className="space-y-4">
        <div className="border-b">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setSectionTab("work-orders")}
              className={cn(
                "whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors",
                sectionTab === "work-orders"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Work Orders
              {workOrdersQuery.data && (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                  {workOrders.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setSectionTab("scorecards")}
              className={cn(
                "whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors",
                sectionTab === "scorecards"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Scorecards
              {scorecardsQuery.data && (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                  {scorecardsQuery.data.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {sectionTab === "work-orders" && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">WO Number</th>
                      <th className="px-4 py-3 font-medium">Scope</th>
                      <th className="px-4 py-3 font-medium">Value (INR)</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Start Date</th>
                      <th className="px-4 py-3 font-medium">End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workOrdersQuery.isLoading && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading work orders…</td>
                      </tr>
                    )}
                    {!workOrdersQuery.isLoading && workOrdersQuery.isError && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-destructive">Failed to load work orders.</td>
                      </tr>
                    )}
                    {!workOrdersQuery.isLoading && !workOrdersQuery.isError && workOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          No work orders for this vendor.
                        </td>
                      </tr>
                    )}
                    {!workOrdersQuery.isLoading && !workOrdersQuery.isError && workOrders.length > 0 &&
                      workOrders.map((wo) => (
                        <tr key={wo.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-xs font-medium">{wo.woNumber}</td>
                          <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground" title={wo.scope || undefined}>
                            {wo.scope || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {wo.value != null ? formatCurrency(Number(wo.value)) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                                woStatusClass(wo.status)
                              )}
                            >
                              {wo.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {wo.startDate ? formatDate(wo.startDate) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {wo.endDate ? formatDate(wo.endDate) : "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {sectionTab === "scorecards" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Vendor scorecards</CardTitle>
              <Button type="button" size="sm" onClick={() => setScorecardModalOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Scorecard
              </Button>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Quality</th>
                      <th className="px-4 py-3 font-medium">Timeliness</th>
                      <th className="px-4 py-3 font-medium">Cost</th>
                      <th className="px-4 py-3 font-medium">Average</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecardsQuery.isLoading && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading scorecards…</td>
                      </tr>
                    )}
                    {!scorecardsQuery.isLoading && scorecardsQuery.isError && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-destructive">Failed to load scorecards.</td>
                      </tr>
                    )}
                    {!scorecardsQuery.isLoading && !scorecardsQuery.isError && (scorecardsQuery.data?.length ?? 0) === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No scorecards yet. Add one to track vendor performance.
                        </td>
                      </tr>
                    )}
                    {!scorecardsQuery.isLoading &&
                      !scorecardsQuery.isError &&
                      (scorecardsQuery.data ?? []).map((sc) => (
                        <tr key={sc.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <RatingCell value={sc.qualityRating} />
                          </td>
                          <td className="px-4 py-3">
                            <RatingCell value={sc.timelinessRating} />
                          </td>
                          <td className="px-4 py-3">
                            <RatingCell value={sc.costRating} />
                          </td>
                          <td className="px-4 py-3 font-medium tabular-nums">
                            {averageRating(sc).toFixed(1)} / 5
                          </td>
                          <td className="max-w-[220px] px-4 py-3 text-muted-foreground" title={sc.notes || undefined}>
                            {sc.notes?.trim() ? sc.notes : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {formatDate(sc.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              disabled={deleteScorecardMutation.isPending}
                              onClick={() => deleteScorecardMutation.mutate(sc.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete scorecard</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit vendor modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Vendor">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Contractor" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Specialty</label>
              <Input value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} placeholder="e.g. Electrical" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">GSTIN</label>
              <Input value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">PAN</label>
              <Input value={form.pan} onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))} placeholder="ABCDE1234F" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Full address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 ..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="vendor@example.com" />
            </div>
          </div>
          {updateMutation.isError && <p className="text-sm text-destructive">Update failed. Please check the fields.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={!form.name.trim() || updateMutation.isPending} onClick={() => updateMutation.mutate()}>
              {updateMutation.isPending ? "Saving…" : "Update"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add scorecard modal */}
      <Modal
        open={scorecardModalOpen}
        onClose={() => !createScorecardMutation.isPending && setScorecardModalOpen(false)}
        title="Add Scorecard"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                ["qualityRating", "Quality rating"] as const,
                ["timelinessRating", "Timeliness rating"] as const,
                ["costRating", "Cost rating"] as const,
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={scorecardForm[key]}
                  onChange={(e) =>
                    setScorecardForm((f) => ({ ...f, [key]: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 }))
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} / 5
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={scorecardForm.notes}
              onChange={(e) => setScorecardForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional feedback"
            />
          </div>
          {createScorecardMutation.isError && (
            <p className="text-sm text-destructive">Could not save scorecard. Please try again.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              disabled={createScorecardMutation.isPending}
              onClick={() => setScorecardModalOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={createScorecardMutation.isPending} onClick={() => createScorecardMutation.mutate()}>
              {createScorecardMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Vendor">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{vendor.name}</span>? This action cannot be undone.
          </p>
          {deleteMutation.isError && <p className="text-sm text-destructive">Failed to delete vendor.</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
