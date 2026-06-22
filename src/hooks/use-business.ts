"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { createClient } from "@/lib/supabase/client";
import type { Staff, Business, Branch } from "@/types";

export function useBusiness() {
  const {
    staff,
    business,
    currentBranch,
    branches,
    isLoaded,
    impersonation,
    setStaff,
    setBusiness,
    setCurrentBranch,
    setBranches,
    setLoaded,
    setImpersonation,
    reset,
  } = useAuthStore();

  // Guard so concurrent triggers (INITIAL_SESSION + poll) don't double-fetch.
  const loading = useRef(false);

  // Capture currentBranch in a ref so the stable loadFromSession closure
  // below always reads the latest value without being re-created on every render.
  const currentBranchRef = useRef(currentBranch);
  currentBranchRef.current = currentBranch;

  useEffect(() => {
    const supabase = createClient();

    // Loads all business/staff data for a confirmed auth session.
    // Called from INITIAL_SESSION (covers page-load) and SIGNED_IN (covers
    // fresh login in the same tab).  TOKEN_REFRESHED is ignored intentionally
    // — if data is already loaded we don't re-fetch on every token refresh.
    async function loadFromSession(uid: string) {
      if (loading.current) return;
      loading.current = true;
      console.log("[use-business] loadFromSession uid=", uid);

      // Platform admin impersonation: load the target business instead of the admin's own.
      try {
        const impRes = await fetch("/api/admin/impersonate", { cache: "no-store" });
        if (impRes.ok) {
          const imp = await impRes.json();
          if (imp.active) {
            const dataRes = await fetch("/api/admin/impersonate-data", { cache: "no-store" });
            if (dataRes.ok) {
              const data = await dataRes.json();
              setStaff(data.staff);
              setBusiness(data.business);
              setBranches(data.branches);
              if (data.branches.length > 0) setCurrentBranch(data.branches[0]);
              setImpersonation({ business_id: data.business.id, business_name: data.business.name });
              setLoaded(true);
              loading.current = false;
              return;
            }
          }
        }
      } catch {
        // Not impersonating or network error — continue with normal loading.
      }

      // Load staff profile via auth user_id
      const { data: profile, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", uid)
        .eq("is_active", true)
        .single();

      console.log(
        "[use-business] staff query →",
        profile
          ? `id=${profile.id} name=${profile.name} role=${profile.role}`
          : `NULL — error: ${staffError?.message ?? "none"} (code ${staffError?.code ?? "none"})`
      );

      if (!profile) {
        // ❌ No active staff row for this auth uid.
        // Root causes: (a) staff row missing, (b) wrong user_id on staff row,
        // (c) is_active=false, (d) RLS blocking the read.
        // Run: node scripts/create-test-users.mjs  to repair test accounts.
        console.error(
          "[use-business] ❌ No active staff record for uid", uid,
          "— dashboard will show empty until this is resolved."
        );
        setLoaded(true);
        loading.current = false;
        return;
      }

      setStaff(profile as Staff);

      const [bizResult, branchResult] = await Promise.all([
        supabase.from("businesses").select("*").eq("id", profile.business_id).single(),
        supabase.from("branches").select("*").eq("business_id", profile.business_id),
      ]);

      console.log(
        "[use-business] business →", bizResult.data ? bizResult.data.name : `NULL (${bizResult.error?.message})`,
        "| branches →", branchResult.data?.length ?? 0
      );

      if (bizResult.data) setBusiness(bizResult.data as Business);

      if (branchResult.data) {
        setBranches(branchResult.data as Branch[]);
        if (!currentBranchRef.current && branchResult.data.length > 0) {
          const defaultBranch =
            branchResult.data.find((b) => b.id === profile.branch_id) ?? branchResult.data[0];
          setCurrentBranch(defaultBranch as Branch);
        }
      }

      console.log("[use-business] ✅ done");
      setLoaded(true);
      loading.current = false;
    }

    // onAuthStateChange is the canonical Supabase trigger:
    //   INITIAL_SESSION → fired once on mount with whatever session exists
    //   SIGNED_IN       → fired after a fresh email/password login (same-tab)
    //   SIGNED_OUT      → fired on logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[use-business] onAuthStateChange →", event, "uid:", session?.user?.id ?? "none");

        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          if (session?.user) {
            const state = useAuthStore.getState();
            const uid = session.user.id;
            // If no staff loaded yet, or the stored staff belongs to a
            // different auth user (account switch without explicit logout),
            // clear stale data and reload.  Without this check, the store
            // keeps User A's business while the Supabase cookie is User B.
            if (!state.staff || state.staff.user_id !== uid) {
              if (state.staff?.user_id && state.staff.user_id !== uid) {
                console.log("[use-business] uid mismatch — clearing stale session");
                reset();
              }
              loadFromSession(uid);
            } else if (!state.isLoaded) {
              setLoaded(true);
            }
          } else if (event === "INITIAL_SESSION") {
            // No session on mount — could be a PIN-only terminal.
            const state = useAuthStore.getState();
            if (!state.activeOperator) reset();
            setLoaded(true);
          }
        }

        if (event === "SIGNED_OUT") {
          reset();
          setLoaded(true);
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally stable — re-subscribing on every render would fire INITIAL_SESSION repeatedly.

  return { staff, business, currentBranch, branches, isLoaded, impersonation };
}
