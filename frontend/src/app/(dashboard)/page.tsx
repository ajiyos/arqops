"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import type { DashboardData, ApiResponse } from "@/types";
import { FolderKanban, Briefcase, Receipt, ShoppingCart, UserCog } from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DashboardData>>("/api/v1/reports/dashboard");
      return data.data;
    },
  });

  const stats = [
    { label: "Active Projects", value: data?.activeProjectCount ?? 0, icon: FolderKanban, format: (v: number) => String(v) },
    { label: "Pipeline Value", value: data?.pipelineValue ?? 0, icon: Briefcase, format: formatCurrency },
    { label: "Outstanding Receivables", value: data?.outstandingReceivables ?? 0, icon: Receipt, format: formatCurrency },
    { label: "Pending Payables", value: data?.pendingPayables ?? 0, icon: ShoppingCart, format: formatCurrency },
    { label: "Team Members", value: data?.employeeCount ?? 0, icon: UserCog, format: (v: number) => String(v) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : stat.format(stat.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
