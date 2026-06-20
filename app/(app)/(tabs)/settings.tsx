import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Switch, TextInput, Modal, Pressable, Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import {
  BarChart2, Package, AlertTriangle, TrendingUp, FileText, DollarSign,
  Bell, Moon, Cloud, Download, Lock, LogOut, Store, ChevronRight,
  Pencil, Check, X, User, Plus, RefreshCw, Camera,
} from 'lucide-react-native';
import { useAppStore } from '../../../src/stores/appStore';
import { useWidgetStore } from '../../../src/stores/widgetStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { useSyncStore, SYNC_INTERVALS } from '../../../src/stores/syncStore';
import { useLangStore } from '../../../src/stores/langStore';
import { useT } from '../../../src/i18n';
import { getStores, updateStore, deleteStore } from '../../../src/db/queries';
import { LT, DT, space, radius, type Theme } from '../../../src/theme/design';
import {
  logout,
  updateDisplayName,
  uploadProfilePhoto,
} from '../../../src/firebase/authService';
import {
  pushToCloud,
  pullFromCloud,
  mergeSync,
} from '../../../src/firebase/syncService';
import type { Store as StoreType } from '../../../src/types';

type WidgetKey = 'kpiRow' | 'quickActions' | 'lowStock' | 'topSellers' | 'recentBills' | 'monthlyChart';

const WIDGETS: { key: WidgetKey; label: string; sub: string; icon: any; iconBg: string; iconColor: string }[] = [
  { key: 'kpiRow', label: 'KPI Stats Row', sub: 'Orders, Avg Sale, Profit, Stock', icon: BarChart2, iconBg: '#EFF6FF', iconColor: '#2563EB' },
  { key: 'quickActions', label: 'Quick Actions', sub: 'New Sale, + Product, Reports', icon: Package, iconBg: '#ECFDF5', iconColor: '#059669' },
  { key: 'lowStock', label: 'Low Stock Alert', sub: 'Shows when items are running low', icon: AlertTriangle, iconBg: '#FEF3C7', iconColor: '#D97706' },
  { key: 'topSellers', label: 'Top Sellers', sub: 'Today\'s best-performing products', icon: TrendingUp, iconBg: '#F5F3FF', iconColor: '#7C3AED' },
  { key: 'recentBills', label: 'Recent Bills', sub: 'Latest 2 transactions', icon: FileText, iconBg: '#EFF6FF', iconColor: '#2563EB' },
  { key: 'monthlyChart', label: 'Monthly Revenue Chart', sub: '12-month revenue visualization', icon: BarChart2, iconBg: '#ECFDF5', iconColor: '#059669' },
];

