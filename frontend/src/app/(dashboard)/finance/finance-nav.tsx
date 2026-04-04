"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export type FinanceSection = "invoices" | "payables" | "expenses";

const ITEMS: { key: FinanceSection; href: string; label: string }[] = [
  { key: "invoices", href: "/finance/invoices", label: "Invoices" },
  { key: "payables", href: "/finance/payables", label: "Payables" },
  { key: "expenses", href: "/finance/expenses", label: "Expenses" },
];

export function FinanceNav({ active }: { active: FinanceSection }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b pb-3" aria-label="Finance sections">
      {ITEMS.map(({ key, href, label }) => (
        <Link
          key={key}
          href={href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === key
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
