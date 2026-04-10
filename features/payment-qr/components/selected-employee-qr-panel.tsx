"use client";

import { useEffect, useState } from "react";
import { FileClock, QrCode } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PaymentQrPanel } from "./payment-qr-panel";
import { PaymentQrUnpaidRequestsPanel } from "./payment-qr-unpaid-requests-panel";
import type { SelectedEmployeePaymentQr } from "@/features/payment-qr/types";

export function SelectedEmployeeQrPanel({
  employee,
}: {
  employee: SelectedEmployeePaymentQr | null;
}) {
  const [selectionSummary, setSelectionSummary] = useState({
    selectedCount: 0,
    selectedTotalAmount: 0,
  });

  useEffect(() => {
    setSelectionSummary({
      selectedCount: 0,
      selectedTotalAmount: 0,
    });
  }, [employee?.id]);

  if (!employee) {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <EmptyState
          description="Chọn nhân sự ở phía trên để hiển thị mã QR thanh toán phục vụ chuyển khoản."
          icon={QrCode}
          title="Chưa chọn nhân sự"
        />
        <EmptyState
          description="Danh sách đề nghị chờ thanh toán sẽ xuất hiện ngay tại đây sau khi bạn chọn nhân sự."
          icon={FileClock}
          title="Chưa có dữ liệu đề nghị"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <PaymentQrPanel
        employee={employee}
        selectedCount={selectionSummary.selectedCount}
        selectedTotalAmount={selectionSummary.selectedTotalAmount}
      />
      <PaymentQrUnpaidRequestsPanel
        employeeName={employee.full_name}
        onSelectionSummaryChange={setSelectionSummary}
        requests={employee.unpaid_requests}
        totalAmount={employee.unpaid_total_amount}
        totalCount={employee.unpaid_request_count}
      />
    </div>
  );
}
