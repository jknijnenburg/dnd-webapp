import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/session";
import { adminExportCampaign } from "@/lib/dal/admin";
import { AuthError } from "@/lib/errors";
import { isUuid } from "@/lib/utils";

/**
 * Admin-only JSON export of one campaign. Read-only GET, so no CSRF surface;
 * authorization is enforced here (and again in the data access layer), not
 * only in proxy.ts.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/admin/campaigns/[id]/export">) {
  const noStore = { "Cache-Control": "private, no-store" };
  try {
    await assertAdmin();
  } catch (error) {
    const forbidden = error instanceof AuthError && error.reason === "forbidden";
    return NextResponse.json(
      { error: forbidden ? "forbidden" : "unauthorized" },
      { status: forbidden ? 403 : 401, headers: noStore },
    );
  }
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  const data = await adminExportCampaign(id);
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      ...noStore,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="kampagne-${data.campaign.slug}-tag-${data.campaign.currentDay}.json"`,
    },
  });
}
