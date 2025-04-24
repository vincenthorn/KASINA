import { create } from 'zustand';

interface FocusState {
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  setFocusMode: (enabled: boolean) => void;
}

export const useFocus = create<FocusState>((set) => ({
  isFocusMode: false,
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
  setFocusMode: (enabled: boolean) => set({ isFocusMode: enabled }),
}));