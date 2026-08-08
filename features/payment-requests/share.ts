const SHORT_CODE_PATTERN = /^[a-f0-9]{10}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isPaymentRequestShortCode = (value: string) =>
  SHORT_CODE_PATTERN.test(value.trim().toLowerCase());

export const isPaymentRequestShareIdentifier = (value: string) => {
  const normalizedValue = value.trim();

  return (
    isPaymentRequestShortCode(normalizedValue) || UUID_PATTERN.test(normalizedValue)
  );
};

export const buildPaymentRequestSharePath = (
  requestId: string,
  shortCode?: string | null,
) => {
  const normalizedShortCode = shortCode?.trim().toLowerCase() ?? "";

  if (isPaymentRequestShortCode(normalizedShortCode)) {
    return `/r/${encodeURIComponent(normalizedShortCode)}`;
  }

  return `/r/${encodeURIComponent(requestId)}`;
};
