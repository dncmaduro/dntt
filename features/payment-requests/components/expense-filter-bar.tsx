"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
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
import type {
  Category,
  ExpenseFilters,
  SubCategory,
} from "@/features/payment-requests/types";

const ALL_VALUE = "all";

const formatMonthLabel = (value: string) => {
  const [year, month] = value.split("-");

  if (!year || !month) {
    return value;
  }

  return `Tháng ${month}/${year}`;
};

const buildMonthOptions = (selectedMonth: string) => {
  const now = new Date();
  const options = Array.from({ length: 24 }, (_, index) => {
    const optionDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const year = optionDate.getFullYear();
    const month = String(optionDate.getMonth() + 1).padStart(2, "0");
    const value = `${year}-${month}`;

    return {
      value,
      label: formatMonthLabel(value),
    };
  });

  if (selectedMonth && !options.some((option) => option.value === selectedMonth)) {
    options.unshift({
      value: selectedMonth,
      label: formatMonthLabel(selectedMonth),
    });
  }

  return options;
};

export function ExpenseFilterBar({
  categories,
  filters,
  subCategories,
}: {
  categories: Category[];
  filters: ExpenseFilters;
  subCategories: SubCategory[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const availableSubCategories = draft.category
    ? subCategories.filter(
        (subCategory) => subCategory.category_id === draft.category,
      )
    : [];
  const monthOptions = useMemo(() => buildMonthOptions(draft.month), [draft.month]);

  const applyFilters = (nextFilters: ExpenseFilters) => {
    const params = new URLSearchParams(searchParams.toString());

    (Object.entries(nextFilters) as Array<[keyof ExpenseFilters, string]>).forEach(
      ([key, value]) => {
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      },
    );

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    const currentUrl = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (nextUrl === currentUrl) {
      return;
    }

    startTransition(() => {
      router.push(nextUrl);
    });
  };

  const updateFilters = (
    updater: (current: ExpenseFilters) => ExpenseFilters,
  ) => {
    const nextFilters = updater(draft);
    setDraft(nextFilters);

    applyFilters(nextFilters);
  };

  const resetFilters = () => {
    const emptyFilters: ExpenseFilters = {
      category: "",
      sub_category: "",
      payment_status: "all",
      month: "",
    };

    setDraft(emptyFilters);
    applyFilters(emptyFilters);
  };

  return (
    <div className="surface-panel space-y-4 rounded-[2rem] p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label>Danh mục</Label>
          <Select
            onValueChange={(value) =>
              updateFilters((current) => ({
                ...current,
                category: value === ALL_VALUE ? "" : value,
                sub_category: "",
              }))
            }
            value={draft.category || ALL_VALUE}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tất cả danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tất cả danh mục</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Danh mục con</Label>
          <Select
            disabled={!draft.category}
            onValueChange={(value) =>
              updateFilters((current) => ({
                ...current,
                sub_category: value === ALL_VALUE ? "" : value,
              }))
            }
            value={draft.sub_category || ALL_VALUE}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tất cả danh mục con" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tất cả danh mục con</SelectItem>
              {availableSubCategories.map((subCategory) => (
                <SelectItem key={subCategory.id} value={subCategory.id}>
                  {subCategory.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Trạng thái thanh toán</Label>
          <Select
            onValueChange={(value) =>
              updateFilters((current) => ({
                ...current,
                payment_status:
                  value === "paid" ? "paid" : "all",
              }))
            }
            value={draft.payment_status}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="paid">Đã thanh toán</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tháng</Label>
          <Select
            onValueChange={(value) =>
              updateFilters((current) => ({
                ...current,
                month: value === ALL_VALUE ? "" : value,
              }))
            }
            value={draft.month || ALL_VALUE}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tất cả tháng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tất cả tháng</SelectItem>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {isPending ? "Đang cập nhật bộ lọc..." : "Bộ lọc cập nhật tự động"}
        </div>
        <Button onClick={resetFilters} type="button" variant="ghost">
          <RotateCcw className="size-4" />
          Đặt lại
        </Button>
      </div>
    </div>
  );
}
