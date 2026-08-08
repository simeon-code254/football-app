import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';

const COVER = images.onboardSlide1;
const AVATAR = images.avatarMale;

const TABS = ['About', 'Videos', 'AI Ratings', 'Stats'] as const;

const SETTINGS_SECTIONS: { title: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { title: 'Account', icon: 'user' },
  { title: 'Security', icon: 'shield' },
  { title: 'Notifications', icon: 'bell' },
  { title: 'Privacy', icon: 'eye-off' },
  { title: 'Language', icon: 'globe' },
  { title: 'Theme', icon: 'moon' },
  { title: 'Help', icon: 'help-circle' },
];

// Canonical outfield attribute set (10) — see engineering plan. Sample
// values shown here for layout purposes; real values come from
// `player_attribute_scores` once the AI pipeline is wired up.
const ATTRIBUTES: { key: string; val: number }[] = [
  { key: 'Pace', val: 78 },
  { key: 'Shooting', val: 85 },
  { key: 'Passing', val: 87 },
  { key: 'Dribbling', val: 90 },
  { key: 'Defending', val: 52 },
  { key: 'Physical', val: 71 },
  { key: 'Vision', val: 84 },
  { key: 'Positioning', val: 79 },
  { key: 'Ball Control', val: 88 },
  { key: 'Decision Making', val: 82 },
];

const STAT_TILES = [
  { label: 'OVR', value: '82' },
  { label: 'Reels', value: '14' },
  { label: 'Views', value: '2.1k' },
  { label: 'Scouts', value: '38' },
];

// Matches the mockup's PROFILE tab: cover + avatar + name/position header,
// 4-across stat tiles, About/Videos/AI Ratings/Stats sub-tabs. The mockup
// only implements the About panel's content — Videos/AI Ratings/Stats are
// built out here with real content matching the app's data model.
export default function Profile() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('About');
  const setRole = useSessionStore((s) => s.setRole);

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <View style={styles.coverWrap}>
        <Image source={{ uri: COVER }} style={styles.cover} />
        <View style={styles.coverMask} />
      </View>

      <View style={styles.headerBlock}>
        <Image source={{ uri: AVATAR }} style={styles.avatar} />
        <Text style={styles.name}>Marcus Johnson</Text>
        <Text style={styles.meta}>CAM · 19 · Lagos, Nigeria</Text>
      </View>

      <View style={styles.statTiles}>
        {STAT_TILES.map((t) => (
          <View key={t.label} style={styles.statTile}>
            <Text style={styles.statTileValue}>{t.value}</Text>
            <Text style={styles.statTileLabel}>{t.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={styles.tabItem}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{t}</Text>
            {tab === t && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      <View style={styles.panel}>
        {tab === 'About' && (
          <View style={{ gap: 16 }}>
            <Text style={styles.bio}>
              Attacking midfielder with sharp vision and a clinical left foot. Captain of my school team,
              two-time regional top scorer. Looking for a trial with a professional academy.
            </Text>
            <View style={styles.detailsGrid}>
              {[
                ['Position', 'CAM'],
                ['Foot', 'Left'],
                ['Height', '178 cm'],
                ['Weight', '68 kg'],
                ['Club', 'Lagos City FC'],
                ['Experience', '6 years'],
              ].map(([label, value]) => (
                <View key={label} style={styles.detailCell}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  <Text style={styles.detailValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {tab === 'Videos' && (
          <View style={styles.videoGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.videoThumb}>
                <View style={styles.videoPlay}>
                  <Text style={styles.videoPlayGlyph}>▶</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 'AI Ratings' && (
          <View style={{ gap: 14 }}>
            <Text style={styles.aiNote}>
              Ratings update automatically as new highlights are analyzed by the AI pipeline.
            </Text>
            {ATTRIBUTES.map((attr) => (
              <View key={attr.key} style={styles.skillRow}>
                <Text style={styles.skillName}>{attr.key}</Text>
                <View style={styles.skillTrack}>
                  <View style={[styles.skillFill, { width: `${attr.val}%` }]} />
                </View>
                <Text style={styles.skillVal}>{attr.val}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'Stats' && (
          <View style={{ gap: 10 }}>
            {[
              ['Profile Views (30d)', '412'],
              ['Video Views (30d)', '2,140'],
              ['Scout Saves', '38'],
              ['Trial Invitations', '3'],
            ].map(([label, value]) => (
              <View key={label} style={styles.statRow}>
                <Text style={styles.statRowLabel}>{label}</Text>
                <Text style={styles.statRowValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsList}>
          {SETTINGS_SECTIONS.map((s) => (
            <Pressable key={s.title} style={styles.settingsRow}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  coverWrap: { height: 140 },
  cover: { width: '100%', height: '100%' },
  coverMask: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerBlock: { alignItems: 'center', marginTop: -44 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.surface },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary, marginTop: 10 },
  meta: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, marginTop: 2 },
  statTiles: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, gap: 10 },
  statTile: { flex: 1, alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, paddingVertical: 12 },
  statTileValue: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary },
  statTileLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  tabRow: { flexDirection: 'row', marginTop: 24, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingHorizontal: 20 },
  tabItem: { marginRight: 20, paddingBottom: 10 },
  tabLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textMuted },
  tabLabelActive: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
  tabIndicator: { height: 2, backgroundColor: colors.primary, borderRadius: 1, marginTop: 8 },
  panel: { padding: 20 },
  bio: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, lineHeight: 21 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailCell: { width: '47%', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 12 },
  detailLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted },
  detailValue: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary, marginTop: 3 },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  videoThumb: {
    width: '31.5%',
    aspectRatio: 9 / 14,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlay: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  videoPlayGlyph: { color: colors.white, fontSize: 11 },
  aiNote: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 18 },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skillName: { width: 110, fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  skillTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  skillFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  skillVal: { width: 28, textAlign: 'right', fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 14 },
  statRowLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody },
  statRowValue: { fontFamily: fontFamily.bold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  settingsSection: { paddingHorizontal: 20, marginTop: 8, paddingBottom: 32 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary, marginBottom: 10 },
  settingsList: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.divider },
  settingsText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, marginTop: 10 },
});
