import { create } from 'zustand';

export type DialogKey = 'observer' | 'settings' | 'about' | 'time' | null;
export type MobileTab = 'globe' | 'catalog' | 'settings';
export type InspectorTab = 'overview' | 'passes' | 'doppler' | 'elements' | 'lifetime' | 'conjunctions' | 'data';

/** Transient UI state shared by the desktop and mobile shells. */
interface UiState {
    dialog: DialogKey;
    openDialog: (d: Exclude<DialogKey, null>) => void;
    closeDialog: () => void;

    inspectorTab: InspectorTab;
    setInspectorTab: (t: InspectorTab) => void;

    searchOpen: boolean;
    setSearchOpen: (open: boolean) => void;

    compass: boolean;
    setCompass: (on: boolean) => void;

    mobileTab: MobileTab;
    setMobileTab: (t: MobileTab) => void;
}

export const useUiStore = create<UiState>((set) => ({
    dialog: null,
    openDialog: (dialog) => set({ dialog }),
    closeDialog: () => set({ dialog: null }),

    inspectorTab: 'overview',
    setInspectorTab: (inspectorTab) => set({ inspectorTab }),

    searchOpen: false,
    setSearchOpen: (searchOpen) => set({ searchOpen }),

    compass: false,
    setCompass: (compass) => set({ compass }),

    mobileTab: 'globe',
    setMobileTab: (mobileTab) => set({ mobileTab }),
}));
