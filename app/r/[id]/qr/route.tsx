import { ImageResponse } from "next/og";

import { getSharedPaymentRequestPreview } from "@/features/payment-requests/queries";
import { isPaymentRequestShareIdentifier } from "@/features/payment-requests/share";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_DIMENSION = 1200;

type ImageDimensions = {
  width: number;
  height: number;
};

const isJpegStartOfFrame = (marker: number) =>
  marker >= 0xc0 &&
  marker <= 0xcf &&
  marker !== 0xc4 &&
  marker !== 0xc8 &&
  marker !== 0xcc;

const getImageDimensions = (buffer: ArrayBuffer): ImageDimensions | null => {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  }

  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;

    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);

      if (isJpegStartOfFrame(marker)) {
        return {
          width: view.getUint16(offset + 7),
          height: view.getUint16(offset + 5),
        };
      }

      offset += 2 + length;
    }
  }

  return null;
};

const getPreviewDimensions = (
  dimensions: ImageDimensions | null,
): ImageDimensions => {
  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return { width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION };
  }

  const scale = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(dimensions.width, dimensions.height),
  );

  return {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
  };
};

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

  if (!qrResponse.ok) {
    return new Response(null, { status: 404 });
  }

  const qrBuffer = await qrResponse.arrayBuffer();
  const size = getPreviewDimensions(getImageDimensions(qrBuffer));
  const contentType = qrResponse.headers.get("content-type") ?? "image/png";
  const qrDataUrl = `data:${contentType};base64,${Buffer.from(qrBuffer).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: "white",
          display: "flex",
          height: "100%",
          width: "100%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="QR thanh toán"
          height={String(size.height)}
          src={qrDataUrl}
          style={{ height: size.height, width: size.width }}
          width={String(size.width)}
        />
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
