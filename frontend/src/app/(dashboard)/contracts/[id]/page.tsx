"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";
import { useTenantBrandingProfile } from "@/lib/tenant-branding/tenant-branding-context";
import type {
  ApiResponse,
  Client,
  Contact,
  ContractDetail,
  ContractParty,
  ContractPartyKind,
  ContractRevision,
  Vendor,
} from "@/types";
import {
  ArrowLeft,
  Loader2,
  Save,
  Sparkles,
  Send,
  Download,
  Upload,
  Trash2,
} from "lucide-react";

type PartyDraft = {
  partyKind: ContractPartyKind;
  clientId: string;
  vendorId: string;
  displayName: string;
  contactEmail: string;
};

const STATUSES = ["draft", "review", "sent", "signed", "archived"] as const;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

async function authDownload(path: string, filename: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Prefer decision-maker / signatory roles, else first contact with an email. */
function pickContactEmailFromContacts(contacts: Contact[]): string {
  const withEmail = contacts.filter((c) => c.email?.trim());
  const preferred = withEmail.find((c) => {
    const role = (c.role ?? "").toLowerCase();
    return (
      role.includes("decision") ||
      role.includes("owner") ||
      role.includes("sign") ||
      role.includes("director")
    );
  });
  return (preferred?.email ?? withEmail[0]?.email ?? "").trim();
}

function partiesToDrafts(parties: ContractParty[]): PartyDraft[] {
  if (!parties.length) {
    return [{ partyKind: "FIRM", clientId: "", vendorId: "", displayName: "", contactEmail: "" }];
  }
  return parties.map((p) => ({
    partyKind: p.partyKind,
    clientId: p.clientId ?? "",
    vendorId: p.vendorId ?? "",
    displayName: p.displayName ?? "",
    contactEmail: p.contactEmail ?? "",
  }));
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const tenantBranding = useTenantBrandingProfile();
  const canWrite = (user?.permissions ?? []).includes("contract.write");

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [projectId, setProjectId] = useState("");
  const [partyDrafts, setPartyDrafts] = useState<PartyDraft[]>([]);
  const [selectedRevId, setSelectedRevId] = useState<string | null>(null);
  const [editorBody, setEditorBody] = useState("");
  const [genOpen, setGenOpen] = useState(false);
  const [genInstructions, setGenInstructions] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [sendSubject, setSendSubject] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendEmails, setSendEmails] = useState("");
  const [uploadRevId, setUploadRevId] = useState("");

  const detailQuery = useQuery({
    queryKey: ["contracts", id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ContractDetail>>(`/api/v1/contracts/${id}`);
      return data.data!;
    },
  });

  const clientsQuery = useQuery({
    queryKey: ["contracts", "clients"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Client[]>>("/api/v1/crm/clients", { params: { page: 0, size: 500 } });
      return data.data ?? [];
    },
    enabled: canWrite,
  });

  const vendorsQuery = useQuery({
    queryKey: ["contracts", "vendors"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Vendor[]>>("/api/v1/vendor/vendors", { params: { page: 0, size: 500 } });
      return data.data ?? [];
    },
    enabled: canWrite,
  });

  const projectsQuery = useQuery({
    queryKey: ["contracts", "projects"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<{ id: string; name: string }[]>>("/api/v1/project/projects", {
        params: { page: 0, size: 200 },
      });
      return data.data ?? [];
    },
    enabled: canWrite,
  });

  const c = detailQuery.data;

  useEffect(() => {
    if (!c) return;
    setTitle(c.title);
    setStatus(c.status);
    setProjectId(c.projectId ?? "");
    setPartyDrafts(partiesToDrafts(c.parties));
  }, [c]);

  useEffect(() => {
    if (!c?.revisions?.length) return;
    setSelectedRevId((prev) => {
      if (prev && c.revisions!.some((r) => r.id === prev)) return prev;
      const latest = [...c.revisions!].sort((a, b) => b.revisionNumber - a.revisionNumber)[0];
      return latest.id;
    });
  }, [c]);

  useEffect(() => {
    if (!c || !selectedRevId) return;
    const r = c.revisions?.find((x) => x.id === selectedRevId);
    if (r) setEditorBody(r.body ?? "");
  }, [c, selectedRevId]);

  const selectedRevision = useMemo(() => {
    if (!c?.revisions || !selectedRevId) return null;
    return c.revisions.find((r) => r.id === selectedRevId) ?? null;
  }, [c, selectedRevId]);

  function selectRevision(r: ContractRevision) {
    setSelectedRevId(r.id);
    setEditorBody(r.body ?? "");
  }

  const saveMetaMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put(`/api/v1/contracts/${id}`, {
        title: title.trim(),
        projectId: projectId || undefined,
        status,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts", id] }),
  });

  const savePartiesMutation = useMutation({
    mutationFn: async () => {
      const parties = partyDrafts
        .filter((row) => row.partyKind === "FIRM" || row.clientId || row.vendorId)
        .map((row) => ({
          partyKind: row.partyKind,
          clientId: row.partyKind === "CLIENT" ? row.clientId || undefined : undefined,
          vendorId: row.partyKind === "VENDOR" ? row.vendorId || undefined : undefined,
          displayName: row.displayName.trim() || undefined,
          contactEmail: row.contactEmail.trim() || undefined,
        }));
      await apiClient.put(`/api/v1/contracts/${id}/parties`, parties);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts", id] }),
  });

  const saveRevisionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ApiResponse<ContractRevision>>(`/api/v1/contracts/${id}/revisions`, {
        body: editorBody,
      });
      return data.data;
    },
    onSuccess: (rev) => {
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
      if (rev?.id) setSelectedRevId(rev.id);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ApiResponse<ContractRevision>>(`/api/v1/contracts/${id}/revisions/generate`, {
        userInstructions: genInstructions.trim() || undefined,
      });
      return data.data;
    },
    onSuccess: (rev) => {
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
      setGenOpen(false);
      setGenInstructions("");
      if (rev?.id) {
        setSelectedRevId(rev.id);
        setEditorBody(rev.body ?? "");
      }
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRevId) throw new Error("Select a revision");
      const recipientEmails = sendEmails
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter(Boolean);
      await apiClient.post(`/api/v1/contracts/${id}/send`, {
        revisionId: selectedRevId,
        subject: sendSubject.trim() || undefined,
        message: sendMessage.trim() || undefined,
        recipientEmails: recipientEmails.length ? recipientEmails : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
      setSendOpen(false);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const params = uploadRevId ? `?revisionId=${uploadRevId}` : "";
      await apiClient.post(`/api/v1/contracts/${id}/signed${params}`, form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts", id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/v1/contracts/${id}`);
    },
    onSuccess: () => router.push("/contracts"),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (detailQuery.isError || !c) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Could not load contract.</p>
        <Button variant="outline" asChild>
          <Link href="/contracts">Back</Link>
        </Button>
      </div>
    );
  }

  const clients = clientsQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const revisions = [...(c.revisions ?? [])].sort((a, b) => b.revisionNumber - a.revisionNumber);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contracts" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{c.title}</h1>
            <p className="text-sm text-muted-foreground">
              {revisions.length} revision{revisions.length === 1 ? "" : "s"}
              {c.projectId && (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`/projects/${c.projectId}`} className="text-primary hover:underline">
                    View project
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate()}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contract details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Project</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Firm-level (no project)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button size="sm" disabled={saveMetaMutation.isPending} onClick={() => saveMetaMutation.mutate()}>
                {saveMetaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parties</CardTitle>
            <p className="text-sm text-muted-foreground">Firm, clients, or vendors. Set contact emails to include them when sending.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {partyDrafts.map((row, idx) => (
              <div key={idx} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Kind</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={row.partyKind}
                    onChange={(e) => {
                      const v = e.target.value as ContractPartyKind;
                      setPartyDrafts((rows) =>
                        rows.map((r, i) => {
                          if (i !== idx) return r;
                          const cleared = { ...r, partyKind: v, clientId: "", vendorId: "" };
                          if (v === "FIRM") {
                            const tp = tenantBranding;
                            return {
                              ...cleared,
                              displayName: tp?.name ?? "",
                              contactEmail: (tp?.googleDriveConnectedEmail ?? "").trim(),
                            };
                          }
                          return { ...cleared, displayName: "", contactEmail: "" };
                        }),
                      );
                    }}
                  >
                    <option value="FIRM">Firm</option>
                    <option value="CLIENT">Client</option>
                    <option value="VENDOR">Vendor</option>
                  </select>
                </div>
                {row.partyKind === "CLIENT" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Client</label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={row.clientId}
                      onChange={async (e) => {
                        const clientId = e.target.value;
                        setPartyDrafts((rows) => rows.map((r, i) => (i === idx ? { ...r, clientId } : r)));
                        if (!clientId) return;
                        try {
                          const [{ data: clRes }, { data: ctRes }] = await Promise.all([
                            apiClient.get<ApiResponse<Client>>(`/api/v1/crm/clients/${clientId}`),
                            apiClient.get<ApiResponse<Contact[]>>(`/api/v1/crm/clients/${clientId}/contacts`),
                          ]);
                          const client = clRes.data;
                          const contacts = ctRes.data ?? [];
                          const email = pickContactEmailFromContacts(contacts);
                          if (client) {
                            setPartyDrafts((rows) =>
                              rows.map((r, i) =>
                                i === idx && r.clientId === clientId
                                  ? { ...r, displayName: client.name, contactEmail: email }
                                  : r,
                              ),
                            );
                          }
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      <option value="">Select client</option>
                      {clients.map((cl) => (
                        <option key={cl.id} value={cl.id}>
                          {cl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {row.partyKind === "VENDOR" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Vendor</label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={row.vendorId}
                      onChange={async (e) => {
                        const vendorId = e.target.value;
                        setPartyDrafts((rows) => rows.map((r, i) => (i === idx ? { ...r, vendorId } : r)));
                        if (!vendorId) return;
                        try {
                          const { data } = await apiClient.get<ApiResponse<Vendor>>(`/api/v1/vendor/vendors/${vendorId}`);
                          const v = data.data;
                          if (v) {
                            setPartyDrafts((rows) =>
                              rows.map((r, i) =>
                                i === idx && r.vendorId === vendorId
                                  ? { ...r, displayName: v.name, contactEmail: (v.email ?? "").trim() }
                                  : r,
                              ),
                            );
                          }
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Display name (optional)</label>
                  <Input
                    value={row.displayName}
                    onChange={(e) =>
                      setPartyDrafts((rows) => rows.map((r, i) => (i === idx ? { ...r, displayName: e.target.value } : r)))
                    }
                    placeholder="Party label"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Contact email</label>
                  <Input
                    value={row.contactEmail}
                    onChange={(e) =>
                      setPartyDrafts((rows) => rows.map((r, i) => (i === idx ? { ...r, contactEmail: e.target.value } : r)))
                    }
                    placeholder="name@example.com"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPartyDrafts((rows) => rows.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPartyDrafts((rows) => [
                    ...rows,
                    { partyKind: "CLIENT", clientId: "", vendorId: "", displayName: "", contactEmail: "" },
                  ])
                }
              >
                Add party
              </Button>
              <Button size="sm" disabled={savePartiesMutation.isPending} onClick={() => savePartiesMutation.mutate()}>
                Save parties
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revisions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {revisions.map((r) => (
              <Button
                key={r.id}
                type="button"
                size="sm"
                variant={selectedRevId === r.id ? "default" : "outline"}
                onClick={() => selectRevision(r)}
              >
                #{r.revisionNumber} ({r.source})
              </Button>
            ))}
          </div>
          {canWrite && (
            <textarea
              className="min-h-[280px] w-full rounded-md border border-input bg-background p-3 font-mono text-sm"
              value={editorBody}
              onChange={(e) => setEditorBody(e.target.value)}
              disabled={!selectedRevision}
            />
          )}
          {!canWrite && selectedRevision && (
            <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
              {selectedRevision.body}
            </pre>
          )}
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={saveRevisionMutation.isPending || !selectedRevId} onClick={() => saveRevisionMutation.mutate()}>
                <Save className="mr-1 h-4 w-4" />
                Save as new revision
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setGenOpen(true)}>
                <Sparkles className="mr-1 h-4 w-4" />
                Generate with AI
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedRevId}
                onClick={() =>
                  selectedRevId &&
                  authDownload(
                    `/api/v1/contracts/${id}/revisions/${selectedRevId}/export?format=md`,
                    `contract-rev-${selectedRevision?.revisionNumber ?? ""}.md`,
                  )
                }
              >
                <Download className="mr-1 h-4 w-4" />
                Export .md
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedRevId}
                onClick={() =>
                  selectedRevId &&
                  authDownload(
                    `/api/v1/contracts/${id}/revisions/${selectedRevId}/export?format=txt`,
                    `contract-rev-${selectedRevision?.revisionNumber ?? ""}.txt`,
                  )
                }
              >
                <Download className="mr-1 h-4 w-4" />
                Export .txt
              </Button>
              <Button size="sm" variant="outline" disabled={!selectedRevId} onClick={() => setSendOpen(true)}>
                <Send className="mr-1 h-4 w-4" />
                Send to parties
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signed documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canWrite && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Link to revision (optional)</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={uploadRevId}
                  onChange={(e) => setUploadRevId(e.target.value)}
                >
                  <option value="">None</option>
                  {revisions.map((r) => (
                    <option key={r.id} value={r.id}>
                      #{r.revisionNumber}
                    </option>
                  ))}
                </select>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <Upload className="h-4 w-4" />
                <span>Upload signed file</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadMutation.mutate(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
          <ul className="space-y-2 text-sm">
            {(c.signedDocuments ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 border-b border-border/50 py-2">
                <span className="truncate">{d.fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    authDownload(`/api/v1/contracts/${id}/signed/${d.id}/download`, d.fileName || "signed.pdf")
                  }
                >
                  Download
                </Button>
              </li>
            ))}
            {!(c.signedDocuments ?? []).length && <li className="text-muted-foreground">No signed uploads yet.</li>}
          </ul>
        </CardContent>
      </Card>

      {(c.sendLog ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {c.sendLog.map((log) => (
                <li key={log.id} className="rounded border p-2">
                  <div className="font-medium">{log.status}</div>
                  <div className="text-muted-foreground">{log.recipientEmails}</div>
                  {log.errorMessage && <div className="text-destructive">{log.errorMessage}</div>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {genOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={() => !generateMutation.isPending && setGenOpen(false)} />
          <Card className="relative z-10 w-full max-w-lg shadow-lg">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">Generate with AI</h2>
              <p className="text-sm text-muted-foreground">
                Uses your workspace Contract AI settings. Adds the latest draft and party context automatically.
              </p>
              <textarea
                className="min-h-[120px] w-full rounded-md border border-input bg-background p-2 text-sm"
                placeholder="Optional instructions (scope, jurisdiction, payment terms, …)"
                value={genInstructions}
                onChange={(e) => setGenInstructions(e.target.value)}
              />
              {generateMutation.isError && (
                <p className="text-sm text-destructive">Generation failed. Check API key in Settings and try again.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGenOpen(false)} disabled={generateMutation.isPending}>
                  Cancel
                </Button>
                <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {sendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={() => !sendMutation.isPending && setSendOpen(false)} />
          <Card className="relative z-10 w-full max-w-lg shadow-lg">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">Send contract</h2>
              <p className="text-sm text-muted-foreground">Emails the selected revision as a Markdown attachment. Leave recipients blank to use party contact emails.</p>
              <Input placeholder="Subject" value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} />
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-background p-2 text-sm"
                placeholder="Email body"
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
              />
              <Input
                placeholder="Recipients (comma-separated), optional"
                value={sendEmails}
                onChange={(e) => setSendEmails(e.target.value)}
              />
              {sendMutation.isError && <p className="text-sm text-destructive">Send failed. Configure SMTP on the server or check emails.</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sendMutation.isPending}>
                  Cancel
                </Button>
                <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !selectedRevId}>
                  {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
