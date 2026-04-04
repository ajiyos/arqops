"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/reports", label: "Overview", exact: true },
  { href: "/reports/crm-pipeline", label: "CRM Pipeline" },
  { href: "/reports/lead-source", label: "Lead Source" },
  { href: "/reports/conversion-rate", label: "Conversion Rate" },
  { href: "/reports/activity-by-member", label: "Activity Summary" },
  { href: "/reports/project-status", label: "Projects" },
  { href: "/reports/budget-variance", label: "Budget Variance" },
  { href: "/reports/milestone-slippage", label: "Milestone Slippage" },
  { href: "/reports/resource-utilization", label: "Resource Utilization" },
  { href: "/reports/project-profitability", label: "Project P&L" },
  { href: "/reports/receivables", label: "Receivables" },
  { href: "/reports/payables", label: "Payables" },
  { href: "/reports/revenue-expenses", label: "Revenue & Costs" },
  { href: "/reports/expense-category", label: "Expense Category" },
  { href: "/reports/gst", label: "GST" },
  { href: "/reports/tds-register", label: "TDS Register" },
  { href: "/reports/vendor-performance", label: "Vendor Performance" },
  { href: "/reports/wo-po-summary", label: "WO/PO Summary" },
  { href: "/reports/attendance", label: "Attendance" },
  { href: "/reports/leave-summary", label: "Leave Summary" },
  { href: "/reports/payroll-register", label: "Payroll Register" },
  { href: "/reports/reimbursement-summary", label: "Reimbursements" },
  { href: "/reports/headcount-attrition", label: "Headcount" },
] as const;

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="flex gap-4 overflow-x-auto border-b" aria-label="Report sections">
        {TABS.map(({ href, label, ...rest }) => {
          const exact = "exact" in rest && rest.exact;
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "shrink-0 border-b-2 px-1 pb-3 text-sm font-medium transition-colors whitespace-nowrap",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
