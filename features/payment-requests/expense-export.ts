import { readFile } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";

import type {
  ExpenseAttachmentWithUrl,
  ExpenseFilters,
  ExpenseRequestListItem,
} from "@/features/payment-requests/types";
import { isImageMimeType } from "@/lib/utils";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "features/payment-requests/templates/expense-monthly-export-template.xlsx",
);

const DETAIL_START_ROW = 9;
const DETAIL_END_ROW = 74;
const DETAIL_SLOT_COUNT = DETAIL_END_ROW - DETAIL_START_ROW + 1;
const TOTAL_ROW_TEMPLATE = 75;
const EVIDENCE_SHEET_NAME = "Minh chứng";
const REPORT_EVIDENCE_COLUMN = 7;
const EVIDENCE_IMAGE_START_COLUMN = 3;
const EVIDENCE_IMAGE_WIDTH = 480;
const EVIDENCE_IMAGE_HEIGHT = 360;
const EVIDENCE_IMAGE_COLUMN_WIDTH = 68;
const EVIDENCE_IMAGE_ROW_HEIGHT = 280;
const EVIDENCE_FONT_NAME = "Times New Roman";

const CATEGORY_COLOR_PALETTE: string[] = [
  "FFFCE8E6",
  "FFEAF4EC",
  "FFE8F0FE",
  "FFFFF4D6",
  "FFF4E8FF",
  "FFE8F7F6",
  "FFFFE8F0",
  "FFF2F2F2",
  "FFEAF1FF",
  "FFF8EEDD",
  "FFE8F5E9",
  "FFFDEBD0",
] as const;

type WorkbookBuildResult = {
  buffer: ArrayBuffer;
  fileName: string;
};

type ExpenseSummaryRow = {
  color: string;
  label: string;
  total: number;
};

type WorkbookImageExtension = "gif" | "jpeg" | "png";

type ResolvedAttachmentImage = {
  attachment: ExpenseAttachmentWithUrl;
  base64: string;
  extension: WorkbookImageExtension;
};

const cloneValue = <T>(value: T): T => structuredClone(value);

const toArrayBuffer = (
  value:
    | Uint8Array<ArrayBufferLike>
    | ArrayBuffer
    | SharedArrayBuffer,
) => {
  if (value instanceof ArrayBuffer) {
    return value.slice(0);
  }

  if (value instanceof SharedArrayBuffer) {
    return Uint8Array.from(new Uint8Array(value)).buffer;
  }

  return Uint8Array.from(value).buffer;
};

const formatCategoryLabel = (item: ExpenseRequestListItem) => {
  const categoryName = item.category?.name?.trim();
  const subCategoryName = item.sub_category?.name?.trim();

  if (categoryName && subCategoryName) {
    return `[${categoryName}] ${subCategoryName}`;
  }

  if (subCategoryName) {
    return subCategoryName;
  }

  if (categoryName) {
    return categoryName;
  }

  return "Chưa phân loại";
};

const buildSummaryRows = (items: ExpenseRequestListItem[]): ExpenseSummaryRow[] => {
  const totals = new Map<string, number>();
  const labelsInOrder: string[] = [];

  for (const item of items) {
    const label = formatCategoryLabel(item);

    if (!totals.has(label)) {
      labelsInOrder.push(label);
    }

    totals.set(label, (totals.get(label) ?? 0) + (item.amount ?? 0));
  }

  const rows = labelsInOrder.map((label, index) => ({
    color: CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length],
    label,
    total: totals.get(label) ?? 0,
  }));

  rows.push({
    color: "",
    label: "Tổng",
    total: items.reduce((sum, item) => sum + (item.amount ?? 0), 0),
  });

  return rows;
};

const buildFileName = (month: string) => {
  if (!month) {
    return "DNTT.xlsx";
  }

  const [, monthPart] = month.split("-");

  return monthPart ? `DNTT - T${monthPart}.xlsx` : "DNTT.xlsx";
};

const buildWorksheetName = (month: string) => {
  if (!month) {
    return "DNTT";
  }

  const [, monthPart] = month.split("-");

  return monthPart ? `DNTT - T${monthPart}` : "DNTT";
};

