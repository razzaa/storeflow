import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { initializeDatabase } from '../src/db/database';
import { useAppStore } from '../src/stores/appStore';
import { useAuthStore } from '../src/stores/authStore';
import { useSyncStore } from '../src/stores/syncStore';
import { useLangStore } from '../src/stores/langStore';
import { useNotifStore } from '../src/stores/notificationStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 1000 * 60 } },
});

function msUntilMidnight(): number {
  const now  = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export default function RootLayout() {
  const loadSettings = useAppStore((s) => s.loadSettings);
  const { setUser, setAuthReady } = useAuthStore();
  const { setSyncStatus, setLastSyncedAt, setIsSyncing } = useSyncStore();
  const loadLang = useLangStore((s) => s.loadLang);
  const notifLoad = useNotifStore((s) => s.load);
  const notifAdd  = useNotifStore((s) => s.add);

  useEffect(() => {
    initializeDatabase().then(loadSettings);
    loadLang();
    notifLoad();
    useSyncStore.getState().loadSyncSettings();
  }, []);

  // ── Firebase auth listener + 1-week session enforcement ──────────────────
  useEffect(() => {
    let unsub: (() => void) | undefined;

    import('firebase/auth').then(({ onAuthStateChanged }) => {
      import('../src/firebase/config').then(({ auth }) => {
        unsub = onAuthStateChanged(auth, async (user) => {
          if (user) {
            const { isSessionExpired, clearLoginTimestamp } = await import('../src/firebase/authService');
            const { signOut } = await import('firebase/auth');
            if (await isSessionExpired()) {
              await clearLoginTimestamp();
              await signOut(auth);
              return;
            }
          }

          setUser(user);
          setAuthReady();

          if (user) {
            const { activeStore } = useAppStore.getState();
            if (activeStore?.id) {
              setIsSyncing(true);
              try {
                const { onLoginSync } = await import('../src/firebase/syncService');
                await onLoginSync(user.uid, activeStore.id);
                // Retry any pending profile photo upload
                const { flushPendingPhoto } = await import('../src/firebase/authService');
                flushPendingPhoto().catch(() => {});
                setLastSyncedAt(Date.now());
                setSyncStatus('success');
                queryClient.invalidateQueries();
                notifAdd({
                  type: 'sync_success',
                  title: 'Cloud Sync Complete',
                  body: 'Your data has been synced to the cloud.',
                });
              } catch {
                setSyncStatus('error');
                notifAdd({
                  type: 'sync_error',
                  title: 'Sync Failed',
                  body: 'Could not sync to cloud. Check your connection and try again from Settings.',
                });
              } finally {
                setIsSyncing(false);
              }
            }
          }
        });
      });
    });

    return () => unsub?.();
  }, []);

  // ── Auto-sync timer (interval or midnight) ────────────────────────────────
  useEffect(() => {
    let intervalTimer: ReturnType<typeof setInterval>  | null = null;
    let midnightTimer: ReturnType<typeof setTimeout>   | null = null;

    const clearTimers = () => {
      if (intervalTimer) { clearInterval(intervalTimer); intervalTimer = null; }
      if (midnightTimer) { clearTimeout(midnightTimer);  midnightTimer = null; }
    };

    const runSync = async () => {
      const { user } = useAuthStore.getState();
      const { activeStore } = useAppStore.getState();
      const { isSyncing } = useSyncStore.getState();
      if (!user || !activeStore?.id || isSyncing) return;

      useSyncStore.getState().setIsSyncing(true);
      try {
        const { mergeSync } = await import('../src/firebase/syncService');
        await mergeSync(user.uid, activeStore.id);
        useSyncStore.getState().setLastSyncedAt(Date.now());
        useSyncStore.getState().setSyncStatus('success');
        queryClient.invalidateQueries();
        notifAdd({
          type: 'sync_success',
          title: 'Auto Sync Complete',
          body: 'Your data was automatically synced to the cloud.',
        });
      } catch {
        useSyncStore.getState().setSyncStatus('error');
      } finally {
        useSyncStore.getState().setIsSyncing(false);
      }
    };

    const setupTimer = (enabled: boolean, intervalMins: number) => {
      clearTimers();
      if (!enabled) return;

      if (intervalMins === 0) {
        // Midnight sync — fire at next 00:00, then every 24 h
        midnightTimer = setTimeout(() => {
          runSync();
          intervalTimer = setInterval(runSync, 24 * 60 * 60 * 1000);
        }, msUntilMidnight());
      } else {
        intervalTimer = setInterval(runSync, intervalMins * 60 * 1000);
      }
    };

    // Set up initial timer
    const { autoSyncEnabled, autoSyncIntervalMins } = useSyncStore.getState();
    setupTimer(autoSyncEnabled, autoSyncIntervalMins);

    // Re-setup whenever the user changes auto-sync settings
    const unsubStore = useSyncStore.subscribe((state) => {
      setupTimer(state.autoSyncEnabled, state.autoSyncIntervalMins);
    });

    return () => {
      clearTimers();
      unsubStore();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
