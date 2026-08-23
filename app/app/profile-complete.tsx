import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';
import { SelectField } from '../src/components/SelectField';
import { PositionPicker } from '../src/components/PositionPicker';
import { TypeaheadField } from '../src/components/TypeaheadField';
import { POSITIONS, GENDERS } from '../src/constants/football';
import { AFRICAN_COUNTRIES } from '../src/constants/africanCountries';
import { useSessionStore } from '../src/store/useSessionStore';
import * as profileRepository from '../src/repositories/profileRepository';
import { showAlert } from '../src/lib/alert';

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

// Minimum age to hold an account without guardian involvement.
//
// The FTC's amended COPPA rules (in force 22 April 2026) treat biometric
// identifiers as personal information and state explicitly that processing
// a child's data for AI training is never part of "providing a service" --
// it needs separate verifiable parental consent every time. This app runs
// pose estimation over uploaded video of the player's own body, which is
// squarely that. GDPR-K sets its own threshold as high as 16 in parts of
// the EU.
//
// 13 is the floor below which an account cannot be created at all. Between
// 13 and 18 the account is created but flagged, so a guardian-consent flow
// (and the AI opt-in that goes with it) has somewhere to attach. That flow
// is a legal question as much as a technical one and is deliberately NOT
// invented here -- this establishes the gate and the honest messaging.
const MIN_AGE_YEARS = 13;
const ADULT_AGE_YEARS = 18;

