"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import type { Activity, ApiResponse, Client, ClientHistory, Contact, Lead } from "@/types";
import {
  ArrowLeft,
  Building2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";

type Tab = "contacts" | "leads" | "activity" | "history";

const ACTIVITY_TYPES = ["Call", "Email", "Meeting", "Note", "Site Visit"] as const;

const STAGE_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-sky-100 text-sky-800",
  QUALIFIED: "bg-violet-100 text-violet-800",
  PROPOSAL_SENT: "bg-amber-100 text-amber-800",
  NEGOTIATION: "bg-orange-100 text-orange-800",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-red-100 text-red-800",
};

function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
        STAGE_COLORS[stage] ?? "bg-muted text-muted-foreground",
      )}
    >
      {stage.replaceAll("_", " ")}
    </span>
  );
}

function ActivityTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    Call: "bg-green-100 text-green-800",
    Email: "bg-blue-100 text-blue-800",
    Meeting: "bg-purple-100 text-purple-800",
    Note: "bg-gray-100 text-gray-800",
    "Site Visit": "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[type] ?? "bg-muted text-muted-foreground",
      )}
    >
      {type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Modal wrapper (follows existing codebase pattern: fixed overlay + Card)
// ---------------------------------------------------------------------------
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md shadow-lg">
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

// ---------------------------------------------------------------------------
// Contact form (used for both add & edit)
// ---------------------------------------------------------------------------
function ContactForm({
  initial,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Contact>;
  isPending: boolean;
  error: boolean;
  onSubmit: (vals: { name: string; designation?: string; email?: string; phone?: string; role?: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [designation, setDesignation] = useState(initial?.designation ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [role, setRole] = useState(initial?.role ?? "");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: name.trim(),
          designation: designation.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role: role.trim() || undefined,
        });
      }}
    >
      <Field label="Name" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" autoFocus />
      </Field>
      <Field label="Designation">
        <Input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Project Manager" />
      </Field>
      <Field label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
      </Field>
      <Field label="Phone">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." />
      </Field>
      <Field label="Role">
        <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Decision Maker" />
      </Field>

      {error && <p className="text-sm text-destructive">Something went wrong. Please try again.</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  );
}

// ===========================================================================
// Main page component
// ===========================================================================
export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clientId = params.id;

  const [activeTab, setActiveTab] = useState<Tab>("contacts");

  // ---- Data fetching ----
  const clientQuery = useQuery({
    queryKey: ["crm", "clients", clientId],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Client>>(`/api/v1/crm/clients/${clientId}`);
      return res.data!;
    },
  });

  const contactsQuery = useQuery({
    queryKey: ["crm", "clients", clientId, "contacts"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Contact[]>>(`/api/v1/crm/clients/${clientId}/contacts`);
      return res.data ?? [];
    },
  });

  const leadsQuery = useQuery({
    queryKey: ["crm", "leads", { clientId }],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Lead[]>>("/api/v1/crm/leads", {
        params: { page: 0, size: 100 },
      });
      return (res.data ?? []).filter((l) => l.clientId === clientId);
    },
  });

  const activitiesQuery = useQuery({
    queryKey: ["crm", "activities", { entityType: "Client", entityId: clientId }],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Activity[]>>("/api/v1/crm/activities", {
        params: { entityType: "Client", entityId: clientId },
      });
      return (res.data ?? []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
  });

  const historyQuery = useQuery({
    queryKey: ["crm", "clients", clientId, "history"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<ClientHistory>>(
        `/api/v1/crm/clients/${clientId}/history`,
      );
      return res.data!;
    },
    enabled: activeTab === "history",
  });

  const client = clientQuery.data;

  // ---- Top-level loading / error ----
  if (clientQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Loading client…</p>
      </div>
    );
  }

  if (clientQuery.isError || !client) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive">Failed to load client details.</p>
        <Button variant="outline" onClick={() => router.push("/crm/clients")}>
          Back to Clients
        </Button>
      </div>
    );
  }

  const historyCount =
    historyQuery.data != null
      ? historyQuery.data.projects.length +
        historyQuery.data.invoices.length +
        historyQuery.data.leads.length
      : undefined;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "contacts", label: "Contacts", count: contactsQuery.data?.length },
    { key: "leads", label: "Leads", count: leadsQuery.data?.length },
    { key: "activity", label: "Activity", count: activitiesQuery.data?.length },
    { key: "history", label: "History", count: historyCount },
  ];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push("/crm/clients")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Clients
      </button>

      {/* Client info header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl">{client.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {[client.type, client.industrySegment].filter(Boolean).join(" · ") || "Client"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem label="Type" value={client.type} />
            <InfoItem label="Industry" value={client.industrySegment} />
            <InfoItem label="GSTIN" value={client.gstin} mono />
            <InfoItem label="PAN" value={client.pan} mono />
          </div>
          {client.billingAddress && Object.keys(client.billingAddress).length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Billing Address</p>
              <p className="text-sm">
                {Object.values(client.billingAddress).filter((v): v is string => Boolean(v)).join(", ")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab navigation */}
      <div className="border-b">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors",
                activeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    "ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs",
                    activeTab === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab panels */}
      {activeTab === "contacts" && (
        <ContactsPanel clientId={clientId} contacts={contactsQuery.data ?? []} isLoading={contactsQuery.isLoading} isError={contactsQuery.isError} queryClient={queryClient} />
      )}
      {activeTab === "leads" && (
        <LeadsPanel leads={leadsQuery.data ?? []} isLoading={leadsQuery.isLoading} isError={leadsQuery.isError} />
      )}
      {activeTab === "activity" && (
        <ActivityPanel clientId={clientId} activities={activitiesQuery.data ?? []} isLoading={activitiesQuery.isLoading} isError={activitiesQuery.isError} queryClient={queryClient} />
      )}
      {activeTab === "history" && (
        <HistoryPanel
          history={historyQuery.data}
          isLoading={historyQuery.isLoading}
          isError={historyQuery.isError}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm", mono && "font-mono", !value && "text-muted-foreground")}>
        {value || "—"}
      </p>
    </div>
  );
}