function SRow({ icon: Icon, iconBg, iconColor, label, sub, value, onPress, toggle, toggleValue, onToggle, T, last }: {
  icon: any; iconBg: string; iconColor: string; label: string; sub?: string;
  value?: string; onPress?: () => void; toggle?: boolean; toggleValue?: boolean;
  onToggle?: (v: boolean) => void; T: Theme; last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.sRow, !last && { borderBottomColor: T.line, borderBottomWidth: 1 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.sRowIcon, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.sRowLabel, { color: T.t1 }]}>{label}</Text>
        {sub && <Text style={[styles.sRowSub, { color: T.t2 }]}>{sub}</Text>}
      </View>
      {toggle !== undefined ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: T.border, true: T.blue }}
          thumbColor="#fff"
        />
      ) : value !== undefined ? (
        <View style={styles.sRowRight}>
          <Text style={[styles.sRowValue, { color: T.t2 }]}>{value}</Text>
          <ChevronRight size={14} color={T.t3} strokeWidth={1.75} />
        </View>
      ) : onPress ? (
        <ChevronRight size={14} color={T.t3} strokeWidth={1.75} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { activeStore, settings, setSkipAuth } = useAppStore();
  const { user } = useAuthStore();
  const widgets = useWidgetStore();
  const syncStore = useSyncStore();
  const { lang, setLang, isUrdu } = useLangStore();
  const queryClient = useQueryClient();
  const isDark = widgets.isDark;
  const T = isDark ? DT : LT;
  const t = useT();

  const insets = useSafeAreaInsets();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(activeStore?.name ?? '');
  const [showStorePicker, setShowStorePicker] = useState(false);

  // Store field pickers
  type PickerMode = 'type' | 'currency' | null;
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  const STORE_TYPES = ['Retail', 'Wholesale', 'Restaurant', 'Salon', 'Pharmacy', 'Other'];
  const CURRENCIES = ['PKR', 'USD', 'GBP', 'AED', 'EUR', 'SAR', 'INR'];

  const handlePickStoreField = async (value: string) => {
    if (!activeStore) return;
    const updates = pickerMode === 'type'
      ? { type: value }
      : { currency: value };
    await updateStore(activeStore.id, updates);
    await useAppStore.getState().setActiveStore(activeStore.id); // refresh activeStore
    queryClient.invalidateQueries();
    setPickerMode(null);
  };

  // Profile editing
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName ?? '');
  const [photoLoading, setPhotoLoading] = useState(false);

  const { data: stores = [], refetch } = useQuery({
    queryKey: ['stores'],
    queryFn: getStores,
  });

  const handleSaveStoreName = async () => {
    if (!activeStore || !nameInput.trim()) return;
    await updateStore(activeStore.id, { name: nameInput.trim() });
    queryClient.invalidateQueries({ queryKey: ['stores'] });
    setEditingName(false);
  };

  const handleDeleteStore = (store: StoreType) => {
    Alert.alert('Delete Store', `Delete "${store.name}" and all its data?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteStore(store.id);
          refetch();
          queryClient.invalidateQueries();
        }
      },
    ]);
  };

  const handleSaveDisplayName = async () => {
    if (!displayNameInput.trim()) return;
    try {
      await updateDisplayName(displayNameInput.trim());
      setEditingDisplayName(false);
    } catch {
      Alert.alert('Error', 'Could not update name. Please try again.');
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    if (!user) {
      Alert.alert('Not logged in', 'Sign in with an account to upload a profile photo.');
      return;
    }
    setPhotoLoading(true);
    try {
      await uploadProfilePhoto(result.assets[0].uri);
    } catch {
      Alert.alert('Upload failed', 'Could not upload photo. Please try again.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          if (user) await logout();
          router.replace('/(onboarding)/auth');
        },
      },
    ]);
  };

  const handleSyncNow = useCallback(async () => {
    if (!user || !activeStore?.id) return;
    syncStore.setIsSyncing(true);
    syncStore.setSyncStatus('syncing');
    try {
      await mergeSync(user.uid, activeStore.id);
      syncStore.setLastSyncedAt(Date.now());
      syncStore.setSyncStatus('success');
      queryClient.invalidateQueries();
    } catch {
      syncStore.setSyncStatus('error');
      syncStore.setError('Sync failed. Check your connection.');
    } finally {
      syncStore.setIsSyncing(false);
    }
  }, [user, activeStore]);

  const handlePushToCloud = useCallback(() => {
    if (!user || !activeStore?.id) return;
    Alert.alert(
      'Push to Cloud',
      'Upload all local data to cloud? This will overwrite any newer cloud data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Push', onPress: async () => {
            syncStore.setIsSyncing(true);
            try {
              await pushToCloud(user.uid, activeStore.id);
              syncStore.setLastSyncedAt(Date.now());
              syncStore.setSyncStatus('success');
            } catch {
              syncStore.setSyncStatus('error');
            } finally {
              syncStore.setIsSyncing(false);
            }
          }
        },
      ]
    );
  }, [user, activeStore]);

  const handleRestoreFromCloud = useCallback(() => {
    if (!user || !activeStore?.id) return;
    Alert.alert(
      'Restore from Cloud',
      'This will import cloud data and merge with your local data. Local data is not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore', onPress: async () => {
            syncStore.setIsSyncing(true);
            try {
              await pullFromCloud(user.uid, activeStore.id);
              syncStore.setLastSyncedAt(Date.now());
              syncStore.setSyncStatus('success');
              queryClient.invalidateQueries();
            } catch {
              syncStore.setSyncStatus('error');
            } finally {
              syncStore.setIsSyncing(false);
            }
          }
        },
      ]
    );
  }, [user, activeStore]);

  const lastSyncText = syncStore.lastSyncedAt
    ? (() => {
        const diff = Math.floor((Date.now() - syncStore.lastSyncedAt) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
      })()
    : 'Never';

  const storeName = activeStore?.name ?? 'My Store';
  const storeInitials = storeName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const userInitials = (user?.displayName ?? user?.email ?? 'U')
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {/* TopBar */}
      <View style={[styles.topBar, { backgroundColor: T.surface, borderBottomColor: T.line, paddingTop: insets.top }]}>
        <Text style={[styles.topTitle, { color: T.t1 }]}>{t.settings.settings}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          {/* Avatar with camera overlay */}
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickPhoto} activeOpacity={0.8}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profileAvatar, { backgroundColor: T.blueL, borderColor: T.blue }]}>
                <Text style={[styles.profileInitials, { color: T.blue }]}>{userInitials}</Text>
              </View>
            )}
            <View style={[styles.cameraOverlay, { backgroundColor: T.blue }]}>
              {photoLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Camera size={12} color="#fff" strokeWidth={2} />}
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1, minWidth: 0 }}>
            {editingDisplayName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={[styles.nameEditInput, { color: T.t1, borderColor: T.border }]}
                  value={displayNameInput}
                  onChangeText={setDisplayNameInput}
                  autoFocus
                  placeholder="Your name"
                  placeholderTextColor={T.t3}
                />
                <TouchableOpacity onPress={handleSaveDisplayName} style={[styles.inlineBtn, { backgroundColor: T.blue }]}>
                  <Check size={13} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setEditingDisplayName(false); setDisplayNameInput(user?.displayName ?? ''); }}
                  style={[styles.inlineBtn, { backgroundColor: T.s2, borderWidth: 1, borderColor: T.border }]}
                >
                  <X size={13} color={T.t2} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.profileName, { color: T.t1 }]} numberOfLines={1}>
                {user?.displayName || 'Set your name'}
              </Text>
            )}
            <Text style={[styles.profileEmail, { color: T.t2 }]} numberOfLines={1}>
              {user?.email ?? 'Local account'}
            </Text>
            {!user && (
              <TouchableOpacity onPress={() => router.push('/(onboarding)/auth')}>
                <Text style={[styles.signInLink, { color: T.blue }]}>Sign in to sync →</Text>
              </TouchableOpacity>
            )}
          </View>

          {user && !editingDisplayName && (
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: T.s2, borderColor: T.border }]}
              onPress={() => { setEditingDisplayName(true); setDisplayNameInput(user?.displayName ?? ''); }}
            >
              <Pencil size={13} color={T.t2} strokeWidth={1.75} />
              <Text style={[styles.editBtnText, { color: T.t2 }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Switch Store card */}
        <TouchableOpacity
          style={[styles.switchStoreCard, { backgroundColor: T.blue }]}
          onPress={() => setShowStorePicker(true)}
          activeOpacity={0.85}
        >
          <View style={[styles.switchStoreIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Store size={20} color="#fff" strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchStoreLabel}>Active Store</Text>
            <Text style={styles.switchStoreName}>{activeStore?.name ?? 'My Store'}</Text>
          </View>
          <View style={styles.switchStoreRight}>
            <Text style={styles.switchStoreBadge}>{stores.length} store{stores.length !== 1 ? 's' : ''}</Text>
            <RefreshCw size={16} color="rgba(255,255,255,0.8)" strokeWidth={2} />
          </View>
        </TouchableOpacity>

        {/* Store section */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>Store Settings</Text>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          {/* Store name row with inline edit */}
          <View style={[styles.storeNameRow, { borderBottomColor: T.line }]}>
            <View style={[styles.sRowIcon, { backgroundColor: LT.blueL }]}>
              <Store size={18} color={LT.blue} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sRowSub, { color: T.t2, marginBottom: 2 }]}>Store Name</Text>
              {editingName ? (
                <TextInput
                  style={[styles.nameInput, { color: T.t1, borderColor: T.border }]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                />
              ) : (
                <Text style={[styles.sRowLabel, { color: T.t1 }]}>{activeStore?.name ?? 'My Store'}</Text>
              )}
            </View>
            {editingName ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={handleSaveStoreName} style={[styles.inlineBtn, { backgroundColor: T.blue }]}>
                  <Check size={14} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditingName(false); setNameInput(activeStore?.name ?? ''); }} style={[styles.inlineBtn, { backgroundColor: T.s2, borderWidth: 1, borderColor: T.border }]}>
                  <X size={14} color={T.t2} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => { setEditingName(true); setNameInput(activeStore?.name ?? ''); }}
                style={[styles.renameChip, { backgroundColor: T.s2, borderColor: T.border }]}
              >
                <Text style={[styles.renameText, { color: T.t2 }]}>Rename</Text>
              </TouchableOpacity>
            )}
          </View>

          <SRow icon={Store} iconBg={LT.purpleL} iconColor={LT.purple}
            label="Store Type" value={activeStore?.type ?? 'Retail'}
            onPress={() => setPickerMode('type')} T={T} />
          <SRow icon={DollarSign} iconBg={LT.greenL} iconColor={LT.green}
            label="Currency" value={activeStore?.currency ?? 'PKR'}
            onPress={() => setPickerMode('currency')} T={T} last />
        </View>

        {/* Store Picker Modal */}
        <Modal
          visible={showStorePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStorePicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowStorePicker(false)}>
            <Pressable style={[styles.modalSheet, { backgroundColor: T.surface }]} onPress={() => {}}>
              {/* Handle */}
              <View style={[styles.modalHandle, { backgroundColor: T.border }]} />

              <Text style={[styles.modalTitle, { color: T.t1 }]}>Switch Store</Text>
              <Text style={[styles.modalSub, { color: T.t2 }]}>Tap a store to make it active</Text>

              <View style={{ marginTop: 16 }}>
                {stores.map((store, i) => {
                  const isActive = activeStore?.id === store.id;
                  const initials = store.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
                  return (
                    <TouchableOpacity
                      key={store.id}
                      style={[
                        styles.storePickerRow,
                        { borderColor: isActive ? T.blue : T.border },
                        isActive && { backgroundColor: T.blueL },
                        i > 0 && { marginTop: 10 },
                      ]}
                      onPress={async () => {
                        if (!isActive) {
                          await useAppStore.getState().setActiveStore(store.id);
                          queryClient.invalidateQueries();
                        }
                        setShowStorePicker(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.storePickerAvatar, { backgroundColor: store.theme_color + '22', borderColor: store.theme_color }]}>
                        <Text style={[styles.storePickerInitials, { color: store.theme_color }]}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.storePickerName, { color: T.t1 }]}>{store.name}</Text>
                        <Text style={[styles.storePickerMeta, { color: T.t2 }]}>
                          {store.type} · {store.currency}
                        </Text>
                      </View>
                      {isActive ? (
                        <View style={[styles.activePill, { backgroundColor: T.blue }]}>
                          <Check size={12} color="#fff" strokeWidth={2.5} />
                          <Text style={styles.activePillText}>Active</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleDeleteStore(store)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={16} color={T.t3} strokeWidth={1.75} />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.addStoreModalBtn, { backgroundColor: T.bg, borderColor: T.border }]}
                onPress={() => { setShowStorePicker(false); router.push('/(onboarding)/setup'); }}
              >
                <Plus size={18} color={T.blue} strokeWidth={2.5} />
                <Text style={[styles.addStoreModalText, { color: T.blue }]}>Add New Store</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Store Field Picker Modal (type / currency) */}
        <Modal
          visible={pickerMode !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerMode(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setPickerMode(null)}>
            <Pressable style={[styles.modalSheet, { backgroundColor: T.surface }]} onPress={() => {}}>
              <View style={[styles.modalHandle, { backgroundColor: T.border }]} />
              <Text style={[styles.modalTitle, { color: T.t1 }]}>
                {pickerMode === 'type' ? 'Store Type' : 'Currency'}
              </Text>
              <View style={{ marginTop: 12, gap: 8 }}>
                {(pickerMode === 'type' ? STORE_TYPES : CURRENCIES).map((opt) => {
                  const current = pickerMode === 'type'
                    ? activeStore?.type
                    : activeStore?.currency;
                  const selected = current === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.pickerOption,
                        { borderColor: selected ? T.blue : T.border,
                          backgroundColor: selected ? T.blueL : T.bg },
                      ]}
                      onPress={() => handlePickStoreField(opt)}
                    >
                      <Text style={[styles.pickerOptionText, { color: selected ? T.blue : T.t1 }]}>
                        {opt}
                      </Text>
                      {selected && <Check size={16} color={T.blue} strokeWidth={2.5} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Dashboard Widgets */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>Dashboard Widgets</Text>
        <View style={[styles.infoBanner, { backgroundColor: T.blueL }]}>
          <Text style={[styles.infoBannerText, { color: T.blue }]}>
            ⚡ Changes instantly update the Home screen
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          {WIDGETS.map((w, i) => (
            <SRow
              key={w.key}
              icon={w.icon}
              iconBg={w.iconBg}
              iconColor={w.iconColor}
              label={w.label}
              sub={w.sub}
              toggle
              toggleValue={widgets[w.key]}
              onToggle={() => widgets.toggle(w.key)}
              T={T}
              last={i === WIDGETS.length - 1}
            />
          ))}
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>{t.settings.appearance}</Text>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <SRow icon={Moon} iconBg={isDark ? '#2A3F58' : '#F5F3FF'} iconColor={isDark ? T.purple : LT.purple}
            label={t.settings.darkMode} sub="Switch between light and dark theme"
            toggle toggleValue={isDark}
            onToggle={(v) => widgets.setDark(v)}
            T={T}
          />
          {/* Language toggle */}
          <View style={[styles.sRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.sRowIcon, { backgroundColor: '#FFF7ED' }]}>
              <Text style={{ fontSize: 16 }}>🌐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sRowLabel, { color: T.t1 }]}>{t.settings.language}</Text>
              <Text style={[styles.sRowSub, { color: T.t2 }]}>
                {isUrdu ? 'اردو فعال ہے' : 'English is active'}
              </Text>
            </View>
            <View style={[styles.langToggle, { backgroundColor: T.s2, borderColor: T.border }]}>
              <TouchableOpacity
                style={[styles.langBtn, !isUrdu && { backgroundColor: T.blue }]}
                onPress={() => setLang('en')}
              >
                <Text style={[styles.langBtnText, { color: !isUrdu ? '#fff' : T.t2 }]}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, isUrdu && { backgroundColor: T.blue }]}
                onPress={() => setLang('ur')}
              >
                <Text style={[styles.langBtnText, { color: isUrdu ? '#fff' : T.t2, fontFamily: 'System' }]}>اردو</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <SRow icon={Bell} iconBg={LT.amberL} iconColor={LT.amber} label="Low Stock Alerts" sub="Get notified when items run low" toggle toggleValue={true} T={T} />
          <SRow icon={Bell} iconBg={LT.blueL} iconColor={LT.blue} label="Daily Sales Summary" sub="End-of-day revenue report" toggle toggleValue={true} T={T} />
          <SRow icon={Bell} iconBg={LT.redL} iconColor={LT.red} label="Payment Reminders" sub="Outstanding payments" toggle toggleValue={false} T={T} last />
        </View>

        {/* Cloud Sync */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>Cloud Sync</Text>
        {!user ? (
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.syncSignInRow}>
              <View style={[styles.sRowIcon, { backgroundColor: LT.blueL }]}>
                <Cloud size={18} color={LT.blue} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sRowLabel, { color: T.t1 }]}>Enable Cloud Backup</Text>
                <Text style={[styles.sRowSub, { color: T.t2 }]}>Sign in to sync your data across devices</Text>
              </View>
              <TouchableOpacity
                style={[styles.signInChip, { backgroundColor: T.blue }]}
                onPress={() => router.push('/(onboarding)/auth')}
              >
                <Text style={styles.signInChipText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>

            {/* ── Main Cloud Sync toggle ── */}
            <View style={[styles.sRow, { borderBottomColor: T.line, borderBottomWidth: 1 }]}>
              <View style={[styles.sRowIcon, { backgroundColor: LT.blueL }]}>
                <Cloud size={18} color={LT.blue} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sRowLabel, { color: T.t1 }]}>Cloud Sync</Text>
                <Text style={[styles.sRowSub, { color: syncStore.autoSyncEnabled ? T.green : T.t2 }]}>
                  {syncStore.autoSyncEnabled
                    ? `Auto · ${SYNC_INTERVALS.find((i) => i.mins === syncStore.autoSyncIntervalMins)?.label ?? 'On'} · Last: ${lastSyncText}`
                    : syncStore.lastSyncedAt
                      ? `Manual · Last: ${lastSyncText}`
                      : 'Enable for automatic scheduled sync'}
                </Text>
              </View>
              <Switch
                value={syncStore.autoSyncEnabled}
                onValueChange={(v) => syncStore.setAutoSyncEnabled(v)}
                trackColor={{ false: T.border, true: T.blue }}
                thumbColor="#fff"
              />
            </View>

            {/* ── Schedule interval (shown when Cloud Sync is on) ── */}
            {syncStore.autoSyncEnabled && (
              <View style={[styles.scheduleRow, { borderBottomColor: T.line }]}>
                <Text style={[styles.scheduleLabel, { color: T.t3 }]}>SYNC EVERY</Text>
                <View style={styles.intervalChips}>
                  {SYNC_INTERVALS.map((interval) => {
                    const active = syncStore.autoSyncIntervalMins === interval.mins;
                    return (
                      <TouchableOpacity
                        key={interval.label}
                        style={[
                          styles.intervalChip,
                          active
                            ? { backgroundColor: T.blue }
                            : { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border },
                        ]}
                        onPress={() => syncStore.setAutoSyncIntervalMins(interval.mins)}
                      >
                        <Text style={[styles.intervalChipText, { color: active ? '#fff' : T.t2 }]}>
                          {interval.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Sync status bar ── */}
            {(syncStore.isSyncing || syncStore.syncStatus === 'error') && (
              <View style={[styles.syncStatusBar, {
                backgroundColor: syncStore.syncStatus === 'error' ? T.redL : T.blueL,
              }]}>
                {syncStore.isSyncing && (
                  <ActivityIndicator size="small" color={T.blue} style={{ marginRight: 8 }} />
                )}
                <Text style={[styles.syncStatusText, {
                  color: syncStore.syncStatus === 'error' ? T.red : T.blue,
                }]}>
                  {syncStore.isSyncing
                    ? 'Syncing your data…'
                    : `⚠ ${syncStore.errorMessage ?? 'Sync failed — check your connection'}`}
                </Text>
              </View>
            )}

            {/* ── Manual action buttons ── */}
            <View style={styles.syncActions}>
              <TouchableOpacity
                style={[styles.syncBtn, { backgroundColor: T.blue }, syncStore.isSyncing && { opacity: 0.6 }]}
                onPress={handleSyncNow}
                disabled={syncStore.isSyncing}
              >
                {syncStore.isSyncing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <RefreshCw size={14} color="#fff" strokeWidth={2} />}
                <Text style={styles.syncBtnText}>Sync Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.syncBtn, { backgroundColor: T.s2, borderWidth: 1, borderColor: T.border }]}
                onPress={handlePushToCloud}
                disabled={syncStore.isSyncing}
              >
                <Cloud size={14} color={T.t2} strokeWidth={2} />
                <Text style={[styles.syncBtnText, { color: T.t2 }]}>Push ↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.syncBtn, { backgroundColor: T.s2, borderWidth: 1, borderColor: T.border }]}
                onPress={handleRestoreFromCloud}
                disabled={syncStore.isSyncing}
              >
                <Download size={14} color={T.t2} strokeWidth={2} />
                <Text style={[styles.syncBtnText, { color: T.t2 }]}>Restore ↓</Text>
              </TouchableOpacity>
            </View>

            <SRow icon={Download} iconBg={LT.greenL} iconColor={LT.green}
              label="Export Data" sub="Download as CSV or PDF" onPress={() => {}} T={T} last />
          </View>
        )}

        {/* Account */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <SRow icon={Lock} iconBg={LT.purpleL} iconColor={LT.purple} label="PIN Lock" sub="Secure app with a 4-digit PIN" toggle toggleValue={false} T={T} />
          <SRow
            icon={User}
            iconBg={T.blueL}
            iconColor={T.blue}
            label="Skip Login on Startup"
            sub="Go directly to the app using local storage"
            toggle
            toggleValue={!!settings?.skip_auth}
            onToggle={(v) => setSkipAuth(v)}
            T={T}
          />
          <SRow
            icon={LogOut}
            iconBg={LT.redL}
            iconColor={LT.red}
            label={user ? 'Log Out' : 'Sign In'}
            onPress={user ? handleLogout : () => router.push('/(onboarding)/auth')}
            T={T}
            last
          />
        </View>

        {/* Store management */}
        {stores.length > 1 && (
          <>
            <Text style={[styles.sectionLabel, { color: T.t3 }]}>Stores</Text>
            <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
              {stores.map((store, i) => (
                <View key={store.id} style={[styles.storeRow, i < stores.length - 1 && { borderBottomColor: T.line, borderBottomWidth: 1 }]}>
                  <View style={[styles.storeColorDot, { backgroundColor: store.theme_color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sRowLabel, { color: T.t1 }]}>{store.name}</Text>
                    <Text style={[styles.sRowSub, { color: T.t2 }]}>{store.type} · {store.currency}</Text>
                  </View>
                  {activeStore?.id === store.id && (
                    <View style={[styles.activeBadge, { backgroundColor: T.blue }]}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => handleDeleteStore(store)} style={{ padding: 4 }}>
                    <Text style={{ color: T.red, fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.addStoreBtn, { backgroundColor: T.surface, borderColor: T.border }]}
          onPress={() => router.push('/(onboarding)/setup')}
        >
          <Text style={{ color: T.blue, fontSize: 22, lineHeight: 24 }}>+</Text>
          <Text style={[styles.addStoreText, { color: T.blue }]}>Add New Store</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  topTitle: { fontSize: 17, fontWeight: '700' },

  content: { padding: 16, paddingBottom: 40 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 20,
  },
  avatarWrap: { position: 'relative' },
  profilePhoto: { width: 52, height: 52, borderRadius: 26 },
  profileAvatar: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInitials: { fontSize: 17, fontWeight: '700' },
  cameraOverlay: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: 15, fontWeight: '700' },
  profileEmail: { fontSize: 12, marginTop: 2 },
  signInLink: { fontSize: 12, marginTop: 3, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
    flexShrink: 0,
  },
  editBtnText: { fontSize: 12, fontWeight: '500' },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameEditInput: {
    flex: 1, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5, fontSize: 14,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4,
  },
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },

  infoBanner: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
  },
  infoBannerText: { fontSize: 12, fontWeight: '500' },

  sRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  sRowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sRowLabel: { fontSize: 14, fontWeight: '500' },
  sRowSub: { fontSize: 11, marginTop: 1 },
  sRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sRowValue: { fontSize: 13 },

  storeNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1,
  },
  nameInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    fontSize: 14, fontWeight: '500',
  },
  inlineBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  renameChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  renameText: { fontSize: 12, fontWeight: '500' },

  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  storeColorDot: { width: 12, height: 12, borderRadius: 6 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  activeBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  addStoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderRadius: 14, borderWidth: 1, justifyContent: 'center',
  },
  addStoreText: { fontSize: 15, fontWeight: '600' },

  // Switch Store card (inline)
  switchStoreCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, marginBottom: 20,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  switchStoreIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  switchStoreLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  switchStoreName: { fontSize: 15, color: '#fff', fontWeight: '700', marginTop: 1 },
  switchStoreRight: { alignItems: 'flex-end', gap: 4 },
  switchStoreBadge: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 20,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: 13 },

  // Store picker rows
  storePickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14, borderWidth: 1.5,
  },
  storePickerAvatar: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  storePickerInitials: { fontSize: 15, fontWeight: '700' },
  storePickerName: { fontSize: 14, fontWeight: '600' },
  storePickerMeta: { fontSize: 11, marginTop: 2 },
  activePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  activePillText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  // Cloud sync
  syncSignInRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  signInChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  signInChipText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  syncStatusBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  syncStatusText: { fontSize: 12, fontWeight: '500' },
  syncActions: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  syncBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: 10,
  },
  syncBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  // Add Store button in modal
  addStoreModalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  addStoreModalText: { fontSize: 15, fontWeight: '600' },

  // Store field picker
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  pickerOptionText: { fontSize: 15, fontWeight: '500' },

  // Cloud sync schedule
  scheduleRow: {
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
  },
  scheduleLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8,
  },
  intervalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  intervalChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  intervalChipText: { fontSize: 12, fontWeight: '600' },

  // Language toggle
  langToggle: {
    flexDirection: 'row', borderRadius: 10, borderWidth: 1,
    overflow: 'hidden', height: 32,
  },
  langBtn: {
    paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center',
  },
  langBtnText: { fontSize: 12, fontWeight: '700' },
});
