"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/hr/employees", label: "Employees" },
  { href: "/hr/timesheets", label: "Timesheets" },
  { href: "/hr/designation-rates", label: "Designation rates" },
  { href: "/hr/attendance", label: "Attendance" },
  { href: "/hr/leaves", label: "Leaves" },
  { href: "/hr/reimbursements", label: "Reimbursements" },
  { href: "/hr/holidays", label: "Holidays" },
] as const;

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b" aria-label="HR sections">
        {TABS.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "border-b-2 px-1 pb-3 text-sm font-medium transition-colors",
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
