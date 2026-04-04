"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
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

export default function PayablesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "payables"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/finance/payables");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Bill #", "Vendor", "Amount", "GST", "TDS", "Due Date", "Days Overdue", "Bucket", "Status"];
    const rows = data.map((r) => [
      r.label,
      r.data.vendor,
      String(r.data.amount),
      String(r.data.gstAmount ?? 0),
      String(r.data.tdsAmount ?? 0),
      r.data.dueDate ?? "",
      String(r.data.daysOverdue ?? 0),
      r.data.bucket ?? "",
      r.data.status,
    ]);
    downloadCSV("payables-aging-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payables Aging</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vendor bills due and overdue across the portfolio.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">All Payables</CardTitle>
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
                    <th className="pb-2 pr-4 font-medium">Bill #</th>
                    <th className="pb-2 pr-4 font-medium">Vendor</th>
                    <th className="pb-2 pr-4 text-right font-medium">Amount</th>
                    <th className="pb-2 pr-4 text-right font-medium">GST</th>
                    <th className="pb-2 pr-4 text-right font-medium">TDS</th>
                    <th className="pb-2 pr-4 font-medium">Due Date</th>
                    <th className="pb-2 pr-4 text-right font-medium">Days Overdue</th>
                    <th className="pb-2 pr-4 font-medium">Bucket</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4">{row.data.vendor}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.amount)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.gstAmount ?? 0)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.tdsAmount ?? 0)}</td>
                      <td className="py-2.5 pr-4">{row.data.dueDate ? formatDate(row.data.dueDate) : "—"}</td>
                      <td
                        className={cn(
                          "py-2.5 pr-4 text-right",
                          (row.data.daysOverdue ?? 0) > 0 && "text-destructive font-medium",
                        )}
                      >
                        {row.data.daysOverdue ?? 0}
                      </td>
                      <td className="py-2.5 pr-4">{row.data.bucket}</td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {row.data.status}
                        </span>
                      </td>
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
