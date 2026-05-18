import { Badge } from "@/components/ui/badge";
import {
  getPaymentRequestStatusBadgeVariant,
  getPaymentRequestStatusLabel,
} from "@/lib/constants";

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <Badge className={getPaymentRequestStatusBadgeVariant(status)} variant="outline">
      {getPaymentRequestStatusLabel(status)}
    </Badge>
  );
}
