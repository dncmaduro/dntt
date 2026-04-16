import { z } from "zod";

export const MAX_ATTACHMENTS = 10;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_PAYMENT_BILL_SIZE_BYTES = 4 * 1024 * 1024;
export const MAX_PAYMENT_REQUEST_QR_SIZE_BYTES = 4 * 1024 * 1024;
export const PAYMENT_REFERENCE_PATTERN = /^PAY-\d{8}-[A-Z0-9]{8}$/;

export const paymentRequestFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Tiêu đề phải có ít nhất 3 ký tự")
    .max(160, "Tiêu đề không được vượt quá 160 ký tự"),
  amount: z
    .number()
    .nonnegative("Số tiền không được nhỏ hơn 0")
    .nullable()
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Mô tả không được vượt quá 2000 ký tự")
    .optional()
    .or(z.literal("")),
  payment_date: z.string().min(1, "Vui lòng chọn ngày thanh toán"),
});

export const reviewSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    note: z
      .string()
      .trim()
      .max(2000, "Ghi chú không được vượt quá 2000 ký tự")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.decision === "reject" && !value.note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập lý do từ chối",
        path: ["note"],
      });
    }
  });

export const paymentBillImageSchema = z
  .instanceof(File, {
    message: "Vui lòng chọn một ảnh bill hợp lệ",
  })
  .refine((file) => file.size > 0, "Ảnh bill không hợp lệ")
  .refine((file) => file.type.startsWith("image/"), "Chỉ chấp nhận tệp hình ảnh")
  .refine(
    (file) => file.size <= MAX_PAYMENT_BILL_SIZE_BYTES,
    "Ảnh bill không được vượt quá 4MB",
  );

export const paymentRequestQrImageSchema = z
  .instanceof(File, {
    message: "Vui lòng chọn một ảnh QR hợp lệ",
  })
  .refine((file) => file.size > 0, "Ảnh QR không hợp lệ")
  .refine((file) => file.type.startsWith("image/"), "Chỉ chấp nhận tệp hình ảnh")
  .refine(
    (file) => file.size <= MAX_PAYMENT_REQUEST_QR_SIZE_BYTES,
    "Ảnh QR không được vượt quá 4MB",
  );

export const confirmPaymentSchema = z.object({
  payment_reference: z
    .string()
    .trim()
    .regex(PAYMENT_REFERENCE_PATTERN, "Mã tham chiếu thanh toán không hợp lệ"),
  requestId: z.string().uuid("Mã đề nghị không hợp lệ"),
});
