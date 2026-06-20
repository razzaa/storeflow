import React, { useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { ChevronLeft, Printer, Share2, Download } from 'lucide-react-native';
import { useAppStore } from '../../../../src/stores/appStore';
import { useWidgetStore } from '../../../../src/stores/widgetStore';
import { getBill, getBillItems } from '../../../../src/db/queries';
import { LT, DT } from '../../../../src/theme/design';
import { BillItem } from '../../../../src/types';

function buildDetailReceiptHtml(params: {
  storeName: string;
  billNum: string;
  date: string;
  time: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  profit: number;
  paymentMethod: string;
  currency: string;
}) {
  const { storeName, billNum, date, time, items, subtotal, discount, tax, total, paymentMethod, currency } = params;

  const itemRows = items.map((item, i) => {
    const lineTotal = (item.price * item.quantity).toFixed(2);
    const name = item.product_name.length > 28
      ? item.product_name.slice(0, 26) + '..'
      : item.product_name;
    return `
      <div class="item-name">${i + 1}. ${name}</div>
      <div class="item-detail">
        <span>${item.quantity} x ${item.price.toFixed(2)}</span>
        <span class="item-total">${lineTotal}</span>
      </div>
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
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
    color: #000;
    background: #fff;
    max-width: 300px;
    margin: 0 auto;
    padding: 8px 0 24px;
    line-height: 1.5;
  }
  .center { text-align: center; }
  .bold   { font-weight: 700; }
  .store-name {
    font-size: 22px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 6px 0 2px;
  }
  .store-type { font-size: 10px; text-align: center; letter-spacing: 1px; color: #444; margin-bottom: 4px; }
  .dashed { color: #aaa; text-align: center; font-size: 12px; }
  .bill-no { font-size: 13px; font-weight: 700; text-align: center; padding: 3px 0; letter-spacing: 1px; }
  .meta-row { display: flex; justify-content: space-between; font-size: 11px; padding: 1px 0; }
  .item-header { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700;
    letter-spacing: 0.5px; border-bottom: 1px solid #ccc; padding: 2px 0; margin-bottom: 3px; }
  .item-name { font-size: 12px; font-weight: 700; padding-top: 3px; }
  .item-detail { display: flex; justify-content: space-between; font-size: 12px; padding-left: 12px; color: #333; }
  .item-total { font-weight: 700; }
  .item-sep { height: 3px; }
  .totals { padding: 4px 0; }
  .total-row { display: flex; justify-content: space-between; font-size: 12px; padding: 1px 0; }
  .total-row.discount { color: #c00; }
  .thick { border-top: 3px double #000; margin: 4px 0; }
  .grand-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; padding: 4px 0 2px; letter-spacing: 0.5px; }
  .payment-box { text-align: center; font-size: 12px; font-weight: 700; padding: 4px; border: 1px solid #000; margin: 4px 0; letter-spacing: 1px; }
  .footer { text-align: center; padding: 4px 0 0; }
  .thanks-en { font-size: 13px; font-weight: 700; }
  .thanks-ur { font-size: 14px; margin: 2px 0; }
  .powered { font-size: 9px; color: #888; margin-top: 4px; }
</style>
</head>
<body>
  <div class="store-name">${storeName}</div>
  <div class="store-type">STORE RECEIPT</div>
  <div class="dashed">--------------------------------</div>
  <div class="bill-no">BILL ${billNum}</div>
  <div class="meta-row"><span>Date: ${date}</span><span>Time: ${time}</span></div>
  <div class="meta-row"><span>Currency: ${currency}</span><span>Items: ${items.length}</span></div>
  <div class="dashed">--------------------------------</div>
  <div class="item-header"><span>DESCRIPTION</span><span>AMOUNT</span></div>
  ${itemRows}
  <div class="dashed">--------------------------------</div>
  <div class="totals">
    <div class="total-row"><span>Sub Total:</span><span>${subtotal.toFixed(2)}</span></div>
    ${discount > 0 ? `<div class="total-row discount"><span>Discount (-):</span><span>${discount.toFixed(2)}</span></div>` : ''}
    ${tax > 0 ? `<div class="total-row"><span>Tax (+):</span><span>${tax.toFixed(2)}</span></div>` : ''}
  </div>
  <div class="thick"></div>
  <div class="grand-row"><span>NET TOTAL:</span><span>${currency} ${total.toFixed(2)}</span></div>
  <div class="thick"></div>
  <div class="payment-box">PAID VIA: ${pmLabel}</div>
  <div class="dashed">--------------------------------</div>
  <div class="footer">
    <div class="thanks-en">*** THANK YOU ***</div>
    <div class="thanks-ur">آپ کا شکریہ</div>
    <div class="powered">Powered by StoreFlow POS</div>
  </div>
</body>
</html>`;
}

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeStore } = useAppStore();
  const isDark = useWidgetStore((s) => s.isDark);
  const T = isDark ? DT : LT;
  const insets = useSafeAreaInsets();
  const currency = activeStore?.currency ?? 'PKR';

  const { data: bill } = useQuery({
    queryKey: ['bill', id],
    queryFn: () => getBill(id),
    enabled: !!id,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['bill-items', id],
    queryFn: () => getBillItems(id),
    enabled: !!id,
  });

  const receiptRef = useRef<View>(null);

  const capturePng = async (): Promise<string> => captureRef(receiptRef, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
  });

  if (!bill) return null;

  const dateObj = new Date(bill.created_at);
  const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const billNum = `#${String(bill.bill_number || 0).padStart(4, '0')}`;
  const storeName = activeStore?.name ?? 'Store';

  const getHtml = () => buildDetailReceiptHtml({
    storeName,
    billNum,
    date: dateStr,
    time: timeStr,
    items,
    subtotal: bill.subtotal,
    discount: bill.discount,
    tax: bill.tax,
    total: bill.total,
    profit: bill.profit,
    paymentMethod: bill.payment_method,
    currency,
  });

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: getHtml() });
    } catch {
      Alert.alert('Print Error', 'Could not open print dialog.');
    }
  };

  const handleShare = async () => {
    try {
      const uri = await capturePng();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Receipt ${billNum}`,
        UTI: 'public.png',
      });
    } catch {
      Alert.alert('Share Error', 'Could not share receipt.');
    }
  };

  const handleDownload = async () => {
    try {
      const uri = await capturePng();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Save Receipt ${billNum}`,
        UTI: 'public.png',
      });
    } catch {
      Alert.alert('Download Error', 'Could not save receipt.');
    }
  };

  const pmLabel = bill.payment_method === 'cash' ? 'CASH / نقد'
    : bill.payment_method === 'card' ? 'CARD / کارڈ'
    : 'OTHER / دیگر';

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {/* TopBar */}
      <View style={[styles.topBar, { backgroundColor: T.surface, borderBottomColor: T.line, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={T.blue} />
          <Text style={[styles.backText, { color: T.blue }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: T.t1 }]}>Receipt {billNum}</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Thermal receipt card */}
        <View ref={receiptRef} collapsable={false} style={[styles.receipt, { backgroundColor: isDark ? '#1a1a1a' : '#fff', shadowColor: '#000' }]}>
          {/* Store name header */}
          <Text style={[styles.rStoreName, { color: T.t1 }]}>{storeName.toUpperCase()}</Text>
          <Text style={[styles.rStoreType, { color: T.t2 }]}>STORE RECEIPT</Text>
          <Text style={[styles.rDash, { color: T.t3 }]}>{'- '.repeat(18)}</Text>

          <Text style={[styles.rBillNo, { color: T.t1 }]}>BILL {billNum}</Text>

          <View style={styles.rMetaRow}>
            <Text style={[styles.rMeta, { color: T.t2 }]}>Date: {dateStr}</Text>
            <Text style={[styles.rMeta, { color: T.t2 }]}>Time: {timeStr}</Text>
          </View>
          <View style={styles.rMetaRow}>
            <Text style={[styles.rMeta, { color: T.t2 }]}>Currency: {currency}</Text>
            <Text style={[styles.rMeta, { color: T.t2 }]}>Items: {items.length}</Text>
          </View>

          <Text style={[styles.rDash, { color: T.t3 }]}>{'- '.repeat(18)}</Text>

          {/* Item header */}
          <View style={styles.rItemHeader}>
            <Text style={[styles.rItemHeaderText, { color: T.t2 }]}>DESCRIPTION</Text>
            <Text style={[styles.rItemHeaderText, { color: T.t2 }]}>AMOUNT</Text>
          </View>

          {/* Items */}
          {items.map((item, i) => (
            <View key={item.id} style={styles.rItemWrap}>
              <Text style={[styles.rItemName, { color: T.t1 }]} numberOfLines={2}>
                {i + 1}. {item.product_name}
              </Text>
              <View style={styles.rItemDetail}>
                <Text style={[styles.rItemQty, { color: T.t2 }]}>
                  {item.quantity} × {item.price.toFixed(2)}
                </Text>
                <Text style={[styles.rItemTotal, { color: T.t1 }]}>
                  {(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}

          <Text style={[styles.rDash, { color: T.t3 }]}>{'- '.repeat(18)}</Text>

          {/* Totals */}
          <View style={styles.rTotalRow}>
            <Text style={[styles.rTotalLabel, { color: T.t2 }]}>Sub Total:</Text>
            <Text style={[styles.rTotalVal, { color: T.t1 }]}>{bill.subtotal.toFixed(2)}</Text>
          </View>
          {bill.discount > 0 && (
            <View style={styles.rTotalRow}>
              <Text style={[styles.rTotalLabel, { color: T.red }]}>Discount (-):</Text>
              <Text style={[styles.rTotalVal, { color: T.red }]}>{bill.discount.toFixed(2)}</Text>
            </View>
          )}
          {bill.tax > 0 && (
            <View style={styles.rTotalRow}>
              <Text style={[styles.rTotalLabel, { color: T.t2 }]}>Tax (+):</Text>
              <Text style={[styles.rTotalVal, { color: T.t1 }]}>{bill.tax.toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.rDoubleLine, { borderTopColor: T.t1 }]} />
          <View style={styles.rGrandRow}>
            <Text style={[styles.rGrandLabel, { color: T.t1 }]}>NET TOTAL:</Text>
            <Text style={[styles.rGrandVal, { color: T.blue }]}>{currency} {bill.total.toFixed(2)}</Text>
          </View>
          <View style={[styles.rDoubleLine, { borderTopColor: T.t1 }]} />

          {/* Payment */}
          <View style={[styles.rPayBox, { borderColor: T.t1 }]}>
            <Text style={[styles.rPayText, { color: T.t1 }]}>PAID VIA: {pmLabel}</Text>
          </View>

          <Text style={[styles.rDash, { color: T.t3 }]}>{'- '.repeat(18)}</Text>

          {/* Footer */}
          <Text style={[styles.rThanksEn, { color: T.t1 }]}>*** THANK YOU ***</Text>
          <Text style={[styles.rThanksUr, { color: T.blue }]}>آپ کا شکریہ</Text>
          <Text style={[styles.rPowered, { color: T.t3 }]}>Powered by StoreFlow POS</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: T.blue }]} onPress={handlePrint}>
            <Printer size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Print</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: T.green }]} onPress={handleShare}>
            <Share2 size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: T.amber }]} onPress={handleDownload}>
            <Download size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Download</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const MONO: any = { fontFamily: 'Courier New' };

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 64 },
  backText: { fontSize: 15, fontWeight: '500' },
  topTitle: { fontSize: 16, fontWeight: '700' },

  scroll: { padding: 16, paddingBottom: 40 },

  receipt: {
    borderRadius: 4,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },

  rStoreName: { ...MONO, fontSize: 20, fontWeight: '700', textAlign: 'center', letterSpacing: 2 },
  rStoreType: { ...MONO, fontSize: 10, textAlign: 'center', letterSpacing: 1, marginBottom: 4 },
  rDash: { ...MONO, fontSize: 11, textAlign: 'center', marginVertical: 6, letterSpacing: 0 },
  rBillNo: { ...MONO, fontSize: 14, fontWeight: '700', textAlign: 'center', letterSpacing: 1, marginBottom: 4 },

  rMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  rMeta: { ...MONO, fontSize: 11 },

  rItemHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 4, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  rItemHeaderText: { ...MONO, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  rItemWrap: { marginBottom: 6 },
  rItemName: { ...MONO, fontSize: 12, fontWeight: '700' },
  rItemDetail: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 12 },
  rItemQty: { ...MONO, fontSize: 12 },
  rItemTotal: { ...MONO, fontSize: 12, fontWeight: '700' },

  rTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  rTotalLabel: { ...MONO, fontSize: 12 },
  rTotalVal: { ...MONO, fontSize: 12 },

  rDoubleLine: { borderTopWidth: 3, borderStyle: 'solid', marginVertical: 6 },

  rGrandRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rGrandLabel: { ...MONO, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  rGrandVal: { ...MONO, fontSize: 15, fontWeight: '700' },

  rPayBox: { borderWidth: 1, padding: 6, marginVertical: 6, alignItems: 'center' },
  rPayText: { ...MONO, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  rThanksEn: { ...MONO, fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  rThanksUr: { fontSize: 15, textAlign: 'center', marginVertical: 2 },
  rPowered: { ...MONO, fontSize: 9, textAlign: 'center', marginTop: 4 },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 12,
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
