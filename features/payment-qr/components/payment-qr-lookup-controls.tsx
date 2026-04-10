"use client";

import { useTransition } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentQrEmployeeOption } from "@/features/payment-qr/types";

export function PaymentQrLookupControls({
  employees,
  selectedEmployeeId,
}: {
  employees: PaymentQrEmployeeOption[];
  selectedEmployeeId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateSelectedEmployee = (employeeId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    if (employeeId) {
      params.set("employee", employeeId);
    } else {
      params.delete("employee");
    }

    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  };

  return (
    <div className="surface-panel rounded-[1.5rem] p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="payment-qr-employee">Nhân sự</Label>
          <Select
            disabled={!employees.length || isPending}
            onValueChange={(value) => updateSelectedEmployee(value)}
            value={selectedEmployeeId}
          >
            <SelectTrigger id="payment-qr-employee">
              <SelectValue placeholder="Chọn nhân sự để thanh toán" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name ?? "Chưa cập nhật"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Chọn nhân sự để xem QR và xử lý đề nghị chờ thanh toán trong cùng màn hình.
          </p>
        </div>

        <Button
          disabled={!selectedEmployeeId || isPending}
          onClick={() => updateSelectedEmployee()}
          type="button"
          variant="outline"
        >
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <RotateCcw className="size-4" />
          )}
          Bỏ chọn
        </Button>
      </div>

      {!employees.length ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Chưa có nhân sự nào khả dụng để tra cứu QR thanh toán.
        </p>
      ) : null}
    </div>
  );
}
