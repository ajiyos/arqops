"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Users, Target, Columns3 } from "lucide-react";

const crmTabs = [
  { label: "Clients", href: "/crm/clients", icon: Users },
  { label: "Leads", href: "/crm/leads", icon: Target },
  { label: "Pipeline", href: "/crm/pipeline", icon: Columns3 },
];

export default function CrmLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage clients, track leads, and monitor your sales pipeline.
        </p>
      </div>

      <nav className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {crmTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
