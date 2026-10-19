import { create } from 'zustand';
import type { DocumentFile } from '@/src/utils/documentFilePicker';

interface SupportPrefill {
  id: string;
  screenLabel: string;
  attachment: DocumentFile | null;
}

interface SupportPrefillState {
  prefill: SupportPrefill | null;
  setPrefill: (prefill: SupportPrefill) => void;
  clearPrefill: (id: string) => void;
}

export const useSupportPrefillStore = create<SupportPrefillState>((set) => ({
  prefill: null,
  setPrefill: (prefill) => set({ prefill }),
  clearPrefill: (id) => set(state => state.prefill?.id === id ? { prefill: null } : state),
}));
