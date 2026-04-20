"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Filter, LoaderCircle, RotateCcw, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  REQUEST_DELETION_FILTER_OPTIONS,
  REQUEST_STATUS_OPTIONS,
} from "@/lib/constants";
import type {
  Category,
  ProfileOption,
  RequestFilters,
  SubCategory,
} from "@/features/payment-requests/types";

type DraftFilters = RequestFilters;

const dateInputClassName =
  "pr-3 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:ml-2";
const searchDebounceMs = 400;
const ALL_VALUE = "all";

function FilterFields({
  categories,
  subCategories,
  draft,
  setDraft,
  showCreator,
  creators,
}: {
  categories: Category[];
  subCategories: SubCategory[];
  draft: DraftFilters;
  setDraft: React.Dispatch<React.SetStateAction<DraftFilters>>;
  showCreator: boolean;
  creators: ProfileOption[];
}) {
  const availableSubCategories = draft.category
    ? subCategories.filter(
        (subCategory) => subCategory.category_id === draft.category,
      )
    : [];

  return (
    <>
      <div className="space-y-2">
        <Label>Từ khóa</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(event) =>
              setDraft((current) => ({ ...current, keyword: event.target.value }))
            }
            placeholder="Tìm theo tiêu đề, mô tả, ghi chú"
            value={draft.keyword}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Trạng thái</Label>
        <Select
          onValueChange={(value) =>
            setDraft((current) => ({ ...current, status: value === "all" ? "" : value }))
          }
          value={draft.status || "all"}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {REQUEST_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Danh mục</Label>
        <Select
          onValueChange={(value) =>
            setDraft((current) => ({
              ...current,
              category: value === ALL_VALUE ? "" : value,
              sub_category: "",
            }))
          }
          value={draft.category || ALL_VALUE}
        >
          <SelectTrigger className="w-full">
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
            setDraft((current) => ({
              ...current,
              sub_category: value === ALL_VALUE ? "" : value,
            }))
          }
          value={draft.sub_category || ALL_VALUE}
        >
          <SelectTrigger className="w-full">
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
        <Label>Tình trạng xóa</Label>
        <Select
          onValueChange={(value) =>
            setDraft((current) => ({
              ...current,
              deleted: value as DraftFilters["deleted"],
            }))
          }
          value={draft.deleted}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chưa xóa" />
          </SelectTrigger>
          <SelectContent>
            {REQUEST_DELETION_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showCreator ? (
        <div className="space-y-2">
          <Label>Người đề nghị</Label>
          <Select
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                creator: value === ALL_VALUE ? "" : value,
              }))
            }
            value={draft.creator || ALL_VALUE}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tất cả nhân viên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tất cả nhân viên</SelectItem>
              {creators.map((creator) => (
                <SelectItem key={creator.id} value={creator.id}>
                  {creator.full_name ?? "Chưa cập nhật"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Từ ngày</Label>
        <Input
          className={dateInputClassName}
          onChange={(event) =>
            setDraft((current) => ({ ...current, from: event.target.value }))
          }
          type="date"
          value={draft.from}
        />
      </div>

      <div className="space-y-2">
        <Label>Đến ngày</Label>
        <Input
          className={dateInputClassName}
          onChange={(event) =>
            setDraft((current) => ({ ...current, to: event.target.value }))
          }
          type="date"
          value={draft.to}
        />
      </div>

      <div className="space-y-2">
        <Label>Sắp xếp</Label>
        <Select
          onValueChange={(value) =>
            setDraft((current) => ({
              ...current,
              sort: value as DraftFilters["sort"],
            }))
          }
          value={draft.sort}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Mới nhất" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mới nhất</SelectItem>
            <SelectItem value="oldest">Cũ nhất</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export function RequestFilterBar({
  categories,
  subCategories,
  filters,
  creators = [],
  showCreator = false,
}: {
  categories: Category[];
  subCategories: SubCategory[];
  filters: RequestFilters;
  creators?: ProfileOption[];
  showCreator?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<RequestFilters>(filters);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const applyFilters = (nextFilters: RequestFilters) => {
    const params = new URLSearchParams(searchParams.toString());

    (
      Object.entries(nextFilters) as Array<[keyof RequestFilters, string]>
    ).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

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
    updater: (current: RequestFilters) => RequestFilters,
    options?: { debounceSearch?: boolean },
  ) => {
    const nextFilters = updater(draft);
    setDraft(nextFilters);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    if (options?.debounceSearch) {
      searchDebounceRef.current = setTimeout(() => {
        applyFilters(nextFilters);
      }, searchDebounceMs);
      return;
    }

    applyFilters(nextFilters);
  };

  const resetFilters = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    const emptyFilters: RequestFilters = {
      category: "",
      sub_category: "",
      keyword: "",
      status: "",
      deleted: "active",
      from: "",
      to: "",
      creator: "",
      sort: "newest",
    };

    setDraft(emptyFilters);
    applyFilters(emptyFilters);
  };

  const handleDraftUpdate: React.Dispatch<React.SetStateAction<RequestFilters>> = (
    updater,
  ) => {
    const nextFilters = typeof updater === "function" ? updater(draft) : updater;
    const isKeywordChanged = nextFilters.keyword !== draft.keyword;
    updateFilters(() => nextFilters, { debounceSearch: isKeywordChanged });
  };

  return (
    <>
      <div className="surface-panel hidden grid-cols-7 gap-4 rounded-[2rem] p-5 md:grid md:w-full">
        <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <FilterFields
            categories={categories}
            creators={creators}
            draft={draft}
            setDraft={handleDraftUpdate}
            showCreator={showCreator}
            subCategories={subCategories}
          />
        </div>
        <div className="col-span-full flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {isPending ? "Đang cập nhật bộ lọc..." : "Bộ lọc cập nhật tự động"}
          </div>
          <Button onClick={resetFilters} type="button" variant="ghost">
            <RotateCcw className="size-4" />
            Đặt lại
          </Button>
        </div>
      </div>

      <div className="md:hidden">
        <Sheet onOpenChange={setIsOpen} open={isOpen}>
          <SheetTrigger asChild>
            <Button className="w-full rounded-2xl" variant="secondary">
              <Filter className="size-4" />
              Bộ lọc
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Lọc đề nghị</SheetTitle>
              <SheetDescription>
                Tùy chỉnh tiêu chí tìm kiếm phù hợp với màn hình hiện tại.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4">
              <FilterFields
                categories={categories}
                creators={creators}
                draft={draft}
                setDraft={handleDraftUpdate}
                showCreator={showCreator}
                subCategories={subCategories}
              />
            </div>
            <SheetFooter>
              <div className="mr-auto flex items-center text-sm text-muted-foreground">
                {isPending ? (
                  <>
                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  "Đã tự động áp dụng"
                )}
              </div>
              <Button onClick={resetFilters} type="button" variant="ghost">
                <RotateCcw className="size-4" />
                Đặt lại
              </Button>
              <Button
                onClick={() => {
                  setIsOpen(false);
                }}
                type="button"
              >
                Đóng
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
