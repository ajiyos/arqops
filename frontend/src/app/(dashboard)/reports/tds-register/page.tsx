"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
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

function fmtTdsRate(n: unknown) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(2)}%`;
}

function fmtDueDate(s: unknown) {
  if (s == null || s === "") return "—";
  const str = String(s);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return formatDate(str.slice(0, 10));
  return str;
}

export default function TdsRegisterPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "finance", "tds-register"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/finance/tds-register");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = [
      "Bill Number",
      "Vendor",
      "PAN",
      "TDS Section",
      "TDS Rate",
      "TDS Amount",
      "Bill Amount",
      "Due Date",
      "Status",
    ];
    const rows = data.map((r) => [
      r.label,
      String(r.data.vendor ?? ""),
      String(r.data.vendorPan ?? ""),
      String(r.data.tdsSection ?? ""),
      fmtTdsRate(r.data.tdsRate),
      formatCurrency(Number(r.data.tdsAmount ?? 0)),
      formatCurrency(Number(r.data.billAmount ?? 0)),
      fmtDueDate(r.data.dueDate),
      String(r.data.status ?? ""),
    ]);
    downloadCSV("tds-register-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">TDS Deduction Register</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tax deducted at source entries from vendor bills.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">TDS entries</CardTitle>
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
                    <th className="pb-2 pr-3 font-medium">Bill Number</th>
                    <th className="pb-2 pr-3 font-medium">Vendor</th>
                    <th className="pb-2 pr-3 font-medium">PAN</th>
                    <th className="pb-2 pr-3 font-medium">TDS Section</th>
                    <th className="pb-2 pr-3 text-right font-medium">TDS Rate</th>
                    <th className="pb-2 pr-3 text-right font-medium">TDS Amount</th>
                    <th className="pb-2 pr-3 text-right font-medium">Bill Amount</th>
                    <th className="pb-2 pr-3 font-medium">Due Date</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-3">{String(row.data.vendor ?? "")}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{String(row.data.vendorPan ?? "")}</td>
                      <td className="py-2.5 pr-3">{String(row.data.tdsSection ?? "")}</td>
                      <td className="py-2.5 pr-3 text-right">{fmtTdsRate(row.data.tdsRate)}</td>
                      <td className="py-2.5 pr-3 text-right">
                        {formatCurrency(Number(row.data.tdsAmount ?? 0))}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        {formatCurrency(Number(row.data.billAmount ?? 0))}
                      </td>
                      <td className="py-2.5 pr-3">{fmtDueDate(row.data.dueDate)}</td>
                      <td className="py-2.5">{String(row.data.status ?? "")}</td>
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
