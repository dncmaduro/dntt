import { z } from "zod";

import {
  MAX_ATTACHMENTS,
  MAX_FILE_SIZE_BYTES,
} from "@/features/payment-requests/schemas";

export { MAX_ATTACHMENTS, MAX_FILE_SIZE_BYTES };

export const privatePaymentRequestFormSchema = z.object({
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
    .min(1, "Vui lòng nhập mô tả")
    .max(2000, "Mô tả không được vượt quá 2000 ký tự"),
  payment_date: z.string().nullable().optional(),
  sub_category_id: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn danh mục con")
    .refine(
      (value) => z.uuid().safeParse(value).success,
      "Danh mục con không hợp lệ",
    ),
});

export const privateRequestFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, "Tệp đính kèm không hợp lệ")
  .refine(
    (file) => file.size <= MAX_FILE_SIZE_BYTES,
    "Mỗi tệp không được vượt quá 10MB",
  )
  .refine(
    (file) =>
      file.type === "application/pdf" ||
      file.type.startsWith("image/") ||
      !file.type,
    "Chỉ hỗ trợ ảnh hoặc PDF",
  );

export type PrivateRequestFormValues = z.infer<
  typeof privatePaymentRequestFormSchema
>;
