import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Colors, FontSize, Spacing } from '../src/theme/colors';

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔍</Text>
      <Text style={styles.title}>Page Not Found</Text>
      <Link href="/" style={styles.link}>Go Home</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: Spacing.lg },
  emoji: { fontSize: 48, marginBottom: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
  link: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '600' },
});
