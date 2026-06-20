import React, { useState, useMemo } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text, TextInput,
  ScrollView, Dimensions, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Search, ScanLine, Package, ChevronRight, Plus,
  LayoutGrid, List as ListIcon, X,
} from 'lucide-react-native';
import { useAppStore } from '../../../../src/stores/appStore';
import { useWidgetStore } from '../../../../src/stores/widgetStore';
import { getProducts, getCategories } from '../../../../src/db/queries';
import { LT, DT, type Theme } from '../../../../src/theme/design';
import { formatCurrency } from '../../../../src/utils/calc';
import type { Product } from '../../../../src/types';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 16 * 2 - 10) / 2;


const PALETTE = [
  { bg: '#EFF6FF', icon: '#2563EB' },
  { bg: '#ECFDF5', icon: '#059669' },
  { bg: '#F5F3FF', icon: '#7C3AED' },
  { bg: '#FEF3C7', icon: '#D97706' },
  { bg: '#FEE2E2', icon: '#DC2626' },
  { bg: '#F0FDF4', icon: '#16A34A' },
];

function StockBadge({ qty, T }: { qty: number; T: Theme }) {
  if (qty === 0) {
    return (
      <View style={{ backgroundColor: T.redL, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: T.red }}>Out</Text>
      </View>
    );
  }
  if (qty <= 5) {
    return (
      <View style={{ backgroundColor: T.amberL, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E' }}>{qty} low</Text>
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: T.greenL, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: T.green }}>{qty}</Text>
    </View>
  );
}

function GridCard({ item, index, currency, T, onPress }: {
  item: Product; index: number; currency: string; T: Theme; onPress: () => void;
}) {
  const c = PALETTE[index % PALETTE.length];
  return (
    <TouchableOpacity
      style={[styles.gridCard, { backgroundColor: T.surface, borderColor: T.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.gridThumb, { backgroundColor: c.bg }]}>
        {item.image
          ? <Image source={{ uri: item.image }} style={styles.gridThumbImg} resizeMode="cover" />
          : <Package size={30} color={c.icon} strokeWidth={1.5} />}
      </View>
      <Text style={[styles.gridName, { color: T.t1 }]} numberOfLines={2}>{item.name}</Text>
      <Text style={[styles.gridSku, { color: T.t3 }]} numberOfLines={1}>{item.sku || 'No SKU'}</Text>
      <View style={styles.gridFooter}>
        <Text style={[styles.gridPrice, { color: T.t1 }]}>{formatCurrency(item.selling_price, currency)}</Text>
        <StockBadge qty={item.quantity} T={T} />
      </View>
    </TouchableOpacity>
  );
}

function ListRow({ item, index, currency, T, onPress }: {
  item: Product; index: number; currency: string; T: Theme; onPress: () => void;
}) {
  const c = PALETTE[index % PALETTE.length];
  return (
    <TouchableOpacity
      style={[styles.listRow, { borderBottomColor: T.line }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.listThumb, { backgroundColor: c.bg }]}>
        {item.image
          ? <Image source={{ uri: item.image }} style={styles.listThumbImg} resizeMode="cover" />
          : <Package size={20} color={c.icon} strokeWidth={1.5} />}
      </View>
      <View style={styles.listInfo}>
        <Text style={[styles.listName, { color: T.t1 }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.listSku, { color: T.t3 }]}>{item.sku || 'No SKU'}</Text>
      </View>
      <View style={styles.listRight}>
        <Text style={[styles.listPrice, { color: T.t1 }]}>{formatCurrency(item.selling_price, currency)}</Text>
        <StockBadge qty={item.quantity} T={T} />
      </View>
      <ChevronRight size={15} color={T.t3} strokeWidth={1.75} />
    </TouchableOpacity>
  );
}

function EmptyState({ search, T }: { search: string; T: Theme }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 52, marginBottom: 14 }}>📦</Text>
      <Text style={[styles.emptyTitle, { color: T.t1 }]}>
        {search ? 'No results for "' + search + '"' : 'No products yet'}
      </Text>
      {!search && (
        <Text style={[styles.emptySub, { color: T.t2 }]}>Tap + to add your first product</Text>
      )}
    </View>
  );
}

