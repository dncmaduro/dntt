"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useDataNavigation } from "@/components/shared/data-navigation";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type {
  Category,
  PrivateExpenseFilters,
  SubCategory,
} from "@/features/private-requests/types";

const ALL_VALUE = "all";

const buildMonthOptions = (selectedMonth: string) => {
  const now = new Date();
  const options = Array.from({ length: 24 }, (_, index) => {
    const optionDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = `${optionDate.getFullYear()}-${String(
      optionDate.getMonth() + 1,
    ).padStart(2, "0")}`;

    return { value, label: `Tháng ${value.slice(5)}/${value.slice(0, 4)}` };
  });

  if (selectedMonth && !options.some((option) => option.value === selectedMonth)) {
    options.unshift({
      value: selectedMonth,
      label: `Tháng ${selectedMonth.slice(5)}/${selectedMonth.slice(0, 4)}`,
    });
  }

  return options;
};

export function PrivateExpenseFilterBar({
  categories,
  filters,
  subCategories,
}: {
  categories: Category[];
  filters: PrivateExpenseFilters;
  subCategories: SubCategory[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { isPending: isDataPending, start: startDataNavigation } =
    useDataNavigation();
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

  const applyFilters = (nextFilters: PrivateExpenseFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    (Object.entries(nextFilters) as Array<[keyof PrivateExpenseFilters, string]>).forEach(
      ([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      },
    );

    const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;
    const currentUrl = searchParams.toString()
      ? `${pathname}?${searchParams}`
      : pathname;

    if (nextUrl === currentUrl) {
      return;
    }

    startDataNavigation();
    startTransition(() => router.push(nextUrl));
  };

  const updateFilters = (
    updater: (current: PrivateExpenseFilters) => PrivateExpenseFilters,
  ) => {
    const nextFilters = updater(draft);
    setDraft(nextFilters);
    applyFilters(nextFilters);
  };

  const disabled = isPending || isDataPending;

  return (
    <div className="surface-panel space-y-4 rounded-lg p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Danh mục</Label>
          <NativeSelect
            disabled={disabled}
            onChange={(event) =>
              updateFilters((current) => ({
                ...current,
                category: event.target.value === ALL_VALUE ? "" : event.target.value,
                sub_category: "",
              }))
            }
            value={draft.category || ALL_VALUE}
          >
            <option value={ALL_VALUE}>Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label>Danh mục con</Label>
          <NativeSelect
            disabled={!draft.category || disabled}
            onChange={(event) =>
              updateFilters((current) => ({
                ...current,
                sub_category: event.target.value === ALL_VALUE ? "" : event.target.value,
              }))
            }
            value={draft.sub_category || ALL_VALUE}
          >
            <option value={ALL_VALUE}>Tất cả danh mục con</option>
            {availableSubCategories.map((subCategory) => (
              <option key={subCategory.id} value={subCategory.id}>
                {subCategory.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <Label>Tháng phát sinh</Label>
          <NativeSelect
            disabled={disabled}
            onChange={(event) =>
              updateFilters((current) => ({
                ...current,
                month: event.target.value === ALL_VALUE ? "" : event.target.value,
              }))
            }
            value={draft.month || ALL_VALUE}
          >
            <option value={ALL_VALUE}>Tất cả tháng</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {disabled ? "Đang cập nhật bộ lọc..." : "Bộ lọc cập nhật tự động"}
        </div>
        <Button
          disabled={disabled}
          onClick={() => {
            const emptyFilters: PrivateExpenseFilters = {
              category: "",
              sub_category: "",
              month: "",
            };
            setDraft(emptyFilters);
            applyFilters(emptyFilters);
          }}
          type="button"
          variant="ghost"
        >
          <RotateCcw className="size-4" />
          Đặt lại
        </Button>
      </div>
    </div>
  );
}
