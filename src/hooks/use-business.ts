"use client";

import { useEffect, useCallback } from "react";
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
    setStaff,
    setBusiness,
    setCurrentBranch,
    setBranches,
    setLoaded,
    reset,
  } = useAuthStore();

  const loadUserData = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      reset();
      setLoaded(true);
      return;
    }

    // Load staff profile via auth user_id
    const { data: profile } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", authUser.id)
      .eq("is_active", true)
      .single();

    if (!profile) {
      setLoaded(true);
      return;
    }

    setStaff(profile as Staff);

    // Load business
    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", profile.business_id)
      .single();

    if (biz) {
      setBusiness(biz as Business);
    }

    // Load branches
    const { data: branchList } = await supabase
      .from("branches")
      .select("*")
      .eq("business_id", profile.business_id);

    if (branchList) {
      setBranches(branchList as Branch[]);
      if (!currentBranch && branchList.length > 0) {
        const defaultBranch =
          branchList.find((b) => b.id === profile.branch_id) ?? branchList[0];
        setCurrentBranch(defaultBranch as Branch);
      }
    }

    setLoaded(true);
  }, [
    reset,
    setLoaded,
    setStaff,
    setBusiness,
    setBranches,
    setCurrentBranch,
    currentBranch,
  ]);

  useEffect(() => {
    if (!isLoaded) {
      loadUserData();
    }
  }, [isLoaded, loadUserData]);

  return { staff, business, currentBranch, branches, isLoaded };
}
