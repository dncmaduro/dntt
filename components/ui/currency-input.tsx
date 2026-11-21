import type * as React from "react";

import { cn } from "@/lib/utils";

const amountFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

const normalizeAmount = (rawValue: string) => {
  const digitsOnly = rawValue.replace(/\D/g, "");

  if (!digitsOnly) {
    return null;
  }

  const parsed = Number(digitsOnly);

  return Number.isFinite(parsed) ? parsed : null;
};

export function CurrencyInput({
  className,
  onBlur,
  onValueChange,
  placeholder,
  value,
  ...props
}: Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value?: number | null;
  onValueChange: (value: number | null) => void;
}) {
  const displayValue =
    value == null ? "" : amountFormatter.format(Math.trunc(value));

  return (
    <div className="relative">
      <input
        {...props}
        className={cn(
          "flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 pr-14 text-sm text-foreground shadow-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/60",
          className,
        )}
        inputMode="numeric"
        onBlur={onBlur}
        onChange={(event) => onValueChange(normalizeAmount(event.target.value))}
        placeholder={placeholder}
        type="text"
        value={displayValue}
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-muted-foreground">
        đ
      </span>
    </div>
  );
}
