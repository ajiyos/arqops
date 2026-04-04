"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiResponse, TenantProfileResponse } from "@/types";
import { useAuth } from "@/lib/auth/auth-context";
import {
  hslTripletFromTheme,
  parseThemeFromSettings,
  THEME_PRESET_OPTIONS,
  type TenantThemePreset,
} from "@/lib/tenant-branding/tenant-theme";
import { Loader2, Upload } from "lucide-react";

function apiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { error?: { message?: string } } | undefined;
    if (body?.error?.message) return body.error.message;
  }
  return fallback;
}

function googleDriveErrorFlashText(reason: string | null): string {
  if (reason === "no_refresh_token") {
    return "Google did not return a refresh token. Try again or revoke app access in your Google account and reconnect.";
  }
  if (reason === "oauth_not_configured") {
    return "Google OAuth credentials were missing when Google redirected back. Save your workspace client ID and secret, then connect again.";
  }
  if (reason === "missing_oauth_params") {
    return "Google did not return an authorization code. Check the authorized redirect URI in Google Cloud Console matches the backend callback URL exactly.";
  }
  if (reason === "invalid_state") {
    return "OAuth state was invalid or expired. Close extra tabs and try Connect again within a few minutes.";
  }
  if (reason === "exchange_failed") {
    return "Could not exchange the authorization code for tokens. Verify the workspace OAuth client secret and redirect URI.";
  }
  if (reason?.startsWith("google_redirect_uri_mismatch") || reason === "google_redirect_uri_mismatch") {
    return "Redirect URI mismatch: in Google Cloud Console, add the exact callback URL shown under Settings (including http vs https and localhost vs 127.0.0.1).";
  }
  if (reason?.startsWith("google_access_denied") || reason === "google_access_denied") {
    return "Google sign-in was cancelled or blocked. Try again or add your account as a test user if the OAuth app is in testing mode.";
  }
  if (reason?.startsWith("google_")) {
    return `Google returned an error (${reason.replace(/^google_/, "")}). Check OAuth consent screen, APIs enabled (Drive), and redirect URI.`;
  }
  return "Google Drive connection failed. Try again or contact support.";
}