function ageFromIsoDob(iso: string): number | null {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

// Matches Matobev v4.dc.html's PROFILE COMPLETION block: a 4-step wizard
// (Personal -> Football Info -> Bio -> Social), progress bar, back/next nav.
// Doubles as Edit Profile (?mode=edit) — pre-filled, "Save Changes" instead
// of "Complete Profile", and a close button to bail out without finishing
// the whole wizard, since profile-complete.tsx was previously the only way
// to touch these fields, ever, even after the initial signup.
export default function ProfileComplete() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
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
        showAlert('Could not load profile', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [isEdit, userId]);

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

  const isLast = step === 4;

  // Required only for the initial completion flow, not edits — an edit
  // implies the profile was already completed once, so re-litigating every
  // field on every edit would just be friction. This is what actually stops
  // the wizard being "completed" by tapping Continue four times with
  // nothing filled in.
  const parsedDob = parseDob(form.dob);
  const dobAge = parsedDob ? ageFromIsoDob(parsedDob) : null;
  const isUnderMinAge = dobAge != null && dobAge < MIN_AGE_YEARS;
  const isMinor = dobAge != null && dobAge < ADULT_AGE_YEARS;

  const step1Valid =
    isEdit ||
    (form.fullName.trim().length > 0 && !!parseDob(form.dob) && !isUnderMinAge && form.nationality.trim().length > 0);
  const step2Valid = isEdit || !!form.primaryPosition;

  const fullNameError = !isEdit && touched.fullName && !form.fullName.trim() ? 'Full name is required.' : undefined;
  const dobError = !isEdit && touched.dob
    ? !form.dob.trim() || !parsedDob
      ? 'Enter a valid date (DD / MM / YYYY).'
      : isUnderMinAge
        ? `You need to be at least ${MIN_AGE_YEARS} to use Matobev.`
        : undefined
    : undefined;
  const nationalityError = !isEdit && touched.nationality && !form.nationality.trim() ? 'Nationality is required.' : undefined;

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
      showAlert('Could not save profile', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 1 && !step1Valid) {
      setTouched((t) => ({ ...t, fullName: true, dob: true, nationality: true }));
      showAlert('Missing details', 'Full name, date of birth, and nationality are required.');
      return;
    }
    if (step === 2 && !step2Valid) {
      showAlert('Missing details', 'Select your primary position.');
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
            <Pressable onPress={() => router.replace('/(player-tabs)/profile')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close without saving">
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.stepBody}>
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
            <AppTextField
              label="Full Name"
              placeholder="Marcus Johnson"
              value={form.fullName}
              onChangeText={(v) => set('fullName', v)}
              onBlur={() => touch('fullName')}
              error={fullNameError}
            />
            <AppTextField
              label="Date of Birth"
              placeholder="DD / MM / YYYY"
              value={form.dob}
              onChangeText={(v) => set('dob', v)}
              onBlur={() => touch('dob')}
              error={dobError}
            />

            {isMinor && !isUnderMinAge && (
              // Said plainly rather than flagged silently. Under-18s are
              // allowed, but they and their guardian should know the app
              // analyses video of them -- which the amended COPPA rules
              // treat as biometric processing requiring separate consent.
              <Text style={styles.minorNote}>
                Because you're under 18, ask a parent or guardian before uploading videos or talking to scouts.
              </Text>
            )}
            <SelectField label="Gender" value={form.gender} options={[...GENDERS]} onChange={(v) => set('gender', v)} />
            <TypeaheadField
              label="Nationality"
              value={form.nationality}
              onChange={(v) => set('nationality', v)}
              options={AFRICAN_COUNTRIES}
              placeholder="e.g. Nigeria"
              onBlur={() => touch('nationality')}
              error={nationalityError}
            />
            <AppTextField label="Phone Number" placeholder="+234 800 000 0000" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => set('phone', v)} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepBody}>
            {/*
              Canvas screen 46 draws this step as a pitch, not two dropdowns.
              A player knows where they play by standing there, and the choice
              feeds attribute weighting (attribute_position_weights) -- so a
              position picked wrongly from an alphabetical list produces a wrong
              overall rating for as long as it stands.
            */}
            <PositionPicker
              value={form.primaryPosition}
              onChange={(v) => set('primaryPosition', v)}
            />
            <SelectField
              label="Secondary Position"
              value={form.secondaryPosition}
              options={[...POSITIONS]}
              onChange={(v) => set('secondaryPosition', v)}
            />
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
          {step > 1 && <IconButton icon="chevron-left" accessibilityLabel="Previous step" onPress={() => setStep((s) => s - 1)} size={52} style={styles.backBtn} />}
          <PrimaryButton
            label={saving ? 'Saving…' : isLast ? (isEdit ? 'Save Changes' : 'Complete Profile') : 'Continue'}
            onPress={next}
            disabled={saving || (step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
            loading={saving}
            style={{ flex: 1 }}
          />
        </View>

        {/* Steps 3 (bio) and 4 (social links) are entirely optional -- the
            database invariant only requires full_name, date_of_birth,
            nationality_code and primary_position, all of which are captured
            by the end of step 2. Forcing all four steps before the app
            became usable was pure drop-off: every extra field between
            signing up and seeing value loses people who would otherwise
            have stayed. They can still finish later from Edit Profile, and
            the remaining steps stay right here for anyone who wants them. */}
        {!isEdit && step === 2 && step2Valid && !saving && (
          <Pressable onPress={save} hitSlop={10} style={styles.finishLaterWrap}>
            <Text style={styles.finishLaterText}>
              Finish later — <Text style={styles.finishLaterLink}>start using Matobev now</Text>
            </Text>
          </Pressable>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  minorNote: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 17,
    marginTop: -4,
    marginBottom: 12,
  },
  finishLaterWrap: { alignItems: 'center', marginTop: 16 },
  finishLaterText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  finishLaterLink: { fontFamily: fontFamily.semiBold, color: colors.primary },
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
  photoUploadLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.caption, color: colors.textDisabled, marginTop: 2 },
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
  footPillSelected: { borderColor: colors.primary, backgroundColor: colors.infoTint },
  footPillText: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textBody },
  footPillTextSelected: { fontFamily: fontFamily.semiBold, color: colors.primary },
  bioBox: { borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, padding: 14, minHeight: 140 },
  bioInput: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary, minHeight: 120, textAlignVertical: 'top' },
  charCount: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, textAlign: 'right' },
  socialHint: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted },
  navRow: { flexDirection: 'row', gap: 10, marginTop: spacing.xl, paddingTop: spacing.xl },
  backBtn: { borderRadius: radii.lg },
  });
}
