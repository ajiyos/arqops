"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SiteAdminIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/site-admin/tenants");
  }, [router]);
  return null;
}
