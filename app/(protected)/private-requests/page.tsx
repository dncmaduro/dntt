import Link from "next/link";

import { PageIntro } from "@/components/shared/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrivateRequestList } from "@/features/private-requests/components/private-request-list";
import { getPrivateDashboardData } from "@/features/private-requests/queries";
import { APP_ROUTES } from "@/lib/constants";
import { requireRole } from "@/lib/auth/session";

export default async function PrivateRequestsDashboardPage() {
  const profile = await requireRole(["accountant", "director"]);
  const dashboard = await getPrivateDashboardData();

  return (
    <div className="space-y-6">
      <PageIntro
        actions={
          profile.role === "director" ? (
            <Button asChild>
              <Link href={APP_ROUTES.privateNewRequest}>Tạo DNTT riêng</Link>
            </Button>
          ) : null
        }
        title="Tổng quan DNTT riêng"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {dashboard.metrics.map((metric) => (
          <Card className="rounded-lg" key={metric.label}>
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">DNTT riêng gần đây</h2>
          <Link className="text-sm font-medium text-primary" href={APP_ROUTES.privateRequests}>
            Xem tất cả
          </Link>
        </div>
        <PrivateRequestList
          detailHrefBase={APP_ROUTES.privateDashboard}
          emptyDescription="Chưa có DNTT riêng gần đây."
          items={dashboard.recentRequests}
        />
      </section>
    </div>
  );
}
