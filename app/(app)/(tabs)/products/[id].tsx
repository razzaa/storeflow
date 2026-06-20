import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Image, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../../../src/stores/appStore';
import { getProduct, updateProduct, deleteProduct } from '../../../../src/db/queries';
import { Button } from '../../../../src/components/ui/Button';
import { Input } from '../../../../src/components/ui/Input';
import { BarcodeScanner } from '../../../../src/components/BarcodeScanner';
import { Colors, FontSize, Spacing, Radius } from '../../../../src/theme/colors';
import { calcProfit, calcMargin } from '../../../../src/utils/calc';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeStore } = useAppStore();
  const currency = activeStore?.currency ?? 'PKR';
  const queryClient = useQueryClient();
  const storeId = activeStore?.id ?? '';

  const { data: product } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [tax, setTax] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku ?? '');
      setBarcode(product.barcode ?? '');
      setDescription(product.description ?? '');
      setCostPrice(String(product.cost_price));
      setSellingPrice(String(product.selling_price));
      setQuantity(String(product.quantity));
      setTax(String(product.tax));
      setImage(product.image);
    }
  }, [product]);

  const cp = parseFloat(costPrice) || 0;
  const sp = parseFloat(sellingPrice) || 0;
  const profit = calcProfit(sp, cp);
  const margin = calcMargin(sp, cp);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await updateProduct(id, {
      name: name.trim(),
      sku: sku.trim() || null,
      barcode: barcode.trim() || null,
      description: description.trim() || null,
      image,
      cost_price: cp,
      selling_price: sp,
      quantity: parseInt(quantity) || 0,
      tax: parseFloat(tax) || 0,
    });
    queryClient.invalidateQueries({ queryKey: ['products', storeId] });
    queryClient.invalidateQueries({ queryKey: ['product', id] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', storeId] });
    router.back();
    setLoading(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Product', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteProduct(id);
          queryClient.invalidateQueries({ queryKey: ['products', storeId] });
          router.back();
        }
      },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={32} color={Colors.gray400} />
              <Text style={styles.imagePlaceholderText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <Input label="Product Name *" value={name} onChangeText={setName} />
        <Input label="SKU" value={sku} onChangeText={setSku} />
        <Input
          label="Barcode"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="numeric"
          rightIcon={
            <TouchableOpacity onPress={() => setShowScanner(true)}>
              <Ionicons name="barcode-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          }
        />
        <Input label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />

        <Text style={styles.sectionHeader}>Pricing</Text>
        <View style={styles.row}>
          <Input label={`Cost (${currency})`} value={costPrice} onChangeText={setCostPrice} keyboardType="numeric" containerStyle={{ flex: 1 }} />
          <View style={{ width: Spacing.md }} />
          <Input label={`Selling (${currency})`} value={sellingPrice} onChangeText={setSellingPrice} keyboardType="numeric" containerStyle={{ flex: 1 }} />
        </View>

        <View style={styles.profitPreview}>
          <View style={styles.profitItem}>
            <Text style={styles.profitLabel}>Profit</Text>
            <Text style={[styles.profitValue, { color: profit >= 0 ? Colors.success : Colors.error }]}>
              {currency} {profit.toFixed(2)}
            </Text>
          </View>
          <View style={styles.profitDivider} />
          <View style={styles.profitItem}>
            <Text style={styles.profitLabel}>Margin</Text>
            <Text style={[styles.profitValue, { color: margin >= 0 ? Colors.success : Colors.error }]}>
              {margin.toFixed(1)}%
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Inventory</Text>
        <View style={styles.row}>
          <Input label="Stock" value={quantity} onChangeText={setQuantity} keyboardType="numeric" containerStyle={{ flex: 1 }} />
          <View style={{ width: Spacing.md }} />
          <Input label="Tax (%)" value={tax} onChangeText={setTax} keyboardType="numeric" containerStyle={{ flex: 1 }} />
        </View>

        <Button label="Save Changes" onPress={handleSave} loading={loading} fullWidth size="lg" style={{ marginTop: Spacing.md }} />
        <Button label="Delete Product" onPress={handleDelete} variant="danger" fullWidth size="lg" style={{ marginTop: Spacing.sm }} />
      </ScrollView>

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <BarcodeScanner
          onScanned={(code) => { setBarcode(code); setShowScanner(false); }}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  imagePicker: { alignSelf: 'center', marginBottom: Spacing.lg },
  image: { width: 100, height: 100, borderRadius: Radius.lg },
  imagePlaceholder: { width: 100, height: 100, borderRadius: Radius.lg, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed' },
  imagePlaceholderText: { fontSize: FontSize.xs, color: Colors.gray400, marginTop: 4 },
  sectionHeader: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md, marginTop: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  profitPreview: { flexDirection: 'row', backgroundColor: Colors.gray50, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  profitItem: { flex: 1, alignItems: 'center' },
  profitLabel: { fontSize: FontSize.xs, color: Colors.subtext, marginBottom: 4 },
  profitValue: { fontSize: FontSize.lg, fontWeight: '700' },
  profitDivider: { width: 1, backgroundColor: Colors.border },
});
