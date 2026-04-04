"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Download, Loader2 } from "lucide-react";

type BudgetVarianceRow = {
  label: string;
  data: { totalBudgeted: number; totalActual: number; variance: number };
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

export default function BudgetVarianceReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "projects", "budget-variance"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<BudgetVarianceRow[]>>("/api/v1/reports/projects/budget-variance");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = ["Project", "Budgeted (INR)", "Actual (INR)", "Variance (INR)"];
    const rows = data.map((r) => [
      r.label,
      String(r.data.totalBudgeted),
      String(r.data.totalActual),
      String(r.data.variance),
    ]);
    downloadCSV("budget-variance-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Budget Variance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Budgeted versus actual spend by project.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Variance by Project</CardTitle>
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
                    <th className="pb-2 pr-4 text-right font-medium">Budgeted</th>
                    <th className="pb-2 pr-4 text-right font-medium">Actual</th>
                    <th className="pb-2 text-right font-medium">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.totalBudgeted)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.totalActual)}</td>
                      <td
                        className={cn(
                          "py-2.5 text-right font-medium",
                          row.data.variance < 0 && "text-destructive",
                        )}
                      >
                        {formatCurrency(row.data.variance)}
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
