import { getSharedPaymentRequestPreview } from "@/features/payment-requests/queries";
import { isPaymentRequestShareIdentifier } from "@/features/payment-requests/share";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const identifier = id.trim().toLowerCase();

  if (!isPaymentRequestShareIdentifier(identifier)) {
    return new Response(null, { status: 404 });
  }

  const paymentRequest = await getSharedPaymentRequestPreview(identifier);

  if (!paymentRequest?.qrPreviewUrl) {
    return new Response(null, { status: 404 });
  }

  const qrResponse = await fetch(paymentRequest.qrPreviewUrl, {
    cache: "no-store",
  });

  if (!qrResponse.ok || !qrResponse.body) {
    return new Response(null, { status: 404 });
  }

  return new Response(qrResponse.body, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Type": qrResponse.headers.get("content-type") ?? "image/png",
    },
  });
}
