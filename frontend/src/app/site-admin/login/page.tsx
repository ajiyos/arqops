"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSiteAdminAuth } from "@/lib/platform/site-admin-auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield } from "lucide-react";
import Link from "next/link";

export default function SiteAdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useSiteAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/site-admin/tenants");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/site-admin/tenants");
    } catch {
      setError("Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900 text-slate-50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
            <Shield className="h-6 w-6 text-amber-500" />
          </div>
          <CardTitle className="text-slate-50">Platform Admin</CardTitle>
          <CardDescription className="text-slate-400">
            Sign in to the site administration panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="platform@arqops.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-slate-700 bg-slate-800 text-slate-50 placeholder:text-slate-500 focus-visible:ring-amber-500"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-slate-700 bg-slate-800 text-slate-50 placeholder:text-slate-500 focus-visible:ring-amber-500"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-xs text-slate-500">
              Dev credentials: platform@arqops.local / admin123
            </p>
            <p className="text-center text-sm text-slate-500">
              <Link href="/login" className="font-medium text-amber-500 hover:underline">
                Back to tenant login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
