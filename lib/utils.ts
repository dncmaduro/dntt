import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatDate = (value?: string | null) => {
  if (!value) {
    return "--";
  }

  return format(new Date(value), "dd/MM/yyyy", { locale: vi });
};

export const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "--";
  }

  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: vi });
};

export const formatCurrency = (value?: number | null) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export const getInitials = (value?: string | null) => {
  if (!value) {
    return "NA";
  }

  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
};

export const isImageMimeType = (value?: string | null) =>
  Boolean(value?.startsWith("image/"));

export const isPdfMimeType = (value?: string | null) =>
  value === "application/pdf";

export const sanitizeFileName = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

export const buildStoragePath = ({
  userId,
  requestId,
  timestamp,
  fileName,
}: {
  userId: string;
  requestId: string;
  timestamp: number;
  fileName: string;
}) => `${userId}/${requestId}/${timestamp}-${sanitizeFileName(fileName)}`;

export const buildPaymentBillStoragePath = ({
  requestId,
  timestamp,
  fileName,
}: {
  requestId: string;
  timestamp: number;
  fileName: string;
}) => `payment-bills/${requestId}/${timestamp}-${sanitizeFileName(fileName)}`;

export const buildPaymentRequestQrStoragePath = ({
  requestId,
  timestamp,
  fileName,
}: {
  requestId: string;
  timestamp: number;
  fileName: string;
}) => `payment-request-qrs/${requestId}/${timestamp}-${sanitizeFileName(fileName)}`;

const resolveFileExtension = ({
  fileName,
  fileType,
}: {
  fileName: string;
  fileType?: string | null;
}) => {
  const sanitizedFileName = sanitizeFileName(fileName);
  const fileNameParts = sanitizedFileName.split(".");
  const fileExtension =
    fileNameParts.length > 1 ? fileNameParts[fileNameParts.length - 1] : "";

  if (fileExtension) {
    return fileExtension;
  }

  const mimeExtension = fileType?.split("/")[1]?.toLowerCase().split("+")[0];

  if (mimeExtension === "jpeg") {
    return "jpg";
  }

  return mimeExtension || "png";
};

export const buildProfileQrStoragePath = ({
  userId,
  timestamp,
  fileName,
  fileType,
}: {
  userId: string;
  timestamp: number;
  fileName: string;
  fileType?: string | null;
}) =>
  `${userId}/profile/qr-${timestamp}.${resolveFileExtension({
    fileName,
    fileType,
  })}`;

export const toPlainString = (value?: string | string[] | null) =>
  Array.isArray(value) ? value[0] : value ?? "";

export const toStringArray = (value?: string | string[] | null) =>
  Array.isArray(value) ? value : value ? [value] : [];

export const generatePaymentReference = () => {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const randomPart = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

  return `PAY-${datePart}-${randomPart}`;
};