const buildDateValue = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const excelEpoch = Date.UTC(1899, 11, 30);
  const utcDate = Date.UTC(year, month - 1, day);

  return (utcDate - excelEpoch) / 86_400_000;
};

const withWrapText = <T extends Record<string, unknown>>(baseStyle: T) => ({
  ...cloneValue(baseStyle),
  alignment: {
    ...(baseStyle.alignment as Record<string, unknown> | undefined),
    vertical: "middle",
    wrapText: true,
  },
});

const buildFilledStyle = <T extends Record<string, unknown>>(baseStyle: T, argb: string) => ({
  ...cloneValue(baseStyle),
  fill: {
    bgColor: { argb },
    fgColor: { argb },
    pattern: "solid",
    type: "pattern",
  },
});

const buildSummaryBlueLabelStyle = <
  TLabel extends Record<string, unknown>,
  TValue extends Record<string, unknown>,
>(
  labelStyle: TLabel,
  valueStyle: TValue,
) => ({
  ...cloneValue(labelStyle),
  fill: cloneValue(valueStyle.fill),
  font: cloneValue(valueStyle.font),
});

const estimateWrappedLineCount = (value: string, maxCharactersPerLine: number) => {
  return value
    .split("\n")
    .reduce((total, part) => total + Math.max(1, Math.ceil(part.length / maxCharactersPerLine)), 0);
};

const resolveDetailRowHeight = (label: string) => {
  const estimatedLineCount = estimateWrappedLineCount(label, 22);

  return Math.max(34.5, 18 * estimatedLineCount + 8);
};

const copyRowStyles = ({
  fromRowNumber,
  toRowNumber,
  worksheet,
}: {
  fromRowNumber: number;
  toRowNumber: number;
  worksheet: ExcelJS.Worksheet;
}) => {
  const sourceRow = worksheet.getRow(fromRowNumber);
  const targetRow = worksheet.getRow(toRowNumber);

  targetRow.height = sourceRow.height;
  targetRow.hidden = sourceRow.hidden;

  sourceRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const targetCell = targetRow.getCell(columnNumber);

    targetCell.style = cloneValue(cell.style);
    targetCell.value = null;
  });
};

const clearMergeIfExists = (worksheet: ExcelJS.Worksheet, range: string) => {
  try {
    worksheet.unMergeCells(range);
  } catch {
    return;
  }
};

const buildRequestEvidenceLabel = (item: ExpenseRequestListItem) => {
  const categoryLabel = formatCategoryLabel(item);

  return categoryLabel && categoryLabel !== "Chưa phân loại"
    ? `${item.title} - ${categoryLabel}`
    : item.title;
};

const normalizeWorkbookImageExtension = (
  attachment: ExpenseAttachmentWithUrl,
): WorkbookImageExtension | null => {
  const normalizedMimeType = attachment.file_type?.trim().toLowerCase();

  if (normalizedMimeType === "image/jpeg" || normalizedMimeType === "image/jpg") {
    return "jpeg";
  }

  if (normalizedMimeType === "image/png") {
    return "png";
  }

  if (normalizedMimeType === "image/gif") {
    return "gif";
  }

  const normalizedExtension = path.extname(attachment.file_name).trim().toLowerCase();

  if (normalizedExtension === ".jpg" || normalizedExtension === ".jpeg") {
    return "jpeg";
  }

  if (normalizedExtension === ".png") {
    return "png";
  }

  if (normalizedExtension === ".gif") {
    return "gif";
  }

  return null;
};

const downloadAttachmentImage = async (
  attachment: ExpenseAttachmentWithUrl,
): Promise<ResolvedAttachmentImage | null> => {
  if (!attachment.signed_url || !isImageMimeType(attachment.file_type)) {
    return null;
  }

  const extension = normalizeWorkbookImageExtension(attachment);

  if (!extension) {
    return null;
  }

  const response = await fetch(attachment.signed_url);

  if (!response.ok) {
    throw new Error(`Unable to download attachment image: ${attachment.file_name}`);
  }

  return {
    attachment,
    base64: Buffer.from(await response.arrayBuffer()).toString("base64"),
    extension,
  };
};

const getExcelColumnName = (value: number) => {
  let currentValue = value;
  let result = "";

  while (currentValue > 0) {
    const remainder = (currentValue - 1) % 26;

    result = String.fromCharCode(65 + remainder) + result;
    currentValue = Math.floor((currentValue - 1) / 26);
  }

  return result;
};

