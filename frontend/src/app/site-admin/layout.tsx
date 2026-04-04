"use client";

import { SiteAdminAuthProvider } from "@/lib/platform/site-admin-auth-context";

export default function SiteAdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteAdminAuthProvider>{children}</SiteAdminAuthProvider>;
}
