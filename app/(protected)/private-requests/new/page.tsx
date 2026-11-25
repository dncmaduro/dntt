import { PageIntro } from "@/components/shared/page-intro";
import { PrivateRequestForm } from "@/features/private-requests/components/private-request-form";
import { getCategories, getSubCategories } from "@/features/private-requests/queries";
import { requireRole } from "@/lib/auth/session";

export default async function NewPrivateRequestPage() {
  await requireRole(["director"]);
  const [categories, subCategories] = await Promise.all([
    getCategories(),
    getSubCategories(),
  ]);

  return (
    <div className="space-y-6">
      <PageIntro title="Tạo DNTT riêng" />
      <PrivateRequestForm categories={categories} subCategories={subCategories} />
    </div>
  );
}
