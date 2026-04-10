import { PageIntro } from "@/components/shared/page-intro";
import { RequestForm } from "@/features/payment-requests/components/request-form";
import { requireRole } from "@/lib/auth/session";

export default async function NewRequestPage() {
  await requireRole(["employee", "accountant"]);

  return (
    <div className="space-y-6">
      <PageIntro
        description="Điền đầy đủ thông tin và đính kèm chứng từ để gửi đề nghị sang bước xác nhận của kế toán."
        eyebrow="Khởi tạo"
        title="Tạo đề nghị thanh toán"
      />

      <RequestForm mode="create" />
    </div>
  );
}
