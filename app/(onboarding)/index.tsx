import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, Dimensions, StyleSheet,
  TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSize, Spacing, Radius } from '../../src/theme/colors';
import { Button } from '../../src/components/ui/Button';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Welcome to StoreFlow',
    description: 'Your complete offline-first POS and inventory management solution for any business.',
    emoji: '🏪',
    bg: '#2563EB',
  },
  {
    id: '2',
    title: 'Manage Multiple Stores',
    description: 'Create and switch between stores with separate inventory, analytics, and reports.',
    emoji: '🏬',
    bg: '#7C3AED',
  },
  {
    id: '3',
    title: 'Works Offline First',
    description: 'All your data lives on your device. No internet required — sync to cloud when ready.',
    emoji: '📴',
    bg: '#059669',
  },
  {
    id: '4',
    title: 'Smart Analytics',
    description: 'Track profits, best sellers, inventory levels, and grow your business with data.',
    emoji: '📊',
    bg: '#D97706',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.push('/(onboarding)/auth');
    }
  };

  const handleSkip = () => router.push('/(onboarding)/auth');

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.emojiContainer, { backgroundColor: item.bg }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <Button
          label={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  skipBtn: { position: 'absolute', top: 56, right: Spacing.lg, zIndex: 10 },
  skipText: { fontSize: FontSize.md, color: Colors.subtext, fontWeight: '500' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingTop: 80 },
  emojiContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emoji: { fontSize: 60 },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.subtext,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gray200, marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: Colors.primary },
});
