"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Rocket,
  X,
  Loader2,
  Phone,
  Mail,
  Users,
  StickyNote,
  MapPin,
  Plus,
  Calendar,
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type {
  ApiResponse,
  Lead,
  Client,
  LeadStage,
  Activity,
} from "@/types";
import { useTenantProjectTypesQuery } from "@/lib/hooks/use-tenant-project-types";

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  contacted:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  "proposal sent":
    "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  negotiation:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  won: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  lost: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

function stageBadgeClass(stage: string): string {
  return (
    STAGE_COLORS[stage.toLowerCase()] ?? "bg-muted text-muted-foreground"
  );
}

const ACTIVITY_TYPES = ["Call", "Email", "Meeting", "Note", "Site Visit"];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  Call: <Phone className="h-4 w-4" />,
  Email: <Mail className="h-4 w-4" />,
  Meeting: <Users className="h-4 w-4" />,
  Note: <StickyNote className="h-4 w-4" />,
  "Site Visit": <MapPin className="h-4 w-4" />,
};

interface LeadFormData {
  title: string;
  clientId: string;
  source: string;
  projectType: string;
  estimatedValue: string;
  location: string;
  stage: string;
  notes: string;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const leadId = params.id as string;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [form, setForm] = useState<LeadFormData>({
    title: "",
    clientId: "",
    source: "",
    projectType: "",
    estimatedValue: "",
    location: "",
    stage: "",
    notes: "",
  });
  const [activityForm, setActivityForm] = useState({
    type: "Call",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const leadQuery = useQuery({
    queryKey: ["crm", "leads", leadId],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Lead>>(
        `/api/v1/crm/leads/${leadId}`
      );
      return res.data!;
    },
  });

  const stagesQuery = useQuery({
    queryKey: ["crm", "lead-stages"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<LeadStage[]>>(
        "/api/v1/crm/leads/stages"
      );
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const clientsQuery = useQuery({
    queryKey: ["crm", "clients", "all"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Client[]>>(
        "/api/v1/crm/clients",
        { params: { page: 0, size: 100 } }
      );
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: tenantProjectTypes } = useTenantProjectTypesQuery();
  const projectTypeSelectOptions = useMemo(() => {
    const base = tenantProjectTypes ?? [];
    const legacy = leadQuery.data?.projectType?.trim();
    if (legacy && !base.some((t) => t.name === legacy)) {
      return [{ id: "__legacy__", name: legacy, displayOrder: -1 }, ...base];
    }
    return base;
  }, [tenantProjectTypes, leadQuery.data?.projectType]);

  const activitiesQuery = useQuery({
    queryKey: ["crm", "activities", "Lead", leadId],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Activity[]>>(
        "/api/v1/crm/activities",
        { params: { entityType: "Lead", entityId: leadId } }
      );
      return res.data ?? [];
    },
  });

  const lead = leadQuery.data;
  const stages = stagesQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const activities = activitiesQuery.data ?? [];

  const clientName = useMemo(() => {
    if (!lead?.clientId) return null;
    return clients.find((c) => c.id === lead.clientId)?.name ?? null;
  }, [lead?.clientId, clients]);

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      await apiClient.put(`/api/v1/crm/leads/${leadId}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      setEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/v1/crm/leads/${leadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      router.push("/crm/leads");
    },
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/api/v1/crm/leads/${leadId}/convert`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const stageMutation = useMutation({
    mutationFn: async (newStage: string) => {
      await apiClient.put(`/api/v1/crm/leads/${leadId}`, {
        ...lead,
        stage: newStage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads", leadId] });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
    },
  });

  const activityMutation = useMutation({
    mutationFn: async (body: {
      entityType: string;
      entityId: string;
      type: string;
      description?: string;
      date: string;
    }) => {
      await apiClient.post("/api/v1/crm/activities", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["crm", "activities", "Lead", leadId],
      });
      setActivityOpen(false);
      setActivityForm({
        type: "Call",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
    },
  });

  function openEdit() {
    if (!lead) return;
    setForm({
      title: lead.title,
      clientId: lead.clientId ?? "",
      source: lead.source ?? "",
      projectType: lead.projectType ?? "",
      estimatedValue:
        lead.estimatedValue != null ? String(lead.estimatedValue) : "",
      location: lead.location ?? "",
      stage: lead.stage,
      notes: lead.notes ?? "",
    });
    setEditOpen(true);
  }

  function handleUpdate() {
    const body: Record<string, unknown> = {
      title: form.title.trim(),
      clientId: form.clientId || undefined,
      source: form.source.trim() || undefined,
      projectType: form.projectType.trim() || undefined,
      estimatedValue: form.estimatedValue
        ? Number(form.estimatedValue)
        : undefined,
      location: form.location.trim() || undefined,
      stage: form.stage || undefined,
      notes: form.notes.trim() || undefined,
    };
    updateMutation.mutate(body);
  }

  function handleLogActivity() {
    activityMutation.mutate({
      entityType: "Lead",
      entityId: leadId,
      type: activityForm.type,
      description: activityForm.description.trim() || undefined,
      date: activityForm.date,
    });
  }

  const setField = (key: keyof LeadFormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  if (leadQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (leadQuery.isError || !lead) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-destructive">Failed to load lead details.</p>
        <Button type="button" variant="outline" asChild>
          <Link href="/crm/leads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leads
          </Link>
        </Button>
      </div>
    );
  }

  const canConvert =
    lead.stage.toLowerCase() !== "won" && lead.stage.toLowerCase() !== "lost";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" asChild>
            <Link href="/crm/leads">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{lead.title}</h1>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(lead.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          {canConvert && (
            <Button
              type="button"
              size="sm"
              disabled={convertMutation.isPending}
              onClick={() => convertMutation.mutate()}
            >
              {convertMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              Convert to Project
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lead Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Lead Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Stage
                </dt>
                <dd className="mt-1">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                      stageBadgeClass(lead.stage)
                    )}
                  >
                    {lead.stage}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Client
                </dt>
                <dd className="mt-1 text-sm">
                  {clientName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Source
                </dt>
                <dd className="mt-1 text-sm">{lead.source ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Project Type
                </dt>
                <dd className="mt-1 text-sm">{lead.projectType ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Estimated Value
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {lead.estimatedValue != null
                    ? formatCurrency(Number(lead.estimatedValue))
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Location
                </dt>
                <dd className="mt-1 text-sm">{lead.location ?? "—"}</dd>
              </div>
              {lead.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Notes
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm">
                    {lead.notes}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Stage Change */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Move Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className={selectClass}
              value={lead.stage}
              onChange={(e) => stageMutation.mutate(e.target.value)}
              disabled={stageMutation.isPending}
            >
              {stages
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
            </select>
            {stageMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating…
              </div>
            )}
            {stageMutation.isError && (
              <p className="text-sm text-destructive">
                Failed to update stage.
              </p>
            )}
            {convertMutation.isError && (
              <p className="text-sm text-destructive">
                Failed to convert lead.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activities Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Activity Timeline</CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={() => setActivityOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Log Activity
          </Button>
        </CardHeader>
        <CardContent>
          {activitiesQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No activities recorded yet.
            </p>
          ) : (
            <div className="relative space-y-0">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
              {activities
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .map((activity) => (
                  <div key={activity.id} className="relative flex gap-4 py-3">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
                      {ACTIVITY_ICONS[activity.type] ?? (
                        <Calendar className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">
                          {activity.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(activity.date)}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                      )}
                      {activity.assignedTo && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Assigned to: {activity.assignedTo}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditOpen(false);
          }}
        >
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Edit Lead</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setEditOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Client
                  </label>
                  <select
                    className={selectClass}
                    value={form.clientId}
                    onChange={(e) => setField("clientId", e.target.value)}
                  >
                    <option value="">None</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Stage
                  </label>
                  <select
                    className={selectClass}
                    value={form.stage}
                    onChange={(e) => setField("stage", e.target.value)}
                  >
                    {stages
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Source
                  </label>
                  <Input
                    value={form.source}
                    onChange={(e) => setField("source", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Project Type
                  </label>
                  <select
                    className={selectClass}
                    value={form.projectType}
                    onChange={(e) => setField("projectType", e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {projectTypeSelectOptions.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Estimated Value (₹)
                  </label>
                  <Input
                    type="number"
                    value={form.estimatedValue}
                    onChange={(e) =>
                      setField("estimatedValue", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Location
                  </label>
                  <Input
                    value={form.location}
                    onChange={(e) => setField("location", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Notes
                </label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                />
              </div>
              {updateMutation.isError && (
                <p className="text-sm text-destructive">
                  Failed to update lead.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!form.title.trim() || updateMutation.isPending}
                  onClick={handleUpdate}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Update"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteOpen(false);
          }}
        >
          <Card className="w-full max-w-sm shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Delete Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  {lead.title}
                </span>
                ? This action cannot be undone.
              </p>
              {deleteMutation.isError && (
                <p className="text-sm text-destructive">
                  Failed to delete lead.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Log Activity Modal */}
      {activityOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivityOpen(false);
          }}
        >
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Log Activity</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setActivityOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Type
                </label>
                <select
                  className={selectClass}
                  value={activityForm.type}
                  onChange={(e) =>
                    setActivityForm((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Date
                </label>
                <Input
                  type="date"
                  value={activityForm.date}
                  onChange={(e) =>
                    setActivityForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={activityForm.description}
                  onChange={(e) =>
                    setActivityForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What happened?"
                />
              </div>
              {activityMutation.isError && (
                <p className="text-sm text-destructive">
                  Failed to log activity.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActivityOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={activityMutation.isPending}
                  onClick={handleLogActivity}
                >
                  {activityMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Log Activity"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
