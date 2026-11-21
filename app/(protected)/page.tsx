import Link from "next/link";

import { PageIntro } from "@/components/shared/page-intro";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardData } from "@/features/payment-requests/queries";
import { RequestList } from "@/features/payment-requests/components/request-list";
import { APP_ROUTES } from "@/lib/constants";
import { requireAuth } from "@/lib/auth/session";

export default async function DashboardPage() {
  const profile = await requireAuth();
  const dashboard = await getDashboardData({
    role: profile.role,
    userId: profile.id,
  });
  const detailBase =
    profile.role === "employee" ? APP_ROUTES.myRequests : APP_ROUTES.requests;

  return (
    <div className="space-y-6">
      <PageIntro
        title="Tổng quan xử lý"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((metric) => (
          <Card key={metric.label} className="rounded-lg">
            <CardContent className="space-y-4 p-6">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-4xl font-semibold">{metric.value}</p>
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
          <div>
            <h2 className="text-xl font-semibold">Đề nghị gần đây</h2>
          </div>
          <Link className="text-sm font-medium text-primary" href={detailBase}>
            Xem tất cả
          </Link>
        </div>

        <RequestList
          detailHrefBase={detailBase}
          emptyDescription="Chưa có đề nghị gần đây."
          items={dashboard.recentRequests}
          showOwner={profile.role !== "employee"}
        />
      </section>
    </div>
  );
}
