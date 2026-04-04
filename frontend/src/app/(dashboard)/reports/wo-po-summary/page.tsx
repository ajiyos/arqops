"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
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

export default function WoPoSummaryReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "vendor", "wo-po-summary"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/vendor/wo-po-summary");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Project", "WOs", "WO Value", "WO Approved", "POs", "PO Value", "PO Approved"];
    const rows = data.map((r) => {
      const d = r.data;
      return [
        r.label,
        String(num(d.woCount)),
        String(num(d.woValue)),
        String(num(d.woApproved)),
        String(num(d.poCount)),
        String(num(d.poValue)),
        String(num(d.poApproved)),
      ];
    });
    downloadCSV("wo-po-summary-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Work Order & PO Summary</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Work orders and purchase orders aggregated by project.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">By Project</CardTitle>
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
                    <th className="pb-2 pr-4 font-medium">Project</th>
                    <th className="pb-2 pr-4 text-right font-medium">WOs</th>
                    <th className="pb-2 pr-4 text-right font-medium">WO Value</th>
                    <th className="pb-2 pr-4 text-right font-medium">WO Approved</th>
                    <th className="pb-2 pr-4 text-right font-medium">POs</th>
                    <th className="pb-2 pr-4 text-right font-medium">PO Value</th>
                    <th className="pb-2 text-right font-medium">PO Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.woCount)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(num(row.data.woValue))}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.woApproved)}</td>
                      <td className="py-2.5 pr-4 text-right">{num(row.data.poCount)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(num(row.data.poValue))}</td>
                      <td className="py-2.5 text-right">{num(row.data.poApproved)}</td>
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
