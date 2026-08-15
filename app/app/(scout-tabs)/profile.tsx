import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, gradients, radii, spacing, useThemeColors } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import { IconButton } from '../../src/components/IconButton';
import * as profileRepository from '../../src/repositories/profileRepository';
import * as scoutingRepository from '../../src/repositories/scoutingRepository';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import * as messagesRepository from '../../src/repositories/messagesRepository';
import { POSITIONS } from '../../src/constants/football';
import { AFRICAN_COUNTRIES } from '../../src/constants/africanCountries';
import { showAlert } from '../../src/lib/alert';
import { QueryState } from '../../src/components/QueryState';
import { SkeletonProfile } from '../../src/components/Skeleton';

// Scout Profile (spec §26) + Settings (§27) + Scouting Preferences (§28) —
// preferences feed the Recommended For You / match-score logic (spec §29),
// which is why it lives as a real (if locally-stored) form, not a stub.
export default function ScoutProfile() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const scoutVerified = useSessionStore((s) => s.scoutVerified);
  const userId = useSessionStore((s) => s.session?.user.id);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefPositions, setPrefPositions] = useState<string[]>([]);
  const [prefCountries, setPrefCountries] = useState<string[]>([]);
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [minOverall, setMinOverall] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['scoutProfileScreen', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [profile, scout, countries, trialsRun, playersContacted, savedCount, prefs] = await Promise.all([
        profileRepository.getMyProfile(userId!),
        profileRepository.getMyScout(userId!),
        profileRepository.getCountries(),
        trialsRepository.getMyTrialsCount(userId!),
        messagesRepository.getConversationsCount(userId!),
        scoutingRepository.getSavedPlayersCount(userId!),
        scoutingRepository.getPreferences(userId!),
      ]);
      const countryName = scout ? countries.find((c) => c.code === scout.country_code)?.name ?? null : null;
      return { profile, scout, countryName, trialsRun, playersContacted, savedCount, prefs };
    },
  });

  useEffect(() => {
    if (!data?.prefs) return;
    setPrefPositions(data.prefs.positions ?? []);
    setPrefCountries(data.prefs.countries ?? []);
    setMinAge(data.prefs.age_min != null ? String(data.prefs.age_min) : '');
    setMaxAge(data.prefs.age_max != null ? String(data.prefs.age_max) : '');
    setMinOverall(data.prefs.min_overall != null ? String(data.prefs.min_overall) : '');
  }, [data?.prefs]);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const savePrefs = async () => {
    if (!userId) return;
    setSavingPrefs(true);
    try {
      await scoutingRepository.upsertPreferences(userId, {
        positions: prefPositions as never,
        countries: prefCountries,
        age_min: minAge ? Number(minAge) : null,
        age_max: maxAge ? Number(maxAge) : null,
        min_overall: minOverall ? Number(minOverall) : null,
      });
      await refetch();
      setPrefsOpen(false);
    } catch (err) {
      showAlert('Could not save preferences', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const activityStats = [
    { label: 'Trials Run', value: data ? String(data.trialsRun) : '—', icon: 'flag' as const },
    { label: 'Players Contacted', value: data ? String(data.playersContacted) : '—', icon: 'message-circle' as const },
    { label: 'Saved Players', value: data ? String(data.savedCount) : '—', icon: 'bookmark' as const },
  ];

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonProfile />}>
      <LinearGradient colors={gradients.primaryButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={{ width: 36 }} />
          <IconButton icon="settings" light accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
        </View>
        <Image source={{ uri: data?.profile.avatar_url ?? images.avatarMale }} style={styles.avatar} />
        <Text style={styles.name}>{data?.profile.full_name || 'Complete your profile'}</Text>
        <View style={[styles.verifiedPill, scoutVerified ? styles.verifiedPillActive : styles.verifiedPillPending]}>
          <Feather name={scoutVerified ? 'check-circle' : 'clock'} size={11} color={scoutVerified ? colors.success : colors.goldDark} />
          <Text style={[styles.verifiedLabel, { color: scoutVerified ? colors.success : colors.goldDark }]}>
            {scoutVerified ? 'Verified Scout' : 'Verification Pending'}
          </Text>
        </View>
        <Text style={styles.org}>
          {[data?.scout?.organization, data?.countryName].filter(Boolean).join(' · ') || 'Add your organization'}
        </Text>
        {!!data?.scout?.scout_since && (
          <Text style={styles.since}>Scout since {new Date(data.scout.scout_since).getFullYear()}</Text>
        )}
        <Pressable style={styles.editProfileBtn} onPress={() => router.push('/scout-edit-profile')}>
          <Feather name="edit-2" size={13} color={colors.primary} />
          <Text style={styles.editProfileBtnText}>Edit Profile</Text>
        </Pressable>
      </LinearGradient>

      {!scoutVerified && (
        <Pressable style={styles.verifyBanner} onPress={() => router.push('/scout-verification')}>
          <View style={styles.verifyBannerIcon}>
            <Feather name="upload" size={16} color={colors.goldDark} />
          </View>
          <View style={styles.verifyBannerBody}>
            <Text style={styles.verifyBannerTitle}>Submit verification documents</Text>
            <Text style={styles.verifyBannerSub}>Verified scouts can message players and run trials</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textPlaceholder} />
        </Pressable>
      )}

      <View style={styles.statsCard}>
        {activityStats.map((t, i) => (
          <View key={t.label} style={[styles.statTile, i < activityStats.length - 1 && styles.statTileDivider]}>
            <View style={styles.statIconWrap}>
              <Feather name={t.icon} size={15} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{t.value}</Text>
            <Text style={styles.statLabel}>{t.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionIconWrap, { backgroundColor: colors.infoTint }]}>
            <Feather name="file-text" size={13} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>About</Text>
        </View>
        <View style={styles.bioCard}>
          <Text style={styles.bio}>{data?.scout?.bio || 'No bio yet — add one from Edit Profile.'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionIconWrap, { backgroundColor: colors.infoTint }]}>
            <Feather name="crosshair" size={13} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Positions Scouted</Text>
        </View>
        <View style={styles.tagRow}>
          {(data?.prefs?.positions?.length ? data.prefs.positions : ['Set in Scouting Preferences']).map((p) => (
            <View key={p} style={styles.tag}>
              <Text style={styles.tagText}>{p}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.section, { marginBottom: 32 }]}>
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.sectionIconWrap, { backgroundColor: colors.infoTint }]}>
            <Feather name="sliders" size={13} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Scouting Preferences</Text>
        </View>
        <Pressable style={styles.prefsCard} onPress={() => setPrefsOpen(true)}>
          <View style={styles.prefsCardIcon}>
            <Feather name="sliders" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefsCardTitle}>Preferred positions, age & rating</Text>
            <Text style={styles.prefsCardSub}>Powers your Recommended For You feed</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textPlaceholder} />
        </Pressable>
      </View>

      </QueryState>

      <Modal visible={prefsOpen} animationType="slide" onRequestClose={() => setPrefsOpen(false)}>
        <KeyboardAvoidingView accessibilityViewIsModal style={styles.prefsRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.prefsHeader}>
            <Pressable onPress={() => setPrefsOpen(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.prefsTitle}>Scouting Preferences</Text>
            <View style={{ width: 22 }} />
          </View>
          <View style={styles.prefsDivider} />
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <Text style={styles.prefsHint}>
              These power your Recommended For You feed — Matobev matches new players against them.
            </Text>

            <Text style={styles.filterLabel}>Preferred Positions</Text>
            <View style={styles.wrapRow}>
              {POSITIONS.map((p) => {
                const active = prefPositions.includes(p);
                return (
                  <Pressable key={p} style={[styles.optionPill, active && styles.optionPillActive]} onPress={() => toggle(prefPositions, setPrefPositions, p)}>
                    <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterLabel}>Preferred Age Range</Text>
            <View style={styles.rangeRow}>
              <TextInput style={styles.rangeInput} keyboardType="numeric" value={minAge} onChangeText={setMinAge} />
              <Text style={styles.rangeDash}>—</Text>
              <TextInput style={styles.rangeInput} keyboardType="numeric" value={maxAge} onChangeText={setMaxAge} />
            </View>

            <Text style={styles.filterLabel}>Preferred Countries</Text>
            <View style={styles.wrapRow}>
              {AFRICAN_COUNTRIES.slice(0, 12).map((c) => {
                const active = prefCountries.includes(c);
                return (
                  <Pressable key={c} style={[styles.optionPill, active && styles.optionPillActive]} onPress={() => toggle(prefCountries, setPrefCountries, c)}>
                    <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.filterLabel}>Minimum Overall Rating</Text>
            <TextInput style={[styles.rangeInput, { width: '100%' }]} keyboardType="numeric" value={minOverall} onChangeText={setMinOverall} />

            <Pressable style={styles.savePrefsBtn} onPress={savePrefs} disabled={savingPrefs}>
              <Text style={styles.savePrefsText}>{savingPrefs ? 'Saving…' : 'Save Preferences'}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  hero: { alignItems: 'center', paddingTop: 44, paddingBottom: 26, paddingHorizontal: 20, borderBottomLeftRadius: radii.xxl, borderBottomRightRadius: radii.xxl },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  avatar: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.white, marginTop: 12 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  verifiedPillActive: { backgroundColor: colors.white },
  verifiedPillPending: { backgroundColor: colors.white },
  verifiedLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs },
  org: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: 'rgba(255,255,255,0.85)', marginTop: 10 },
  since: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 9, marginTop: 16 },
  editProfileBtnText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.primary },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radii.lg, marginHorizontal: 20, marginTop: 16, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  verifyBannerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.warningTint, alignItems: 'center', justifyContent: 'center' },
  verifyBannerBody: { flex: 1 },
  verifyBannerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  verifyBannerSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statTile: { flex: 1, alignItems: 'center' },
  statTileDivider: { borderRightWidth: 1, borderRightColor: colors.divider },
  statIconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.infoTint, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontFamily: fontFamily.extraBold, fontSize: fontSize.headingLg, color: colors.textPrimary },
  statLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  section: { paddingHorizontal: 20, marginTop: 22 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIconWrap: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary, letterSpacing: 0.2 },
  bioCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.primary, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  bio: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, lineHeight: 21 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  tagText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  prefsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  prefsCardIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.infoTint, alignItems: 'center', justifyContent: 'center' },
  prefsCardTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  prefsCardSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  prefsRoot: { flex: 1, backgroundColor: colors.surface, paddingTop: 50 },
  prefsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  prefsTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary },
  prefsDivider: { height: 1, backgroundColor: colors.divider },
  prefsHint: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 19, marginTop: 16, marginBottom: 8 },
  filterLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textLabel, marginTop: 18, marginBottom: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  optionPillActive: { backgroundColor: colors.primary },
  optionPillText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  optionPillTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rangeInput: { flex: 1, height: 44, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, paddingHorizontal: 14, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  rangeDash: { color: colors.textMuted },
  savePrefsBtn: { backgroundColor: colors.primary, borderRadius: radii.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  savePrefsText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.white },
  });
}
