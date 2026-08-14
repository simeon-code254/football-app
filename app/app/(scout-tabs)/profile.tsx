import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { fontFamily, fontSize, radii, spacing, useThemeColors } from '../../src/theme';
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

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
      <View style={styles.header}>
        <View style={styles.headerSettingsBtn}>
          <IconButton icon="settings" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
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
          {[data?.scout?.organization, data?.countryName].filter(Boolean).join(' · ') || '—'}
        </Text>
        <Text style={styles.since}>
          {data?.scout?.scout_since ? `Scout since ${new Date(data.scout.scout_since).getFullYear()}` : ''}
        </Text>
        <Pressable style={styles.editProfileLink} onPress={() => router.push('/scout-edit-profile')}>
          <Feather name="edit-2" size={12} color={colors.primary} />
          <Text style={styles.editProfileLinkText}>Edit Profile</Text>
        </Pressable>
        {!scoutVerified && (
          <Pressable style={styles.verifyCta} onPress={() => router.push('/scout-verification')}>
            <Feather name="upload" size={14} color={colors.white} />
            <Text style={styles.verifyCtaText}>Submit Verification Documents</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.bioCard}>
          <Text style={styles.bio}>{data?.scout?.bio || 'No bio yet — add one from Edit Profile.'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Positions Scouted</Text>
        <View style={styles.tagRow}>
          {(data?.prefs?.positions?.length ? data.prefs.positions : ['Set in Scouting Preferences']).map((p) => (
            <View key={p} style={styles.tag}>
              <Text style={styles.tagText}>{p}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.activityGrid}>
          {[
            ['Trials Run', data ? String(data.trialsRun) : '—'],
            ['Players Contacted', data ? String(data.playersContacted) : '—'],
            ['Saved Players', data ? String(data.savedCount) : '—'],
          ].map(([label, value], i) => (
            <View key={label} style={[styles.activityTile, i < 2 && styles.activityTileDivider]}>
              <Text style={styles.activityValue}>{value}</Text>
              <Text style={styles.activityLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scouting Preferences</Text>
        <View style={styles.settingsList}>
          <Pressable style={styles.settingsRow} onPress={() => setPrefsOpen(true)}>
            <Feather name="sliders" size={15} color={colors.textBody} />
            <Text style={styles.settingsText}>Preferred positions, age & rating filters</Text>
            <Feather name="chevron-right" size={16} color={colors.textPlaceholder} />
          </Pressable>
        </View>
      </View>

      </QueryState>

      <Modal visible={prefsOpen} animationType="slide" onRequestClose={() => setPrefsOpen(false)}>
        <KeyboardAvoidingView style={styles.prefsRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.prefsHeader}>
            <Pressable onPress={() => setPrefsOpen(false)}>
              <Feather name="x" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.prefsTitle}>Scouting Preferences</Text>
            <View style={{ width: 22 }} />
          </View>
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
  root: { flex: 1, backgroundColor: colors.surface },
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 20 },
  headerSettingsBtn: { position: 'absolute', top: 44, right: 16, zIndex: 1 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.surfaceMuted, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary, marginTop: 12 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  verifiedPillActive: { backgroundColor: colors.successTint },
  verifiedPillPending: { backgroundColor: colors.warningTint },
  verifiedLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs },
  org: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginTop: 8 },
  since: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, marginTop: 2 },
  editProfileLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  editProfileLinkText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.primary },
  verifyCta: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.goldDark, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 10, marginTop: 14 },
  verifyCtaText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.white },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary, marginBottom: 10, letterSpacing: 0.2 },
  bioCard: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.primary },
  bio: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, lineHeight: 21 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  activityGrid: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, paddingVertical: 14 },
  activityTile: { flex: 1, alignItems: 'center' },
  activityTileDivider: { borderRightWidth: 1, borderRightColor: colors.divider },
  activityValue: { fontFamily: fontFamily.extraBold, fontSize: fontSize.headingLg, color: colors.textPrimary },
  activityLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  settingsList: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.divider },
  settingsText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  prefsRoot: { flex: 1, backgroundColor: colors.surface, paddingTop: 50 },
  prefsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  prefsTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary },
  prefsHint: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 19, marginBottom: 8 },
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
