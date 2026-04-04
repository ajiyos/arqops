"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

type VendorPerformanceRow = {
  label: string;
  data: {
    reviewCount: number;
    avgQuality: number;
    avgTimeliness: number;
    avgCost: number;
    overallAvg: number;
  };
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

function fmtScore(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

export default function VendorPerformanceReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "vendor", "performance"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<VendorPerformanceRow[]>>("/api/v1/reports/vendor/performance");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = [
      "Vendor",
      "Reviews",
      "Avg Quality",
      "Avg Timeliness",
      "Avg Cost",
      "Overall",
    ];
    const rows = data.map((r) => [
      r.label,
      String(r.data.reviewCount),
      fmtScore(r.data.avgQuality),
      fmtScore(r.data.avgTimeliness),
      fmtScore(r.data.avgCost),
      fmtScore(r.data.overallAvg),
    ]);
    downloadCSV("vendor-performance-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendor Performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review counts and average scorecard ratings by vendor.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Scorecard Summary</CardTitle>
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
                    <th className="pb-2 pr-3 font-medium">Vendor</th>
                    <th className="pb-2 pr-3 text-right font-medium">Reviews</th>
                    <th className="pb-2 pr-3 text-right font-medium">Avg Quality</th>
                    <th className="pb-2 pr-3 text-right font-medium">Avg Timeliness</th>
                    <th className="pb-2 pr-3 text-right font-medium">Avg Cost</th>
                    <th className="pb-2 text-right font-medium">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-3 text-right">{row.data.reviewCount}</td>
                      <td className="py-2.5 pr-3 text-right">{fmtScore(row.data.avgQuality)}</td>
                      <td className="py-2.5 pr-3 text-right">{fmtScore(row.data.avgTimeliness)}</td>
                      <td className="py-2.5 pr-3 text-right">{fmtScore(row.data.avgCost)}</td>
                      <td className="py-2.5 text-right font-medium">{fmtScore(row.data.overallAvg)}</td>
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
