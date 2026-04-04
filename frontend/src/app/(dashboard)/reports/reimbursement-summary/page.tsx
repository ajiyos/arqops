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

export default function ReimbursementSummaryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "hr", "reimbursement-summary"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/hr/reimbursement-summary");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Employee", "Code", "Claims", "Approved", "Pending", "Rejected", "Total", "Approved Amt"];
    const rows = data.map((r) => [
      r.label,
      String(r.data.employeeCode ?? ""),
      String(r.data.totalClaims ?? 0),
      String(r.data.approved ?? 0),
      String(r.data.pending ?? 0),
      String(r.data.rejected ?? 0),
      formatCurrency(Number(r.data.totalAmount ?? 0)),
      formatCurrency(Number(r.data.approvedAmount ?? 0)),
    ]);
    downloadCSV("reimbursement-summary-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reimbursement Summary</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Employee reimbursement claims with status breakdown.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">By employee</CardTitle>
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
                    <th className="pb-2 pr-3 font-medium">Employee</th>
                    <th className="pb-2 pr-3 font-medium">Code</th>
                    <th className="pb-2 pr-3 text-right font-medium">Total Claims</th>
                    <th className="pb-2 pr-3 text-right font-medium">Approved</th>
                    <th className="pb-2 pr-3 text-right font-medium">Pending</th>
                    <th className="pb-2 pr-3 text-right font-medium">Rejected</th>
                    <th className="pb-2 pr-3 text-right font-medium">Total Amount</th>
                    <th className="pb-2 text-right font-medium">Approved Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={`${row.label}-${row.data.employeeCode ?? ""}`} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{String(row.data.employeeCode ?? "")}</td>
                      <td className="py-2.5 pr-3 text-right">{Number(row.data.totalClaims ?? 0)}</td>
                      <td className="py-2.5 pr-3 text-right">{Number(row.data.approved ?? 0)}</td>
                      <td className="py-2.5 pr-3 text-right">{Number(row.data.pending ?? 0)}</td>
                      <td className="py-2.5 pr-3 text-right">{Number(row.data.rejected ?? 0)}</td>
                      <td className="py-2.5 pr-3 text-right">
                        {formatCurrency(Number(row.data.totalAmount ?? 0))}
                      </td>
                      <td className="py-2.5 text-right font-medium">
                        {formatCurrency(Number(row.data.approvedAmount ?? 0))}
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
