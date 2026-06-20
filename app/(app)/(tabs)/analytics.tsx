import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../../src/stores/appStore';
import { useWidgetStore } from '../../../src/stores/widgetStore';
import {
  getDashboardStats, getTopProducts,
  getAnalyticsStats, getPaymentBreakdown, getPeakHours,
  getMonthlySales, getCategoryBreakdown,
} from '../../../src/db/queries';
import { LT, DT } from '../../../src/theme/design';
import { formatCurrency } from '../../../src/utils/calc';

type Range = 'today' | 'week' | 'month' | 'year';
type Tab = 0 | 1 | 2;

const RANGES: { key: Range; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const PEAK_HOUR_LABELS = ['8am', '9', '10', '11', '12', '1pm', '2', '3', '4', '5', '6', '7', '8pm'];
const SCREEN_W = Dimensions.get('window').width;
const CARD_W = (SCREEN_W - 16 * 2 - 10) / 2;

export default function AnalyticsScreen() {
  const { activeStore } = useAppStore();
  const isDark = useWidgetStore((s) => s.isDark);
  const T = isDark ? DT : LT;
  const insets = useSafeAreaInsets();
  const storeId = activeStore?.id ?? '';
  const currency = activeStore?.currency ?? 'PKR';
  const [range, setRange] = useState<Range>('month');
  const [tab, setTab] = useState<Tab>(0);

  const { data: dashStats } = useQuery({
    queryKey: ['dashboard', storeId],
    queryFn: () => getDashboardStats(storeId),
    enabled: !!storeId,
  });

  const { data: rangeStats } = useQuery({
    queryKey: ['analytics-stats', storeId, range],
    queryFn: () => getAnalyticsStats(storeId, range),
    enabled: !!storeId,
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ['top-products', storeId],
    queryFn: () => getTopProducts(storeId, 5),
    enabled: !!storeId,
  });

  const { data: monthlySalesData = [] } = useQuery({
    queryKey: ['monthly-sales', storeId],
    queryFn: () => getMonthlySales(storeId),
    enabled: !!storeId,
  });

  const { data: peakHoursData = [] } = useQuery({
    queryKey: ['peak-hours', storeId],
    queryFn: () => getPeakHours(storeId),
    enabled: !!storeId,
  });

  const { data: paymentData = [] } = useQuery({
    queryKey: ['payment-breakdown', storeId, range],
    queryFn: () => getPaymentBreakdown(storeId, range),
    enabled: !!storeId,
  });

  const { data: categoryData = [] } = useQuery({
    queryKey: ['category-breakdown', storeId, range],
    queryFn: () => getCategoryBreakdown(storeId, range),
    enabled: !!storeId,
  });

  const revenue = rangeStats?.revenue ?? 0;
  const profit = rangeStats?.profit ?? 0;
  const orders = rangeStats?.orders ?? 0;
  const lowCount = dashStats?.low_stock_count ?? 0;
  const avgOrder = orders > 0 ? revenue / orders : 0;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  const monthBars = useMemo(() => {
    const maxVal = Math.max(...monthlySalesData.map((m) => m.total), 1);
    return Array.from({ length: 12 }, (_, i) => {
      const idx = monthlySalesData.length - 12 + i;
      if (idx < 0) return 0;
      return Math.round(((monthlySalesData[idx]?.total ?? 0) / maxVal) * 100);
    });
  }, [monthlySalesData]);

  const { peakBarsNorm, peakMaxIdx } = useMemo(() => {
    const peakMap = new Map(peakHoursData.map((p) => [p.hour, p.count]));
    const rawBars = Array.from({ length: 13 }, (_, i) => peakMap.get(i + 8) ?? 0);
    const maxVal = Math.max(...rawBars, 1);
    const peakBarsNorm = rawBars.map((b) => Math.round((b / maxVal) * 100));
    const maxCount = Math.max(...rawBars);
    const peakMaxIdx = maxCount > 0 ? rawBars.indexOf(maxCount) : -1;
    return { peakBarsNorm, peakMaxIdx };
  }, [peakHoursData]);

  const paymentBreakdown = useMemo(() => {
    const totalRevenue = paymentData.reduce((s, p) => s + p.total, 0);
    return ['cash', 'card', 'other'].map((method) => {
      const found = paymentData.find((p) => p.method === method);
      const pct = totalRevenue > 0 && found ? Math.round((found.total / totalRevenue) * 100) : 0;
      const amount = found?.total ?? 0;
      return {
        label: method.charAt(0).toUpperCase() + method.slice(1),
        pct,
        amount,
        color: method === 'cash' ? T.green : method === 'card' ? T.blue : T.amber,
        bg: method === 'cash' ? T.greenL : method === 'card' ? T.blueL : T.amberL,
      };
    });
  }, [paymentData, T]);

  const catBreakdown = useMemo(() => {
    const totalCat = categoryData.reduce((s, c) => s + c.total, 0);
    return categoryData.map((cat, i) => ({
      label: cat.category,
      pct: totalCat > 0 ? Math.round((cat.total / totalCat) * 100) : 0,
      amount: cat.total,
      color: [T.blue, T.green, T.amber, T.red, T.t2][i % 5],
    }));
  }, [categoryData, T]);

  const nowLabel = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  const kpiItems = [
    { label: 'Orders', val: String(orders), color: T.blue, bg: T.blueL, icon: '🛍️' },
    { label: 'Avg Order', val: formatCurrency(avgOrder, currency), color: T.green, bg: T.greenL, icon: '💰' },
    { label: 'Margin', val: `${margin}%`, color: T.amber, bg: T.amberL, icon: '📊' },
    { label: 'Low Stock', val: String(lowCount), color: T.red, bg: '#FFF0F0', icon: '⚠️' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: T.surface, borderBottomColor: T.line, paddingTop: insets.top + 10 }]}>
        <Text style={[styles.headerTitle, { color: T.t1 }]}>Analytics</Text>
        <View style={[styles.monthBadge, { backgroundColor: T.blueL }]}>
          <Text style={[styles.monthBadgeText, { color: T.blue }]}>{nowLabel}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Range selector */}
        <View style={[styles.rangeTrack, { backgroundColor: T.line, marginTop: 14 }]}>
          {RANGES.map(({ key, label }) => {
            const active = range === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.rangePill, active && { backgroundColor: T.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 }]}
                onPress={() => setRange(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rangeText, { color: active ? T.blue : T.t3, fontWeight: active ? '700' : '400' }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Revenue hero */}
        <View style={[styles.heroCard, { backgroundColor: T.blue }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroEyebrow}>Total Revenue</Text>
              <Text style={styles.heroRevenue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {formatCurrency(revenue, currency)}
              </Text>
            </View>
            <View style={[styles.heroProfitBox, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Text style={styles.heroProfitLabel}>Profit</Text>
              <Text style={styles.heroProfitVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {formatCurrency(profit, currency)}
              </Text>
            </View>
          </View>
          <View style={styles.barsArea}>
            {monthBars.map((h, i) => (
              <View
                key={i}
                style={[styles.monthBar, {
                  height: Math.max(Math.round((h / 100) * 52), 3),
                  backgroundColor: i === monthBars.length - 1
                    ? 'rgba(255,255,255,0.95)'
                    : `rgba(255,255,255,${0.12 + (h / 100) * 0.25})`,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }]}
              />
            ))}
          </View>
        </View>

        {/* KPI 2×2 */}
        <View style={styles.kpiGrid}>
          {kpiItems.map(({ label, val, color, bg, icon }) => (
            <View key={label} style={[styles.kpiCard, { backgroundColor: bg, width: CARD_W }]}>
              <Text style={styles.kpiIcon}>{icon}</Text>
              <Text style={[styles.kpiVal, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {val}
              </Text>
              <Text style={[styles.kpiLabel, { color }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>BREAKDOWN</Text>

        {/* Tabs */}
        <View style={[styles.tabsCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={[styles.tabsBar, { borderBottomColor: T.line }]}>
            {['Products', 'Payment', 'Category'].map((t, i) => {
              const active = tab === i;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, active && [styles.tabBtnActive, { borderBottomColor: T.blue }]]}
                  onPress={() => setTab(i as Tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, { color: active ? T.blue : T.t2, fontWeight: active ? '700' : '500' }]} numberOfLines={1}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Products tab */}
          {tab === 0 && (
            <View>
              {topProducts.length === 0 ? (
                <Text style={[styles.noData, { color: T.t3 }]}>No sales yet for this period</Text>
              ) : (
                topProducts.map((p, i) => {
                  const barW = Math.max(10, 100 - i * 17);
                  return (
                    <View key={i} style={[styles.topRow, { borderBottomColor: T.line }]}>
                      <View style={[styles.rankBadge, { backgroundColor: i === 0 ? T.blue : T.blueL }]}>
                        <Text style={[styles.rankText, { color: i === 0 ? '#fff' : T.blue }]}>#{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.topName, { color: T.t1 }]} numberOfLines={1}>{p.product_name}</Text>
                        <View style={[styles.barTrack, { backgroundColor: T.line }]}>
                          <View style={[styles.barFill, { width: `${barW}%` as any, backgroundColor: i === 0 ? T.blue : T.blueL }]} />
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <Text style={[styles.topRevenue, { color: T.t1 }]}>{formatCurrency(p.total_profit, currency)}</Text>
                        <Text style={[styles.topQty, { color: T.t2 }]}>{p.total_qty} sold</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Payment tab */}
          {tab === 1 && (
            <View style={styles.tabPad}>
              {paymentData.length === 0 ? (
                <Text style={[styles.noData, { color: T.t3 }]}>No transactions yet</Text>
              ) : (
                paymentBreakdown.map(({ label, pct, amount, color, bg }) => (
                  <View key={label} style={[styles.methodCard, { backgroundColor: bg }]}>
                    <View style={styles.methodRow}>
                      <Text style={[styles.methodLabel, { color }]}>{label}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.methodPct, { color }]}>{pct}%</Text>
                        <Text style={[styles.methodAmt, { color }]}>{formatCurrency(amount, currency)}</Text>
                      </View>
                    </View>
                    <View style={[styles.payBarTrack, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                      <View style={[styles.payBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Category tab */}
          {tab === 2 && (
            <View style={styles.tabPad}>
              {catBreakdown.length === 0 ? (
                <Text style={[styles.noData, { color: T.t3 }]}>No sales yet</Text>
              ) : (
                catBreakdown.map(({ label, pct, amount, color }) => (
                  <View key={label} style={{ marginBottom: 14 }}>
                    <View style={styles.methodRow}>
                      <View style={styles.catDotRow}>
                        <View style={[styles.catDot, { backgroundColor: color }]} />
                        <Text style={[styles.methodLabel, { color: T.t1 }]} numberOfLines={1}>{label}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.methodPct, { color }]}>{pct}%</Text>
                        <Text style={[styles.methodAmt, { color: T.t2 }]}>{formatCurrency(amount, currency)}</Text>
                      </View>
                    </View>
                    <View style={[styles.payBarTrack, { backgroundColor: T.line, marginTop: 6 }]}>
                      <View style={[styles.payBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Peak Hours */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>PEAK HOURS</Text>
        <View style={[styles.peakCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.peakBars}>
            {peakBarsNorm.map((h, i) => (
              <View key={i} style={styles.peakBarWrap}>
                <View style={[styles.peakBar, {
                  height: Math.max(Math.round((h / 100) * 72), 4),
                  backgroundColor: i === peakMaxIdx ? T.blue : T.blueL,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                }]} />
                <Text style={[styles.peakLabel, { color: T.t3 }]}>{i % 3 === 0 ? PEAK_HOUR_LABELS[i] : ''}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.insightRow, { backgroundColor: T.blueL }]}>
            <Text style={[styles.insightText, { color: T.blue }]}>
              {peakMaxIdx >= 0 && peakHoursData.length > 0
                ? `📈  Busiest hour: ${PEAK_HOUR_LABELS[peakMaxIdx]}`
                : '📈  No peak hour data yet — make some sales!'}
            </Text>
          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  monthBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  monthBadgeText: { fontSize: 13, fontWeight: '600' },

  content: { paddingBottom: 40 },

  rangeTrack: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  rangePill: { flex: 1, paddingVertical: 7, borderRadius: 10, alignItems: 'center' },
  rangeText: { fontSize: 13 },

  heroCard: {
    marginHorizontal: 16, marginBottom: 14,
    borderRadius: 22, padding: 18, overflow: 'hidden',
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  heroLeft: { flex: 1, minWidth: 0 },
  heroEyebrow: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 4, letterSpacing: 0.5 },
  heroRevenue: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroProfitBox: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-end', flexShrink: 0 },
  heroProfitLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 2 },
  heroProfitVal: { fontSize: 16, fontWeight: '700', color: '#fff' },
  barsArea: { flexDirection: 'row', alignItems: 'flex-end', height: 52, gap: 3 },
  monthBar: { flex: 1 },

  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, marginBottom: 14,
  },
  kpiCard: {
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14,
  },
  kpiIcon: { fontSize: 20, marginBottom: 8 },
  kpiVal: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  kpiLabel: { fontSize: 11, fontWeight: '600', marginTop: 3, opacity: 0.75 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    paddingHorizontal: 16, marginBottom: 8,
  },

  tabsCard: {
    marginHorizontal: 16, marginBottom: 14,
    borderRadius: 18, borderWidth: 1, overflow: 'hidden',
  },
  tabsBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: {},
  tabText: { fontSize: 13 },

  noData: { fontSize: 14, textAlign: 'center', padding: 28 },

  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1,
  },
  rankBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 11, fontWeight: '800' },
  topName: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  topRevenue: { fontSize: 13, fontWeight: '700' },
  topQty: { fontSize: 11, marginTop: 2 },
  barTrack: { height: 5, borderRadius: 3 },
  barFill: { height: '100%', borderRadius: 3 },

  tabPad: { padding: 14, gap: 10 },

  methodCard: { borderRadius: 12, padding: 12, marginBottom: 10 },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  methodLabel: { fontSize: 14, fontWeight: '700' },
  methodPct: { fontSize: 16, fontWeight: '800' },
  methodAmt: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  payBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  payBarFill: { height: '100%', borderRadius: 3 },
  catDotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },

  peakCard: {
    marginHorizontal: 16,
    borderRadius: 18, borderWidth: 1, padding: 16,
  },
  peakBars: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 3, marginBottom: 8 },
  peakBarWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  peakBar: { width: '100%' },
  peakLabel: { fontSize: 8, marginTop: 4 },
  insightRow: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 4 },
  insightText: { fontSize: 12, fontWeight: '600' },
});
