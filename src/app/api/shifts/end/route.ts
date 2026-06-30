import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { closeShift } from "@/lib/shift";

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (auth.error) return auth.error;
  const { businessId, branchId, staffId } = auth;

  let closing_cash: number | null = null;
  let notes: string | null = null;
  try {
    const body = await req.json();
    closing_cash = typeof body.closing_cash === "number" ? body.closing_cash : null;
    notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  } catch {
    // optional body
  }

  const summary = await closeShift({ businessId, branchId, staffId, closingCash: closing_cash, notes });
  return NextResponse.json({ success: true, summary });
}
