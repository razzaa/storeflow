import { create } from 'zustand';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

const storage = createAsyncStorage('storeflow-sync');

export const SYNC_INTERVALS: { label: string; mins: number }[] = [
  { label: '15 min',    mins: 15  },
  { label: '30 min',    mins: 30  },
  { label: '1 hour',    mins: 60  },
  { label: '6 hours',   mins: 360 },
  { label: 'Midnight',  mins: 0   },
];

type SyncState = {
  syncEnabled:           boolean;
  isSyncing:             boolean;
  syncStatus:            SyncStatus;
  lastSyncedAt:          number | null;
  errorMessage:          string | null;
  isOnline:              boolean;
  autoSyncEnabled:       boolean;
  autoSyncIntervalMins:  number;

  setSyncEnabled:           (val: boolean)  => void;
  setIsSyncing:             (val: boolean)  => void;
  setSyncStatus:            (s: SyncStatus) => void;
  setLastSyncedAt:          (ts: number)    => void;
  setError:                 (msg: string | null) => void;
  setIsOnline:              (val: boolean)  => void;
  setAutoSyncEnabled:       (val: boolean)  => Promise<void>;
  setAutoSyncIntervalMins:  (mins: number)  => Promise<void>;
  loadSyncSettings:         ()              => Promise<void>;
};

export const useSyncStore = create<SyncState>((set) => ({
  syncEnabled:           false,
  isSyncing:             false,
  syncStatus:            'idle',
  lastSyncedAt:          null,
  errorMessage:          null,
  isOnline:              false,
  autoSyncEnabled:       false,
  autoSyncIntervalMins:  0,  // default = Midnight

  setSyncEnabled:          (val) => set({ syncEnabled: val }),
  setIsSyncing:            (val) => set({ isSyncing: val }),
  setSyncStatus:           (s)   => set({ syncStatus: s }),
  setLastSyncedAt:         (ts)  => set({ lastSyncedAt: ts }),
  setError:                (msg) => set({ errorMessage: msg }),
  setIsOnline:             (val) => set({ isOnline: val }),

  setAutoSyncEnabled: async (val) => {
    set({ autoSyncEnabled: val });
    try { await storage.setItem('auto_sync_enabled', val ? '1' : '0'); } catch {}
  },

  setAutoSyncIntervalMins: async (mins) => {
    set({ autoSyncIntervalMins: mins });
    try { await storage.setItem('auto_sync_interval', String(mins)); } catch {}
  },

  loadSyncSettings: async () => {
    try {
      const enabled  = await storage.getItem('auto_sync_enabled');
      const interval = await storage.getItem('auto_sync_interval');
      set({
        autoSyncEnabled:      enabled === '1',
        autoSyncIntervalMins: interval !== null ? parseInt(interval, 10) : 0,
      });
    } catch {}
  },
}));
