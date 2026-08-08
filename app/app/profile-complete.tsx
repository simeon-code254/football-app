import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';
import { SelectField } from '../src/components/SelectField';
import { TypeaheadField } from '../src/components/TypeaheadField';
import { POSITIONS, GENDERS } from '../src/constants/football';
import { AFRICAN_COUNTRIES } from '../src/constants/africanCountries';
import { useSessionStore } from '../src/store/useSessionStore';
import * as profileRepository from '../src/repositories/profileRepository';

const STEP_TITLES = ['Personal Details', 'Football Info', 'About You', 'Social Links'];
const FOOT_OPTIONS = ['Right', 'Left', 'Both'] as const;

type FormState = {
  fullName: string;
  dob: string;
  gender: string | null;
  nationality: string;
  phone: string;
  primaryPosition: string | null;
  secondaryPosition: string | null;
  preferredFoot: (typeof FOOT_OPTIONS)[number];
  height: string;
  weight: string;
  club: string;
  jersey: string;
  yearsPlaying: string;
  bio: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  facebook: string;
};

const initialForm: FormState = {
  fullName: '',
  dob: '',
  gender: null,
  nationality: '',
  phone: '',
  primaryPosition: null,
  secondaryPosition: null,
  preferredFoot: 'Right',
  height: '',
  weight: '',
  club: '',
  jersey: '',
  yearsPlaying: '',
  bio: '',
  instagram: '',
  youtube: '',
  tiktok: '',
  facebook: '',
};

