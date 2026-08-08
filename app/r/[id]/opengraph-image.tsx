import { ImageResponse } from "next/og";

import { getSharedPaymentRequestPreview } from "@/features/payment-requests/queries";
import { isPaymentRequestShareIdentifier } from "@/features/payment-requests/share";

export const dynamic = "force-dynamic";

export const alt = "QR thanh toán";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identifier = id.trim().toLowerCase();
  const request = isPaymentRequestShareIdentifier(identifier)
    ? await getSharedPaymentRequestPreview(identifier)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "white",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        {request?.qrPreviewUrl ? (
          <img
            alt="QR thanh toán"
            height="630"
            src={request.qrPreviewUrl}
            style={{ height: 630, objectFit: "contain", width: 630 }}
            width="630"
          />
        ) : null}
      </div>
    ),
    size,
  );
}
