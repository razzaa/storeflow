import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { Product } from '../types';
import { Colors, FontSize, Spacing, Radius } from '../theme/colors';
import { formatCurrency } from '../utils/calc';

type Props = {
  product: Product;
  currency?: string;
  onPress?: () => void;
  onAddToCart?: () => void;
};

export function ProductCard({ product, currency = 'PKR', onPress, onAddToCart }: Props) {
  const stockStatus =
    product.quantity === 0
      ? 'out'
      : product.quantity <= 5
      ? 'low'
      : 'normal';

  const stockColor =
    stockStatus === 'out'
      ? Colors.error
      : stockStatus === 'low'
      ? Colors.warning
      : Colors.success;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.container}>
      {product.image ? (
        <Image source={{ uri: product.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>
            {product.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        {product.sku && <Text style={styles.sku}>SKU: {product.sku}</Text>}
        <View style={styles.row}>
          <Text style={styles.price}>{formatCurrency(product.selling_price, currency)}</Text>
          <View style={[styles.stockBadge, { backgroundColor: stockColor + '20' }]}>
            <Text style={[styles.stockText, { color: stockColor }]}>
              {stockStatus === 'out' ? 'Out of stock' : `${product.quantity} left`}
            </Text>
          </View>
        </View>
        <Text style={styles.profit}>
          Profit: {formatCurrency(product.profit, currency)} ({product.margin.toFixed(1)}%)
        </Text>
      </View>
      {onAddToCart && (
        <TouchableOpacity
          onPress={onAddToCart}
          style={styles.addBtn}
          disabled={product.quantity === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    alignItems: 'center',
  },
  image: { width: 56, height: 56, borderRadius: Radius.md },
  imagePlaceholder: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.primary },
  info: { flex: 1, marginLeft: Spacing.md },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  sku: { fontSize: FontSize.xs, color: Colors.subtext, marginTop: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  price: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  stockText: { fontSize: FontSize.xs, fontWeight: '600' },
  profit: { fontSize: FontSize.xs, color: Colors.success, marginTop: 2 },
  addBtn: {
    width: 36,
    height: 36,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  addBtnText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: '600', lineHeight: 24 },
});
