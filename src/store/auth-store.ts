"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Business, Branch, Staff, BusinessModule, UserRole } from "@/types";

interface ActiveOperator {
  id: string;
  name: string;
  role: UserRole;
  branch_id: string | null;
}

interface Impersonation {
  business_id: string;
  business_name: string;
}

interface AuthState {
  staff: Staff | null;
  business: Business | null;
  currentBranch: Branch | null;
  branches: Branch[];
  isLoaded: boolean;
  activeOperator: ActiveOperator | null;
  /** Set when a platform admin is viewing another business. Never persisted. */
  impersonation: Impersonation | null;
  /** True if the logged-in user is in platform_admins table. Never persisted — derived on each session load. */
  isPlatformAdmin: boolean;

  setStaff: (staff: Staff | null) => void;
  setBusiness: (business: Business | null) => void;
  setCurrentBranch: (branch: Branch | null) => void;
  setBranches: (branches: Branch[]) => void;
  setLoaded: (loaded: boolean) => void;
  setActiveOperator: (op: ActiveOperator | null) => void;
  clearOperator: () => void;
  setImpersonation: (imp: Impersonation | null) => void;
  setIsPlatformAdmin: (v: boolean) => void;
  reset: () => void;

  hasModule: (module: BusinessModule) => boolean;
  /** Returns true if the *active operator* (or owner when no operator is set) has one of the given roles. */
  canAccess: (roles: UserRole[]) => boolean;
  /** The effective role for UI filtering: activeOperator.role ?? staff.role */
  effectiveRole: () => UserRole | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      staff: null,
      business: null,
      currentBranch: null,
      branches: [],
      isLoaded: false,
      activeOperator: null,
      impersonation: null,
      isPlatformAdmin: false,

      setStaff: (staff) => set({ staff }),
      setBusiness: (business) => set({ business }),
      setCurrentBranch: (branch) => set({ currentBranch: branch }),
      setBranches: (branches) => set({ branches }),
      setLoaded: (loaded) => set({ isLoaded: loaded }),
      setActiveOperator: (op) => set({ activeOperator: op }),
      clearOperator: () => set({ activeOperator: null }),
      setImpersonation: (imp) => set({ impersonation: imp }),
      setIsPlatformAdmin: (v) => set({ isPlatformAdmin: v }),

      reset: () =>
        set({
          staff: null,
          business: null,
          currentBranch: null,
          branches: [],
          isLoaded: false,
          activeOperator: null,
          impersonation: null,
          isPlatformAdmin: false,
        }),

      hasModule: (module) => {
        const { business } = get();
        return business?.modules.includes(module) ?? false;
      },

      effectiveRole: () => {
        const { staff, activeOperator } = get();
        // activeOperator always wins when set — they are who's at the till.
        // No activeOperator = fall back to the Supabase session role (owner browsing dashboard).
        return activeOperator?.role ?? staff?.role ?? null;
      },

      canAccess: (roles) => {
        const { staff, activeOperator } = get();
        const role = activeOperator?.role ?? staff?.role;
        if (!role) return false;
        if (role === "owner") return true;
        return roles.includes(role);
      },
    }),
    {
      name: "delron-auth",
      partialize: (state) => ({
        staff: state.staff,
        business: state.business,
        currentBranch: state.currentBranch,
        branches: state.branches,
        activeOperator: state.activeOperator,
      }),
    }
  )
);
