import { create } from 'zustand';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';

const storage = createAsyncStorage('storeflow');
const KEY = 'notifications';

export type NotifType = 'sync_success' | 'sync_error' | 'admin' | 'low_stock';

export type AppNotification = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  adminId?: string;
};

type NotifState = {
  notifications: AppNotification[];
  seenAdminIds: string[];
  loaded: boolean;

  load: () => Promise<void>;
  add: (n: Pick<AppNotification, 'type' | 'title' | 'body' | 'adminId'>) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeOld: () => Promise<void>;
  hasSeenAdmin: (adminId: string) => boolean;
  markAdminSeen: (ids: string[]) => Promise<void>;

  get unreadCount(): number;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function save(notifications: AppNotification[], seenAdminIds: string[]) {
  try {
    await storage.setItem(KEY, JSON.stringify({ notifications, seenAdminIds }));
  } catch {}
}

export const useNotifStore = create<NotifState>((set, get) => ({
  notifications: [],
  seenAdminIds: [],
  loaded: false,

  get unreadCount() {
    return get().notifications.filter((n) => !n.read).length;
  },

  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await storage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          notifications: parsed.notifications ?? [],
          seenAdminIds: parsed.seenAdminIds ?? [],
          loaded: true,
        });
        return;
      }
    } catch {}
    set({ loaded: true });
  },

  add: async (n) => {
    const next: AppNotification = {
      id: uid(),
      type: n.type,
      title: n.title,
      body: n.body,
      timestamp: Date.now(),
      read: false,
      adminId: n.adminId,
    };
    const list = [next, ...get().notifications].slice(0, 100);
    set({ notifications: list });
    await save(list, get().seenAdminIds);
  },

  markRead: async (id) => {
    const list = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    set({ notifications: list });
    await save(list, get().seenAdminIds);
  },

  markAllRead: async () => {
    const list = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: list });
    await save(list, get().seenAdminIds);
  },

  removeOld: async () => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
    const list = get().notifications.filter((n) => n.timestamp > cutoff);
    set({ notifications: list });
    await save(list, get().seenAdminIds);
  },

  hasSeenAdmin: (adminId) => get().seenAdminIds.includes(adminId),

  markAdminSeen: async (ids) => {
    const seen = [...new Set([...get().seenAdminIds, ...ids])];
    set({ seenAdminIds: seen });
    await save(get().notifications, seen);
  },
}));