export default function SettingsProfilePage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isTenantAdmin = (user?.roles ?? []).includes("TENANT_ADMIN");

  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [address, setAddress] = useState("");
  const [driveFlash, setDriveFlash] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");

  const [themePreset, setThemePreset] = useState<TenantThemePreset>("default");
  const [themeH, setThemeH] = useState(221);
  const [themeS, setThemeS] = useState(83);
  const [themeL, setThemeL] = useState(53);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenant", "profile"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<TenantProfileResponse>>("/api/v1/tenant/profile");
      return res.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setGstin(data.gstin ?? "");
    setPan(data.pan ?? "");
    setAddress(data.address ?? "");
    setGoogleClientId(data.googleOauthClientId ?? "");
    const t = parseThemeFromSettings(data.settings ?? null);
    const raw = (t?.preset as string) || "default";
    const allowed = new Set<string>(THEME_PRESET_OPTIONS.map((o) => o.value));
    setThemePreset(allowed.has(raw) ? (raw as TenantThemePreset) : "default");
    const trip = hslTripletFromTheme(t);
    setThemeH(trip.h);
    setThemeS(trip.s);
    setThemeL(trip.l);
  }, [data]);

  const { data: oauthCfg } = useQuery({
    queryKey: ["tenant", "google-oauth-config"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<{ redirectUri: string }>>(
        "/api/v1/tenant/storage/google/oauth-config"
      );
      return res.data;
    },
    enabled: isTenantAdmin,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const gd = params.get("google_drive");
    if (gd === "connected") {
      setDriveFlash({ type: "ok", text: "Google Drive connected successfully." });
      void queryClient.invalidateQueries({ queryKey: ["tenant", "profile"] });
      window.history.replaceState({}, "", "/settings/profile");
    } else if (gd === "error") {
      const reason = params.get("reason");
      setDriveFlash({ type: "err", text: googleDriveErrorFlashText(reason) });
      window.history.replaceState({}, "", "/settings/profile");
    }
  }, [queryClient]);

  const connectDriveMut = useMutation({
    mutationFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<{ url: string }>>(
        "/api/v1/tenant/storage/google/authorization-url"
      );
      return res.data?.url;
    },
    onSuccess: (url) => {
      if (url) window.location.href = url;
    },
  });

  const saveOauthCredsMut = useMutation({
    mutationFn: async () => {
      const body: { clientId: string; clientSecret?: string } = { clientId: googleClientId.trim() };
      if (googleClientSecret.trim()) body.clientSecret = googleClientSecret.trim();
      await apiClient.put("/api/v1/tenant/storage/google/credentials", body);
    },
    onSuccess: () => {
      setGoogleClientSecret("");
      void queryClient.invalidateQueries({ queryKey: ["tenant", "profile"] });
    },
  });

  const disconnectDriveMut = useMutation({
    mutationFn: async () => {
      await apiClient.post("/api/v1/tenant/storage/google/disconnect");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tenant", "profile"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put("/api/v1/tenant/profile", {
        name: name.trim(),
        gstin: gstin.trim() || null,
        pan: pan.trim() || null,
        address: address.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "profile"] });
    },
  });

  const saveThemeMutation = useMutation({
    mutationFn: async () => {
      const theme =
        themePreset === "custom"
          ? { preset: "custom", primaryH: themeH, primaryS: themeS, primaryL: themeL }
          : { preset: themePreset };
      await apiClient.put("/api/v1/tenant/profile", {
        settings: { theme },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "profile"] });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${base}/api/v1/tenant/profile/logo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(j?.error?.message ?? "Upload failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "profile"] });
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete("/api/v1/tenant/profile/logo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "profile"] });
    },
  });

  return (
    <div className="space-y-6">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">Firm information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading profile…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Could not load tenant profile.</p>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="firm-name">
                  Firm name
                </label>
                <Input
                  id="firm-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isTenantAdmin}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="gstin">
                  GSTIN
                </label>
                <Input
                  id="gstin"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                  disabled={!isTenantAdmin}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="pan">
                  PAN
                </label>
                <Input id="pan" value={pan} onChange={(e) => setPan(e.target.value)} disabled={!isTenantAdmin} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="address">
                  Address
                </label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} disabled={!isTenantAdmin} />
              </div>
              {saveMutation.isError && (
                <p className="text-sm text-destructive">
                  Save failed. You may need TENANT_ADMIN role to update the profile.
                </p>
              )}
              {saveMutation.isSuccess && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved successfully.</p>
              )}
              <div className="pt-2">
                <Button
                  type="button"
                  disabled={!isTenantAdmin || !name.trim() || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? "Saving…" : "Save changes"}
                </Button>
                {!isTenantAdmin && (
                  <p className="mt-2 text-xs text-muted-foreground">Only tenant admins can edit this profile.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Shown next to your firm name in the sidebar, header, and browser tab title. PNG, JPEG, WebP, or GIF, up to 2
            MB.
          </p>
          {data?.logoUrl ? (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.logoUrl} alt="Workspace logo" className="h-16 w-16 rounded-md border object-contain p-1" />
              {isTenantAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleteLogoMutation.isPending}
                  onClick={() => deleteLogoMutation.mutate()}
                >
                  Remove logo
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No logo uploaded.</p>
          )}
          {isTenantAdmin && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploadLogoMutation.isPending ? "Uploading…" : "Upload logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploadLogoMutation.isPending}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) uploadLogoMutation.mutate(f);
                  }}
                />
              </label>
              {uploadLogoMutation.isError && (
                <p className="text-sm text-destructive">Upload failed. Check file type and size.</p>
              )}
            </div>
          )}
          {!isTenantAdmin && (
            <p className="text-xs text-muted-foreground">Only tenant admins can change the workspace logo.</p>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">Color theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Primary accent for buttons, links, and focus rings across the app. Saved in workspace settings.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="theme-preset">
              Preset
            </label>
            <select
              id="theme-preset"
              className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={themePreset}
              disabled={!isTenantAdmin}
              onChange={(e) => {
                const v = e.target.value as TenantThemePreset;
                setThemePreset(v);
                if (v !== "custom") {
                  const trip = hslTripletFromTheme({ preset: v });
                  setThemeH(trip.h);
                  setThemeS(trip.s);
                  setThemeL(trip.l);
                }
              }}
            >
              {THEME_PRESET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {themePreset === "custom" && isTenantAdmin && (
            <div className="grid max-w-md gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Hue</label>
                <Input type="number" min={0} max={360} value={themeH} onChange={(e) => setThemeH(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Saturation %</label>
                <Input type="number" min={0} max={100} value={themeS} onChange={(e) => setThemeS(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Lightness %</label>
                <Input type="number" min={0} max={100} value={themeL} onChange={(e) => setThemeL(Number(e.target.value))} />
              </div>
            </div>
          )}
          <div
            className="h-10 max-w-md rounded-md border"
            style={{
              backgroundColor: `hsl(${themeH} ${themeS}% ${themeL}%)`,
            }}
            aria-hidden
          />
          {saveThemeMutation.isError && (
            <p className="text-sm text-destructive">Could not save theme. Try again as tenant admin.</p>
          )}
          {saveThemeMutation.isSuccess && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Theme saved.</p>
          )}
          {isTenantAdmin && (
            <Button type="button" disabled={saveThemeMutation.isPending} onClick={() => saveThemeMutation.mutate()}>
              {saveThemeMutation.isPending ? "Saving…" : "Save theme"}
            </Button>
          )}
          {!isTenantAdmin && (
            <p className="text-xs text-muted-foreground">Only tenant admins can change the workspace theme.</p>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">Google Drive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {driveFlash && (
            <p
              className={
                driveFlash.type === "ok"
                  ? "text-sm text-emerald-600 dark:text-emerald-400"
                  : "text-sm text-destructive"
              }
            >
              {driveFlash.text}
            </p>
          )}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Each workspace uses its own Google Cloud OAuth client. Create an OAuth 2.0 Web client in Google Cloud
                Console (Drive API enabled), then paste the client ID and secret below. Use the same authorized redirect
                URI as shown — it is shared for all tenants on this deployment.
              </p>
              {isTenantAdmin && oauthCfg?.redirectUri && (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                  <p className="font-medium text-foreground">Authorized redirect URI (add in Google Cloud Console)</p>
                  <p className="mt-1 break-all font-mono text-muted-foreground">{oauthCfg.redirectUri}</p>
                </div>
              )}
              {isTenantAdmin && (
                <div className="space-y-3 rounded-md border border-border p-4">
                  <p className="text-sm font-medium">Workspace OAuth client</p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="google-client-id">
                      Client ID
                    </label>
                    <Input
                      id="google-client-id"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      placeholder="….apps.googleusercontent.com"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="google-client-secret">
                      Client secret
                    </label>
                    <Input
                      id="google-client-secret"
                      type="password"
                      value={googleClientSecret}
                      onChange={(e) => setGoogleClientSecret(e.target.value)}
                      placeholder={
                        data?.googleDriveOauthConfigured
                          ? "Leave blank to keep the current secret"
                          : "Required on first setup"
                      }
                      autoComplete="new-password"
                    />
                  </div>
                  {saveOauthCredsMut.isError && (
                    <p className="text-sm text-destructive">
                      {apiErrorMessage(saveOauthCredsMut.error, "Could not save OAuth credentials.")}
                    </p>
                  )}
                  {saveOauthCredsMut.isSuccess && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">OAuth credentials saved.</p>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      !googleClientId.trim() ||
                      (!data?.googleDriveOauthConfigured && !googleClientSecret.trim()) ||
                      saveOauthCredsMut.isPending
                    }
                    onClick={() => saveOauthCredsMut.mutate()}
                  >
                    {saveOauthCredsMut.isPending ? "Saving…" : "Save OAuth credentials"}
                  </Button>
                  {data?.googleDriveOauthConfigured && (
                    <p className="text-xs text-muted-foreground">
                      Changing the client ID or secret disconnects Google Drive if it was connected; you will need to
                      connect again.
                    </p>
                  )}
                </div>
              )}
              {data?.googleDriveConnected ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    Connected as{" "}
                    <span className="font-medium text-foreground">
                      {data.googleDriveConnectedEmail ?? "Google account"}
                    </span>
                  </p>
                  {isTenantAdmin && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={disconnectDriveMut.isPending}
                      onClick={() => disconnectDriveMut.mutate()}
                    >
                      {disconnectDriveMut.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          Disconnecting…
                        </>
                      ) : (
                        "Disconnect Google Drive"
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Not connected — uploads will be blocked until you connect.
                  </p>
                  {isTenantAdmin ? (
                    <Button
                      type="button"
                      disabled={!data?.googleDriveOauthConfigured || connectDriveMut.isPending}
                      onClick={() => connectDriveMut.mutate()}
                    >
                      {connectDriveMut.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          Redirecting…
                        </>
                      ) : (
                        "Connect Google Drive"
                      )}
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ask a tenant admin to save this workspace&apos;s Google OAuth client ID and secret, then connect
                      Google Drive.
                    </p>
                  )}
                </div>
              )}
              {connectDriveMut.isError && (
                <p className="text-sm text-destructive">
                  {apiErrorMessage(
                    connectDriveMut.error,
                    "Could not start Google connection. Save your workspace OAuth client ID and secret first."
                  )}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
