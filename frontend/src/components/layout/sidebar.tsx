"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/auth/auth-context";
import { useTenantBrandingProfile } from "@/lib/tenant-branding/tenant-branding-context";
import {
  LayoutDashboard, Users, Briefcase, FolderKanban,
  Receipt, UserCog, BarChart3, Settings, Building2, ShoppingCart, FileText,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, permission: null },
  { label: "CRM", href: "/crm/clients", icon: Users, permission: "crm.read" },
  { label: "Pipeline", href: "/crm/pipeline", icon: Briefcase, permission: "crm.read" },
  { label: "Vendors", href: "/vendors", icon: ShoppingCart, permission: "vendor.read" },
  { label: "Projects", href: "/projects", icon: FolderKanban, permission: "project.read" },
  { label: "Contracts", href: "/contracts", icon: FileText, permission: "contract.read" },
  { label: "Finance", href: "/finance/invoices", icon: Receipt, permission: "finance.read" },
  { label: "HR", href: "/hr/employees", icon: UserCog, permission: "hr.read" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "report.read" },
  { label: "Settings", href: "/settings/profile", icon: Settings, permission: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const tenantProfile = useTenantBrandingProfile();
  const permissions = user?.permissions ?? [];
  const firmName = tenantProfile?.name?.trim() || "ArqOps";
  const logoUrl = tenantProfile?.logoUrl?.trim();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 min-h-16 items-center gap-2 border-b px-4">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-md object-contain" />
        ) : (
          <Building2 className="h-8 w-8 shrink-0 text-primary" />
        )}
        <span className="truncate text-lg font-bold leading-tight text-primary" title={firmName}>
          {firmName}
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems
          .filter((item) => !item.permission || permissions.includes(item.permission))
          .map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
