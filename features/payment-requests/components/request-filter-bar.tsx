"use client";

import { useEffect, useState, useTransition } from "react";
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
import { REQUEST_STATUS_OPTIONS } from "@/lib/constants";
import type { ProfileOption, RequestFilters } from "@/features/payment-requests/types";

type DraftFilters = RequestFilters;

const dateInputClassName =
  "pr-3 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:ml-2";

function FilterFields({
  draft,
  setDraft,
  showCreator,
  creators,
}: {
  draft: DraftFilters;
  setDraft: React.Dispatch<React.SetStateAction<DraftFilters>>;
  showCreator: boolean;
  creators: ProfileOption[];
}) {
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
          <SelectTrigger>
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

      {showCreator ? (
        <div className="space-y-2">
          <Label>Người tạo</Label>
          <Select
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                creator: value === "all" ? "" : value,
              }))
            }
            value={draft.creator || "all"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tất cả nhân viên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhân viên</SelectItem>
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
          <SelectTrigger>
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
  filters,
  creators = [],
  showCreator = false,
}: {
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

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

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

    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  };

  const resetFilters = () => {
    const emptyFilters: RequestFilters = {
      keyword: "",
      status: "",
      from: "",
      to: "",
      creator: "",
      sort: "newest",
    };

    setDraft(emptyFilters);
    applyFilters(emptyFilters);
  };

  return (
    <>
      <div className="surface-panel hidden grid-cols-6 gap-4 rounded-[2rem] p-5 md:grid">
        <FilterFields
          creators={creators}
          draft={draft}
          setDraft={setDraft}
          showCreator={showCreator}
        />
        <div className="col-span-full flex items-center justify-end gap-3">
          <Button onClick={resetFilters} type="button" variant="ghost">
            <RotateCcw className="size-4" />
            Đặt lại
          </Button>
          <Button onClick={() => applyFilters(draft)} type="button">
            {isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Filter className="size-4" />
            )}
            Áp dụng
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
                creators={creators}
                draft={draft}
                setDraft={setDraft}
                showCreator={showCreator}
              />
            </div>
            <SheetFooter>
              <Button onClick={resetFilters} type="button" variant="ghost">
                <RotateCcw className="size-4" />
                Đặt lại
              </Button>
              <Button
                onClick={() => {
                  applyFilters(draft);
                  setIsOpen(false);
                }}
                type="button"
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Filter className="size-4" />
                )}
                Áp dụng
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
