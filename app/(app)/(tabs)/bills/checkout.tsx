import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Modal, Pressable,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import {
  ChevronLeft, Trash2, Plus, Minus, Search, ScanLine,
  Tag, User, Printer, Share2, Download, CheckCircle, X, Package,
} from 'lucide-react-native';
import { useAppStore } from '../../../../src/stores/appStore';
import { useCartStore } from '../../../../src/stores/cartStore';
import { useWidgetStore } from '../../../../src/stores/widgetStore';
import { getProducts, createBill } from '../../../../src/db/queries';
import { LT, DT, type Theme } from '../../../../src/theme/design';
import { formatCurrency } from '../../../../src/utils/calc';
import type { Product, Bill, CartItem } from '../../../../src/types';

// ─── Payment methods ──────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { key: 'cash',  label: 'Cash',  emoji: '💵' },
  { key: 'card',  label: 'Card',  emoji: '💳' },
  { key: 'other', label: 'Other', emoji: '⚡' },
];

// ─── Receipt HTML generator ───────────────────────────────────────────────────

function buildReceiptHtml(params: {
  storeName: string;
  billNum: string;
  date: string;
  time: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  currency: string;
}) {
  const { storeName, billNum, date, time, items, subtotal, discount, tax, total, paymentMethod, currency } = params;

  const dash58 = '- '.repeat(29);
  const eq58   = '='.repeat(48);

  const itemRows = items.map((item, i) => {
    const lineTotal = (item.unit_price * item.quantity).toFixed(2);
    const name = item.product.name.length > 28
      ? item.product.name.slice(0, 26) + '..'
      : item.product.name;
    return `
      <div class="item-name">${i + 1}. ${name}</div>
      <div class="item-detail">
        <span>${item.quantity} x ${item.unit_price.toFixed(2)}</span>
        <span class="item-total">${lineTotal}</span>
      </div>
      ${item.product.sku ? `<div class="item-sku">   SKU: ${item.product.sku}</div>` : ''}
    `;
  }).join('<div class="item-sep"></div>');

  const pmLabel = paymentMethod === 'cash' ? 'CASH / نقد'
    : paymentMethod === 'card' ? 'CARD / کارڈ'
    : 'OTHER / دیگر';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Receipt ${billNum}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: 13px;
    color: #000;
    background: #fff;
    max-width: 300px;
    margin: 0 auto;
    padding: 8px 0 24px;
    line-height: 1.5;
  }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: 700; }
  .small  { font-size: 10px; }
  .gray   { color: #555; }

  /* ── Header ── */
  .store-name {
    font-size: 22px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 6px 0 2px;
  }
  .store-type {
    font-size: 10px;
    text-align: center;
    letter-spacing: 1px;
    color: #444;
    margin-bottom: 4px;
  }
  .dashed { color: #aaa; text-align: center; font-size: 12px; overflow: hidden; }
  .solid  { border-top: 2px solid #000; margin: 3px 0; }
  .thick  { border-top: 3px double #000; margin: 4px 0; }

  /* ── Meta ── */
  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    padding: 1px 0;
  }
  .bill-no {
    font-size: 13px;
    font-weight: 700;
    text-align: center;
    padding: 3px 0;
    letter-spacing: 1px;
  }

  /* ── Items ── */
  .section-header {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 3px 0;
  }
  .item-header {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #ccc;
    padding: 2px 0;
    margin-bottom: 3px;
  }
  .item-name { font-size: 12px; font-weight: 700; padding-top: 3px; }
  .item-detail {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding-left: 12px;
    color: #333;
  }
  .item-total { font-weight: 700; }
  .item-sku { font-size: 9px; color: #888; padding-left: 12px; }
  .item-sep { height: 3px; }

  /* ── Totals ── */
  .totals { padding: 4px 0; }
  .total-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 1px 0;
  }
  .total-row.discount { color: #c00; }
  .grand-row {
    display: flex;
    justify-content: space-between;
    font-size: 15px;
    font-weight: 700;
    padding: 4px 0 2px;
    letter-spacing: 0.5px;
  }

  /* ── Payment ── */
  .payment-box {
    text-align: center;
    font-size: 12px;
    font-weight: 700;
    padding: 4px;
    border: 1px solid #000;
    margin: 4px 0;
    letter-spacing: 1px;
  }

  /* ── Footer ── */
  .footer { text-align: center; padding: 4px 0 0; }
  .thanks-en { font-size: 13px; font-weight: 700; }
  .thanks-ur { font-size: 14px; margin: 2px 0; }
  .powered   { font-size: 9px; color: #888; margin-top: 4px; }
</style>
</head>
<body>

  <div class="store-name">${storeName}</div>
  <div class="store-type">STORE RECEIPT</div>
  <div class="dashed">--------------------------------</div>

  <div class="bill-no">BILL ${billNum}</div>

  <div class="meta-row">
    <span>Date: ${date}</span>
    <span>Time: ${time}</span>
  </div>
  <div class="meta-row">
    <span>Currency: ${currency}</span>
    <span>Items: ${items.length}</span>
  </div>

  <div class="dashed">--------------------------------</div>

  <div class="item-header">
    <span>DESCRIPTION</span>
    <span>AMOUNT</span>
  </div>

  ${itemRows}

  <div class="dashed">--------------------------------</div>

  <div class="totals">
    <div class="total-row">
      <span>Sub Total:</span>
      <span>${subtotal.toFixed(2)}</span>
    </div>
    ${discount > 0 ? `<div class="total-row discount">
      <span>Discount (-):</span>
      <span>${discount.toFixed(2)}</span>
    </div>` : ''}
    ${tax > 0 ? `<div class="total-row">
      <span>Tax (+):</span>
      <span>${tax.toFixed(2)}</span>
    </div>` : ''}
  </div>

  <div class="thick"></div>
  <div class="grand-row">
    <span>NET TOTAL:</span>
    <span>${currency} ${total.toFixed(2)}</span>
  </div>
  <div class="thick"></div>

  <div class="payment-box">PAID VIA: ${pmLabel}</div>

  <div class="dashed">--------------------------------</div>

  <div class="footer">
    <div class="thanks-en">*** THANK YOU ***</div>
    <div class="thanks-ur">آپ کا شکریہ</div>
    <div class="thanks-ur" style="font-size:11px;">براہ کرم یہ رسید سنبھال کر رکھیں</div>
    <div class="powered">Powered by StoreFlow POS</div>
  </div>

</body>
</html>`;
}

// ─── ProductSearchRow ─────────────────────────────────────────────────────────

function ProductSearchRow({ item, T, currency, onAdd }: {
  item: Product; T: Theme; currency: string; onAdd: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.searchRow, { borderBottomColor: T.line }]}
      onPress={onAdd}
      activeOpacity={0.7}
    >
      <View style={[styles.searchThumb, { backgroundColor: T.s2, borderColor: T.border }]}>
        {item.image
          ? <Image source={{ uri: item.image }} style={styles.searchThumbImg} resizeMode="cover" />
          : <Package size={18} color={T.t3} strokeWidth={1.5} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.searchName, { color: T.t1 }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.searchSku, { color: T.t2 }]}>{item.sku || '—'} · Stock: {item.quantity}</Text>
      </View>
      <Text style={[styles.searchPrice, { color: T.t1 }]}>{formatCurrency(item.selling_price, currency)}</Text>
      <View style={[styles.addRowBtn, { backgroundColor: T.blueL }]}>
        <Plus size={14} color={T.blue} strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Receipt Modal ────────────────────────────────────────────────────────────

function ReceiptModal({ visible, bill, items, storeName, currency, discount, T, onClose }: {
  visible: boolean;
  bill: Bill | null;
  items: CartItem[];
  storeName: string;
  currency: string;
  discount: number;
  T: Theme;
  onClose: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<'print' | 'share' | 'download' | null>(null);
  const receiptRef = useRef<View>(null);

  if (!bill) return null;

  const now = new Date(bill.created_at);
  const dateStr = now.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
  const billNum = `#${String(bill.bill_number).padStart(4, '0')}`;

  const html = buildReceiptHtml({
    storeName, billNum, date: dateStr, time: timeStr,
    items, subtotal: bill.subtotal, discount: bill.discount,
    tax: bill.tax, total: bill.total,
    paymentMethod: bill.payment_method, currency,
  });

  const capturePng = async (): Promise<string> => {
    const uri = await captureRef(receiptRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    return uri;
  };

  const handlePrint = async () => {
    setActionLoading('print');
    try {
      await Print.printAsync({ html });
    } catch { /* user cancelled */ }
    setActionLoading(null);
  };

  const handleShare = async () => {
    setActionLoading('share');
    try {
      const uri = await capturePng();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Receipt ${billNum}`,
          UTI: 'public.png',
        });
      } else {
        Alert.alert('Sharing not available', 'This device cannot share files.');
      }
    } catch { /* cancelled */ }
    setActionLoading(null);
  };

  const handleDownload = async () => {
    setActionLoading('download');
    try {
      const uri = await capturePng();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Save Receipt ${billNum}`,
        UTI: 'public.png',
      });
    } catch { /* cancelled */ }
    setActionLoading(null);
  };

  const payEmoji = bill.payment_method === 'cash' ? '💵' : bill.payment_method === 'card' ? '💳' : '⚡';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: T.surface }]} onPress={() => {}}>
          {/* Handle */}
          <View style={[styles.modalHandle, { backgroundColor: T.border }]} />

          {/* Success header */}
          <View style={styles.receiptHeader}>
            <View style={[styles.successCircle, { backgroundColor: T.greenL }]}>
              <CheckCircle size={32} color={T.green} strokeWidth={2} />
            </View>
            <Text style={[styles.successTitle, { color: T.t1 }]}>Sale Complete!</Text>
            <Text style={[styles.successSub, { color: T.t2 }]}>{billNum} · {dateStr} · {timeStr}</Text>
          </View>

          {/* Mini receipt preview */}
          <ScrollView
            style={[styles.receiptScroll, { backgroundColor: T.bg, borderColor: T.border }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Receipt store header */}
            <View style={[styles.receiptStoreHdr, { backgroundColor: '#1d4ed8' }]}>
              <Text style={styles.receiptStoreName}>{storeName}</Text>
              <Text style={styles.receiptStoreTag}>Official Receipt / ریسیپٹ</Text>
            </View>

            {/* Items */}
            <View style={styles.receiptBody} ref={receiptRef} collapsable={false}>
              {/* Column headers */}
              <View style={[styles.receiptColHdr, { backgroundColor: '#111' }]}>
                <Text style={[styles.rchItem, { color: '#fff' }]}>ITEM / آئٹم</Text>
                <Text style={[styles.rchQty, { color: '#fff' }]}>QTY</Text>
                <Text style={[styles.rchRate, { color: '#fff' }]}>RATE</Text>
                <Text style={[styles.rchAmt, { color: '#fff' }]}>{currency}</Text>
              </View>

              {items.map((item, i) => (
                <View
                  key={item.product.id}
                  style={[
                    styles.receiptItem,
                    { borderBottomColor: T.line },
                    i === items.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.rchItemLeft}>
                    <Text style={[styles.rchSr, { color: T.t3 }]}>{i + 1}.</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rchName, { color: T.t1 }]} numberOfLines={2}>{item.product.name}</Text>
                      {item.product.sku ? (
                        <Text style={[styles.rchSkuText, { color: T.t3 }]}>SKU: {item.product.sku}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={[styles.rchQtyVal, { color: T.t2 }]}>{item.quantity}</Text>
                  <Text style={[styles.rchRateVal, { color: T.t2 }]}>{item.unit_price.toFixed(0)}</Text>
                  <Text style={[styles.rchAmtVal, { color: T.t1 }]}>
                    {(item.unit_price * item.quantity).toFixed(0)}
                  </Text>
                </View>
              ))}

              {/* Totals */}
              <View style={[styles.receiptTotals, { borderTopColor: T.border }]}>
                <TotalRow label="Sub Total / جمع" value={formatCurrency(bill.subtotal, currency)} T={T} />
                {bill.discount > 0 && (
                  <TotalRow label="Discount / رعایت" value={`- ${formatCurrency(bill.discount, currency)}`} T={T} valueColor={T.red} />
                )}
                {bill.tax > 0 && (
                  <TotalRow label="Tax / ٹیکس" value={formatCurrency(bill.tax, currency)} T={T} />
                )}
                <View style={[styles.grandRow, { borderTopColor: T.border }]}>
                  <Text style={[styles.grandLabel, { color: T.t1 }]}>TOTAL / کل رقم</Text>
                  <Text style={[styles.grandVal, { color: '#1d4ed8' }]}>{formatCurrency(bill.total, currency)}</Text>
                </View>
              </View>

              {/* Payment method */}
              <View style={[styles.payMethodRow, { backgroundColor: T.bg, borderTopColor: T.border }]}>
                <Text style={[styles.payMethodLabel, { color: T.t2 }]}>Payment / ادائیگی</Text>
                <View style={[styles.payMethodBadge, { backgroundColor: T.greenL }]}>
                  <Text style={{ fontSize: 13 }}>{payEmoji}</Text>
                  <Text style={[styles.payMethodText, { color: T.green }]}>
                    {bill.payment_method.charAt(0).toUpperCase() + bill.payment_method.slice(1)}
                  </Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.receiptFooter}>
                <Text style={[styles.footerThanks, { color: T.t1 }]}>Thank You for Your Purchase!</Text>
                <Text style={[styles.footerUrdu, { color: '#1d4ed8' }]}>آپ کا شکریہ</Text>
                <Text style={[styles.footerTagline, { color: T.t3 }]}>
                  Powered by StoreFlow · Keep this receipt for your records
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <ActionBtn
              icon={Printer}
              label="Print"
              color="#1d4ed8"
              bg={T.blueL}
              loading={actionLoading === 'print'}
              onPress={handlePrint}
            />
            <ActionBtn
              icon={Share2}
              label="Share"
              color={T.green}
              bg={T.greenL}
              loading={actionLoading === 'share'}
              onPress={handleShare}
            />
            <ActionBtn
              icon={Download}
              label="Download"
              color={T.amber}
              bg={T.amberL}
              loading={actionLoading === 'download'}
              onPress={handleDownload}
            />
          </View>

          {/* New Sale / Done */}
          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={[styles.newSaleBtn, { borderColor: T.border, backgroundColor: T.bg }]}
              onPress={() => { onClose(); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.newSaleTxt, { color: T.t1 }]}>New Sale</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: '#1d4ed8' }]}
              onPress={() => { onClose(); router.back(); }}
              activeOpacity={0.85}
            >
              <Text style={styles.doneTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TotalRow({ label, value, T, valueColor }: {
  label: string; value: string; T: Theme; valueColor?: string;
}) {
  return (
    <View style={styles.totalRowWrap}>
      <Text style={[styles.totalRowLabel, { color: T.t2 }]}>{label}</Text>
      <Text style={[styles.totalRowVal, { color: valueColor ?? T.t1 }]}>{value}</Text>
    </View>
  );
}

function ActionBtn({ icon: Icon, label, color, bg, loading, onPress }: {
  icon: any; label: string; color: string; bg: string;
  loading: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: bg }]} onPress={onPress} disabled={loading} activeOpacity={0.8}>
      {loading
        ? <ActivityIndicator size="small" color={color} />
        : <Icon size={20} color={color} strokeWidth={2} />}
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Checkout Screen ──────────────────────────────────────────────────────────

