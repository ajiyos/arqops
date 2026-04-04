"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { Download, Loader2 } from "lucide-react";

type PayrollRegisterRow = {
  label: string;
  data: {
    employeeCode: string;
    designation: string;
    department: string;
    basic: number;
    hra: number;
    da: number;
    pf: number;
    esi: number;
    pt: number;
    gross: number;
    net: number;
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

export default function PayrollRegisterReportPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "hr", "payroll-register"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PayrollRegisterRow[]>>("/api/v1/reports/hr/payroll-register");
      return res.data.data!;
    },
  });

  const handleExport = () => {
    if (!data) return;
    const headers = [
      "Employee",
      "Code",
      "Designation",
      "Department",
      "Basic",
      "HRA",
      "DA",
      "PF",
      "ESI",
      "PT",
      "Gross",
      "Net",
    ];
    const rows = data.map((r) => [
      r.label,
      r.data.employeeCode,
      r.data.designation,
      r.data.department,
      String(r.data.basic),
      String(r.data.hra),
      String(r.data.da),
      String(r.data.pf),
      String(r.data.esi),
      String(r.data.pt),
      String(r.data.gross),
      String(r.data.net),
    ]);
    downloadCSV("payroll-register-report.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payroll Register</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Earnings, statutory deductions, and net pay by employee.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-muted shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Register</CardTitle>
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
                    <th className="sticky left-0 z-[1] bg-card pb-2 pr-3 font-medium">Employee</th>
                    <th className="pb-2 pr-3 font-medium">Code</th>
                    <th className="pb-2 pr-3 font-medium">Designation</th>
                    <th className="pb-2 pr-3 font-medium">Department</th>
                    <th className="pb-2 pr-2 text-right font-medium">Basic</th>
                    <th className="pb-2 pr-2 text-right font-medium">HRA</th>
                    <th className="pb-2 pr-2 text-right font-medium">DA</th>
                    <th className="pb-2 pr-2 text-right font-medium">PF</th>
                    <th className="pb-2 pr-2 text-right font-medium">ESI</th>
                    <th className="pb-2 pr-2 text-right font-medium">PT</th>
                    <th className="pb-2 pr-2 text-right font-medium">Gross</th>
                    <th className="pb-2 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={`${row.label}-${row.data.employeeCode}`} className="border-b last:border-0">
                      <td className="sticky left-0 z-[1] bg-card py-2.5 pr-3 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{row.data.employeeCode}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{row.data.designation || "—"}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{row.data.department || "—"}</td>
                      <td className="py-2.5 pr-2 text-right">{formatCurrency(row.data.basic)}</td>
                      <td className="py-2.5 pr-2 text-right">{formatCurrency(row.data.hra)}</td>
                      <td className="py-2.5 pr-2 text-right">{formatCurrency(row.data.da)}</td>
                      <td className="py-2.5 pr-2 text-right">{formatCurrency(row.data.pf)}</td>
                      <td className="py-2.5 pr-2 text-right">{formatCurrency(row.data.esi)}</td>
                      <td className="py-2.5 pr-2 text-right">{formatCurrency(row.data.pt)}</td>
                      <td className="py-2.5 pr-2 text-right font-medium">{formatCurrency(row.data.gross)}</td>
                      <td className="py-2.5 text-right font-medium">{formatCurrency(row.data.net)}</td>
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
