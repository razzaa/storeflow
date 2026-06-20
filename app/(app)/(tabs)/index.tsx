import React, { useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, StatusBar, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Bell, TrendingUp, AlertTriangle, Plus } from 'lucide-react-native';
import { useAppStore } from '../../../src/stores/appStore';
import { useWidgetStore } from '../../../src/stores/widgetStore';
import { useAuthStore } from '../../../src/stores/authStore';
import { useNotifStore } from '../../../src/stores/notificationStore';
import {
  getDashboardStats, getTopProducts, getLowStockProducts,
  getSalesData, getMonthlySales,
} from '../../../src/db/queries';
import { LT, DT, space, radius, shadow } from '../../../src/theme/design';
import { formatCurrency } from '../../../src/utils/calc';
import { useT } from '../../../src/i18n';

function getGreeting(t: ReturnType<typeof useT>) {
  const h = new Date().getHours();
  if (h < 12) return t.home.goodMorning;
  if (h < 17) return t.home.goodAfternoon;
  return t.home.goodEvening;
}

export default function HomeScreen() {
  const { activeStore } = useAppStore();
  const { isDark, kpiRow, quickActions, lowStock, topSellers, recentBills, monthlyChart } = useWidgetStore();
  const { user } = useAuthStore();
  const unreadCount = useNotifStore((s) => s.unreadCount);
  const T = isDark ? DT : LT;
  const insets = useSafeAreaInsets();
  const t = useT();

  const storeId = activeStore?.id ?? '';
  const currency = activeStore?.currency ?? 'PKR';
  const storeName = activeStore?.name ?? 'StoreFlow';
  const userInitials = (user?.displayName ?? user?.email ?? storeName)
    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || 'SF';

  const { data: stats, refetch: refetchStats, isLoading } = useQuery({
    queryKey: ['dashboard', storeId],
    queryFn: () => getDashboardStats(storeId),
    enabled: !!storeId,
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products', storeId],
    queryFn: () => getTopProducts(storeId, 3),
    enabled: !!storeId,
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ['low-stock', storeId],
    queryFn: () => getLowStockProducts(storeId),
    enabled: !!storeId,
  });

  const { data: salesData7 = [] } = useQuery({
    queryKey: ['sales-7day', storeId],
    queryFn: () => getSalesData(storeId, 7),
    enabled: !!storeId,
  });

  const { data: monthlyData = [] } = useQuery({
    queryKey: ['monthly-sales', storeId],
    queryFn: () => getMonthlySales(storeId),
    enabled: !!storeId,
  });

  // Sparkline: 7-day normalized bars
  const sparkline = useMemo(() => {
    if (!salesData7.length) return [0, 0, 0, 0, 0, 0, 0];
    const maxVal = Math.max(...salesData7.map((d) => d.total), 1);
    return salesData7.map((d) => Math.round((d.total / maxVal) * 100));
  }, [salesData7]);

  // Sparkline labels from real dates
  const sparkLabels = useMemo(
    () => salesData7.map((d) => d.date),
    [salesData7]
  );

  // % change vs yesterday
  const vsYesterday = useMemo(() => {
    const todayVal     = salesData7[salesData7.length - 1]?.total ?? 0;
    const yesterdayVal = salesData7[salesData7.length - 2]?.total ?? 0;
    if (!yesterdayVal) return null;
    return Math.round(((todayVal - yesterdayVal) / yesterdayVal) * 100);
  }, [salesData7]);

  // Monthly chart: 12-slot normalized bars
  const monthBarsReal = useMemo(() => {
    const maxVal = Math.max(...monthlyData.map((m) => m.total), 1);
    return Array.from({ length: 12 }, (_, i) => {
      const idx = monthlyData.length - 12 + i;
      if (idx < 0) return 0;
      return Math.round(((monthlyData[idx]?.total ?? 0) / maxVal) * 100);
    });
  }, [monthlyData]);

  // % change vs last month
  const vsLastMonth = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const thisMonth = monthlyData[monthlyData.length - 1]?.total ?? 0;
    const lastMonth = monthlyData[monthlyData.length - 2]?.total ?? 0;
    if (!lastMonth) return null;
    return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  }, [monthlyData]);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  }, [refetchStats]);

  if (!storeId) {
    return (
      <View style={[styles.center, { backgroundColor: T.bg }]}>
        <Text style={{ fontSize: 60, marginBottom: 16 }}>🏪</Text>
        <Text style={[styles.emptyTitle, { color: T.t1 }]}>No Store Selected</Text>
        <TouchableOpacity onPress={() => router.push('/(onboarding)/setup')}>
          <Text style={{ color: T.blue, fontSize: 15, fontWeight: '600', marginTop: 8 }}>Create a Store →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const revenue = stats?.today_sales ?? 0;
  const profit = stats?.today_profit ?? 0;
  const orders = stats?.total_orders ?? 0;
  const monthly = stats?.monthly_revenue ?? 0;
  const lowCount = stats?.low_stock_count ?? 0;
  const avgSale = orders > 0 ? revenue / orders : 0;

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        style={[styles.root, { backgroundColor: T.bg }]}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.blue} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: T.surface, borderBottomColor: T.line, paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={[styles.greeting, { color: T.t2 }]}>{getGreeting(t)} 👋</Text>
            <Text style={[styles.storeName, { color: T.t1 }]}>{storeName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: T.s2, borderColor: T.border }]}
              onPress={() => router.push('/(app)/notifications')}
            >
              <Bell size={18} color={T.t2} strokeWidth={1.75} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { borderColor: T.surface }]}>
                  {unreadCount > 9
                    ? null
                    : null}
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.avatar, { backgroundColor: T.blueL, borderColor: T.blue, overflow: 'hidden' }]}
              onPress={() => user ? router.push('/(app)/profile') : router.push('/(onboarding)/auth')}
              activeOpacity={0.8}
            >
              {user?.photoURL
                ? <Image source={{ uri: user.photoURL }} style={styles.avatarImg} />
                : <Text style={[styles.avatarText, { color: T.blue }]}>{userInitials}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Revenue hero card */}
        <View style={[styles.heroCard, { backgroundColor: T.blue }]}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.heroLabel}>Today's Revenue</Text>
              <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatCurrency(revenue, currency)}</Text>
              {vsYesterday !== null && (
                <View style={styles.trendPill}>
                  <TrendingUp size={12} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.trendText}>
                    {vsYesterday >= 0 ? '↑' : '↓'} {Math.abs(vsYesterday)}% vs yesterday
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.heroRightLabel}>Net Profit</Text>
              <Text style={styles.heroProfit} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatCurrency(profit, currency)}</Text>
              <Text style={styles.heroMargin}>
                {revenue > 0 ? `${Math.round((profit / revenue) * 100)}% margin` : '0% margin'}
              </Text>
            </View>
          </View>
          <View style={styles.sparkline}>
            {sparkline.map((h, i) => (
              <View
                key={i}
                style={[styles.sparkBar, {
                  height: `${Math.max(h, 4)}%` as any,
                  backgroundColor: i === sparkline.length - 1
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(255,255,255,0.2)',
                }]}
              />
            ))}
          </View>
          <View style={styles.sparkLabels}>
            {sparkLabels.map((d, i) => (
              <Text key={i} style={styles.sparkLabel}>{d}</Text>
            ))}
          </View>
        </View>

        {/* KPI 2×2 Grid */}
        {kpiRow && (
          <View style={styles.kpiGrid}>
            {[
              { label: 'Orders Today', val: String(orders), color: T.blue, bg: T.blueL },
              { label: 'Avg Sale', val: formatCurrency(avgSale, currency), color: T.t1, bg: T.surface },
              { label: 'Net Profit', val: formatCurrency(profit, currency), color: T.green, bg: T.greenL },
              { label: 'Low Stock', val: String(lowCount), color: T.amber, bg: T.amberL },
            ].map(({ label, val, color, bg }) => (
              <View key={label} style={[styles.kpiCard, { backgroundColor: bg, borderColor: T.border }]}>
                <Text style={[styles.kpiVal, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>{val}</Text>
                <Text style={[styles.kpiLabel, { color: T.t2 }]} numberOfLines={1}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        {quickActions && (
          <View style={[styles.section, { paddingBottom: 16 }]}>
            <Text style={[styles.sectionLabel, { color: T.t3 }]}>{t.home.quickActions}</Text>
            <TouchableOpacity
              style={[styles.qaNew, { backgroundColor: T.blue }]}
              onPress={() => router.push('/(app)/(tabs)/bills/checkout')}
              activeOpacity={0.85}
            >
              <Plus size={20} color="#fff" strokeWidth={2.5} />
              <Text style={styles.qaNewText}>{t.home.newSale}</Text>
            </TouchableOpacity>
            <View style={styles.qaRow2}>
              <TouchableOpacity
                style={[styles.qaBtn, { backgroundColor: T.surface, borderColor: T.border }]}
                onPress={() => router.push('/(app)/(tabs)/products/add')}
              >
                <Text style={[styles.qaBtnText, { color: T.t1 }]}>+ {t.home.addProduct}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qaBtn, { backgroundColor: T.surface, borderColor: T.border }]}
                onPress={() => router.push('/(app)/(tabs)/analytics')}
              >
                <Text style={[styles.qaBtnText, { color: T.t1 }]}>{t.home.viewReports}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Low Stock Banner */}
        {lowStock && lowCount > 0 && (
          <TouchableOpacity
            style={[styles.alertBanner, { backgroundColor: T.amberL, borderColor: T.amber }]}
            onPress={() => router.push('/(app)/(tabs)/products')}
            activeOpacity={0.85}
          >
            <AlertTriangle size={24} color={T.amber} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: isDark ? T.amber : '#92400E' }]}>
                {lowCount} {lowCount === 1 ? 'item' : 'items'} low on stock
              </Text>
              <Text style={[styles.alertSub, { color: isDark ? T.amber : '#B45309' }]}>
                Tap to review and restock
              </Text>
            </View>
            <Text style={{ color: T.amber, fontSize: 22 }}>›</Text>
          </TouchableOpacity>
        )}

        {/* Monthly Revenue Chart */}
        {monthlyChart && (
          <View style={[styles.chartCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: T.t1 }]}>Monthly Revenue</Text>
              <Text style={[styles.chartValue, { color: T.blue }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatCurrency(monthly, currency)}</Text>
            </View>
            {vsLastMonth !== null && (
              <Text style={[styles.chartGrowth, { color: vsLastMonth >= 0 ? T.green : T.red }]}>
                {vsLastMonth >= 0 ? '↑' : '↓'} {vsLastMonth >= 0 ? '+' : ''}{vsLastMonth}% from last month
              </Text>
            )}
            <View style={styles.monthBars}>
              {monthBarsReal.map((h, i) => (
                <View
                  key={i}
                  style={[styles.monthBar, {
                    height: `${Math.max(h, 4)}%` as any,
                    backgroundColor: i === 11 ? T.blue : T.blueL,
                  }]}
                />
              ))}
            </View>
            <View style={styles.monthLabels}>
              <Text style={[styles.monthLabel, { color: T.t3 }]}>Jan</Text>
              <Text style={[styles.monthLabel, { color: T.t3 }]}>Apr</Text>
              <Text style={[styles.monthLabel, { color: T.t3 }]}>Jun</Text>
              <Text style={[styles.monthLabel, { color: T.t3 }]}>Today</Text>
            </View>
          </View>
        )}

        {/* Top Sellers */}
        {topSellers && (
          <View style={[styles.listCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: T.t1 }]}>🏆 {t.home.topSellers}</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/products')} hitSlop={12}>
                <Text style={[styles.seeAll, { color: T.blue }]}>{t.home.viewAll} →</Text>
              </TouchableOpacity>
            </View>
            {topProducts && topProducts.length > 0 ? (
              topProducts.map((p, i) => (
                <View key={i} style={[styles.topRow, { borderBottomColor: T.line }]}>
                  <View style={[styles.rank, { backgroundColor: T.blueL }]}>
                    <Text style={[styles.rankText, { color: T.blue }]}>#{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.topName, { color: T.t1 }]} numberOfLines={1}>{p.product_name}</Text>
                    <View style={[styles.barMini, { backgroundColor: T.line }]}>
                      <View style={[styles.barMiniFill, { width: `${100 - i * 24}%` as any, backgroundColor: T.blue }]} />
                    </View>
                  </View>
                  <Text style={[styles.topVal, { color: T.t1 }]}>{formatCurrency(p.total_profit, currency)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.topEmpty}>
                <Text style={[styles.topEmptyText, { color: T.t3 }]}>
                  No sales yet — make your first sale!
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: space.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  greeting: { fontSize: 14, fontWeight: '400' },
  storeName: { fontSize: 22, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  badge: {
    position: 'absolute', top: -2, right: -2,
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626',
    borderWidth: 2,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 21 },

  heroCard: {
    margin: 14, marginHorizontal: 16, borderRadius: 24, padding: 20,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  heroLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  heroValue: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 4, lineHeight: 38 },
  trendPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 5, marginTop: 10, alignSelf: 'flex-start',
  },
  trendText: { fontSize: 13, color: '#fff' },
  heroRight: { alignItems: 'flex-end', flexShrink: 0 },
  heroRightLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  heroProfit: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 4 },
  heroMargin: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 },

  sparkline: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 36, marginTop: 18 },
  sparkBar: { flex: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  sparkLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sparkLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  // 2×2 grid instead of 4-in-a-row
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, paddingBottom: 4,
  },
  kpiCard: {
    width: '47%', borderRadius: 18, borderWidth: 1,
    paddingVertical: 16, paddingHorizontal: 14,
  },
  kpiVal: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  kpiLabel: { fontSize: 13, fontWeight: '500' },

  section: { paddingHorizontal: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 },

  // New Sale: full-width prominent button
  qaNew: {
    borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 10,
  },
  qaNewText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Add Product + View Reports: side by side
  qaRow2: { flexDirection: 'row', gap: 10 },
  qaBtn: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  qaBtnText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 14,
    borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14,
  },
  alertTitle: { fontSize: 16, fontWeight: '700' },
  alertSub: { fontSize: 13, opacity: 0.85, marginTop: 3 },

  chartCard: {
    marginHorizontal: 16, marginBottom: 14,
    borderRadius: 20, borderWidth: 1, padding: 16,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  chartTitle: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  chartValue: { fontSize: 17, fontWeight: '800', flexShrink: 0 },
  chartGrowth: { fontSize: 13, marginBottom: 12 },
  monthBars: { flexDirection: 'row', gap: 3, alignItems: 'flex-end', height: 52 },
  monthBar: { flex: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  monthLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  monthLabel: { fontSize: 12 },

  listCard: {
    marginHorizontal: 16, marginBottom: 14,
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 15, paddingBottom: 10,
  },
  listTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 15, fontWeight: '600' },

  topEmpty: { paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' },
  topEmptyText: { fontSize: 15, textAlign: 'center' },
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  rank: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 13, fontWeight: '700' },
  topName: { fontSize: 15, fontWeight: '600', marginBottom: 5 },
  barMini: { height: 5, borderRadius: 3 },
  barMiniFill: { height: '100%', borderRadius: 3 },
  topVal: { fontSize: 15, fontWeight: '700' },

});
