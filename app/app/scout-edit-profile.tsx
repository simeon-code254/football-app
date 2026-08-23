import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';
import { TypeaheadField } from '../src/components/TypeaheadField';
import { AFRICAN_COUNTRIES } from '../src/constants/africanCountries';
import { useSessionStore } from '../src/store/useSessionStore';
import * as profileRepository from '../src/repositories/profileRepository';
import { showAlert } from '../src/lib/alert';

// Scouts had no way to edit their profile after signup, same gap as the
// player side — this is the scout counterpart (lighter than the player's
// 4-step wizard since a scout profile has fewer fields).
export default function ScoutEditProfile() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const session = useSessionStore((s) => s.session);
  const hydrate = useSessionStore((s) => s.hydrate);
  const userId = session?.user.id;

  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [countryCodeByName, setCountryCodeByName] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [profile, scout, countries] = await Promise.all([
          profileRepository.getMyProfile(userId),
          profileRepository.getMyScout(userId),
          profileRepository.getCountries(),
        ]);
        setCountryCodeByName(Object.fromEntries(countries.map((c) => [c.name, c.code])));
        setFullName(profile.full_name ?? '');
        setExistingAvatarUrl(profile.avatar_url);
        setOrganization(scout?.organization ?? '');
        setCountry(scout?.country_code ? countries.find((c) => c.code === scout.country_code)?.name ?? '' : '');
        setBio(scout?.bio ?? '');
      } catch (err) {
        showAlert('Could not load profile', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert(
        'Permission needed',
        'Allow photo library access to set a profile photo.',
        perm.canAskAgain || Platform.OS === 'web'
          ? undefined
          : [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setPhotoUri(result.assets[0].uri);
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      if (photoUri) {
        await profileRepository.uploadAvatar(userId, photoUri);
      }
      await Promise.all([
        profileRepository.updateProfileFields(userId, { full_name: fullName.trim() || null }),
        profileRepository.updateScout(userId, {
          organization: organization.trim() || null,
          country_code: country ? countryCodeByName[country] ?? null : null,
          bio: bio.trim() || null,
        }),
      ]);
      await hydrate(session);
      router.replace('/(scout-tabs)/profile');
    } catch (err) {
      showAlert('Could not save profile', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable style={[styles.photoUpload, (photoUri || existingAvatarUrl) && styles.photoUploadFilled]} onPress={pickPhoto}>
          {photoUri || existingAvatarUrl ? (
            <Image source={{ uri: photoUri ?? existingAvatarUrl ?? undefined }} style={styles.photoPreview} />
          ) : (
            <>
              <Feather name="camera" size={22} color={colors.textDisabled} />
              <Text style={styles.photoUploadLabel}>Add Photo</Text>
            </>
          )}
        </Pressable>
        <AppTextField label="Full Name" icon="user" placeholder="Your name" value={fullName} onChangeText={setFullName} />
        <AppTextField label="Organization / Club" icon="briefcase" placeholder="Club or organization" value={organization} onChangeText={setOrganization} />
        <TypeaheadField label="Country" value={country} onChange={setCountry} options={AFRICAN_COUNTRIES} placeholder="e.g. Kenya" />
        <View>
          <Text style={styles.label}>Bio</Text>
          <View style={styles.bioBox}>
            <TextInput
              placeholder="Tell players what you're looking for"
              placeholderTextColor={colors.textPlaceholder}
              style={styles.bioInput}
              multiline
              maxLength={300}
              value={bio}
              onChangeText={setBio}
            />
          </View>
          <Text style={styles.charCount}>{bio.length} / 300</Text>
        </View>

        <PrimaryButton
          label={saving ? 'Saving…' : 'Save Changes'}
          onPress={save}
          disabled={saving}
          loading={saving}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  content: { padding: 20, paddingTop: 8, gap: 14 },
  photoUpload: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.borderDashed,
    borderStyle: 'dashed',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  photoUploadFilled: { borderStyle: 'solid', borderColor: colors.primary },
  photoUploadLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.caption, color: colors.textDisabled, marginTop: 2 },
  photoPreview: { width: '100%', height: '100%', borderRadius: 40 },
  label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textLabel, marginBottom: 5 },
  bioBox: { borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, padding: 12, minHeight: 100 },
  bioInput: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, textAlign: 'right', marginTop: 4 },
  });
}
