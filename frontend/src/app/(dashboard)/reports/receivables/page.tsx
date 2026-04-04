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

export default function ReceivablesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "receivables"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/finance/receivables");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Invoice #", "Client", "Total", "Paid", "Outstanding", "Due Date", "Days Overdue", "Bucket", "Status"];
    const rows = data.map((r) => [
      r.label,
      r.data.client,
      String(r.data.total),
      String(r.data.paid),
      String(r.data.outstanding),
      r.data.dueDate ?? "",
      String(r.data.daysOverdue ?? 0),
      r.data.bucket ?? "",
      r.data.status,
    ]);
    downloadCSV("receivables-aging-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Receivables Aging</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Outstanding invoices by age bucket and client.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">All Receivables</CardTitle>
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
                    <th className="pb-2 pr-4 font-medium">Invoice #</th>
                    <th className="pb-2 pr-4 font-medium">Client</th>
                    <th className="pb-2 pr-4 text-right font-medium">Total</th>
                    <th className="pb-2 pr-4 text-right font-medium">Paid</th>
                    <th className="pb-2 pr-4 text-right font-medium">Outstanding</th>
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
                      <td className="py-2.5 pr-4">{row.data.client}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.total)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.paid)}</td>
                      <td className="py-2.5 pr-4 text-right font-medium">{formatCurrency(row.data.outstanding)}</td>
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
