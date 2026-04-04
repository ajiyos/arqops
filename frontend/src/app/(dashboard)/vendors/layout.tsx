"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { ShoppingCart, FileText, ClipboardList } from "lucide-react";

const vendorTabs = [
  { label: "Vendors", href: "/vendors", icon: ShoppingCart },
  { label: "Work Orders", href: "/vendors/work-orders", icon: FileText },
  { label: "Purchase Orders", href: "/vendors/purchase-orders", icon: ClipboardList },
];

export default function VendorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendor Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage vendors, work orders, and purchase orders.
        </p>
      </div>

      <nav className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {vendorTabs.map((tab) => {
          const isActive =
            tab.href === "/vendors"
              ? pathname === "/vendors" || pathname.startsWith("/vendors/") && !vendorTabs.slice(1).some((t) => pathname.startsWith(t.href))
              : pathname.startsWith(tab.href);
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
