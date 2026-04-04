"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ChevronDown,
  Columns3,
  IndianRupee,
  MapPin,
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { ApiResponse, Lead, Client, LeadStage } from "@/types";

const STAGE_BORDER_COLORS: Record<string, string> = {
  new: "border-t-blue-500",
  contacted: "border-t-yellow-500",
  "proposal sent": "border-t-purple-500",
  negotiation: "border-t-orange-500",
  won: "border-t-green-500",
  lost: "border-t-red-500",
};

const STAGE_BG_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  "proposal sent": "bg-purple-500",
  negotiation: "bg-orange-500",
  won: "bg-green-500",
  lost: "bg-red-500",
};

export default function CrmPipelinePage() {
  const queryClient = useQueryClient();

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

  const leadsQuery = useQuery({
    queryKey: ["crm", "leads", "kanban"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<Lead[]>>(
        "/api/v1/crm/leads",
        { params: { page: 0, size: 200 } }
      );
      return res.data ?? [];
    },
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

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clientsQuery.data ?? []) {
      map.set(c.id, c.name);
    }
    return map;
  }, [clientsQuery.data]);

  const stages = useMemo(
    () =>
      (stagesQuery.data ?? []).sort((a, b) => a.displayOrder - b.displayOrder),
    [stagesQuery.data]
  );
  const leads = leadsQuery.data ?? [];

  const columns = useMemo(() => {
    return stages.map((stage) => ({
      stage,
      leads: leads.filter(
        (l) => l.stage.toLowerCase() === stage.name.toLowerCase()
      ),
    }));
  }, [stages, leads]);

  const totalValue = useMemo(
    () =>
      leads.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0),
    [leads]
  );

  const isLoading =
    stagesQuery.isLoading || leadsQuery.isLoading;
  const isError = stagesQuery.isError || leadsQuery.isError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kanban view of all leads by stage.
          </p>
        </div>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
        </div>
        <Card>
          <CardContent className="py-16 text-center text-destructive">
            Failed to load pipeline data.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Columns3 className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              No pipeline stages configured. Add stages in your CRM settings to
              get started.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {leads.length} leads &middot; Total value{" "}
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(({ stage, leads: columnLeads }) => {
          const colValue = columnLeads.reduce(
            (sum, l) => sum + (l.estimatedValue ?? 0),
            0
          );
          const borderColor =
            STAGE_BORDER_COLORS[stage.name.toLowerCase()] ??
            "border-t-muted-foreground";
          const dotColor =
            STAGE_BG_COLORS[stage.name.toLowerCase()] ??
            "bg-muted-foreground";

          return (
            <div
              key={stage.id}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-lg border border-t-4 bg-card shadow-sm",
                borderColor
              )}
            >
              <div className="border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn("h-2.5 w-2.5 rounded-full", dotColor)}
                  />
                  <h2 className="text-sm font-semibold">{stage.name}</h2>
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {columnLeads.length}
                  </span>
                </div>
                {colValue > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(colValue)}
                  </p>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                {columnLeads.length === 0 ? (
                  <p className="px-1 py-8 text-center text-xs text-muted-foreground">
                    No leads
                  </p>
                ) : (
                  columnLeads.map((lead) => (
                    <PipelineCard
                      key={lead.id}
                      lead={lead}
                      clientName={
                        lead.clientId
                          ? clientMap.get(lead.clientId) ?? null
                          : null
                      }
                      stages={stages}
                      queryClient={queryClient}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineCard({
  lead,
  clientName,
  stages,
  queryClient,
}: {
  lead: Lead;
  clientName: string | null;
  stages: LeadStage[];
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [moveOpen, setMoveOpen] = useState(false);

  const moveMutation = useMutation({
    mutationFn: async (newStage: string) => {
      await apiClient.put(`/api/v1/crm/leads/${lead.id}`, {
        ...lead,
        stage: newStage,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      setMoveOpen(false);
    },
  });

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="group relative">
      <Link href={`/crm/leads/${lead.id}`}>
        <Card className="cursor-pointer shadow-none transition-shadow hover:shadow-md">
          <CardHeader className="space-y-1 p-3 pb-2">
            <CardTitle className="text-sm font-medium leading-snug">
              {lead.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 p-3 pt-0">
            {clientName && (
              <p className="text-xs text-muted-foreground">{clientName}</p>
            )}
            {lead.estimatedValue != null && (
              <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                <IndianRupee className="h-3 w-3" />
                {formatCurrency(Number(lead.estimatedValue))}
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {lead.source}
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      <div className="absolute right-2 top-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMoveOpen(!moveOpen);
          }}
          title="Move to stage"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {moveOpen && (
        <div
          className="absolute right-0 top-8 z-20 w-44 rounded-md border bg-popover p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Move to
          </p>
          <select
            className={selectClass}
            value={lead.stage}
            onChange={(e) => moveMutation.mutate(e.target.value)}
            disabled={moveMutation.isPending}
            autoFocus
          >
            {stages.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          {moveMutation.isPending && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Moving…
            </div>
          )}
          {moveMutation.isError && (
            <p className="mt-1 text-xs text-destructive">Failed to move.</p>
          )}
        </div>
      )}
    </div>
  );
}
