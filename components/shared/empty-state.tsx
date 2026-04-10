import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="rounded-[2rem]">
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-5 flex size-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {action ? <div className="mt-6">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