// ===========================================================================
// Contacts panel
// ===========================================================================
function ContactsPanel({
  clientId,
  contacts,
  isLoading,
  isError,
  queryClient,
}: {
  clientId: string;
  contacts: Contact[];
  isLoading: boolean;
  isError: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm", "clients", clientId, "contacts"] });

  const addMutation = useMutation({
    mutationFn: async (body: { name: string; designation?: string; email?: string; phone?: string; role?: string }) => {
      await apiClient.post(`/api/v1/crm/clients/${clientId}/contacts`, body);
    },
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ contactId, body }: { contactId: string; body: Record<string, unknown> }) => {
      await apiClient.put(`/api/v1/crm/clients/${clientId}/contacts/${contactId}`, body);
    },
    onSuccess: () => {
      invalidate();
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiClient.delete(`/api/v1/crm/clients/${clientId}/contacts/${contactId}`);
    },
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contacts</h2>
        <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Designation</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading…</td>
                  </tr>
                )}
                {!isLoading && isError && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-destructive">Failed to load contacts.</td>
                  </tr>
                )}
                {!isLoading && !isError && contacts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <User className="h-8 w-8 text-muted-foreground/50" />
                        <p>No contacts yet.</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                          Add the first contact
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && contacts.length > 0 &&
                  contacts.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.designation || "—"}</td>
                      <td className="px-4 py-3">
                        {c.email ? (
                          <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                            <Mail className="h-3.5 w-3.5" />
                            {c.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {c.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.role || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTarget(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add contact modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Contact">
        <ContactForm
          isPending={addMutation.isPending}
          error={addMutation.isError}
          onSubmit={(vals) => addMutation.mutate(vals)}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {/* Edit contact modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Contact">
        {editTarget && (
          <ContactForm
            key={editTarget.id}
            initial={editTarget}
            isPending={editMutation.isPending}
            error={editMutation.isError}
            onSubmit={(vals) => editMutation.mutate({ contactId: editTarget.id, body: vals })}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Contact">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget.name}</span>? This action cannot be undone.
            </p>
            {deleteMutation.isError && (
              <p className="text-sm text-destructive">Failed to delete contact.</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ===========================================================================
// Leads panel
// ===========================================================================
function LeadsPanel({
  leads,
  isLoading,
  isError,
}: {
  leads: Lead[];
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return <p className="py-12 text-center text-muted-foreground">Loading leads…</p>;
  }
  if (isError) {
    return <p className="py-12 text-center text-destructive">Failed to load leads.</p>;
  }
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <Building2 className="h-8 w-8 text-muted-foreground/50" />
        <p>No leads linked to this client yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Leads ({leads.length})</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {leads.map((lead) => (
          <Link key={lead.id} href={`/crm/leads/${lead.id}`} className="block">
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium leading-snug">{lead.title}</h3>
                  <StageBadge stage={lead.stage} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {lead.estimatedValue != null && (
                    <span className="font-medium text-foreground">
                      {formatCurrency(lead.estimatedValue)}
                    </span>
                  )}
                  {lead.projectType && <span>{lead.projectType}</span>}
                  {lead.source && <span>via {lead.source}</span>}
                </div>
                {lead.location && (
                  <p className="text-xs text-muted-foreground">{lead.location}</p>
                )}
                <p className="text-xs text-muted-foreground">Created {formatDate(lead.createdAt)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// Activity panel
// ===========================================================================
function ActivityPanel({
  clientId,
  activities,
  isLoading,
  isError,
  queryClient,
}: {
  clientId: string;
  activities: Activity[];
  isLoading: boolean;
  isError: boolean;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const [actType, setActType] = useState<string>(ACTIVITY_TYPES[0]);
  const [actDesc, setActDesc] = useState("");
  const [actDate, setActDate] = useState(() => new Date().toISOString().slice(0, 10));

  const createMutation = useMutation({
    mutationFn: async (body: { entityType: string; entityId: string; type: string; description?: string; date?: string }) => {
      await apiClient.post("/api/v1/crm/activities", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "activities", { entityType: "Client", entityId: clientId }] });
      setLogOpen(false);
      setActType(ACTIVITY_TYPES[0]);
      setActDesc("");
      setActDate(new Date().toISOString().slice(0, 10));
    },
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity</h2>
        <Button type="button" size="sm" onClick={() => setLogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Log Activity
        </Button>
      </div>

      {isLoading && (
        <p className="py-12 text-center text-muted-foreground">Loading activities…</p>
      )}
      {!isLoading && isError && (
        <p className="py-12 text-center text-destructive">Failed to load activities.</p>
      )}
      {!isLoading && !isError && activities.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Building2 className="h-8 w-8 text-muted-foreground/50" />
          <p>No activities recorded yet.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setLogOpen(true)}>
            Log the first activity
          </Button>
        </div>
      )}
      {!isLoading && !isError && activities.length > 0 && (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

          {activities.map((act, i) => (
            <div key={act.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Dot */}
              <div className="relative z-10 mt-1 flex h-[10px] w-[10px] shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background" style={{ marginLeft: "14px" }} />
              {/* Content */}
              <Card className={cn("flex-1", i === 0 && "border-primary/20")}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ActivityTypeBadge type={act.type} />
                        <span className="text-xs text-muted-foreground">{formatDate(act.date)}</span>
                      </div>
                      {act.description && <p className="text-sm">{act.description}</p>}
                    </div>
                    {act.assignedTo && (
                      <span className="text-xs text-muted-foreground">by {act.assignedTo}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Log activity modal */}
      <Modal open={logOpen} onClose={() => setLogOpen(false)} title="Log Activity">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              entityType: "Client",
              entityId: clientId,
              type: actType,
              description: actDesc.trim() || undefined,
              date: actDate || undefined,
            });
          }}
        >
          <Field label="Type" required>
            <select
              value={actType}
              onChange={(e) => setActType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <Input type="date" value={actDate} onChange={(e) => setActDate(e.target.value)} />
          </Field>
          <Field label="Description">
            <textarea
              value={actDesc}
              onChange={(e) => setActDesc(e.target.value)}
              rows={3}
              placeholder="Notes about this activity…"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </Field>

          {createMutation.isError && (
            <p className="text-sm text-destructive">Failed to log activity. Please try again.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setLogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving…" : "Log Activity"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ===========================================================================
// History panel
// ===========================================================================
function HistoryPanel({
  history,
  isLoading,
  isError,
}: {
  history: ClientHistory | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return <p className="py-12 text-center text-muted-foreground">Loading history…</p>;
  }
  if (isError || !history) {
    return <p className="py-12 text-center text-destructive">Failed to load client history.</p>;
  }

  const outstanding = history.totalInvoiced - history.totalPaid;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">History</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(history.totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(history.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(outstanding)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.projects.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No projects linked.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {history.projects.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/projects/${p.id}`} className="font-medium text-primary hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.status}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(p.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.invoices.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {history.invoices.map((inv) => (
                    <tr key={`${inv.invoiceNumber}-${inv.date}`} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.status}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(inv.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.leads.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No leads in history.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Title</th>
                    <th className="px-4 py-3 text-left font-medium">Stage</th>
                    <th className="px-4 py-3 text-right font-medium">Est. value</th>
                  </tr>
                </thead>
                <tbody>
                  {history.leads.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/crm/leads/${lead.id}`} className="font-medium text-primary hover:underline">
                          {lead.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge stage={lead.stage} />
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(lead.estimatedValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
