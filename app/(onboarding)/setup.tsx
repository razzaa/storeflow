import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/colors';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { createStore } from '../../src/db/queries';
import { useAppStore } from '../../src/stores/appStore';

const STORE_TYPES = [
  { id: 'retail', label: 'Retail', emoji: '🏪' },
  { id: 'grocery', label: 'Grocery', emoji: '🛒' },
  { id: 'pharmacy', label: 'Pharmacy', emoji: '💊' },
  { id: 'electronics', label: 'Electronics', emoji: '📱' },
  { id: 'cosmetics', label: 'Cosmetics', emoji: '💄' },
  { id: 'other', label: 'Other', emoji: '🏬' },
];

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR'];

const THEME_COLORS = [
  '#2563EB', '#7C3AED', '#DC2626', '#D97706',
  '#059669', '#0891B2', '#DB2777', '#374151',
];

export default function SetupScreen() {
  const [name, setName] = useState('');
  const [type, setType] = useState('retail');
  const [currency, setCurrency] = useState('PKR');
  const [themeColor, setThemeColor] = useState('#2563EB');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setActiveStore, completeOnboarding } = useAppStore();

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Store name is required');
      return;
    }
    setLoading(true);
    const store = await createStore({ name: name.trim(), type, currency, theme_color: themeColor, logo: null });
    await setActiveStore(store.id);
    await completeOnboarding(); // mark done AFTER store exists — prevents index.tsx race
    router.replace('/(app)/(tabs)');
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set Up Your Store</Text>
        <Text style={styles.subtitle}>You can always change this later in settings</Text>

        <Input
          label="Store Name *"
          placeholder="e.g. Ali General Store"
          value={name}
          onChangeText={(t) => { setName(t); setError(''); }}
          error={error}
          autoFocus
        />

        <Text style={styles.sectionLabel}>Store Type</Text>
        <View style={styles.grid}>
          {STORE_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setType(t.id)}
              style={[styles.typeBtn, type === t.id && styles.typeBtnActive]}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <Text style={[styles.typeLabel, type === t.id && styles.typeLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Currency</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCurrency(c)}
              style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]}
            >
              <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Theme Color</Text>
        <View style={styles.colorRow}>
          {THEME_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setThemeColor(c)}
              style={[styles.colorDot, { backgroundColor: c }, themeColor === c && styles.colorDotSelected]}
            />
          ))}
        </View>

        <Button
          label="Create Store & Continue"
          onPress={handleCreate}
          loading={loading}
          fullWidth
          size="lg"
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: Spacing.lg, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.md, color: Colors.subtext, marginBottom: Spacing.xl },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  typeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  typeEmoji: { fontSize: 18 },
  typeLabel: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.subtext },
  typeLabelActive: { color: Colors.primary },
  currencyScroll: { marginBottom: Spacing.lg },
  currencyBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    marginRight: Spacing.sm, backgroundColor: Colors.white,
  },
  currencyBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  currencyText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.subtext },
  currencyTextActive: { color: Colors.white },
  colorRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
});
