"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { Download, Loader2 } from "lucide-react";

type ReportRow = { label: string; data: Record<string, any> };

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

export default function GstPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "gst"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/finance/gst");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Month", "CGST", "SGST", "IGST", "Total Output", "Input GST", "Net GST Liability"];
    const rows = data.map((r) => [
      r.label,
      String(r.data.cgst ?? 0),
      String(r.data.sgst ?? 0),
      String(r.data.igst ?? 0),
      String(r.data.totalOutput ?? 0),
      String(r.data.inputGst ?? 0),
      String(r.data.netGst ?? 0),
    ]);
    downloadCSV("gst-summary-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GST Summary</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tax outputs, inputs, and net position for filing prep.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Monthly GST Breakdown</CardTitle>
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
                    <th className="pb-2 pr-4 font-medium">Month</th>
                    <th className="pb-2 pr-4 text-right font-medium">CGST</th>
                    <th className="pb-2 pr-4 text-right font-medium">SGST</th>
                    <th className="pb-2 pr-4 text-right font-medium">IGST</th>
                    <th className="pb-2 pr-4 text-right font-medium">Total Output</th>
                    <th className="pb-2 pr-4 text-right font-medium">Input GST</th>
                    <th className="pb-2 text-right font-medium">Net GST Liability</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.cgst ?? 0)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.sgst ?? 0)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.igst ?? 0)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.totalOutput ?? 0)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.inputGst ?? 0)}</td>
                      <td className="py-2.5 text-right font-medium">{formatCurrency(row.data.netGst ?? 0)}</td>
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
