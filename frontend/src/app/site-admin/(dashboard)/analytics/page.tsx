"use client";

import { useEffect, useState } from "react";
import platformApi from "@/lib/platform/platform-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle, PauseCircle, XCircle } from "lucide-react";

interface TenantSummary {
  id: string;
  name: string;
  status: string;
  plan: string;
  createdAt: string;
}

export default function AnalyticsPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi
      .get("/api/v1/platform/tenants", { params: { page: 0, size: 1000 } })
      .then(({ data }) => {
        setTenants(data.data.content || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = tenants.filter((t) => t.status === "active").length;
  const suspended = tenants.filter((t) => t.status === "suspended").length;
  const deactivated = tenants.filter((t) => t.status === "deactivated").length;

  const planCounts: Record<string, number> = {};
  tenants.forEach((t) => {
    const p = t.plan || "unknown";
    planCounts[p] = (planCounts[p] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-50">Platform Analytics</h1>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Tenants"
          value={tenants.length}
          icon={<Building2 className="h-5 w-5" />}
          accent="text-amber-500 bg-amber-500/10"
        />
        <KpiCard
          title="Active"
          value={active}
          icon={<CheckCircle className="h-5 w-5" />}
          accent="text-emerald-400 bg-emerald-500/10"
        />
        <KpiCard
          title="Suspended"
          value={suspended}
          icon={<PauseCircle className="h-5 w-5" />}
          accent="text-amber-400 bg-amber-500/10"
        />
        <KpiCard
          title="Deactivated"
          value={deactivated}
          icon={<XCircle className="h-5 w-5" />}
          accent="text-red-400 bg-red-500/10"
        />
      </div>

      {/* Plan breakdown */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-slate-200">Tenants by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.entries(planCounts).length === 0 ? (
            <p className="text-sm text-slate-500">No data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(planCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([plan, count]) => (
                  <div key={plan} className="flex items-center gap-4">
                    <span className="w-28 text-sm capitalize text-slate-300">{plan}</span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-amber-500"
                          style={{
                            width: `${Math.max(4, (count / tenants.length) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-10 text-right text-sm font-medium text-slate-300">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent tenants */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-slate-200">Recently Created</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tenants
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 5)
              .map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-700 text-xs font-bold text-amber-500">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.plan || "—"}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-50">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