function formatDob(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d} / ${m} / ${y}`;
}

function parseDob(text: string): string | undefined {
  const parts = text.split(/\D+/).filter(Boolean);
  if (parts.length !== 3) return undefined;
  const [d, m, y] = parts;
  if (y.length !== 4) return undefined;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Matches Matobev v4.dc.html's PROFILE COMPLETION block: a 4-step wizard
// (Personal -> Football Info -> Bio -> Social), progress bar, back/next nav.
// Doubles as Edit Profile (?mode=edit) — pre-filled, "Save Changes" instead
// of "Complete Profile", and a close button to bail out without finishing
// the whole wizard, since profile-complete.tsx was previously the only way
// to touch these fields, ever, even after the initial signup.
export default function ProfileComplete() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEdit = mode === 'edit';
  const session = useSessionStore((s) => s.session);
  const hydrate = useSessionStore((s) => s.hydrate);
  const userId = session?.user.id;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [countryCodeByName, setCountryCodeByName] = useState<Record<string, string>>({});
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    profileRepository.getCountries().then((countries) => {
      setCountryCodeByName(Object.fromEntries(countries.map((c) => [c.name, c.code])));
    });
  }, []);

  useEffect(() => {
    if (!isEdit || !userId) return;
    (async () => {
      try {
        const [profile, player] = await Promise.all([
          profileRepository.getMyProfile(userId),
          profileRepository.getMyPlayer(userId),
        ]);
        const countries = await profileRepository.getCountries();
        const nationalityName = countries.find((c) => c.code === player.nationality_code)?.name ?? '';
        setForm({
          fullName: profile.full_name ?? '',
          dob: formatDob(player.date_of_birth),
          gender: player.gender,
          nationality: nationalityName,
          phone: profile.phone ?? '',
          primaryPosition: player.primary_position,
          secondaryPosition: player.secondary_position,
          preferredFoot: (player.preferred_foot as FormState['preferredFoot']) ?? 'Right',
          height: player.height_cm != null ? String(player.height_cm) : '',
          weight: player.weight_kg != null ? String(player.weight_kg) : '',
          club: player.club ?? '',
          jersey: player.jersey_number != null ? String(player.jersey_number) : '',
          yearsPlaying: player.years_playing != null ? String(player.years_playing) : '',
          bio: player.bio ?? '',
          instagram: player.instagram_handle ?? '',
          youtube: player.youtube_url ?? '',
          tiktok: player.tiktok_handle ?? '',
          facebook: player.facebook_url ?? '',
        });
        setExistingAvatarUrl(profile.avatar_url);
      } catch (err) {
        Alert.alert('Could not load profile', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [isEdit, userId]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to set a profile photo.');
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

  const isLast = step === 4;

  // Required only for the initial completion flow, not edits — an edit
  // implies the profile was already completed once, so re-litigating every
  // field on every edit would just be friction. This is what actually stops
  // the wizard being "completed" by tapping Continue four times with
  // nothing filled in.
  const step1Valid = isEdit || (form.fullName.trim().length > 0 && !!parseDob(form.dob) && form.nationality.trim().length > 0);
  const step2Valid = isEdit || !!form.primaryPosition;

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      if (photoUri) {
        await profileRepository.uploadAvatar(userId, photoUri);
      }
      await Promise.all([
        profileRepository.updateProfileFields(userId, {
          full_name: form.fullName.trim() || null,
          phone: form.phone.trim() || null,
        }),
        profileRepository.updatePlayer(userId, {
          date_of_birth: parseDob(form.dob) ?? null,
          gender: form.gender,
          nationality_code: form.nationality ? countryCodeByName[form.nationality] ?? null : null,
          primary_position: form.primaryPosition as never,
          secondary_position: form.secondaryPosition as never,
          preferred_foot: form.preferredFoot,
          height_cm: form.height ? Number(form.height) : null,
          weight_kg: form.weight ? Number(form.weight) : null,
          club: form.club.trim() || null,
          jersey_number: form.jersey ? Number(form.jersey) : null,
          years_playing: form.yearsPlaying ? Number(form.yearsPlaying) : null,
          bio: form.bio.trim() || null,
          instagram_handle: form.instagram.trim() || null,
          youtube_url: form.youtube.trim() || null,
          tiktok_handle: form.tiktok.trim() || null,
          facebook_url: form.facebook.trim() || null,
          ...(isEdit ? {} : { profile_completed: true }),
        }),
      ]);
      await hydrate(session);
      router.replace(isEdit ? '/(player-tabs)/profile' : '/(player-tabs)/home');
    } catch (err) {
      Alert.alert('Could not save profile', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 1 && !step1Valid) {
      Alert.alert('Missing details', 'Full name, date of birth, and nationality are required.');
      return;
    }
    if (step === 2 && !step2Valid) {
      Alert.alert('Missing details', 'Select your primary position.');
      return;
    }
    if (isLast) {
      save();
    } else {
      setStep((s) => Math.min(s + 1, 4));
    }
  };

  if (loadingEdit) {
    return (
      <SafeAreaView style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.stepLabel}>Step {step} of 4</Text>
          {isEdit && (
            <Pressable onPress={() => router.replace('/(player-tabs)/profile')} hitSlop={8}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Text style={styles.stepTitle}>{STEP_TITLES[step - 1]}</Text>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.progressSeg, { backgroundColor: i <= step ? colors.primary : colors.border }]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.stepBody}>
            <Pressable style={[styles.photoUpload, (photoUri || existingAvatarUrl) && styles.photoUploadFilled]} onPress={pickPhoto}>
              {photoUri || existingAvatarUrl ? (
                <Image source={{ uri: photoUri ?? existingAvatarUrl ?? undefined }} style={styles.photoPreview} />
              ) : (
                <>
                  <Feather name="camera" size={22} color="#9CA3AF" />
                  <Text style={styles.photoUploadLabel}>Add Photo</Text>
                </>
              )}
            </Pressable>
            <AppTextField label="Full Name" placeholder="Marcus Johnson" value={form.fullName} onChangeText={(v) => set('fullName', v)} />
            <AppTextField label="Date of Birth" placeholder="DD / MM / YYYY" value={form.dob} onChangeText={(v) => set('dob', v)} />
            <SelectField label="Gender" value={form.gender} options={[...GENDERS]} onChange={(v) => set('gender', v)} />
            <TypeaheadField
              label="Nationality"
              value={form.nationality}
              onChange={(v) => set('nationality', v)}
              options={AFRICAN_COUNTRIES}
              placeholder="e.g. Nigeria"
            />
            <AppTextField label="Phone Number" placeholder="+234 800 000 0000" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => set('phone', v)} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepBody}>
            <View style={styles.row}>
              <SelectField label="Primary Position" value={form.primaryPosition} options={[...POSITIONS]} onChange={(v) => set('primaryPosition', v)} />
              <SelectField label="Secondary Position" value={form.secondaryPosition} options={[...POSITIONS]} onChange={(v) => set('secondaryPosition', v)} />
            </View>
            <View>
              <Text style={styles.label}>Preferred Foot</Text>
              <View style={styles.footRow}>
                {FOOT_OPTIONS.map((foot) => {
                  const selected = form.preferredFoot === foot;
                  return (
                    <Pressable
                      key={foot}
                      onPress={() => set('preferredFoot', foot)}
                      style={[styles.footPill, selected && styles.footPillSelected]}
                    >
                      <Text style={[styles.footPillText, selected && styles.footPillTextSelected]}>{foot}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.row}>
              <AppTextField label="Height (cm)" placeholder="180" keyboardType="numeric" value={form.height} onChangeText={(v) => set('height', v)} />
              <AppTextField label="Weight (kg)" placeholder="75" keyboardType="numeric" value={form.weight} onChangeText={(v) => set('weight', v)} />
            </View>
            <AppTextField label="Current Club (Optional)" placeholder="Club name" value={form.club} onChangeText={(v) => set('club', v)} />
            <View style={styles.row}>
              <AppTextField label="Jersey Number" placeholder="10" keyboardType="numeric" value={form.jersey} onChangeText={(v) => set('jersey', v)} />
              <AppTextField label="Years Playing" placeholder="8" keyboardType="numeric" value={form.yearsPlaying} onChangeText={(v) => set('yearsPlaying', v)} />
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepBody}>
            <Text style={styles.label}>Biography</Text>
            <View style={styles.bioBox}>
              <TextInput
                placeholder="Tell scouts about yourself, your playing style, achievements, and goals. Max 500 characters."
                placeholderTextColor={colors.textPlaceholder}
                style={styles.bioInput}
                multiline
                maxLength={500}
                value={form.bio}
                onChangeText={(v) => set('bio', v)}
              />
            </View>
            <Text style={styles.charCount}>{form.bio.length} / 500</Text>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepBody}>
            <Text style={styles.socialHint}>Optional — add your social media profiles</Text>
            <AppTextField label="Instagram" icon="instagram" placeholder="username" value={form.instagram} onChangeText={(v) => set('instagram', v)} autoCapitalize="none" />
            <AppTextField label="YouTube" placeholder="youtube.com/c/..." value={form.youtube} onChangeText={(v) => set('youtube', v)} autoCapitalize="none" />
            <AppTextField label="TikTok" placeholder="username" value={form.tiktok} onChangeText={(v) => set('tiktok', v)} autoCapitalize="none" />
            <AppTextField label="Facebook" placeholder="facebook.com/..." value={form.facebook} onChangeText={(v) => set('facebook', v)} autoCapitalize="none" />
          </View>
        )}

        <View style={styles.navRow}>
          {step > 1 && <IconButton icon="chevron-left" onPress={() => setStep((s) => s - 1)} size={52} style={styles.backBtn} />}
          <PrimaryButton
            label={saving ? 'Saving…' : isLast ? (isEdit ? 'Save Changes' : 'Complete Profile') : 'Continue'}
            onPress={next}
            disabled={saving || (step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
            loading={saving}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 2 },
  stepTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.heading, color: colors.textPrimary },
  progressRow: { flexDirection: 'row', gap: 4, marginTop: 10 },
  progressSeg: { flex: 1, height: 3, borderRadius: 2 },
  content: { paddingHorizontal: 28, paddingBottom: 32, flexGrow: 1 },
  stepBody: { gap: 14, paddingTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textLabel, marginBottom: 5 },
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
  photoUploadLabel: { fontFamily: fontFamily.regular, fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  photoPreview: { width: '100%', height: '100%', borderRadius: 40 },
  footRow: { flexDirection: 'row', gap: 8 },
  footPill: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footPillSelected: { borderColor: colors.primary, backgroundColor: '#F0F5FF' },
  footPillText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textBody },
  footPillTextSelected: { fontFamily: fontFamily.semiBold, color: colors.primary },
  bioBox: { borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, padding: 14, minHeight: 140 },
  bioInput: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary, minHeight: 120, textAlignVertical: 'top' },
  charCount: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, textAlign: 'right' },
  socialHint: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted },
  navRow: { flexDirection: 'row', gap: 10, marginTop: spacing.xl, paddingTop: spacing.xl },
  backBtn: { borderRadius: radii.lg },
});
