import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './ui/Card';
import { Colors, FontSize, Spacing } from '../theme/colors';

type Props = {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
};

export function DashboardCard({ title, value, subtitle, color = Colors.primary, icon }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && (
          <View style={[styles.iconBg, { backgroundColor: color + '20' }]}>
            {icon}
          </View>
        )}
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: '47%', margin: Spacing.xs },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: { fontSize: FontSize.xs, color: Colors.subtext, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: FontSize.xl, fontWeight: '700' },
  subtitle: { fontSize: FontSize.xs, color: Colors.subtext, marginTop: 2 },
  iconBg: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
