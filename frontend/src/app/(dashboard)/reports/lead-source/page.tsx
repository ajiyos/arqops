"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { Download, Loader2 } from "lucide-react";

type LeadSourceRow = {
  label: string;
  data: { leadCount: number; totalValue: number; wonCount: number };
};

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

export default function LeadSourceReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "crm", "lead-source"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<LeadSourceRow[]>>("/api/v1/reports/crm/lead-source");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Source", "Lead Count", "Total Value (INR)", "Won Count"];
    const rows = data.map((r) => [
      r.label,
      String(r.data.leadCount),
      String(r.data.totalValue),
      String(r.data.wonCount),
    ]);
    downloadCSV("lead-source-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Source Analysis</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lead volume, pipeline value, and wins by acquisition source.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">By Source</CardTitle>
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
                    <th className="pb-2 pr-4 font-medium">Source</th>
                    <th className="pb-2 pr-4 text-right font-medium">Lead Count</th>
                    <th className="pb-2 pr-4 text-right font-medium">Total Value</th>
                    <th className="pb-2 text-right font-medium">Won Count</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4 text-right">{row.data.leadCount}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.totalValue)}</td>
                      <td className="py-2.5 text-right">{row.data.wonCount}</td>
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
