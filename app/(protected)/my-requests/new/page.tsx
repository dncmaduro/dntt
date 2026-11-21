import { PageIntro } from "@/components/shared/page-intro";
import { RequestForm } from "@/features/payment-requests/components/request-form";
import {
  getCategories,
  getSubCategories,
} from "@/features/payment-requests/queries";
import { requireRole } from "@/lib/auth/session";

export default async function NewRequestPage() {
  const profile = await requireRole(["employee", "accountant"]);
  const [categories, subCategories] = await Promise.all([
    getCategories(),
    getSubCategories(),
  ]);

  return (
    <div className="space-y-6">
      <PageIntro
        description="Điền thông tin và đính kèm chứng từ."
        title="Tạo đề nghị thanh toán"
      />

      <RequestForm
        categories={categories}
        hasProfileQr={Boolean(profile.qr_payment_url)}
        mode="create"
        subCategories={subCategories}
      />
    </div>
  );
}
