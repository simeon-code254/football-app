import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';
import { SelectField } from '../src/components/SelectField';
import { POSITIONS, GENDERS, NATIONALITIES } from '../src/constants/football';

const STEP_TITLES = ['Personal Details', 'Football Info', 'About You', 'Social Links'];
const FOOT_OPTIONS = ['Right', 'Left', 'Both'] as const;

type FormState = {
  fullName: string;
  dob: string;
  gender: string | null;
  nationality: string | null;
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
  nationality: null,
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

// Matches Matobev v4.dc.html's PROFILE COMPLETION block: a 4-step wizard
// (Personal -> Football Info -> Bio -> Social), progress bar, back/next nav.
export default function ProfileComplete() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isLast = step === 4;

  const next = () => {
    if (isLast) {
      router.replace('/(tabs)/home');
    } else {
      setStep((s) => Math.min(s + 1, 4));
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.stepLabel}>Step {step} of 4</Text>
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
            <Pressable style={styles.photoUpload}>
              <Feather name="camera" size={22} color="#9CA3AF" />
              <Text style={styles.photoUploadLabel}>Add Photo</Text>
            </Pressable>
            <AppTextField label="Full Name" placeholder="Marcus Johnson" value={form.fullName} onChangeText={(v) => set('fullName', v)} />
            <AppTextField label="Date of Birth" placeholder="DD / MM / YYYY" value={form.dob} onChangeText={(v) => set('dob', v)} />
            <View style={styles.row}>
              <SelectField label="Gender" value={form.gender} options={[...GENDERS]} onChange={(v) => set('gender', v)} />
              <SelectField label="Nationality" value={form.nationality} options={[...NATIONALITIES]} onChange={(v) => set('nationality', v)} />
            </View>
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
          <PrimaryButton label={isLast ? 'Complete Profile' : 'Continue'} onPress={next} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
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
  },
  photoUploadLabel: { fontFamily: fontFamily.regular, fontSize: 9, color: '#9CA3AF', marginTop: 2 },
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
