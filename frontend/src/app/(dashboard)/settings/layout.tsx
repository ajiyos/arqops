"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Building2, Users, Shield, UserCog, ScrollText, Layers, Sparkles, Mail } from "lucide-react";

const settingsTabs = [
  { label: "Firm Profile", href: "/settings/profile", icon: Building2 },
  { label: "My Account", href: "/settings/account", icon: UserCog },
  { label: "Project types", href: "/settings/project-types", icon: Layers },
  { label: "Outbound email", href: "/settings/outbound-email", icon: Mail },
  { label: "Contract AI", href: "/settings/contract-ai", icon: Sparkles },
  { label: "Users", href: "/settings/users", icon: Users },
  { label: "Roles", href: "/settings/roles", icon: Shield },
  { label: "Audit Log", href: "/settings/audit-log", icon: ScrollText },
];

export default function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, firm profile, team members, and access roles.
        </p>
      </div>

      <nav className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {settingsTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
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
