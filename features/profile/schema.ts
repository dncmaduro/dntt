import { z } from "zod";

export const MAX_PROFILE_QR_SIZE_BYTES = 4 * 1024 * 1024;

export const profileDetailsSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Họ tên phải có ít nhất 2 ký tự")
    .max(120, "Họ tên không được vượt quá 120 ký tự"),
});

export const profileQrImageSchema = z
  .instanceof(File, {
    message: "Vui lòng chọn một ảnh QR hợp lệ",
  })
  .refine((file) => file.size > 0, "Tệp ảnh QR không hợp lệ")
  .refine((file) => file.type.startsWith("image/"), "Chỉ chấp nhận tệp hình ảnh")
  .refine(
    (file) => file.size <= MAX_PROFILE_QR_SIZE_BYTES,
    "Ảnh QR không được vượt quá 4MB",
  );

export type ProfileDetailsValues = z.infer<typeof profileDetailsSchema>;
