import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { voidTabItems } from "@/lib/bar-void";

/**
 * Remove items from an open bill, or cancel the whole table.
 * Body: { line_ids: string[], quantity: number, reason, note? }
 *    or { cancel_table: true, reason, note? }
 * Any staff member serving tables may do it; every removal is logged for the owner.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const result = await voidTabItems(
    createAdminClient(),
    { businessId: auth.businessId, branchId: auth.branchId, staffId: auth.staffId },
    params.id,
    {
      lineIds: Array.isArray(body.line_ids) ? body.line_ids.map(String) : undefined,
      quantity: Number(body.quantity),
      reason: String(body.reason ?? ""),
      note: body.note ?? null,
      cancelTable: body.cancel_table === true,
    }
  );

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ tab_total: result.total, removed: result.removed });
}
