import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, TextInput, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Store } from 'lucide-react-native';
import { useAppStore } from '../../src/stores/appStore';
import { LT as T, radius } from '../../src/theme/design';
import {
  loginWithEmail,
  signupWithEmail,
  sendPasswordReset,
} from '../../src/firebase/authService';

type Tab = 'login' | 'signup';

export default function AuthScreen() {
  const [tab, setTab] = useState<Tab>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { completeOnboarding } = useAppStore();

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    if (tab === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await loginWithEmail(email.trim(), password);
        // Returning user — onboarding already done, go straight to app
        router.replace('/(app)/(tabs)');
      } else {
        await signupWithEmail(email.trim(), password, name.trim());
        // New user — send to store setup. completeOnboarding() is called there
        // after the store is created, so index.tsx won't race to /(app)/(tabs).
        router.replace('/(onboarding)/setup');
      }
    } catch (e: any) {
      console.error('Auth error:', e?.code, e?.message);
      const code: string = e?.code ?? '';
      const msg = code.includes('invalid-credential') || code.includes('wrong-password')
        ? 'Incorrect email or password.'
        : code.includes('email-already-in-use')
        ? 'An account with this email already exists.'
        : code.includes('weak-password')
        ? 'Password must be at least 6 characters.'
        : code.includes('user-not-found')
        ? 'No account found with this email.'
        : code.includes('network-request-failed')
        ? 'Network error. Check your internet connection.'
        : code.includes('too-many-requests')
        ? 'Too many attempts. Try again later.'
        : code.includes('configuration-not-found')
        ? 'Email sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in methods.'
        : e?.message
        ? e.message
        : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Reset Password', 'Enter your email address above first.');
      return;
    }
    try {
      await sendPasswordReset(email.trim());
      Alert.alert('Email sent', `Check your inbox at ${email.trim()} for reset instructions.`);
    } catch {
      Alert.alert('Error', 'Could not send reset email. Please check the address.');
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    await completeOnboarding();
    router.replace('/(onboarding)/setup');
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo block */}
        <View style={styles.logoBlock}>
          <View style={styles.logoBox}>
            <Store size={30} color="#fff" strokeWidth={2} />
          </View>
          <Text style={styles.logoTitle}>StoreFlow</Text>
          <Text style={styles.logoSub}>Offline-first point of sale</Text>
        </View>

        {/* Segment */}
        <View style={styles.segment}>
          {(['login', 'signup'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.segPill, tab === t && styles.segPillActive]}
              onPress={() => { setTab(t); setError(''); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.segText, tab === t && styles.segTextActive]}>
                {t === 'login' ? 'Log In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          {tab === 'signup' && (
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sarah Johnson"
                placeholderTextColor={T.t3}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={T.t3}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0 }]}
                placeholder="••••••••"
                placeholderTextColor={T.t3}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Text style={styles.showBtn}>{showPass ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {tab === 'login' && (
            <TouchableOpacity style={styles.forgotRow} onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {error.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.ctaBtn, loading && { opacity: 0.7 }]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>
              {loading
                ? tab === 'login' ? 'Signing in…' : 'Creating account…'
                : tab === 'login' ? 'Log In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Continue without account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1 },

  logoBlock: {
    backgroundColor: T.surface,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: T.line,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: T.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: T.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  logoTitle: { fontSize: 24, fontWeight: '800', color: T.t1, letterSpacing: -0.3 },
  logoSub: { fontSize: 13, color: T.t2, marginTop: 3 },

  segment: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderRadius: radius.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: T.border,
    margin: 20,
  },
  segPill: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  segPillActive: { backgroundColor: T.blue },
  segText: { fontSize: 14, fontWeight: '400', color: T.t2 },
  segTextActive: { fontWeight: '700', color: '#fff' },

  form: { paddingHorizontal: 20, paddingBottom: 40 },

  field: { marginBottom: 14 },
  label: {
    fontSize: 11, fontWeight: '700', color: T.t2,
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: T.t1,
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  showBtn: { fontSize: 13, color: T.blue, fontWeight: '600', paddingVertical: 8 },

  forgotRow: { alignItems: 'flex-end', paddingVertical: 8, marginBottom: 8 },
  forgotText: { fontSize: 13, color: T.blue },

  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },

  ctaBtn: {
    backgroundColor: T.blue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: T.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 13, color: T.t2 },
});
