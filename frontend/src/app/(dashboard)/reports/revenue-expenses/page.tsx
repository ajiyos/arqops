"use client";

import { useMemo } from "react";
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

export default function RevenueExpensesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "revenue-expenses"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ReportRow[]>>("/api/v1/reports/finance/revenue-expenses");
      return res.data.data!;
    },
  });

  const totals = useMemo(() => {
    if (!data?.length) return null;
    return data.reduce(
      (acc, row) => ({
        revenue: acc.revenue + (row.data.revenue ?? 0),
        expenses: acc.expenses + (row.data.expenses ?? 0),
        vendorCosts: acc.vendorCosts + (row.data.vendorCosts ?? 0),
      }),
      { revenue: 0, expenses: 0, vendorCosts: 0 },
    );
  }, [data]);

  const handleExport = () => {
    if (!data) return;
    const headers = ["Month", "Revenue (INR)", "Expenses (INR)", "Vendor Costs (INR)", "Net (INR)"];
    const rows = data.map((r) => {
      const net = (r.data.revenue ?? 0) - (r.data.expenses ?? 0) - (r.data.vendorCosts ?? 0);
      return [r.label, String(r.data.revenue ?? 0), String(r.data.expenses ?? 0), String(r.data.vendorCosts ?? 0), String(net)];
    });
    if (totals) {
      const totalNet = totals.revenue - totals.expenses - totals.vendorCosts;
      rows.push(["Total", String(totals.revenue), String(totals.expenses), String(totals.vendorCosts), String(totalNet)]);
    }
    downloadCSV("revenue-expenses-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue & Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly revenue, expenses, and vendor cost breakdown.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Monthly Breakdown</CardTitle>
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
                    <th className="pb-2 pr-4 text-right font-medium">Revenue (INR)</th>
                    <th className="pb-2 pr-4 text-right font-medium">Expenses (INR)</th>
                    <th className="pb-2 pr-4 text-right font-medium">Vendor Costs (INR)</th>
                    <th className="pb-2 text-right font-medium">Net (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => {
                    const net = (row.data.revenue ?? 0) - (row.data.expenses ?? 0) - (row.data.vendorCosts ?? 0);
                    return (
                      <tr key={row.label} className="border-b">
                        <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                        <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.revenue ?? 0)}</td>
                        <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.expenses ?? 0)}</td>
                        <td className="py-2.5 pr-4 text-right">{formatCurrency(row.data.vendorCosts ?? 0)}</td>
                        <td className="py-2.5 text-right font-medium">{formatCurrency(net)}</td>
                      </tr>
                    );
                  })}
                  {totals && (
                    <tr className="border-t-2 font-bold">
                      <td className="py-2.5 pr-4">Total</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(totals.revenue)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(totals.expenses)}</td>
                      <td className="py-2.5 pr-4 text-right">{formatCurrency(totals.vendorCosts)}</td>
                      <td className="py-2.5 text-right">
                        {formatCurrency(totals.revenue - totals.expenses - totals.vendorCosts)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
