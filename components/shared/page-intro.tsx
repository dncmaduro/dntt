import { cn } from '@/lib/utils';

export function PageIntro({
  title,
  description,
  actions,
  className,
  titleClassName,
  actionsBelow = false,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  actionsBelow?: boolean;
}) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-5',
        actionsBelow ? '' : 'md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <h1
          className={cn(
            'text-2xl font-semibold [overflow-wrap:anywhere] md:text-[1.75rem]',
            titleClassName,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="max-w-prose text-sm leading-6 [overflow-wrap:anywhere] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={cn(
            'flex w-full flex-wrap items-center gap-3',
            actionsBelow ? 'justify-end' : 'md:w-auto md:justify-end',
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
