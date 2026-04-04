"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ApiResponse, DashboardData } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils/format";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  FolderKanban,
  IndianRupee,
  Loader2,
  Megaphone,
  Palmtree,
  PieChart,
  Receipt,
  Scale,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

const REPORT_LINKS: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
}[] = [
  {
    title: "CRM Pipeline",
    description: "Opportunity stages, conversion, and weighted pipeline value.",
    icon: Users,
    href: "/reports/crm-pipeline",
  },
  {
    title: "Lead Source Analysis",
    description: "Lead volume, value, and wins by acquisition source.",
    icon: Megaphone,
    href: "/reports/lead-source",
  },
  {
    title: "Conversion Rate & Cycle Time",
    description: "Win rates by source and average deal duration.",
    icon: TrendingUp,
    href: "/reports/conversion-rate",
  },
  {
    title: "Activity Summary",
    description: "Activity counts by type for each team member.",
    icon: Target,
    href: "/reports/activity-by-member",
  },
  {
    title: "Project Status",
    description: "Active projects, phases, milestones, and delivery health.",
    icon: FolderKanban,
    href: "/reports/project-status",
  },
  {
    title: "Project Budget Variance",
    description: "Budgeted versus actual spend and variance by project.",
    icon: Scale,
    href: "/reports/budget-variance",
  },
  {
    title: "Milestone Slippage",
    description: "Planned vs actual milestone dates and delivery discipline.",
    icon: CalendarDays,
    href: "/reports/milestone-slippage",
  },
  {
    title: "Resource Utilization",
    description: "Team member allocation and load across projects.",
    icon: Users,
    href: "/reports/resource-utilization",
  },
  {
    title: "Project Profitability",
    description: "Revenue vs vendor costs and expenses per project.",
    icon: IndianRupee,
    href: "/reports/project-profitability",
  },
  {
    title: "Receivables Aging",
    description: "Outstanding invoices by age bucket and client.",
    icon: IndianRupee,
    href: "/reports/receivables",
  },
  {
    title: "Payables Aging",
    description: "Vendor bills due and overdue across the portfolio.",
    icon: PieChart,
    href: "/reports/payables",
  },
  {
    title: "Revenue & Costs",
    description: "Monthly revenue, expenses, and vendor cost breakdown.",
    icon: TrendingUp,
    href: "/reports/revenue-expenses",
  },
  {
    title: "Expense by Category",
    description: "Expense counts and totals by category for a date range.",
    icon: Receipt,
    href: "/reports/expense-category",
  },
  {
    title: "GST Summary",
    description: "Tax outputs, inputs, and net position for filing prep.",
    icon: FileSpreadsheet,
    href: "/reports/gst",
  },
  {
    title: "TDS Register",
    description: "Tax deducted at source entries from vendor payments.",
    icon: FileSpreadsheet,
    href: "/reports/tds-register",
  },
  {
    title: "Vendor Performance",
    description: "Review volume and average quality, timeliness, and cost scores.",
    icon: Star,
    href: "/reports/vendor-performance",
  },
  {
    title: "WO/PO Summary",
    description: "Work orders and purchase orders by project.",
    icon: Briefcase,
    href: "/reports/wo-po-summary",
  },
  {
    title: "Attendance Summary",
    description: "Team presence, patterns, and exceptions by period.",
    icon: CalendarDays,
    href: "/reports/attendance",
  },
  {
    title: "Leave Summary",
    description: "Approved, pending, and rejected leave by employee.",
    icon: Palmtree,
    href: "/reports/leave-summary",
  },
  {
    title: "Payroll Register",
    description: "Earnings, deductions, gross, and net pay by employee.",
    icon: ClipboardList,
    href: "/reports/payroll-register",
  },
  {
    title: "Reimbursement Summary",
    description: "Employee reimbursement claims and approval status.",
    icon: Receipt,
    href: "/reports/reimbursement-summary",
  },
  {
    title: "Headcount & Attrition",
    description: "Employee counts by department with attrition rates.",
    icon: Users,
    href: "/reports/headcount-attrition",
  },
];

