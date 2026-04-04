"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

type ReportRow = { label: string; data: Record<string, unknown> };

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ActivityByMemberReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "crm", "activity-by-member"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/crm/activity-by-member");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Assignee", "Total", "Calls", "Meetings", "Emails", "Site Visits", "Others"];
    const rows = data.map((r) => {
      const d = r.data;
      return [
        r.label,
        String(num(d.totalActivities)),
        String(num(d.calls)),
        String(num(d.meetings)),
        String(num(d.emails)),
        String(num(d.siteVisits)),
        String(num(d.others)),
      ];
    });
    downloadCSV("activity-by-member-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity Summary by Team Member</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Activity log counts by type for each team member.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">By Team Member</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.length ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Assignee</th>
                    <th className="pb-2 pr-4 text-right font-medium">Total</th>
                    <th className="pb-2 pr-4 text-right font-medium">Calls</th>
                    <th className="pb-2 pr-4 text-right font-medium">Meetings</th>
                    <th className="pb-2 pr-4 text-right font-medium">Emails</th>
                    <th className="pb-2 pr-4 text-right font-medium">Site Visits</th>
                    <th className="pb-2 text-right font-medium">Others</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.totalActivities)}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.calls)}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.meetings)}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.emails)}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.siteVisits)}</td>
                      <td className="py-2.5 text-right">{num(row.data.others)}</td>
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
