"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Business, Branch, Staff, BusinessModule, UserRole } from "@/types";

interface AuthState {
  staff: Staff | null;
  business: Business | null;
  currentBranch: Branch | null;
  branches: Branch[];
  isLoaded: boolean;

  setStaff: (staff: Staff | null) => void;
  setBusiness: (business: Business | null) => void;
  setCurrentBranch: (branch: Branch | null) => void;
  setBranches: (branches: Branch[]) => void;
  setLoaded: (loaded: boolean) => void;
  reset: () => void;

  hasModule: (module: BusinessModule) => boolean;
  canAccess: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      staff: null,
      business: null,
      currentBranch: null,
      branches: [],
      isLoaded: false,

      setStaff: (staff) => set({ staff }),
      setBusiness: (business) => set({ business }),
      setCurrentBranch: (branch) => set({ currentBranch: branch }),
      setBranches: (branches) => set({ branches }),
      setLoaded: (loaded) => set({ isLoaded: loaded }),
      reset: () =>
        set({
          staff: null,
          business: null,
          currentBranch: null,
          branches: [],
          isLoaded: false,
        }),

      hasModule: (module) => {
        const { business } = get();
        return business?.modules.includes(module) ?? false;
      },

      canAccess: (roles) => {
        const { staff } = get();
        if (!staff) return false;
        if (staff.role === "owner") return true;
        return roles.includes(staff.role);
      },
    }),
    {
      name: "delron-auth",
      partialize: (state) => ({
        staff: state.staff,
        business: state.business,
        currentBranch: state.currentBranch,
        branches: state.branches,
      }),
    }
  )
);
