import ExcelJS from "exceljs";

import type { PrivateExpenseRequestListItem } from "@/features/private-requests/types";
import { formatDate } from "@/lib/utils";

type PrivateExportResult = {
  buffer: ArrayBuffer;
  fileName: string;
};

const toArrayBuffer = (value: ArrayBuffer | Uint8Array) => {
  if (value instanceof ArrayBuffer) {
    return value;
  }

  return Uint8Array.from(value).buffer;
};

const getFileName = (month: string) => {
  if (!month) {
    return "DNTT-rieng.xlsx";
  }

  return `DNTT-rieng-T${month.slice(5)}.xlsx`;
};

const getWorksheetName = (month: string) =>
  month ? `DNTT riêng - T${month.slice(5)}` : "DNTT riêng";

export const buildPrivateExpenseExportWorkbook = async ({
  filters,
  items,
}: {
  filters: { month: string };
  items: PrivateExpenseRequestListItem[];
}): Promise<PrivateExportResult> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(getWorksheetName(filters.month));
  const totalAmount = items.reduce((total, item) => total + (item.amount ?? 0), 0);

  worksheet.mergeCells("A1:G1");
  worksheet.getCell("A1").value = "DANH SÁCH DNTT RIÊNG";
  worksheet.getCell("A1").font = { bold: true, size: 16 };
  worksheet.getCell("A1").alignment = { horizontal: "center" };
  worksheet.getCell("A2").value = filters.month
    ? `Kỳ: tháng ${filters.month.slice(5)}/${filters.month.slice(0, 4)}`
    : "Kỳ: tất cả thời gian";
  worksheet.getCell("A3").value = "Tổng chi phí";
  worksheet.getCell("B3").value = totalAmount;
  worksheet.getCell("B3").numFmt = '#,##0" ₫"';

  const headerRow = worksheet.getRow(5);
  headerRow.values = [
    "STT",
    "Ngày phát sinh",
    "Danh mục",
    "Tiêu đề",
    "Mô tả",
    "Người tạo",
    "Số tiền",
  ];
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E78" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };

  items.forEach((item, index) => {
    const row = worksheet.addRow([
      index + 1,
      item.payment_date ? formatDate(item.payment_date) : "—",
      item.sub_category?.name ?? item.category?.name ?? "Chưa phân loại",
      item.title,
      item.description ?? "",
      item.owner?.full_name ?? item.user_id,
      item.amount ?? 0,
    ]);
    row.getCell(2).numFmt = "dd/mm/yyyy";
    row.getCell(7).numFmt = '#,##0" ₫"';
    row.alignment = { vertical: "top", wrapText: true };
  });

  worksheet.columns = [
    { width: 8 },
    { width: 18 },
    { width: 28 },
    { width: 34 },
    { width: 48 },
    { width: 24 },
    { width: 20 },
  ];
  worksheet.autoFilter = { from: "A5", to: "G5" };
  worksheet.views = [{ state: "frozen", ySplit: 5 }];

  const rawBuffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: toArrayBuffer(rawBuffer),
    fileName: getFileName(filters.month),
  };
};
