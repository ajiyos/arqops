"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiResponse, TenantOutboundEmailConfig } from "@/types";
import { Loader2, ArrowLeft } from "lucide-react";

export default function SettingsOutboundEmailPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const isTenantAdmin = user?.roles?.includes("TENANT_ADMIN") ?? false;

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [starttlsEnabled, setStarttlsEnabled] = useState(true);
  const [smtpSsl, setSmtpSsl] = useState(false);

  const configQuery = useQuery({
    queryKey: ["tenant", "outbound-email"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TenantOutboundEmailConfig>>("/api/v1/tenant/outbound-email");
      return data.data!;
    },
    enabled: isTenantAdmin,
  });

  useEffect(() => {
    const cfg = configQuery.data;
    if (!cfg) return;
    setSmtpHost(cfg.smtpHost ?? "");
    setSmtpPort(String(cfg.smtpPort ?? 587));
    setSmtpUsername(cfg.smtpUsername ?? "");
    setFromEmail(cfg.fromEmail ?? "");
    setStarttlsEnabled(cfg.starttlsEnabled ?? true);
    setSmtpSsl(cfg.smtpSsl ?? false);
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const port = parseInt(smtpPort, 10);
      await apiClient.put("/api/v1/tenant/outbound-email", {
        smtpHost: smtpHost.trim(),
        smtpPort: Number.isFinite(port) ? port : 587,
        smtpUsername: smtpUsername.trim(),
        smtpPassword: smtpPassword.trim() || undefined,
        fromEmail: fromEmail.trim(),
        starttlsEnabled,
        smtpSsl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "outbound-email"] });
      setSmtpPassword("");
    },
  });

  if (authLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isTenantAdmin) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h2 className="text-xl font-semibold">Outbound email</h2>
        <p className="text-sm text-muted-foreground">Only tenant administrators can configure SMTP for this workspace.</p>
        <Button variant="outline" asChild>
          <Link href="/settings/profile">Back to settings</Link>
        </Button>
      </div>
    );
  }

  const cfg = configQuery.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2">
        <Link href="/settings/profile">
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Outbound email</CardTitle>
          <CardDescription>
            Contract emails and other tenant-sent mail use this SMTP server and From address. Credentials are encrypted with
            your workspace encryption key. For Resend: host <code className="text-xs">smtp.resend.com</code>, port{" "}
            <code className="text-xs">587</code>, username <code className="text-xs">resend</code>, password = your API key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configQuery.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                {cfg?.passwordConfigured ? (
                  <span>SMTP password saved — enter a new password below only if you want to replace it.</span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400">SMTP password not saved yet (required to send mail).</span>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">SMTP host</label>
                <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.resend.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">SMTP port</label>
                <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">SMTP username</label>
                <Input value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder="resend" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">SMTP password / API key</label>
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder={cfg?.passwordConfigured ? "Leave blank to keep current" : "Required"}
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">From email</label>
                <Input
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="noreply@yourdomain.com"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={starttlsEnabled} onChange={(e) => setStarttlsEnabled(e.target.checked)} />
                  STARTTLS (typical for port 587)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={smtpSsl} onChange={(e) => setSmtpSsl(e.target.checked)} />
                  SSL (typical for port 465)
                </label>
              </div>
              {saveMutation.isError && (
                <p className="text-sm text-destructive">Could not save. Check values and permissions.</p>
              )}
              <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
