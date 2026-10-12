import { create } from 'zustand';

export type DialogKey = 'observer' | 'settings' | 'about' | 'time' | null;

/** Transient UI state shared by the desktop and mobile shells. */
interface UiState {
    dialog: DialogKey;
    openDialog: (d: Exclude<DialogKey, null>) => void;
    closeDialog: () => void;

    searchOpen: boolean;
    setSearchOpen: (open: boolean) => void;

    compass: boolean;
    setCompass: (on: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
    dialog: null,
    openDialog: (dialog) => set({ dialog }),
    closeDialog: () => set({ dialog: null }),

    searchOpen: false,
    setSearchOpen: (searchOpen) => set({ searchOpen }),

    compass: false,
    setCompass: (compass) => set({ compass }),
}));