export default function CheckoutScreen() {
  const { activeStore } = useAppStore();
  const isDark = useWidgetStore((s) => s.isDark);
  const T = isDark ? DT : LT;
  const storeId = activeStore?.id ?? '';
  const currency = activeStore?.currency ?? 'PKR';
  const storeName = activeStore?.name ?? 'StoreFlow';
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const {
    items, addItem, removeItem, updateQty,
    discount, setDiscount, total, subtotal,
    clearCart,
  } = useCartStore();

  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [completedBill, setCompletedBill] = useState<Bill | null>(null);
  const [billItems, setBillItems] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['products', storeId, search],
    queryFn: () => getProducts(storeId, search || undefined),
    enabled: !!storeId && showSearch,
  });

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Add at least one product to complete the sale.');
      return;
    }
    setLoading(true);
    try {
      const savedItems = [...items];
      const savedDiscount = discount;
      const bill = await createBill(storeId, items, discount, 0, paymentMethod);
      queryClient.invalidateQueries({ queryKey: ['bills', storeId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', storeId] });
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
      queryClient.invalidateQueries({ queryKey: ['analytics-stats', storeId] });
      queryClient.invalidateQueries({ queryKey: ['sales-7day', storeId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-sales', storeId] });
      setBillItems(savedItems);
      setBillDiscount(savedDiscount);
      setCompletedBill(bill);
      clearCart();
      setShowReceipt(true);
    } catch {
      Alert.alert('Error', 'Could not complete the sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const billNum = 'New Bill';

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {/* ─── Top Bar ─── */}
      <View style={[styles.topBar, { backgroundColor: T.surface, borderBottomColor: T.line, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={T.blue} strokeWidth={2} />
          <Text style={[styles.backText, { color: T.blue }]}>Back</Text>
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={[styles.topTitle, { color: T.t1 }]}>New Sale</Text>
          <View style={[styles.billPill, { backgroundColor: T.blueL }]}>
            <Text style={[styles.billNumText, { color: T.blue }]}>{billNum}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => { clearCart(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Trash2 size={20} color={T.red} strokeWidth={1.75} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* ─── Add product bar ─── */}
        <TouchableOpacity
          style={[styles.addBar, { backgroundColor: T.bg, borderColor: T.blue }]}
          onPress={() => setShowSearch(!showSearch)}
          activeOpacity={0.85}
        >
          <Plus size={18} color={T.blue} strokeWidth={2.5} />
          <Text style={[styles.addBarText, { color: T.t2 }]}>
            {showSearch ? 'Close search' : 'Search and add product...'}
          </Text>
          <ScanLine size={18} color={T.t2} strokeWidth={1.75} />
        </TouchableOpacity>

        {/* ─── Product search panel ─── */}
        {showSearch && (
          <View style={{ backgroundColor: T.surface }}>
            <View style={[styles.searchBarInner, { borderColor: T.border }]}>
              <Search size={14} color={T.t3} strokeWidth={1.75} />
              <TextInput
                style={[styles.searchInput, { color: T.t1 }]}
                placeholder="Search products..."
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
            </View>
            {products.slice(0, 8).map((p) => (
              <ProductSearchRow
                key={p.id}
                item={p}
                T={T}
                currency={currency}
                onAdd={() => { addItem(p); setShowSearch(false); setSearch(''); }}
              />
            ))}
            {search.length > 0 && products.length === 0 && (
              <Text style={[styles.noResults, { color: T.t3 }]}>No products found for "{search}"</Text>
            )}
          </View>
        )}

        {/* ─── Cart items ─── */}
        {items.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>🛒</Text>
            <Text style={[styles.emptyText, { color: T.t2 }]}>Cart is empty</Text>
            <Text style={[styles.emptySub, { color: T.t3 }]}>Search above to add products</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: T.surface, marginTop: 1 }}>
            {/* Column header */}
            <View style={[styles.cartHeader, { backgroundColor: T.s2, borderBottomColor: T.border }]}>
              <Text style={[styles.cartHdrItem, { color: T.t3 }]}>ITEM</Text>
              <Text style={[styles.cartHdrQty, { color: T.t3 }]}>QTY</Text>
              <Text style={[styles.cartHdrTotal, { color: T.t3 }]}>AMOUNT</Text>
            </View>
            {items.map((item) => (
              <View key={item.product.id} style={[styles.cartRow, { borderBottomColor: T.line }]}>
                <View style={[styles.cartThumb, { backgroundColor: T.s2, borderColor: T.border }]}>
                  {item.product.image
                    ? <Image source={{ uri: item.product.image }} style={styles.cartThumbImg} resizeMode="cover" />
                    : <Package size={16} color={T.t3} strokeWidth={1.5} />}
                </View>
                <View style={styles.cartLeft}>
                  <Text style={[styles.cartName, { color: T.t1 }]} numberOfLines={1}>{item.product.name}</Text>
                  <Text style={[styles.cartUnit, { color: T.t3 }]}>
                    {formatCurrency(item.unit_price, currency)} each
                  </Text>
                </View>
                <View style={[styles.qtyStepper, { borderColor: T.border }]}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, { borderRightColor: T.border }]}
                    onPress={() => updateQty(item.product.id, item.quantity - 1)}
                  >
                    <Minus size={13} color={T.t1} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={[styles.qtyVal, { color: T.t1 }]}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={[styles.qtyBtn, { borderLeftColor: T.border }]}
                    onPress={() => updateQty(item.product.id, item.quantity + 1)}
                  >
                    <Plus size={13} color={T.t1} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
                <View style={styles.cartRight}>
                  <Text style={[styles.cartLineTotal, { color: T.t1 }]}>
                    {formatCurrency(item.unit_price * item.quantity, currency)}
                  </Text>
                  <TouchableOpacity onPress={() => removeItem(item.product.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <X size={14} color={T.t3} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ─── Discount ─── */}
        <View style={[styles.infoSection, { backgroundColor: T.surface, marginTop: 8 }]}>
          <View style={[styles.infoRow, { borderBottomColor: T.line }]}>
            <Tag size={15} color={T.t2} strokeWidth={1.75} />
            <Text style={[styles.infoLabel, { color: T.t1 }]}>Discount</Text>
            <TextInput
              style={[styles.discountInput, { color: T.blue, borderColor: T.border }]}
              value={discount > 0 ? String(discount) : ''}
              onChangeText={(v) => setDiscount(parseFloat(v) || 0)}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={T.t3}
            />
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <User size={15} color={T.t2} strokeWidth={1.75} />
            <Text style={[styles.infoLabel, { color: T.t2 }]}>No customer selected</Text>
            <Text style={[styles.infoAction, { color: T.blue }]}>+ Add</Text>
          </View>
        </View>

        {/* ─── Order Summary ─── */}
        <View style={[styles.summaryCard, { backgroundColor: T.surface, marginTop: 8 }]}>
          <View style={[styles.summaryRow, { borderBottomColor: T.line }]}>
            <Text style={[styles.summaryLabel, { color: T.t2 }]}>Sub Total</Text>
            <Text style={[styles.summaryVal, { color: T.t1 }]}>{formatCurrency(subtotal(), currency)}</Text>
          </View>
          {discount > 0 && (
            <View style={[styles.summaryRow, { borderBottomColor: T.line }]}>
              <Text style={[styles.summaryLabel, { color: T.t2 }]}>Discount</Text>
              <Text style={[styles.summaryVal, { color: T.red }]}>- {formatCurrency(discount, currency)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, { borderBottomColor: T.border }]}>
            <Text style={[styles.summaryLabel, { color: T.t2 }]}>Tax</Text>
            <Text style={[styles.summaryVal, { color: T.t1 }]}>{formatCurrency(0, currency)}</Text>
          </View>
          <View style={[styles.summaryTotal, { borderTopColor: T.border }]}>
            <Text style={[styles.totalLabel, { color: T.t1 }]}>Total</Text>
            <Text style={[styles.totalVal, { color: '#1d4ed8' }]}>{formatCurrency(total(), currency)}</Text>
          </View>
        </View>

        {/* ─── Payment Methods ─── */}
        <View style={[styles.paySection, { backgroundColor: T.surface, marginTop: 8 }]}>
          <Text style={[styles.paySectionLabel, { color: T.t3 }]}>PAYMENT METHOD</Text>
          <View style={styles.payRow}>
            {PAYMENT_METHODS.map(({ key, label, emoji }) => {
              const active = paymentMethod === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.payChip, {
                    backgroundColor: active ? '#EFF6FF' : T.s2,
                    borderColor: active ? '#1d4ed8' : T.border,
                    borderWidth: active ? 1.5 : 1,
                  }]}
                  onPress={() => setPaymentMethod(key)}
                >
                  <Text style={{ fontSize: 16 }}>{emoji}</Text>
                  <Text style={[styles.payChipText, {
                    color: active ? '#1d4ed8' : T.t2,
                    fontWeight: active ? '700' : '500',
                  }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Complete Sale CTA ─── */}
        <TouchableOpacity
          style={[styles.ctaBtn, loading && { opacity: 0.7 }]}
          onPress={handleCheckout}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>
                Complete Sale · {formatCurrency(total(), currency)}
              </Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Receipt Modal ─── */}
      <ReceiptModal
        visible={showReceipt}
        bill={completedBill}
        items={billItems}
        storeName={storeName}
        currency={currency}
        discount={billDiscount}
        T={T}
        onClose={() => setShowReceipt(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, gap: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 56 },
  backText: { fontSize: 14, fontWeight: '500' },
  topCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { fontSize: 17, fontWeight: '700' },
  billPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  billNumText: { fontSize: 10, fontWeight: '600' },

  addBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 14, borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  addBarText: { flex: 1, fontSize: 14 },

  searchBarInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginBottom: 4, marginTop: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  noResults: { textAlign: 'center', paddingVertical: 14, fontSize: 13 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchThumb: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  searchThumbImg: { width: 40, height: 40 },
  searchName: { fontSize: 14, fontWeight: '600' },
  searchSku: { fontSize: 11, marginTop: 2 },
  searchPrice: { fontSize: 13, fontWeight: '700' },
  addRowBtn: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  emptyCart: { alignItems: 'center', paddingVertical: 56 },
  emptyText: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySub: { fontSize: 13 },

  cartHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7, borderBottomWidth: 1,
  },
  cartHdrItem: { flex: 1, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  cartHdrQty: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginRight: 30 },
  cartHdrTotal: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', minWidth: 70, textAlign: 'right' },

  cartRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
  },
  cartThumb: {
    width: 38, height: 38, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  cartThumbImg: { width: 38, height: 38 },
  cartLeft: { flex: 1, minWidth: 0 },
  cartName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  cartUnit: { fontSize: 11 },
  cartRight: { alignItems: 'flex-end', gap: 4, minWidth: 70 },
  cartLineTotal: { fontSize: 13, fontWeight: '700' },

  qtyStepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 8, overflow: 'hidden',
  },
  qtyBtn: {
    width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
    borderRightWidth: 0, borderLeftWidth: 0,
  },
  qtyVal: { fontSize: 13, fontWeight: '700', minWidth: 28, textAlign: 'center' },

  infoSection: {},
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  infoLabel: { flex: 1, fontSize: 14 },
  infoAction: { fontSize: 13, fontWeight: '600' },
  discountInput: {
    fontSize: 14, fontWeight: '600', textAlign: 'right',
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    minWidth: 90,
  },

  summaryCard: { paddingHorizontal: 16, paddingVertical: 4 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1,
  },
  summaryLabel: { fontSize: 14 },
  summaryVal: { fontSize: 14, fontWeight: '500' },
  summaryTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderTopWidth: 1,
  },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalVal: { fontSize: 24, fontWeight: '800' },

  paySection: { padding: 14 },
  paySectionLabel: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.7, marginBottom: 10,
  },
  payRow: { flexDirection: 'row', gap: 8 },
  payChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 10,
  },
  payChipText: { fontSize: 13 },

  ctaBtn: {
    margin: 14, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', backgroundColor: '#1d4ed8',
    shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },

  receiptHeader: { alignItems: 'center', marginBottom: 14 },
  successCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  successTitle: { fontSize: 20, fontWeight: '800' },
  successSub: { fontSize: 12, marginTop: 4 },

  receiptScroll: {
    maxHeight: 320, borderRadius: 12, borderWidth: 1, marginBottom: 14,
  },
  receiptStoreHdr: {
    paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center',
  },
  receiptStoreName: {
    fontSize: 17, fontWeight: '900', color: '#fff',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  receiptStoreTag: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  receiptBody: { padding: 0 },
  receiptColHdr: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  rchItem: { flex: 1, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  rchQty: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, width: 30, textAlign: 'right' },
  rchRate: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, width: 46, textAlign: 'right' },
  rchAmt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, width: 52, textAlign: 'right' },

  receiptItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1,
  },
  rchItemLeft: { flex: 1, flexDirection: 'row', gap: 4 },
  rchSr: { fontSize: 10, width: 14, marginTop: 1 },
  rchName: { fontSize: 11, fontWeight: '600' },
  rchSkuText: { fontSize: 9, marginTop: 1 },
  rchQtyVal: { fontSize: 12, width: 30, textAlign: 'right' },
  rchRateVal: { fontSize: 12, width: 46, textAlign: 'right' },
  rchAmtVal: { fontSize: 12, fontWeight: '700', width: 52, textAlign: 'right' },

  receiptTotals: { borderTopWidth: 1, paddingHorizontal: 10, paddingTop: 6 },
  totalRowWrap: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalRowLabel: { fontSize: 11 },
  totalRowVal: { fontSize: 11, fontWeight: '600' },
  grandRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1.5, paddingTop: 6, paddingBottom: 6, marginTop: 4,
  },
  grandLabel: { fontSize: 13, fontWeight: '900' },
  grandVal: { fontSize: 16, fontWeight: '900' },

  payMethodRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1,
  },
  payMethodLabel: { fontSize: 11 },
  payMethodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  payMethodText: { fontSize: 11, fontWeight: '700' },

  receiptFooter: {
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  footerThanks: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  footerUrdu: { fontSize: 14, marginBottom: 5 },
  footerTagline: { fontSize: 9, textAlign: 'center' },

  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  actionBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 14, gap: 5,
  },
  actionLabel: { fontSize: 11, fontWeight: '700' },

  bottomRow: { flexDirection: 'row', gap: 10 },
  newSaleBtn: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    paddingVertical: 13, alignItems: 'center',
  },
  newSaleTxt: { fontSize: 14, fontWeight: '600' },
  doneBtn: {
    flex: 2, borderRadius: 14,
    paddingVertical: 13, alignItems: 'center',
  },
  doneTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
