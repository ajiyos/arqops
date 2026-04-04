"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function PlatformUsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-50">Platform Users</h1>
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-200">
            <Users className="h-5 w-5 text-amber-500" />
            Platform Administrators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">
            Platform user management coming soon. Currently, platform administrators are seeded via
            database migrations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
