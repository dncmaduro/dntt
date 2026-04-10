import { LOG_ACTION_LABELS, ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { PaymentRequestLogWithActor } from "@/features/payment-requests/types";

export function RequestTimeline({
  logs,
}: {
  logs: PaymentRequestLogWithActor[];
}) {
  return (
    <div className="space-y-4">
      {logs.map((log, index) => {
        const isLastItem = index === logs.length - 1;

        return (
        <div key={log.id} className="flex gap-4">
          <div className="relative flex w-3 shrink-0 justify-center">
            <span className="relative z-10 mt-1 size-3 rounded-full bg-primary" />
            {!isLastItem ? (
              <span className="absolute left-1/2 top-4 bottom-0 w-px -translate-x-1/2 bg-border" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 rounded-3xl border border-border/70 bg-white/70 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">
                  {LOG_ACTION_LABELS[log.action as keyof typeof LOG_ACTION_LABELS] ??
                    log.action}
                </p>
                <p className="text-sm text-muted-foreground">
                  {log.actor?.full_name ?? "Hệ thống"}
                  {log.actor?.role ? ` • ${ROLE_LABELS[log.actor.role as keyof typeof ROLE_LABELS]}` : ""}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(log.created_at)}
              </p>
            </div>
            {log.meta && typeof log.meta === "object" && "note" in log.meta ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {(log.meta.note as string) || "Không có ghi chú bổ sung"}
              </p>
            ) : null}
          </div>
        </div>
        );
      })}
    </div>
  );
}
