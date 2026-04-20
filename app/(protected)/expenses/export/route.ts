import { NextResponse, type NextRequest } from "next/server";

import { buildExpenseExportWorkbook } from "@/features/payment-requests/expense-export";
import {
  getExpenseRequestList,
  parseExpenseFilters,
} from "@/features/payment-requests/queries";
import { getCurrentProfile } from "@/lib/auth/session";
import { APP_ROUTES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return NextResponse.redirect(new URL(APP_ROUTES.login, request.url));
  }

  if (profile.role !== "accountant" && profile.role !== "director") {
    return NextResponse.redirect(new URL(APP_ROUTES.dashboard, request.url));
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = await parseExpenseFilters(Promise.resolve(params));
  const items = await getExpenseRequestList({ filters });
  const workbook = await buildExpenseExportWorkbook({
    filters,
    items,
  });
  const responseBody = new Blob([workbook.buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return new NextResponse(responseBody, {
    headers: {
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(workbook.fileName)}`,
    },
  });
}
