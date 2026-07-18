import { cn } from '@/lib/utils';

export function BrandMark({
  className,
  compact = false,
  inverted = false,
}: {
  className?: string;
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        alt="DNTT nội bộ"
        className="size-11 rounded-2xl shadow-lg shadow-primary/15"
        height="44"
        src="/icon.svg"
        width="44"
      />

      {compact ? null : (
        <div className="space-y-1">
          <h1
            className={cn(
              'text-base font-semibold leading-[1.2]',
              inverted ? 'text-white' : 'text-foreground',
            )}
          >
            Đề nghị thanh toán
          </h1>
        </div>
      )}
    </div>
  );
}
