import { NextResponse, type NextRequest } from "next/server";

import { buildPrivateExpenseExportWorkbook } from "@/features/private-requests/private-expense-export";
import {
  getPrivateExpenseRequestList,
  parsePrivateExpenseFilters,
} from "@/features/private-requests/queries";
import { getCurrentProfile } from "@/lib/auth/session";
import { APP_ROUTES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return NextResponse.redirect(new URL(APP_ROUTES.login, request.url));
  }

  if (profile.role !== "accountant") {
    return NextResponse.redirect(new URL(APP_ROUTES.privateDashboard, request.url));
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = await parsePrivateExpenseFilters(Promise.resolve(params));
  const items = await getPrivateExpenseRequestList({ filters });
  const workbook = await buildPrivateExpenseExportWorkbook({
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
