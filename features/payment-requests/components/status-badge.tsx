import { Badge } from "@/components/ui/badge";
import {
  STATUS_BADGE_VARIANTS,
  STATUS_LABELS,
  type PaymentRequestStatus,
} from "@/lib/constants";

export function StatusBadge({
  status,
}: {
  status: PaymentRequestStatus;
}) {
  return (
    <Badge className={STATUS_BADGE_VARIANTS[status]} variant="outline">
      {STATUS_LABELS[status]}
    </Badge>
  );
}
