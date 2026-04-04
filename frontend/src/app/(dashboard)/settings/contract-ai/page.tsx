"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiResponse, TenantContractAiConfig } from "@/types";
import { Loader2, ArrowLeft } from "lucide-react";

export default function SettingsContractAiPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const isTenantAdmin = user?.roles?.includes("TENANT_ADMIN") ?? false;

  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");

  const configQuery = useQuery({
    queryKey: ["tenant", "contract-ai"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<TenantContractAiConfig>>("/api/v1/tenant/contract-ai");
      return data.data!;
    },
    enabled: isTenantAdmin,
  });

  useEffect(() => {
    const cfg = configQuery.data;
    if (!cfg) return;
    setPrompt(cfg.defaultSystemPrompt ?? "");
    setModel(cfg.defaultModel || "gpt-4o-mini");
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put("/api/v1/tenant/contract-ai", {
        openaiApiKey: apiKey.trim() || undefined,
        defaultSystemPrompt: prompt.trim() || undefined,
        defaultModel: model.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "contract-ai"] });
      setApiKey("");
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
        <h2 className="text-xl font-semibold">Contract AI</h2>
        <p className="text-sm text-muted-foreground">Only tenant administrators can configure OpenAI for contract generation.</p>
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
          <CardTitle>Contract AI</CardTitle>
          <CardDescription>
            OpenAI API key and default system prompt for generating contract drafts. The key is encrypted and never shown in full after saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configQuery.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                {cfg?.apiKeyConfigured ? (
                  <span>
                    API key configured
                    {cfg.apiKeyLastFour ? (
                      <span className="text-muted-foreground"> (ends with …{cfg.apiKeyLastFour})</span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400">No API key configured yet.</span>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">OpenAI API key</label>
                <Input
                  type="password"
                  autoComplete="off"
                  placeholder={cfg?.apiKeyConfigured ? "Enter new key to replace" : "sk-…"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Default model</label>
                <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Default system prompt</label>
                <textarea
                  className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Instructions for how the model should draft contracts for your firm…"
                />
              </div>
              {saveMutation.isError && (
                <p className="text-sm text-destructive">Could not save. Check your connection and permissions.</p>
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
