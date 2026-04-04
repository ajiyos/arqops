"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

type LeaveSummaryRow = {
  label: string;
  data: {
    employeeCode: string;
    approvedLeaves: number;
    pendingLeaves: number;
    rejectedLeaves: number;
    totalDays: number;
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

export default function LeaveSummaryReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "hr", "leave-summary"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<LeaveSummaryRow[]>>("/api/v1/reports/hr/leave-summary");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Employee", "Code", "Approved", "Pending", "Rejected", "Total Days"];
    const rows = data.map((r) => [
      r.label,
      r.data.employeeCode,
      String(r.data.approvedLeaves),
      String(r.data.pendingLeaves),
      String(r.data.rejectedLeaves),
      String(r.data.totalDays),
    ]);
    downloadCSV("leave-summary-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Summary</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Leave request outcomes and booked days by employee.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">By Employee</CardTitle>
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
                    <th className="pb-2 pr-3 text-right font-medium">Approved</th>
                    <th className="pb-2 pr-3 text-right font-medium">Pending</th>
                    <th className="pb-2 pr-3 text-right font-medium">Rejected</th>
                    <th className="pb-2 text-right font-medium">Total Days</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={`${row.label}-${row.data.employeeCode}`} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-3 font-mono text-muted-foreground">{row.data.employeeCode}</td>
                      <td className="py-2.5 pr-3 text-right">{row.data.approvedLeaves}</td>
                      <td className="py-2.5 pr-3 text-right">{row.data.pendingLeaves}</td>
                      <td className="py-2.5 pr-3 text-right">{row.data.rejectedLeaves}</td>
                      <td className="py-2.5 text-right">{row.data.totalDays}</td>
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
