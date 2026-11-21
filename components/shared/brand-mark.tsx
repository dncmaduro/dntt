import { cn } from '@/lib/utils';
import Image from 'next/image';

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
      <Image
        alt="DNTT nội bộ"
        className="size-10 rounded-xl shadow-sm shadow-black/10"
        height={40}
        src="/icon.svg"
        width={40}
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
