"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSiteAdminAuth } from "@/lib/platform/site-admin-auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Shield, Building2, LogOut, BarChart3, Users } from "lucide-react";

const navItems = [
  { label: "Tenants", href: "/site-admin/tenants", icon: Building2 },
  { label: "Users", href: "/site-admin/users", icon: Users },
  { label: "Analytics", href: "/site-admin/analytics", icon: BarChart3 },
];

export default function SiteAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user, logout } = useSiteAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/site-admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50">
      {/* Sidebar */}
      <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900">
        <div className="flex h-16 items-center border-b border-slate-800 px-6">
          <Shield className="mr-2 h-5 w-5 text-amber-500" />
          <span className="text-lg font-bold text-amber-500">Site Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <p className="mb-2 truncate text-xs text-slate-500">{user?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            onClick={() => {
              logout();
              router.push("/site-admin/login");
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
          <h1 className="text-sm font-medium text-slate-300">Platform Administration</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{user?.name}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-500">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">{children}</main>
      </div>
    </div>
  );
}
