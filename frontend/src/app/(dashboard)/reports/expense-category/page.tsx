"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import { Download, Loader2 } from "lucide-react";

type ExpenseCategoryRow = {
  label: string;
  data: { expenseCount: number; totalAmount: number };
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

function defaultFromTo() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const toStr = now.toISOString().slice(0, 10);
  const fromStr = from.toISOString().slice(0, 10);
  return { from: fromStr, to: toStr };
}

export default function ExpenseCategoryReportPage() {
  const defaults = useMemo(() => defaultFromTo(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [appliedFrom, setAppliedFrom] = useState(defaults.from);
  const [appliedTo, setAppliedTo] = useState(defaults.to);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "finance", "expense-by-category", appliedFrom, appliedTo],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ExpenseCategoryRow[]>>(
        "/api/v1/reports/finance/expense-by-category",
        { params: { from: appliedFrom, to: appliedTo } },
      );
      return res.data.data!;
    },
    enabled: Boolean(appliedFrom && appliedTo),
  });

  const applyRange = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  const handleExport = () => {
    if (!data) return;
    const headers = ["Category", "Count", "Total Amount (INR)"];
    const rows = data.map((r) => [r.label, String(r.data.expenseCount), String(r.data.totalAmount)]);
    downloadCSV("expense-by-category-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expense by Category</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Expense volume and totals grouped by category for the selected period.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between space-y-0">
          <CardTitle className="text-base">Filters</CardTitle>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="expense-cat-from" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                From
              </label>
              <Input
                id="expense-cat-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div>
              <label htmlFor="expense-cat-to" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                To
              </label>
              <Input
                id="expense-cat-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button type="button" size="sm" onClick={applyRange}>
              Apply
            </Button>
          </div>
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
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 text-right font-medium">Count</th>
                    <th className="pb-2 text-right font-medium">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-4 text-right">{row.data.expenseCount}</td>
                      <td className="py-2.5 text-right">{formatCurrency(row.data.totalAmount)}</td>
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
