import { PageIntro } from "@/components/shared/page-intro";
import { DataNavigationRegion } from "@/components/shared/data-loading-overlay";
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
  const profile = await requireRole(["accountant", "director"]);

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
        description="Chọn nhân sự để xem QR và xử lý thanh toán."
        title="QR thanh toán"
      />

      <PaymentQrLookupControls
        compact={profile.role === "director"}
        key={selectedEmployee?.id ?? employeeId ?? "empty"}
        employees={employees}
        selectedEmployeeId={employeeId}
      />

      <DataNavigationRegion>
        <SelectedEmployeeQrPanel
          employee={selectedEmployee}
          key={selectedEmployee?.id ?? employeeId ?? "empty-panel"}
          viewerRole={profile.role}
        />
      </DataNavigationRegion>
    </div>
  );
}
