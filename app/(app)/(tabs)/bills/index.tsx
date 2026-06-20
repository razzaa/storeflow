import React, { useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Plus } from 'lucide-react-native';
import { useAppStore } from '../../../../src/stores/appStore';
import { useWidgetStore } from '../../../../src/stores/widgetStore';
import { getBills } from '../../../../src/db/queries';
import { LT, DT, space, radius, type Theme } from '../../../../src/theme/design';
import { formatCurrency } from '../../../../src/utils/calc';
import type { Bill } from '../../../../src/types';

const FILTERS = ['All', 'Today', 'Cash', 'Card'];

function BillRow({ item, currency, T, onPress }: { item: Bill; currency: string; T: Theme; onPress: () => void }) {
  const date = new Date(item.created_at);
  const isCash = item.payment_method === 'cash';
  const icon = isCash ? '💵' : '💳';
  const iconBg = isCash ? T.greenL : T.blueL;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: T.line }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.billIcon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.billId, { color: T.t1 }]}>
          Bill {item.bill_number ? `#${String(item.bill_number).padStart(4, '0')}` : `#${item.id.slice(-6).toUpperCase()}`}
        </Text>
        <Text style={[styles.billMeta, { color: T.t2 }]}>
          {date.toLocaleDateString()} · {item.payment_method}
        </Text>
      </View>
      <Text style={[styles.billTotal, { color: T.t1 }]}>{formatCurrency(item.total, currency)}</Text>
      <Text style={{ color: T.t3, fontSize: 16 }}>›</Text>
    </TouchableOpacity>
  );
}

export default function BillsScreen() {
  const { activeStore } = useAppStore();
  const isDark = useWidgetStore((s) => s.isDark);
  const T = isDark ? DT : LT;
  const insets = useSafeAreaInsets();
  const storeId = activeStore?.id ?? '';
  const currency = activeStore?.currency ?? 'PKR';
  const [activeFilter, setActiveFilter] = useState('All');

  const { data: bills = [] } = useQuery({
    queryKey: ['bills', storeId],
    queryFn: () => getBills(storeId),
    enabled: !!storeId,
  });

  const today = new Date().toDateString();
  const filtered = bills.filter((b) => {
    if (activeFilter === 'Today') return new Date(b.created_at).toDateString() === today;
    if (activeFilter === 'Cash') return b.payment_method === 'cash';
    if (activeFilter === 'Card') return b.payment_method === 'card';
    return true;
  });

  const todayBills = bills.filter((b) => new Date(b.created_at).toDateString() === today);
  const todaySales = todayBills.reduce((s, b) => s + b.total, 0);
  const avgOrder = todayBills.length > 0 ? todaySales / todayBills.length : 0;

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {/* TopBar */}
      <View style={[styles.topBar, { backgroundColor: T.surface, borderBottomColor: T.line, paddingTop: insets.top }]}>
        <Text style={[styles.topTitle, { color: T.t1 }]}>Bills</Text>
        <View style={styles.topRight}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: T.s2, borderColor: T.border }]}>
            <Search size={16} color={T.t2} strokeWidth={1.75} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: T.s2, borderColor: T.border }]}>
            <Filter size={16} color={T.t2} strokeWidth={1.75} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      <View style={[styles.filtersWrap, { backgroundColor: T.bg }]}>
        {FILTERS.map((f) => {
          const active = f === activeFilter;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, active
                ? { backgroundColor: T.blue }
                : { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border }
              ]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : T.t2, fontWeight: active ? '700' : '400' }]}>
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Today summary strip */}
      <View style={[styles.summaryStrip, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        {[
          { label: "Today's Sales", val: formatCurrency(todaySales, currency) },
          { label: 'Bills', val: String(todayBills.length) },
          { label: 'Avg Order', val: formatCurrency(avgOrder, currency) },
        ].map(({ label, val }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <View style={[styles.stripDiv, { backgroundColor: T.line }]} />}
            <View style={styles.stripCol}>
              <Text style={[styles.stripVal, { color: T.t1 }]}>{val}</Text>
              <Text style={[styles.stripLabel, { color: T.t2 }]}>{label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: T.surface }}
        renderItem={({ item }) => (
          <BillRow
            item={item}
            currency={currency}
            T={T}
            onPress={() => router.push(`/(app)/(tabs)/bills/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🧾</Text>
            <Text style={[styles.emptyTitle, { color: T.t1 }]}>No bills yet</Text>
            <Text style={[styles.emptySub, { color: T.t2 }]}>Create your first bill with the + button</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: T.blue }]}
        onPress={() => router.push('/(app)/(tabs)/bills/checkout')}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  topTitle: { fontSize: 17, fontWeight: '700' },
  topRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  filtersWrap: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  chipText: { fontSize: 13 },

  summaryStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  stripCol: { flex: 1, alignItems: 'center' },
  stripVal: { fontSize: 14, fontWeight: '700' },
  stripLabel: { fontSize: 11, marginTop: 2 },
  stripDiv: { width: 1, height: 32 },

  list: { paddingBottom: 100 },
  listEmpty: { flex: 1 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  billIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  billId: { fontSize: 14, fontWeight: '600' },
  billMeta: { fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
  billTotal: { fontSize: 15, fontWeight: '700', marginRight: 4 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 24, right: 16,
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
});
