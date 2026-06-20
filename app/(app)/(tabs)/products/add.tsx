import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Image, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera, ScanLine } from 'lucide-react-native';
import { useAppStore } from '../../../../src/stores/appStore';
import { useWidgetStore } from '../../../../src/stores/widgetStore';
import { useQuery } from '@tanstack/react-query';
import { getCategories, createProduct } from '../../../../src/db/queries';
import { BarcodeScanner } from '../../../../src/components/BarcodeScanner';
import { LT, DT } from '../../../../src/theme/design';
import { calcProfit, calcMargin, formatCurrency } from '../../../../src/utils/calc';

export default function AddProductScreen() {
  const { activeStore } = useAppStore();
  const isDark = useWidgetStore((s) => s.isDark);
  const T = isDark ? DT : LT;
  const insets = useSafeAreaInsets();
  const storeId = activeStore?.id ?? '';
  const currency = activeStore?.currency ?? 'PKR';
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [tax, setTax] = useState('0');
  const [image, setImage] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showScanner, setShowScanner] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => getCategories(storeId),
    enabled: !!storeId,
  });

  const cp = parseFloat(costPrice) || 0;
  const sp = parseFloat(sellingPrice) || 0;
  const profit = calcProfit(sp, cp);
  const margin = calcMargin(sp, cp);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Product name is required';
    if (!sellingPrice || sp <= 0) e.sellingPrice = 'Selling price must be > 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await createProduct({
        store_id: storeId,
        category_id: categoryId,
        name: name.trim(),
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        description: description.trim() || null,
        image,
        cost_price: cp,
        selling_price: sp,
        quantity: parseInt(quantity) || 0,
        tax: parseFloat(tax) || 0,
        discount: 0,
        is_archived: 0,
      });
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', storeId] });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.root, { backgroundColor: T.bg }]}
    >
      {/* ─── Top Bar ─── */}
      <View style={[styles.topBar, { backgroundColor: T.surface, borderBottomColor: T.line, paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={T.blue} strokeWidth={2} />
          <Text style={[styles.backText, { color: T.blue }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: T.t1 }]}>Add Product</Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: T.blue }, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Image picker ─── */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: T.s2, borderColor: T.border }]}>
              <Camera size={28} color={T.t3} strokeWidth={1.5} />
              <Text style={[styles.imagePlaceholderText, { color: T.t3 }]}>Add Photo</Text>
            </View>
          )}
          <View style={[styles.cameraOverlay, { backgroundColor: T.blue }]}>
            <Camera size={11} color="#fff" strokeWidth={2} />
          </View>
        </TouchableOpacity>

        {/* ─── Basic Info ─── */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>PRODUCT INFO</Text>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Field label="Name *" error={errors.name} T={T}>
            <TextInput
              style={[styles.input, { color: T.t1 }]}
              placeholder="e.g. Coca Cola 500ml"
              placeholderTextColor={T.t3}
              value={name}
              onChangeText={(v) => { setName(v); if (errors.name) setErrors((e) => ({ ...e, name: '' })); }}
            />
          </Field>
          <Field label="SKU" T={T}>
            <TextInput
              style={[styles.input, { color: T.t1 }]}
              placeholder="Optional stock keeping unit"
              placeholderTextColor={T.t3}
              value={sku}
              onChangeText={setSku}
            />
          </Field>
          <Field label="Barcode" T={T} last>
            <View style={styles.barcodeRow}>
              <TextInput
                style={[styles.input, { color: T.t1, flex: 1 }]}
                placeholder="Scan or type barcode"
                placeholderTextColor={T.t3}
                value={barcode}
                onChangeText={setBarcode}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={[styles.scanChip, { backgroundColor: T.blueL }]}
                onPress={() => setShowScanner(true)}
              >
                <ScanLine size={16} color={T.blue} strokeWidth={1.75} />
              </TouchableOpacity>
            </View>
          </Field>
        </View>

        {/* ─── Category ─── */}
        {categories.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: T.t3 }]}>CATEGORY</Text>
            <View style={styles.catRow}>
              {[{ id: null, name: 'None' }, ...categories].map((cat) => {
                const active = categoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id ?? 'none'}
                    style={[
                      styles.catChip,
                      active
                        ? { backgroundColor: T.blue }
                        : { backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
                    ]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <Text style={[styles.catChipText, { color: active ? '#fff' : T.t2 }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ─── Pricing ─── */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>PRICING</Text>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.twoCol}>
            <Field label={`Cost Price (${currency})`} T={T} half>
              <TextInput
                style={[styles.input, { color: T.t1 }]}
                placeholder="0"
                placeholderTextColor={T.t3}
                value={costPrice}
                onChangeText={setCostPrice}
                keyboardType="decimal-pad"
              />
            </Field>
            <View style={[styles.colDiv, { backgroundColor: T.line }]} />
            <Field label={`Selling Price (${currency}) *`} error={errors.sellingPrice} T={T} half last>
              <TextInput
                style={[styles.input, { color: T.t1 }]}
                placeholder="0"
                placeholderTextColor={T.t3}
                value={sellingPrice}
                onChangeText={(v) => { setSellingPrice(v); if (errors.sellingPrice) setErrors((e) => ({ ...e, sellingPrice: '' })); }}
                keyboardType="decimal-pad"
              />
            </Field>
          </View>
        </View>

        {/* Profit preview pill */}
        {sp > 0 && (
          <View style={[styles.profitPreview, { backgroundColor: profit >= 0 ? T.greenL : T.redL, borderColor: profit >= 0 ? T.green : T.red }]}>
            <View style={styles.profitItem}>
              <Text style={[styles.profitLabel, { color: T.t2 }]}>Profit</Text>
              <Text style={[styles.profitValue, { color: profit >= 0 ? T.green : T.red }]}>
                {currency} {profit.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.profitDiv, { backgroundColor: profit >= 0 ? T.green : T.red, opacity: 0.25 }]} />
            <View style={styles.profitItem}>
              <Text style={[styles.profitLabel, { color: T.t2 }]}>Margin</Text>
              <Text style={[styles.profitValue, { color: profit >= 0 ? T.green : T.red }]}>
                {margin.toFixed(1)}%
              </Text>
            </View>
          </View>
        )}

        {/* ─── Inventory ─── */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>INVENTORY</Text>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.twoCol}>
            <Field label="Stock Quantity" T={T} half>
              <TextInput
                style={[styles.input, { color: T.t1 }]}
                placeholder="0"
                placeholderTextColor={T.t3}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
              />
            </Field>
            <View style={[styles.colDiv, { backgroundColor: T.line }]} />
            <Field label="Tax (%)" T={T} half last>
              <TextInput
                style={[styles.input, { color: T.t1 }]}
                placeholder="0"
                placeholderTextColor={T.t3}
                value={tax}
                onChangeText={setTax}
                keyboardType="decimal-pad"
              />
            </Field>
          </View>
        </View>

        {/* ─── Description ─── */}
        <Text style={[styles.sectionLabel, { color: T.t3 }]}>DESCRIPTION</Text>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <TextInput
            style={[styles.descInput, { color: T.t1 }]}
            placeholder="Optional product description..."
            placeholderTextColor={T.t3}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <BarcodeScanner
          onScanned={(code) => { setBarcode(code); setShowScanner(false); }}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────
function Field({
  label, error, children, T, last, half,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  T: typeof LT;
  last?: boolean;
  half?: boolean;
}) {
  return (
    <View style={[
      fieldStyles.wrap,
      !last && !half && { borderBottomWidth: 1, borderBottomColor: T.line },
      half && { flex: 1 },
    ]}>
      <Text style={[fieldStyles.label, { color: T.t3 }]}>{label}</Text>
      {children}
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  );
}
const fieldStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 },
  label: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  error: { fontSize: 11, color: '#DC2626', marginTop: 3 },
});

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, minHeight: 52,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 60 },
  backText: { fontSize: 15, fontWeight: '500' },
  topTitle: { fontSize: 16, fontWeight: '700' },
  saveBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10,
    minWidth: 60, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  content: { padding: 16, paddingBottom: 40 },

  imagePicker: { alignSelf: 'center', marginBottom: 20, position: 'relative' },
  image: { width: 100, height: 100, borderRadius: 16 },
  imagePlaceholder: {
    width: 100, height: 100, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderStyle: 'dashed',
  },
  imagePlaceholderText: { fontSize: 11, marginTop: 6 },
  cameraOverlay: {
    position: 'absolute', bottom: -4, right: -4,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: 6, paddingHorizontal: 4,
  },
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },

  input: { fontSize: 14, paddingVertical: 2 },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanChip: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  twoCol: { flexDirection: 'row' },
  colDiv: { width: 1 },

  profitPreview: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1,
    padding: 12, marginBottom: 16,
  },
  profitItem: { flex: 1, alignItems: 'center' },
  profitLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  profitValue: { fontSize: 17, fontWeight: '700', marginTop: 3 },
  profitDiv: { width: 1 },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  catChipText: { fontSize: 13, fontWeight: '500' },

  descInput: { padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
});