export default function ProductsScreen() {
  const { activeStore } = useAppStore();
  const isDark = useWidgetStore((s) => s.isDark);
  const T = isDark ? DT : LT;
  const insets = useSafeAreaInsets();
  const storeId = activeStore?.id ?? '';
  const currency = activeStore?.currency ?? 'PKR';

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isGrid, setIsGrid] = useState(true);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => getCategories(storeId),
    enabled: !!storeId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', storeId, search, activeCategoryId],
    queryFn: () => getProducts(storeId, search || undefined, activeCategoryId ?? undefined),
    enabled: !!storeId,
  });

  const filtered = products;

  const inStockCount = products.filter((p) => p.quantity > 5).length;
  const lowCount = products.filter((p) => p.quantity > 0 && p.quantity <= 5).length;
  const outCount = products.filter((p) => p.quantity === 0).length;

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {/* ─── Header ─── */}
      <View style={[styles.header, { backgroundColor: T.surface, borderBottomColor: T.line, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: T.t1 }]}>Products</Text>
            <Text style={[styles.headerSub, { color: T.t3 }]}>{products.length} items · {activeStore?.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, {
                backgroundColor: searchOpen ? T.blueL : T.s2,
                borderColor: searchOpen ? T.blue : T.border,
              }]}
              onPress={() => { setSearchOpen((v) => !v); setSearch(''); }}
            >
              <Search size={17} color={searchOpen ? T.blue : T.t2} strokeWidth={1.75} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, {
                backgroundColor: isGrid ? T.blueL : T.s2,
                borderColor: isGrid ? T.blue : T.border,
              }]}
              onPress={() => setIsGrid((v) => !v)}
            >
              {isGrid
                ? <ListIcon size={17} color={T.blue} strokeWidth={1.75} />
                : <LayoutGrid size={17} color={T.t2} strokeWidth={1.75} />
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: T.blue }]}
              onPress={() => router.push('/(app)/(tabs)/products/add')}
            >
              <Plus size={17} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search (collapsible) */}
        {searchOpen && (
          <View style={[styles.searchBar, { backgroundColor: T.bg, borderColor: T.border }]}>
            <Search size={14} color={T.t3} strokeWidth={1.75} />
            <TextInput
              style={[styles.searchInput, { color: T.t1 }]}
              placeholder="Name, SKU, barcode..."
              placeholderTextColor={T.t3}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={14} color={T.t3} strokeWidth={2} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.scanBtn, { backgroundColor: T.blueL }]}>
              <ScanLine size={14} color={T.blue} strokeWidth={1.75} />
            </TouchableOpacity>
          </View>
        )}

        {/* Category pills — real categories from DB */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContent}
        >
          {[{ id: null, name: 'All' }, ...categories].map((cat) => {
            const active = activeCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id ?? 'all'}
                style={[
                  styles.pill,
                  active
                    ? { backgroundColor: T.blue }
                    : { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border },
                ]}
                onPress={() => setActiveCategoryId(cat.id)}
              >
                <Text style={[
                  styles.pillText,
                  { color: active ? '#fff' : T.t2, fontWeight: active ? '700' : '500' },
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Stats strip ─── */}
      <View style={[styles.statsStrip, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        {[
          { label: 'Total', val: String(products.length), color: T.t1 },
          { label: 'In Stock', val: String(inStockCount), color: T.green },
          { label: 'Low', val: String(lowCount), color: T.amber },
          { label: 'Out', val: String(outCount), color: T.red },
        ].map(({ label, val, color }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <View style={[styles.statDiv, { backgroundColor: T.line }]} />}
            <View style={styles.statCol}>
              <Text style={[styles.statVal, { color }]}>{val}</Text>
              <Text style={[styles.statLabel, { color: T.t3 }]}>{label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* ─── Grid / List ─── */}
      {isGrid ? (
        <FlatList
          key="grid"
          data={filtered}
          keyExtractor={(p) => p.id}
          numColumns={2}
          contentContainerStyle={[styles.gridContent, filtered.length === 0 && { flex: 1 }]}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <GridCard item={item} index={index} currency={currency} T={T}
              onPress={() => router.push(`/(app)/(tabs)/products/${item.id}`)} />
          )}
          ListEmptyComponent={<EmptyState search={search} T={T} />}
        />
      ) : (
        <FlatList
          key="list"
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.listContent, filtered.length === 0 && { flex: 1 }]}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: T.surface }}
          renderItem={({ item, index }) => (
            <ListRow item={item} index={index} currency={currency} T={T}
              onPress={() => router.push(`/(app)/(tabs)/products/${item.id}`)} />
          )}
          ListEmptyComponent={<EmptyState search={search} T={T} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { borderBottomWidth: 1 },
  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 11, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  scanBtn: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  // Pills
  pillsContent: {
    paddingHorizontal: 16, paddingBottom: 10, paddingTop: 2, gap: 6, flexDirection: 'row',
  },
  pill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 12.5 },

  // Stats
  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 1 },
  statDiv: { width: 1, height: 26 },

  // Grid
  gridContent: { padding: 14, paddingBottom: 100 },
  gridRow: { gap: 10, marginBottom: 10 },
  gridCard: {
    width: CARD_W, borderRadius: 16, borderWidth: 1, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  gridThumb: {
    width: '100%', height: 84, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    overflow: 'hidden',
  },
  gridThumbImg: { width: '100%', height: '100%', borderRadius: 12 },
  gridName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  gridSku: { fontSize: 10, marginTop: 2, marginBottom: 8 },
  gridFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gridPrice: { fontSize: 13, fontWeight: '700' },

  // List
  listContent: { paddingBottom: 100 },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1,
  },
  listThumb: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  listThumbImg: { width: 44, height: 44, borderRadius: 12 },
  listInfo: { flex: 1, minWidth: 0 },
  listName: { fontSize: 14, fontWeight: '600' },
  listSku: { fontSize: 11, marginTop: 1 },
  listRight: { alignItems: 'flex-end', gap: 3 },
  listPrice: { fontSize: 13, fontWeight: '700' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 70 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center', paddingHorizontal: 32 },
  emptySub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
});
