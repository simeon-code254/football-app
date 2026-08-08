import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Alert } from 'react-native';
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

// Matches the demo values already shown on the player Profile screen's
// About tab, so opening Edit Profile doesn't look like data loss.
const editInitialForm: FormState = {
  ...initialForm,
  fullName: 'Marcus Johnson',
  gender: 'Male',
  nationality: 'Nigeria',
  primaryPosition: 'CAM',
  preferredFoot: 'Left',
  height: '178',
  weight: '68',
  club: 'Lagos City FC',
  yearsPlaying: '6',
  bio: 'Attacking midfielder with sharp vision and a clinical left foot. Captain of my school team, two-time regional top scorer. Looking for a trial with a professional academy.',
};

// Matches Matobev v4.dc.html's PROFILE COMPLETION block: a 4-step wizard
// (Personal -> Football Info -> Bio -> Social), progress bar, back/next nav.
// Doubles as Edit Profile (?mode=edit) — pre-filled, "Save Changes" instead
// of "Complete Profile", and a close button to bail out without finishing
// the whole wizard, since profile-complete.tsx was previously the only way
// to touch these fields, ever, even after the initial signup.
export default function ProfileComplete() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isEdit = mode === 'edit';
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(isEdit ? editInitialForm : initialForm);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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

  const next = () => {
    if (isLast) {
      router.replace(isEdit ? '/(player-tabs)/profile' : '/(player-tabs)/home');
    } else {
      setStep((s) => Math.min(s + 1, 4));
    }
  };

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
            <Pressable style={[styles.photoUpload, photoUri && styles.photoUploadFilled]} onPress={pickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
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
            label={isLast ? (isEdit ? 'Save Changes' : 'Complete Profile') : 'Continue'}
            onPress={next}
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
