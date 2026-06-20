import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '../src/stores/appStore';
import { useAuthStore } from '../src/stores/authStore';

export default function Index() {
  const { settings, isLoading } = useAppStore();
  const { user, isAuthReady } = useAuthStore();

  useEffect(() => {
    if (isLoading || !isAuthReady) return;

    if (!settings?.is_onboarding_done) {
      router.replace('/(onboarding)');
      return;
    }

    // Already authenticated via Firebase or skip_auth enabled
    if (user || settings?.skip_auth) {
      router.replace('/(app)/(tabs)');
    } else {
      router.replace('/(onboarding)/auth');
    }
  }, [isLoading, isAuthReady, settings, user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB' },
});
