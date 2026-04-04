"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/finance/invoices", label: "Invoices" },
  { href: "/finance/payables", label: "Payables" },
  { href: "/finance/expenses", label: "Expenses" },
] as const;

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const isTenantAdmin = user?.roles?.includes("TENANT_ADMIN") ?? false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
          {!isLoading && isTenantAdmin && (
            <Button variant="outline" size="icon" asChild title="Finance settings (tenant admin)">
              <Link href="/finance/settings" aria-label="Finance settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <nav className="flex gap-4 border-b" aria-label="Finance sections">
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