const buildEvidenceSheet = async ({
  items,
  workbook,
}: {
  items: ExpenseRequestListItem[];
  workbook: ExcelJS.Workbook;
}) => {
  const evidenceSheet = workbook.addWorksheet(EVIDENCE_SHEET_NAME, {
    views: [{ state: "frozen", xSplit: 2, ySplit: 1 }],
  });
  const imageMatrix = await Promise.all(
    items.map((item) =>
      Promise.all(item.attachments.map((attachment) => downloadAttachmentImage(attachment))),
    ),
  );
  const maxImageCount = Math.max(
    1,
    ...imageMatrix.map((images) => images.filter(Boolean).length),
  );

  evidenceSheet.columns = [
    { header: "STT", key: "index", width: 8 },
    { header: "Đề nghị", key: "request", width: 52 },
    ...Array.from({ length: maxImageCount }, (_, index) => ({
      header: `Ảnh ${index + 1}`,
      key: `image_${index + 1}`,
      width: EVIDENCE_IMAGE_COLUMN_WIDTH,
    })),
  ];

  evidenceSheet.properties.defaultRowHeight = 24;
  evidenceSheet.eachRow({ includeEmpty: true }, (row) => {
    row.font = { name: EVIDENCE_FONT_NAME, size: 12 };
  });

  const headerRow = evidenceSheet.getRow(1);
  headerRow.font = { name: EVIDENCE_FONT_NAME, size: 12, bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 24;

  const linkTargetByRequestId = new Map<string, string>();

  imageMatrix.forEach((images, index) => {
    const item = items[index];
    const rowNumber = index + 2;
    const row = evidenceSheet.getRow(rowNumber);
    const resolvedImages = images.filter(
      (image): image is ResolvedAttachmentImage => image !== null,
    );

    row.getCell(1).value = index + 1;
    row.getCell(2).value = buildRequestEvidenceLabel(item);
    row.getCell(1).font = { name: EVIDENCE_FONT_NAME, size: 12 };
    row.getCell(2).font = { name: EVIDENCE_FONT_NAME, size: 12 };
    row.getCell(2).alignment = { vertical: "middle", wrapText: true };

    if (!resolvedImages.length) {
      row.getCell(EVIDENCE_IMAGE_START_COLUMN).value = "Không có ảnh minh chứng";
      row.getCell(EVIDENCE_IMAGE_START_COLUMN).font = {
        name: EVIDENCE_FONT_NAME,
        size: 12,
      };
      row.height = 24;
      return;
    }

    row.height = EVIDENCE_IMAGE_ROW_HEIGHT;

    resolvedImages.forEach((image, imageIndex) => {
      const columnNumber = EVIDENCE_IMAGE_START_COLUMN + imageIndex;
      const cellAddress = `${getExcelColumnName(columnNumber)}${rowNumber}`;
      const imageId = workbook.addImage({
        base64: image.base64,
        extension: image.extension,
      });

      evidenceSheet.addImage(imageId, {
        tl: { col: columnNumber - 1 + 0.08, row: rowNumber - 1 + 0.08 },
        ext: { width: EVIDENCE_IMAGE_WIDTH, height: EVIDENCE_IMAGE_HEIGHT },
      });
      evidenceSheet.getColumn(columnNumber).width = EVIDENCE_IMAGE_COLUMN_WIDTH;

      if (imageIndex === 0) {
        linkTargetByRequestId.set(item.id, cellAddress);
      }
    });
  });

  return linkTargetByRequestId;
};

export const buildExpenseExportWorkbook = async ({
  filters,
  items,
}: {
  filters: ExpenseFilters;
  items: ExpenseRequestListItem[];
}): Promise<WorkbookBuildResult> => {
  const workbook = new ExcelJS.Workbook();
  const templateBytes = await readFile(TEMPLATE_PATH);
  await workbook.xlsx.load(toArrayBuffer(templateBytes));

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("Expense export template is missing its first worksheet.");
  }

  const exportItems = [...items].sort((left, right) =>
    (left.payment_date ?? "").localeCompare(right.payment_date ?? "") ||
    left.created_at.localeCompare(right.created_at),
  );
  const evidenceLinkTargetByRequestId = await buildEvidenceSheet({
    items: exportItems,
    workbook,
  });
  const summaryRows = buildSummaryRows(exportItems);
  const extraRows = Math.max(exportItems.length - DETAIL_SLOT_COUNT, 0);
  const detailEndRow = DETAIL_END_ROW + extraRows;
  const totalRow = TOTAL_ROW_TEMPLATE + extraRows;
  const signingDateRow = 77 + extraRows;
  const signatureTopRow = 83 + extraRows;
  const signatureBottomRow = 84 + extraRows;

  worksheet.name = buildWorksheetName(filters.month);
  worksheet.getColumn(REPORT_EVIDENCE_COLUMN).width = 18;

  clearMergeIfExists(worksheet, "A75:E75");
  clearMergeIfExists(worksheet, "E77:F77");
  clearMergeIfExists(worksheet, "A83:B83");
  clearMergeIfExists(worksheet, "C83:E83");
  clearMergeIfExists(worksheet, "C84:F84");
  clearMergeIfExists(worksheet, "G7:G8");

  if (extraRows > 0) {
    worksheet.spliceRows(
      TOTAL_ROW_TEMPLATE,
      0,
      ...Array.from({ length: extraRows }, () => []),
    );

    for (let index = 0; index < extraRows; index += 1) {
      copyRowStyles({
        fromRowNumber: 68,
        toRowNumber: TOTAL_ROW_TEMPLATE + index,
        worksheet,
      });
    }
  }

  worksheet.mergeCells(`A${totalRow}:E${totalRow}`);
  worksheet.mergeCells(`E${signingDateRow}:F${signingDateRow}`);
  worksheet.mergeCells(`A${signatureTopRow}:B${signatureTopRow}`);
  worksheet.mergeCells(`C${signatureTopRow}:E${signatureTopRow}`);
  worksheet.mergeCells(`C${signatureBottomRow}:F${signatureBottomRow}`);
  worksheet.mergeCells("G7:G8");
  worksheet.getCell("G7").value = "Minh chứng";
  worksheet.getCell("G7").style = cloneValue(worksheet.getCell("F7").style);
  worksheet.getCell("G8").style = cloneValue(worksheet.getCell("F8").style);

  const actualRowStyles = {
    A: cloneValue(worksheet.getCell("A9").style),
    B: cloneValue(worksheet.getCell("B9").style),
    C: cloneValue(worksheet.getCell("C9").style),
    D: withWrapText(worksheet.getCell("D9").style),
    E: cloneValue(worksheet.getCell("E9").style),
    F: cloneValue(worksheet.getCell("F9").style),
    G: cloneValue(worksheet.getCell("E9").style),
  };
  const blankRowStyles = {
    A: cloneValue(worksheet.getCell("A68").style),
    B: cloneValue(worksheet.getCell("B68").style),
    C: cloneValue(worksheet.getCell("C68").style),
    D: withWrapText(worksheet.getCell("D68").style),
    E: cloneValue(worksheet.getCell("E68").style),
    F: cloneValue(worksheet.getCell("F68").style),
    G: cloneValue(worksheet.getCell("E68").style),
  };
  const summaryStyles = {
    blankLabel: cloneValue(worksheet.getCell("I24").style),
    blankValue: cloneValue(worksheet.getCell("J24").style),
    label: cloneValue(worksheet.getCell("I9").style),
    totalLabel: cloneValue(worksheet.getCell("I23").style),
    totalValue: cloneValue(worksheet.getCell("J23").style),
    value: cloneValue(worksheet.getCell("J9").style),
  };

  const categoryColorByLabel = new Map(
    summaryRows
      .filter((row) => row.label !== "Tổng")
      .map((row) => [row.label, row.color]),
  );

  for (let index = 0; index < detailEndRow - DETAIL_START_ROW + 1; index += 1) {
    const rowNumber = DETAIL_START_ROW + index;
    const row = worksheet.getRow(rowNumber);
    const item = exportItems[index];
    const cellA = row.getCell(1);
    const cellB = row.getCell(2);
    const cellC = row.getCell(3);
    const cellD = row.getCell(4);
    const cellE = row.getCell(5);
    const cellF = row.getCell(6);
    const cellG = row.getCell(7);

    if (item) {
      const label = formatCategoryLabel(item);
      const fillColor = categoryColorByLabel.get(label) ?? CATEGORY_COLOR_PALETTE[0];
      const evidenceLinkTarget = evidenceLinkTargetByRequestId.get(item.id);
      const imageCount = item.attachments.filter((attachment) =>
        isImageMimeType(attachment.file_type),
      ).length;
      row.height = resolveDetailRowHeight(label);

      cellA.style = cloneValue(actualRowStyles.A);
      cellB.style = cloneValue(actualRowStyles.B);
      cellC.style = cloneValue(actualRowStyles.C);
      cellD.style = buildFilledStyle(actualRowStyles.D, fillColor);
      cellE.style = cloneValue(actualRowStyles.E);
      cellF.style = cloneValue(actualRowStyles.F);
      cellG.style = cloneValue(actualRowStyles.G);

      cellA.value = index + 1;
      cellB.value = item.attachment_count > 0 ? "Có hoá đơn" : null;
      cellC.value = buildDateValue(item.payment_date);
      cellD.value = label;
      cellE.value = item.title;
      cellF.value = item.amount ?? 0;
      cellG.value = evidenceLinkTarget
        ? {
            text: `Xem ảnh (${imageCount})`,
            hyperlink: `#'${EVIDENCE_SHEET_NAME}'!${evidenceLinkTarget}`,
            tooltip: `Đi tới sheet ${EVIDENCE_SHEET_NAME}`,
          }
        : "Không có ảnh";
      cellG.font = evidenceLinkTarget
        ? {
            ...(typeof actualRowStyles.G.font === "object" && actualRowStyles.G.font
              ? actualRowStyles.G.font
              : {}),
            color: { argb: "FF0563C1" },
            underline: true,
          }
        : cloneValue(cellG.font);
    } else {
      row.height = 30;
      cellA.style = cloneValue(blankRowStyles.A);
      cellB.style = cloneValue(blankRowStyles.B);
      cellC.style = cloneValue(blankRowStyles.C);
      cellD.style = cloneValue(blankRowStyles.D);
      cellE.style = cloneValue(blankRowStyles.E);
      cellF.style = cloneValue(blankRowStyles.F);
      cellG.style = cloneValue(blankRowStyles.G);

      cellA.value = null;
      cellB.value = null;
      cellC.value = null;
      cellD.value = null;
      cellE.value = null;
      cellF.value = null;
      cellG.value = null;
    }
  }

  const summaryClearEndRow = Math.max(detailEndRow, DETAIL_START_ROW + summaryRows.length + 4);

  for (let rowNumber = DETAIL_START_ROW; rowNumber <= summaryClearEndRow; rowNumber += 1) {
    const labelCell = worksheet.getCell(`I${rowNumber}`);
    const valueCell = worksheet.getCell(`J${rowNumber}`);

    labelCell.style = cloneValue(summaryStyles.blankLabel);
    valueCell.style = cloneValue(summaryStyles.blankValue);
    labelCell.value = null;
    valueCell.value = null;
  }

  summaryRows.forEach((summary, index) => {
    const rowNumber = DETAIL_START_ROW + index;
    const labelCell = worksheet.getCell(`I${rowNumber}`);
    const valueCell = worksheet.getCell(`J${rowNumber}`);

    labelCell.style =
      summary.label === "Tổng"
        ? cloneValue(summaryStyles.totalLabel)
        : buildSummaryBlueLabelStyle(summaryStyles.label, summaryStyles.value);
    valueCell.style =
      summary.label === "Tổng"
        ? cloneValue(summaryStyles.totalValue)
        : cloneValue(summaryStyles.value);
    labelCell.value = summary.label;
    valueCell.value = summary.total;
  });

  worksheet.getCell(`F${totalRow}`).value = {
    formula: `SUM(F${DETAIL_START_ROW}:F${detailEndRow})`,
    result: summaryRows[summaryRows.length - 1]?.total ?? 0,
  };

  const outputBuffer = await workbook.xlsx.writeBuffer();

  return {
    buffer: toArrayBuffer(outputBuffer),
    fileName: buildFileName(filters.month),
  };
};
