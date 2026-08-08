import { ImageResponse } from "next/og";

import { getSharedPaymentRequestPreview } from "@/features/payment-requests/queries";

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
  const request = await getSharedPaymentRequestPreview(id);
  const description = request?.description || "Đề nghị thanh toán nội bộ";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f8faf9",
          color: "#17212b",
          display: "flex",
          height: "100%",
          padding: "64px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: "24px",
            paddingRight: "52px",
          }}
        >
          <div style={{ color: "#0f9b83", fontSize: 28, fontWeight: 700 }}>
            ĐỀ NGHỊ THANH TOÁN
          </div>
          <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.15 }}>
            {request?.title || "Đề nghị thanh toán"}
          </div>
          <div style={{ color: "#64748b", fontSize: 28, lineHeight: 1.4 }}>
            {description}
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            background: "white",
            border: "2px solid #d8e5e0",
            borderRadius: 32,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            padding: 28,
          }}
        >
          {request?.qrPreviewUrl ? (
            <img
              alt="QR thanh toán"
              height="390"
              src={request.qrPreviewUrl}
              style={{ height: 390, objectFit: "contain", width: 390 }}
              width="390"
            />
          ) : (
            <div
              style={{
                alignItems: "center",
                color: "#64748b",
                display: "flex",
                fontSize: 26,
                height: 390,
                textAlign: "center",
                width: 390,
              }}
            >
              Chưa có QR thanh toán
            </div>
          )}
          <div style={{ color: "#0f9b83", fontSize: 26, fontWeight: 700 }}>
            Quét QR để thanh toán
          </div>
        </div>
      </div>
    ),
    size,
  );
}