const KPI_ROW_1: {
  key: keyof DashboardData;
  label: string;
  icon: ComponentType<{ className?: string }>;
  format: (v: number) => string;
  color?: string;
}[] = [
  { key: "activeProjectCount", label: "Active Projects", icon: FolderKanban, format: (v) => String(v) },
  { key: "pipelineValue", label: "Pipeline Value", icon: BarChart3, format: formatCurrency },
  { key: "openLeadCount", label: "Open Leads", icon: Megaphone, format: (v) => String(v) },
  { key: "employeeCount", label: "Employees", icon: Users, format: (v) => String(v) },
  { key: "activeVendorCount", label: "Active Vendors", icon: Star, format: (v) => String(v) },
];

const KPI_ROW_2: {
  key: keyof DashboardData;
  label: string;
  icon: ComponentType<{ className?: string }>;
  format: (v: number) => string;
  warn?: boolean;
}[] = [
  { key: "totalRevenue", label: "Revenue (Period)", icon: TrendingUp, format: formatCurrency },
  { key: "totalExpenses", label: "Expenses (Period)", icon: Receipt, format: formatCurrency },
  { key: "totalVendorCosts", label: "Vendor Costs (Period)", icon: Briefcase, format: formatCurrency },
  { key: "outstandingReceivables", label: "Outstanding Receivables", icon: IndianRupee, format: formatCurrency },
  { key: "pendingPayables", label: "Pending Payables", icon: PieChart, format: formatCurrency },
  { key: "overdueInvoiceCount", label: "Overdue Invoices", icon: AlertTriangle, format: (v) => String(v), warn: true },
  { key: "pendingLeaveRequests", label: "Pending Leaves", icon: Palmtree, format: (v) => String(v) },
];

function defaultFrom() {
  const d = new Date();
  d.setMonth(d.getMonth() - 11);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "dashboard", from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await apiClient.get<ApiResponse<DashboardData>>(
        `/api/v1/reports/dashboard?${params.toString()}`
      );
      return res.data.data!;
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Key metrics at a glance. Date range applies to revenue, expenses, and vendor cost KPIs.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label htmlFor="dash-from" className="block text-xs text-muted-foreground mb-1">From</label>
            <Input id="dash-from" type="date" className="h-9 w-36" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="dash-to" className="block text-xs text-muted-foreground mb-1">To</label>
            <Input id="dash-to" type="date" className="h-9 w-36" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => { setFrom(defaultFrom()); setTo(defaultTo()); }}>
            Reset
          </Button>
        </div>
      </div>

      {/* Snapshot KPIs (not date filtered) */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">Current Snapshot</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {KPI_ROW_1.map((s) => (
            <Card key={s.key} className="border-muted shadow-sm">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-1">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <p className="text-2xl font-bold">{data ? s.format(data[s.key]) : "—"}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Financial KPIs (date filtered) */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">Financial &amp; Period Metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {KPI_ROW_2.map((s) => (
            <Card key={s.key} className={`border-muted shadow-sm ${s.warn && data && data[s.key] > 0 ? "border-destructive/50" : ""}`}>
              <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-1">
                <div className={`rounded-lg p-2 ${s.warn && data && data[s.key] > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <p className={`text-2xl font-bold ${s.warn && data && data[s.key] > 0 ? "text-destructive" : ""}`}>
                    {data ? s.format(data[s.key]) : "—"}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Report links */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">Detailed Reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {REPORT_LINKS.map((r) => (
            <Link key={r.href} href={r.href} className="group">
              <Card className="h-full border-muted shadow-sm transition-colors group-hover:bg-accent/40">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <r.icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold leading-tight">{r.title}</CardTitle>
                    <CardDescription className="text-sm leading-snug">{r.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-xs font-medium text-primary group-hover:underline">View report →</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
