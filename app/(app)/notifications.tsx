import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, CheckCheck, Cloud, CloudOff, Megaphone, Package, Bell } from 'lucide-react-native';
import { useWidgetStore } from '../../src/stores/widgetStore';
import { useNotifStore, type AppNotification } from '../../src/stores/notificationStore';
import { fetchAdminNotifications } from '../../src/firebase/notificationService';
import { LT, DT, space, radius } from '../../src/theme/design';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
}

// ─── Icon per type ───────────────────────────────────────────────────────────

function NotifIcon({ type, T }: { type: AppNotification['type']; T: any }) {
  const map: Record<string, { Icon: any; bg: string; color: string }> = {
    sync_success: { Icon: Cloud,     bg: T.greenL, color: T.green },
    sync_error:   { Icon: CloudOff,  bg: T.redL,   color: T.red   },
    admin:        { Icon: Megaphone, bg: T.blueL,  color: T.blue  },
    low_stock:    { Icon: Package,   bg: T.amberL, color: T.amber },
  };
  const { Icon, bg, color } = map[type] ?? { Icon: Bell, bg: T.s2, color: T.t2 };
  return (
    <View style={[styles.notifIcon, { backgroundColor: bg }]}>
      <Icon size={18} color={color} strokeWidth={1.75} />
    </View>
  );
}

// ─── Single notification card ────────────────────────────────────────────────

function NotifCard({
  notif, T, onPress,
}: {
  notif: AppNotification; T: any; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: notif.read ? T.surface : T.blueL + '55', borderColor: T.border },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <NotifIcon type={notif.type} T={T} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardTitle, { color: T.t1 }]} numberOfLines={1}>
            {notif.title}
          </Text>
          {!notif.read && <View style={[styles.dot, { backgroundColor: T.blue }]} />}
        </View>
        <Text style={[styles.cardBody, { color: T.t2 }]} numberOfLines={2}>
          {notif.body}
        </Text>
        <Text style={[styles.cardTime, { color: T.t3 }]}>{timeAgo(notif.timestamp)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const isDark = useWidgetStore((s) => s.isDark);
  const T = isDark ? DT : LT;
  const insets = useSafeAreaInsets();

  const { notifications, markRead, markAllRead, add, hasSeenAdmin, markAdminSeen, load } =
    useNotifStore();

  const [fetchingAdmin, setFetchingAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAdminNotifs = useCallback(async () => {
    setFetchingAdmin(true);
    try {
      const adminNotifs = await fetchAdminNotifications();
      const unseen = adminNotifs.filter((a) => !hasSeenAdmin(a.id));
      for (const a of unseen) {
        await add({ type: 'admin', title: a.title, body: a.body, adminId: a.id });
      }
      if (unseen.length > 0) {
        await markAdminSeen(unseen.map((a) => a.id));
      }
    } catch {}
    setFetchingAdmin(false);
  }, [hasSeenAdmin]);

  useEffect(() => {
    load();
    loadAdminNotifs();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAdminNotifs();
    setRefreshing(false);
  }, [loadAdminNotifs]);

  // Group by day
  const grouped: { label: string; items: AppNotification[] }[] = [];
  const seen = new Set<string>();
  for (const n of notifications) {
    const label = dayLabel(n.timestamp);
    if (!seen.has(label)) {
      seen.add(label);
      grouped.push({ label, items: [] });
    }
    grouped[grouped.length - 1].items.push(n);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[
        styles.header,
        { backgroundColor: T.surface, borderBottomColor: T.line, paddingTop: insets.top + 8 },
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <ChevronLeft size={22} color={T.t1} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: T.t1 }]}>Notifications</Text>
          {fetchingAdmin && (
            <Text style={[styles.fetchingText, { color: T.t3 }]}>Checking for new…</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={[styles.markAllBtn, { borderColor: T.border }]}
            onPress={markAllRead}
            hitSlop={8}
          >
            <CheckCheck size={15} color={T.blue} strokeWidth={2} />
            <Text style={[styles.markAllText, { color: T.blue }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={[styles.root, { backgroundColor: T.bg }]}
        contentContainerStyle={[
          styles.content,
          notifications.length === 0 && styles.contentCenter,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.blue} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: T.s2 }]}>
              <Bell size={32} color={T.t3} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: T.t1 }]}>All caught up</Text>
            <Text style={[styles.emptySub, { color: T.t3 }]}>
              Sync updates and messages from StoreFlow will appear here.
            </Text>
          </View>
        ) : (
          grouped.map(({ label, items }) => (
            <View key={label}>
              <Text style={[styles.dayLabel, { color: T.t3 }]}>{label}</Text>
              <View style={styles.group}>
                {items.map((n, i) => (
                  <React.Fragment key={n.id}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: T.line }]} />}
                    <NotifCard
                      notif={n}
                      T={T}
                      onPress={() => { if (!n.read) markRead(n.id); }}
                    />
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16 },
  contentCenter: { flex: 1, justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: space.lg, paddingBottom: 12,
    borderBottomWidth: 1, minHeight: 52,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  fetchingText: { fontSize: 10, marginTop: 1 },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  markAllText: { fontSize: 11, fontWeight: '600' },

  dayLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.7, marginBottom: 8, paddingHorizontal: 4,
  },
  group: {
    borderRadius: radius.lg, overflow: 'hidden', marginBottom: 20,
    borderWidth: 1, borderColor: 'transparent',
  },
  divider: { height: 1, marginHorizontal: 14 },

  card: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 0,
  },
  notifIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  cardBody: { fontSize: 13, lineHeight: 18 },
  cardTime: { fontSize: 11, marginTop: 4 },

  emptyWrap: { alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
