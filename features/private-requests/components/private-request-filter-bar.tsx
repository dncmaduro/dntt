"use client";

import { useEffect, useState, useTransition } from "react";
import { RotateCcw, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useDataNavigation } from "@/components/shared/data-navigation";
import type {
  Category,
  PrivateRequestFilters,
  SubCategory,
} from "@/features/private-requests/types";

const ALL_VALUE = "all";

export function PrivateRequestFilterBar({
  categories,
  creators,
  filters,
  subCategories,
}: {
  categories: Category[];
  creators: Array<{ id: string; full_name: string | null }>;
  filters: PrivateRequestFilters;
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
  const disabled = isPending || isDataPending;

  const applyFilters = (nextFilters: PrivateRequestFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    (Object.entries(nextFilters) as Array<[keyof PrivateRequestFilters, string]>).forEach(
      ([key, value]) => {
        if (value && value !== "active" && value !== "newest") {
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
    updater: (current: PrivateRequestFilters) => PrivateRequestFilters,
  ) => {
    const nextFilters = updater(draft);
    setDraft(nextFilters);
    applyFilters(nextFilters);
  };

  return (
    <div className="surface-panel space-y-4 rounded-lg p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 xl:col-span-2">
          <Label>Từ khóa</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              disabled={disabled}
              onChange={(event) =>
                setDraft((current) => ({ ...current, keyword: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applyFilters(draft);
                }
              }}
              placeholder="Tìm theo tiêu đề hoặc mô tả"
              value={draft.keyword}
            />
          </div>
        </div>

        <FilterSelect
          disabled={disabled}
          label="Danh mục"
          onChange={(value) =>
            updateFilters((current) => ({
              ...current,
              category: value === ALL_VALUE ? "" : value,
              sub_category: "",
            }))
          }
          options={categories.map((category) => ({
            label: category.name,
            value: category.id,
          }))}
          value={draft.category}
        />
        <FilterSelect
          disabled={!draft.category || disabled}
          label="Danh mục con"
          onChange={(value) =>
            updateFilters((current) => ({
              ...current,
              sub_category: value === ALL_VALUE ? "" : value,
            }))
          }
          options={availableSubCategories.map((subCategory) => ({
            label: subCategory.name,
            value: subCategory.id,
          }))}
          value={draft.sub_category}
        />
        <FilterSelect
          disabled={disabled}
          label="Người tạo"
          onChange={(value) =>
            updateFilters((current) => ({
              ...current,
              creator: value === ALL_VALUE ? "" : value,
            }))
          }
          options={creators.map((creator) => ({
            label: creator.full_name ?? creator.id,
            value: creator.id,
          }))}
          value={draft.creator}
        />
        <div className="space-y-2">
          <Label>Từ ngày</Label>
          <Input
            disabled={disabled}
            onChange={(event) =>
              setDraft((current) => ({ ...current, from: event.target.value }))
            }
            onBlur={() => applyFilters(draft)}
            type="date"
            value={draft.from}
          />
        </div>
        <div className="space-y-2">
          <Label>Đến ngày</Label>
          <Input
            disabled={disabled}
            onChange={(event) =>
              setDraft((current) => ({ ...current, to: event.target.value }))
            }
            onBlur={() => applyFilters(draft)}
            type="date"
            value={draft.to}
          />
        </div>
        <FilterSelect
          disabled={disabled}
          label="Sắp xếp"
          onChange={(value) =>
            updateFilters((current) => ({
              ...current,
              sort: value === "oldest" ? "oldest" : "newest",
            }))
          }
          options={[
            { label: "Mới nhất", value: "newest" },
            { label: "Cũ nhất", value: "oldest" },
          ]}
          value={draft.sort}
        />
        <FilterSelect
          disabled={disabled}
          label="Tình trạng xóa"
          onChange={(value) =>
            updateFilters((current) => ({
              ...current,
              deleted: value === "deleted" ? "deleted" : "active",
            }))
          }
          options={[
            { label: "Chưa xóa", value: "active" },
            { label: "Đã xóa", value: "deleted" },
          ]}
          value={draft.deleted}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {disabled ? "Đang cập nhật bộ lọc..." : "Bộ lọc cập nhật tự động"}
        </span>
        <Button
          disabled={disabled}
          onClick={() => {
            const emptyFilters: PrivateRequestFilters = {
              category: "",
              sub_category: "",
              keyword: "",
              deleted: "active",
              from: "",
              to: "",
              creator: "",
              sort: "newest",
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

function FilterSelect({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <NativeSelect
        className="disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value || ALL_VALUE}
      >
        <option value={ALL_VALUE}>
          {label === "Người tạo" ? "Tất cả người tạo" : `Tất cả ${label.toLowerCase()}`}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
