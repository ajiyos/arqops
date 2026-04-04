"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<"form" | "success">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firmName: "",
    subdomainSlug: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
  });

  function updateField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "firmName" && !form.subdomainSlug) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setForm((f) => ({ ...f, [field]: value, subdomainSlug: slug }));
    }
  }

  const canSubmit =
    form.firmName.trim() &&
    form.subdomainSlug.trim() &&
    form.adminName.trim() &&
    form.adminEmail.trim() &&
    form.adminPassword.length >= 6 &&
    form.adminPassword === form.confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/v1/tenant`, {
        name: form.firmName.trim(),
        subdomainSlug: form.subdomainSlug.trim(),
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
        plan: "starter",
      });

      await login(form.adminEmail.trim(), form.adminPassword);
      setStep("success");
      setTimeout(() => router.push("/"), 1500);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Welcome aboard!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your firm <strong>{form.firmName}</strong> has been created. Redirecting to dashboard…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Create your firm on ArqOps</CardTitle>
          <CardDescription>Set up your architecture practice in under a minute</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="px-2 text-sm font-semibold text-muted-foreground">Firm details</legend>
              <div className="space-y-2">
                <label htmlFor="firmName" className="text-sm font-medium">Firm name *</label>
                <Input
                  id="firmName"
                  placeholder="e.g. Sharma Associates"
                  value={form.firmName}
                  onChange={(e) => updateField("firmName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="slug" className="text-sm font-medium">URL slug *</label>
                <div className="flex items-center gap-2">
                  <Input
                    id="slug"
                    placeholder="sharma-associates"
                    value={form.subdomainSlug}
                    onChange={(e) => setForm((f) => ({ ...f, subdomainSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    className="font-mono text-sm"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only</p>
              </div>
            </fieldset>

            <fieldset className="space-y-4 rounded-lg border p-4">
              <legend className="px-2 text-sm font-semibold text-muted-foreground">Admin account</legend>
              <div className="space-y-2">
                <label htmlFor="adminName" className="text-sm font-medium">Your name *</label>
                <Input
                  id="adminName"
                  placeholder="Priya Sharma"
                  value={form.adminName}
                  onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="adminEmail" className="text-sm font-medium">Email *</label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="priya@sharma-associates.com"
                  value={form.adminEmail}
                  onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="adminPassword" className="text-sm font-medium">Password *</label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="Min 6 characters"
                    value={form.adminPassword}
                    onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm *</label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              {form.confirmPassword && form.adminPassword !== form.confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </fieldset>

            <Button type="submit" className="w-full" disabled={!canSubmit || loading}>
              {loading ? "Creating your firm…" : "Create firm & get started"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
