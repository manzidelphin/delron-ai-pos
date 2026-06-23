import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";
import SignOutOnSuspended from "@/components/auth/sign-out-on-suspended";

export const dynamic = "force-dynamic";

function fmtRwf(n: number) {
  return `RWF ${n.toLocaleString()}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "dd MMM yyyy"); } catch { return d; }
}

export default async function AccountSuspendedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Platform admins should never see this page
  const { data: adminRecord } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminRecord) redirect("/admin/businesses");

  const admin = createAdminClient();

  // Find this user's business
  const { data: staffRecord } = await admin
    .from("staff")
    .select("business_id, businesses(id, name, subscription_status, monthly_amount)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  const bizRaw = staffRecord?.businesses;
  const biz = (Array.isArray(bizRaw) ? bizRaw[0] : bizRaw) as {
    id: string; name: string; subscription_status: string; monthly_amount: number;
  } | null;

  // If not actually suspended, send back to dashboard
  if (!biz || biz.subscription_status !== "suspended") redirect("/dashboard");

  // Fetch outstanding invoices
  const { data: invoices } = await admin
    .from("invoices")
    .select("id, invoice_number, amount, due_date, status")
    .eq("business_id", biz.id)
    .in("status", ["pending", "overdue"])
    .order("due_date", { ascending: false });

  const outstanding = (invoices ?? []).reduce((sum, inv) => sum + inv.amount, 0);
  const oldestInvoice = invoices?.[invoices.length - 1];

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Account Suspended</h1>
          <p className="text-zinc-400 text-sm">{biz.name}</p>
        </div>

        {/* Outstanding amount card */}
        <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6 mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-1">Outstanding Balance</p>
          <p className="text-3xl font-bold text-red-400 mb-4">{fmtRwf(outstanding)}</p>

          {(invoices ?? []).length > 0 && (
            <div className="space-y-2 mb-4">
              {(invoices ?? []).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{inv.invoice_number}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">{fmtDate(inv.due_date)}</span>
                    <span className="text-white font-medium">{fmtRwf(inv.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {oldestInvoice && (
            <p className="text-xs text-zinc-500">
              Overdue since {fmtDate(oldestInvoice.due_date)}
            </p>
          )}
        </div>

        {/* MoMo payment instructions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
          <p className="text-sm font-semibold text-white mb-3">How to reactivate your account</p>
          <ol className="space-y-2 text-sm text-zinc-400">
            <li className="flex gap-2">
              <span className="text-violet-400 font-bold">1.</span>
              Dial <span className="text-white font-mono">*182#</span> on your MTN line
            </li>
            <li className="flex gap-2">
              <span className="text-violet-400 font-bold">2.</span>
              Approve the pending payment request for {fmtRwf(outstanding)}
            </li>
            <li className="flex gap-2">
              <span className="text-violet-400 font-bold">3.</span>
              Your account will be reactivated automatically within minutes
            </li>
          </ol>
          <p className="text-xs text-zinc-600 mt-4">
            No pending request? Contact{" "}
            <span className="text-zinc-400">support@delronpos.rw</span>{" "}
            or call your account manager.
          </p>
        </div>

        <SignOutOnSuspended />
      </div>
    </div>
  );
}
