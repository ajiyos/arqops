"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiResponse, AuditLogEntry, PageMeta } from "@/types";
import { RefreshCw } from "lucide-react";

const PAGE_SIZE = 20;

function formatAuditTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export default function SettingsAuditLogPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["audit-logs", page],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<AuditLogEntry[]>>("/api/v1/audit-logs", {
        params: { page, size: PAGE_SIZE },
      });
      return { items: res.data ?? [], meta: res.meta };
    },
  });

  const items = data?.items ?? [];
  const meta: PageMeta | undefined = data?.meta;
  const canPrev = page > 0;
  const canNext = meta ? page < meta.totalPages - 1 : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            void refetch();
          }}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audit log</CardTitle>
          <p className="text-sm text-muted-foreground">
            Recent changes and actions recorded for your tenant.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading audit log…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Could not load audit log.</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Timestamp</th>
                      <th className="px-4 py-3 font-medium">User ID</th>
                      <th className="px-4 py-3 font-medium">Entity Type</th>
                      <th className="px-4 py-3 font-medium">Entity ID</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">IP Address</th>
                      <th className="px-4 py-3 font-medium">Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row) => (
                      <tr key={row.id} className="border-b last:border-0 align-top">
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatAuditTimestamp(row.createdAt)}
                        </td>
                        <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs" title={row.userId}>
                          {row.userId ?? "—"}
                        </td>
                        <td className="px-4 py-3">{row.entityType}</td>
                        <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs" title={row.entityId}>
                          {row.entityId ?? "—"}
                        </td>
                        <td className="px-4 py-3">{row.action}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                          {row.ipAddress ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {row.changes != null && Object.keys(row.changes).length > 0 ? (
                            <details className="max-w-xs rounded-md border bg-muted/30 p-2 text-xs">
                              <summary className="cursor-pointer font-medium text-foreground">View JSON</summary>
                              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                                {JSON.stringify(row.changes, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>
                  {meta
                    ? `Page ${meta.page + 1} of ${meta.totalPages} (${meta.totalElements} total)`
                    : `Showing ${items.length} entries`}
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={!canPrev || isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                    Previous
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={!canNext || isFetching} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
