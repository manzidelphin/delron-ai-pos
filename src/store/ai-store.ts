"use client";

import { create } from "zustand";
import type { AIMessage } from "@/types";

interface AIState {
  isOpen: boolean;
  messages: AIMessage[];
  isLoading: boolean;
  input: string;

  setOpen: (open: boolean) => void;
  addMessage: (msg: Omit<AIMessage, "id" | "timestamp">) => void;
  setLoading: (loading: boolean) => void;
  setInput: (input: string) => void;
  clearMessages: () => void;
}

let msgId = 0;

export const useAIStore = create<AIState>((set) => ({
  isOpen: false,
  messages: [
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your DELRON AI assistant. I can help you understand your sales, inventory, credits, and much more. What would you like to know?",
      timestamp: new Date(),
    },
  ],
  isLoading: false,
  input: "",

  setOpen: (isOpen) => set({ isOpen }),
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, id: String(++msgId), timestamp: new Date() },
      ],
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setInput: (input) => set({ input }),
  clearMessages: () =>
    set({
      messages: [
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! I'm your DELRON AI assistant. How can I help you today?",
          timestamp: new Date(),
        },
      ],
    }),
}));
