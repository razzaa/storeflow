import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Image, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Camera, Check, X, Eye, EyeOff, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useWidgetStore } from '../../src/stores/widgetStore';
import { useAuthStore } from '../../src/stores/authStore';
import { LT, DT, space, radius } from '../../src/theme/design';
import { updateDisplayName, uploadProfilePhoto, changePassword } from '../../src/firebase/authService';
import { auth } from '../../src/firebase/config';
import { useT } from '../../src/i18n';

export default function ProfileScreen() {
  const isDark = useWidgetStore((s) => s.isDark);
  const T = isDark ? DT : LT;
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();
  const t = useT();

  const [name, setName] = useState(user?.displayName ?? '');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [showPassSection, setShowPassSection] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const initials = (user?.displayName ?? user?.email ?? 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  async function handleSaveName() {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      await updateDisplayName(name.trim());
      if (auth.currentUser) setUser(auth.currentUser);
      setEditingName(false);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  }

  async function handlePickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access in Settings to upload a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingPhoto(true);
    try {
      await uploadProfilePhoto(result.assets[0].uri);
      // Refresh the store with the updated Firebase Auth user (now has photoURL)
      if (auth.currentUser) setUser(auth.currentUser);
      Alert.alert('', t.settings.photoUpdated);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPass || !newPass) {
      Alert.alert('Error', 'Please fill both password fields');
      return;
    }
    if (newPass.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    setSavingPass(true);
    try {
      await changePassword(currentPass, newPass);
      setCurrentPass('');
      setNewPass('');
      setShowPassSection(false);
      Alert.alert('', t.settings.passwordChanged);
    } catch (e: any) {
      const code = e.code ?? '';
      if (code.includes('wrong-password') || code.includes('invalid-credential')) {
        Alert.alert('Error', 'Current password is incorrect');
      } else {
        Alert.alert('Error', e.message ?? 'Failed to change password');
      }
    } finally {
      setSavingPass(false);
    }
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView
        style={[styles.root, { backgroundColor: T.bg }]}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: T.surface, borderBottomColor: T.line, paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <ChevronLeft size={22} color={T.t1} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: T.t1 }]}>{t.settings.editProfile}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85} disabled={uploadingPhoto}>
            <View style={[styles.avatarRing, { borderColor: T.blue }]}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: T.blueL }]}>
                  <Text style={[styles.avatarInitials, { color: T.blue }]}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={[styles.cameraOverlay, { backgroundColor: T.blue }]}>
              {uploadingPhoto
                ? <ActivityIndicator size={14} color="#fff" />
                : <Camera size={14} color="#fff" strokeWidth={2} />}
            </View>
          </TouchableOpacity>
          <Text style={[styles.emailLabel, { color: T.t3 }]}>{user?.email ?? ''}</Text>
        </View>

        {/* Name section */}
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[styles.cardLabel, { color: T.t3 }]}>{t.settings.updateName}</Text>
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.nameInput, { color: T.t1, borderBottomColor: T.blue }]}
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                placeholderTextColor={T.t3}
              />
              <TouchableOpacity onPress={handleSaveName} disabled={savingName} hitSlop={8}>
                {savingName
                  ? <ActivityIndicator size={18} color={T.blue} />
                  : <Check size={20} color={T.green} strokeWidth={2.5} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setEditingName(false); setName(user?.displayName ?? ''); }} hitSlop={8}>
                <X size={20} color={T.red} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.nameRow} onPress={() => setEditingName(true)} activeOpacity={0.7}>
              <Text style={[styles.nameText, { color: T.t1 }]}>
                {user?.displayName || t.settings.setYourName}
              </Text>
              <Text style={[styles.editHint, { color: T.blue }]}>{t.common.edit}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Password section */}
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <TouchableOpacity
            style={styles.passHeader}
            onPress={() => setShowPassSection((s) => !s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.cardLabel, { color: T.t3 }]}>{t.settings.changePassword}</Text>
            <Text style={[styles.editHint, { color: T.blue }]}>{showPassSection ? t.common.cancel : t.common.edit}</Text>
          </TouchableOpacity>

          {showPassSection && (
            <View style={{ gap: space.sm, marginTop: space.sm }}>
              <View style={[styles.passField, { borderColor: T.border, backgroundColor: T.s2 }]}>
                <TextInput
                  style={[styles.passInput, { color: T.t1 }]}
                  placeholder={t.settings.currentPassword}
                  placeholderTextColor={T.t3}
                  value={currentPass}
                  onChangeText={setCurrentPass}
                  secureTextEntry={!showCurrent}
                />
                <TouchableOpacity onPress={() => setShowCurrent((s) => !s)} hitSlop={8}>
                  {showCurrent
                    ? <EyeOff size={18} color={T.t3} strokeWidth={1.75} />
                    : <Eye size={18} color={T.t3} strokeWidth={1.75} />}
                </TouchableOpacity>
              </View>

              <View style={[styles.passField, { borderColor: T.border, backgroundColor: T.s2 }]}>
                <TextInput
                  style={[styles.passInput, { color: T.t1 }]}
                  placeholder={t.settings.newPassword}
                  placeholderTextColor={T.t3}
                  value={newPass}
                  onChangeText={setNewPass}
                  secureTextEntry={!showNew}
                />
                <TouchableOpacity onPress={() => setShowNew((s) => !s)} hitSlop={8}>
                  {showNew
                    ? <EyeOff size={18} color={T.t3} strokeWidth={1.75} />
                    : <Eye size={18} color={T.t3} strokeWidth={1.75} />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.savePassBtn, { backgroundColor: T.blue, opacity: savingPass ? 0.6 : 1 }]}
                onPress={handleChangePassword}
                disabled={savingPass}
                activeOpacity={0.85}
              >
                {savingPass
                  ? <ActivityIndicator color="#fff" size={16} />
                  : <Text style={styles.savePassText}>{t.settings.saveChanges}</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.lg, paddingBottom: 12, borderBottomWidth: 1,
    minHeight: 52,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },

  avatarSection: { alignItems: 'center', paddingTop: 32, paddingBottom: 16 },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 44 },
  avatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 28, fontWeight: '700' },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  emailLabel: { fontSize: 13, marginTop: 10 },

  card: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: radius.lg,
    borderWidth: 1, padding: space.md,
  },
  cardLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameText: { fontSize: 16, fontWeight: '600' },
  editHint: { fontSize: 13, fontWeight: '600' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, fontSize: 16, fontWeight: '600', borderBottomWidth: 1.5, paddingBottom: 4 },

  passHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passField: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 12, height: 44,
  },
  passInput: { flex: 1, fontSize: 15 },
  savePassBtn: { borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  savePassText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
