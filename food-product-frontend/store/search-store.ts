import { create } from "zustand";

interface SearchState {
  submittedQuery: string;
  submitQuery: (query: string) => void;
  clearQuery: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  submittedQuery: "",
  submitQuery: (query) => set({ submittedQuery: query.trim() }),
  clearQuery: () => set({ submittedQuery: "" }),
}));
