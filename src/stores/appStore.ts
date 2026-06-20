import { create } from 'zustand';
import type { AppSettings, Store } from '../types';
import { getAppSettings, updateAppSettings, getStore } from '../db/queries';

type AppState = {
  settings: AppSettings | null;
  activeStore: Store | null;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  setActiveStore: (storeId: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setSkipAuth: (val: boolean) => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  settings: null,
  activeStore: null,
  isLoading: true,

  loadSettings: async () => {
    set({ isLoading: true });
    const settings = await getAppSettings();
    let activeStore: Store | null = null;
    if (settings.active_store_id) {
      activeStore = await getStore(settings.active_store_id);
    }
    set({ settings, activeStore, isLoading: false });
  },

  setActiveStore: async (storeId: string) => {
    await updateAppSettings({ active_store_id: storeId });
    const store = await getStore(storeId);
    set((state) => ({
      settings: state.settings
        ? { ...state.settings, active_store_id: storeId }
        : state.settings,
      activeStore: store,
    }));
  },

  completeOnboarding: async () => {
    await updateAppSettings({ is_onboarding_done: 1 });
    set((state) => ({
      settings: state.settings
        ? { ...state.settings, is_onboarding_done: 1 }
        : state.settings,
    }));
  },

  setSkipAuth: async (val: boolean) => {
    const num = val ? 1 : 0;
    await updateAppSettings({ skip_auth: num });
    set((state) => ({
      settings: state.settings
        ? { ...state.settings, skip_auth: num }
        : state.settings,
    }));
  },
}));
