import { create } from 'zustand';

type WidgetKey = 'kpiRow' | 'quickActions' | 'lowStock' | 'topSellers' | 'recentBills' | 'monthlyChart';

interface WidgetStore {
  kpiRow: boolean;
  quickActions: boolean;
  lowStock: boolean;
  topSellers: boolean;
  recentBills: boolean;
  monthlyChart: boolean;
  isDark: boolean;
  toggle: (key: WidgetKey) => void;
  setDark: (val: boolean) => void;
}

export const useWidgetStore = create<WidgetStore>((set) => ({
  kpiRow: true,
  quickActions: true,
  lowStock: true,
  topSellers: true,
  recentBills: true,
  monthlyChart: true,
  isDark: false,
  toggle: (key) => set((s) => ({ [key]: !s[key] })),
  setDark: (val) => set({ isDark: val }),
}));
