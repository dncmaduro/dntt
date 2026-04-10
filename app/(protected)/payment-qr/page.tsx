import { PageIntro } from "@/components/shared/page-intro";
import { requireRole } from "@/lib/auth/session";
import { PaymentQrLookupControls } from "@/features/payment-qr/components/payment-qr-lookup-controls";
import { SelectedEmployeeQrPanel } from "@/features/payment-qr/components/selected-employee-qr-panel";
import {
  getEmployeesForPaymentQrLookup,
  getSelectedEmployeePaymentQr,
  parsePaymentQrSearchParams,
} from "@/features/payment-qr/queries";

type PaymentQrPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentQrPage({
  searchParams,
}: PaymentQrPageProps) {
  await requireRole(["director"]);

  const { employeeId, month, page, year } =
    await parsePaymentQrSearchParams(searchParams);
  const [employees, selectedEmployee] = await Promise.all([
    getEmployeesForPaymentQrLookup(),
    getSelectedEmployeePaymentQr(employeeId, {
      month,
      page,
      year,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageIntro
        description="Chọn nhân sự để xem nhanh mã QR phục vụ thanh toán."
        eyebrow="Thanh toán"
        title="QR thanh toán"
      />

      <PaymentQrLookupControls
        key={selectedEmployee?.id ?? employeeId ?? "empty"}
        employees={employees}
        selectedEmployeeId={employeeId}
      />

      <SelectedEmployeeQrPanel employee={selectedEmployee} />
    </div>
  );
}
