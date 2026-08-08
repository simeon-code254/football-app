import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import { POSITIONS } from '../../src/constants/football';
import { AFRICAN_COUNTRIES } from '../../src/constants/africanCountries';

const SETTINGS_SECTIONS: { title: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { title: 'Account', icon: 'user' },
  { title: 'Security', icon: 'shield' },
  { title: 'Notifications', icon: 'bell' },
  { title: 'Privacy', icon: 'eye-off' },
  { title: 'Scouting Preferences', icon: 'sliders' },
  { title: 'Language', icon: 'globe' },
  { title: 'Theme', icon: 'moon' },
  { title: 'Help', icon: 'help-circle' },
];

// Scout Profile (spec §26) + Settings (§27) + Scouting Preferences (§28) —
// preferences feed the Recommended For You / match-score logic (spec §29),
// which is why it lives as a real (if locally-stored) form, not a stub.
export default function ScoutProfile() {
  const scoutVerified = useSessionStore((s) => s.scoutVerified);
  const setRole = useSessionStore((s) => s.setRole);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefPositions, setPrefPositions] = useState<string[]>(['LW', 'RW', 'ST']);
  const [prefCountries, setPrefCountries] = useState<string[]>(['Kenya']);
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('23');
  const [minOverall, setMinOverall] = useState('75');

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Image source={{ uri: images.avatarMale }} style={styles.avatar} />
        <View style={styles.nameRow}>
          <Text style={styles.name}>Simeon Anyal</Text>
          {scoutVerified && <Feather name="check-circle" size={16} color={colors.success} />}
        </View>
        <Text style={styles.verifiedLabel}>{scoutVerified ? 'Verified Scout' : 'Verification Pending'}</Text>
        <Text style={styles.org}>Matobev Talent Partners · Kenya</Text>
        <Text style={styles.since}>Scout since 2024</Text>
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
        <Text style={styles.bio}>
          Independent scout focused on East African wingers and attacking talent, working with academies across
          Kenya, Uganda and Tanzania.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Positions Scouted</Text>
        <View style={styles.tagRow}>
          {['LW', 'RW', 'ST', 'CAM'].map((p) => (
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
            ['Trials Run', '5'],
            ['Players Contacted', '12'],
            ['Players Signed', '3'],
          ].map(([label, value]) => (
            <View key={label} style={styles.activityTile}>
              <Text style={styles.activityValue}>{value}</Text>
              <Text style={styles.activityLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsList}>
          {SETTINGS_SECTIONS.map((s) => (
            <Pressable
              key={s.title}
              style={styles.settingsRow}
              onPress={() => s.title === 'Scouting Preferences' && setPrefsOpen(true)}
            >
              <Feather name={s.icon} size={17} color={colors.textBody} style={{ width: 24 }} />
              <Text style={styles.settingsText}>{s.title}</Text>
              <Feather name="chevron-right" size={16} color={colors.textPlaceholder} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.logoutRow}
          onPress={() => {
            setRole('player');
            router.replace('/welcome');
          }}
        >
          <Feather name="log-out" size={17} color={colors.error} style={{ width: 24 }} />
          <Text style={[styles.settingsText, { color: colors.error }]}>Logout</Text>
        </Pressable>
        <Pressable style={styles.logoutRow}>
          <Feather name="trash-2" size={17} color={colors.textPlaceholder} style={{ width: 24 }} />
          <Text style={[styles.settingsText, { color: colors.textPlaceholder }]}>Delete Account</Text>
        </Pressable>
      </View>

      <Modal visible={prefsOpen} animationType="slide" onRequestClose={() => setPrefsOpen(false)}>
        <View style={styles.prefsRoot}>
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

            <Pressable style={styles.savePrefsBtn} onPress={() => setPrefsOpen(false)}>
              <Text style={styles.savePrefsText}>Save Preferences</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.surfaceMuted },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary },
  verifiedLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.success, marginTop: 2 },
  org: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginTop: 4 },
  since: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, marginTop: 2 },
  editProfileLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  editProfileLinkText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.primary },
  verifyCta: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.goldDark, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 10, marginTop: 14 },
  verifyCtaText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.white },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary, marginBottom: 10 },
  bio: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, lineHeight: 21 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  activityGrid: { flexDirection: 'row', gap: 10 },
  activityTile: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 14, alignItems: 'center' },
  activityValue: { fontFamily: fontFamily.extraBold, fontSize: fontSize.headingLg, color: colors.textPrimary },
  activityLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  settingsList: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.divider },
  settingsText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, marginTop: 10 },
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
