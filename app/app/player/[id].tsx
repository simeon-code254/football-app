import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { IconButton } from '../../src/components/IconButton';
import { getPlayerById } from '../../src/data/mockPlayers';
import { MOCK_TRIALS } from '../../src/data/mockTrials';
import { useSessionStore } from '../../src/store/useSessionStore';

const TABS = ['Overview', 'AI Analysis', 'Videos'] as const;
const FOLDERS = ['Favorites', 'U21 Prospects', 'Wingers', 'Potential Signings'];

const CONFIDENCE_COLOR: Record<string, string> = {
  High: colors.success,
  Medium: colors.goldDark,
  Low: colors.error,
};

// Player Details, scoped for a scout viewing a player (spec §18-22): cover +
// profile header, Overview/AI Analysis/Videos tabs, confidence-annotated
// attributes (§20), Save-to-folder (§21), and private Scout Notes (§22).
export default function PlayerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const player = getPlayerById(id);
  const role = useSessionStore((s) => s.role);
  const scoutVerified = useSessionStore((s) => s.scoutVerified);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedFolder, setSavedFolder] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [note, setNote] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitedTrialTitle, setInvitedTrialTitle] = useState<string | null>(null);

  if (!player) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.notFound}>Player not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <Image source={{ uri: player.avatar }} style={styles.coverImage} />
          <View style={styles.coverMask} />
          <View style={styles.coverTop}>
            <IconButton icon="chevron-left" light onPress={() => router.back()} />
          </View>
        </View>

        <View style={styles.headerBlock}>
          <Image source={{ uri: player.avatar }} style={styles.avatar} />
          <Text style={styles.name}>{player.name}</Text>
          <Text style={styles.meta}>
            {player.position} · {player.flag} {player.country}
          </Text>
          <Text style={styles.metaSub}>{player.age} years old · {player.club}</Text>
          <View style={styles.ovrPill}>
            <Text style={styles.ovrPillText}>{player.overall} OVR</Text>
          </View>

          {role === 'scout' && (
            <View style={styles.actionsRow}>
              <Pressable style={styles.saveActionBtn} onPress={() => setSaveOpen(true)}>
                <Feather name="heart" size={15} color={savedFolder ? '#EF4444' : colors.textPrimary} />
                <Text style={styles.saveActionText}>{savedFolder ? `Saved · ${savedFolder}` : 'Save'}</Text>
              </Pressable>
              <Pressable
                style={[styles.messageActionBtn, !scoutVerified && { opacity: 0.5 }]}
                onPress={() =>
                  scoutVerified &&
                  router.push({ pathname: '/(scout-tabs)/messages', params: { playerId: player.id } })
                }
              >
                <Feather name="message-circle" size={15} color={colors.white} />
                <Text style={styles.messageActionText}>Message</Text>
              </Pressable>
              <Pressable style={styles.notesActionBtn} onPress={() => setNotesOpen(true)}>
                <Feather name="edit-3" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>
          )}
          {role === 'scout' && (
            <Pressable
              style={[styles.inviteActionBtn, !scoutVerified && { opacity: 0.5 }]}
              onPress={() => scoutVerified && setInviteOpen(true)}
            >
              <Feather name="send" size={15} color={colors.primary} />
              <Text style={styles.inviteActionText}>
                {invitedTrialTitle ? `Invited · ${invitedTrialTitle}` : 'Invite to Trial'}
              </Text>
            </Pressable>
          )}
          {role === 'scout' && !scoutVerified && (
            <Text style={styles.verifyHint}>Verification required before contacting or inviting players.</Text>
          )}
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
          {tab === 'Overview' && (
            <View style={{ gap: 16 }}>
              <View style={styles.detailsGrid}>
                {[
                  ['Position', player.position],
                  ['Age', String(player.age)],
                  ['Country', `${player.flag} ${player.country}`],
                  ['City', player.city],
                  ['Club', player.club],
                  ['Videos', String(player.videoCount)],
                ].map(([label, value]) => (
                  <View key={label} style={styles.detailCell}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailValue}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {tab === 'AI Analysis' && (
            <View style={{ gap: 16 }}>
              <View style={styles.disclaimer}>
                <Feather name="info" size={14} color={colors.primary} />
                <Text style={styles.disclaimerText}>
                  AI performance data is decision support, not a final verdict — always confirm with match footage.
                </Text>
              </View>

              <View style={styles.overallCard}>
                <Text style={styles.overallLabel}>OVERALL</Text>
                <Text style={styles.overallValue}>{player.overall}</Text>
              </View>

              <View style={{ gap: 10 }}>
                {player.attributes.map((a) => (
                  <View key={a.key} style={styles.skillRow}>
                    <Text style={styles.skillName}>{a.key}</Text>
                    <View style={styles.skillTrack}>
                      <View style={[styles.skillFill, { width: `${a.val}%` }]} />
                    </View>
                    <Text style={styles.skillVal}>{a.val}</Text>
                    <View style={[styles.confDot, { backgroundColor: CONFIDENCE_COLOR[a.confidence] }]} />
                  </View>
                ))}
              </View>

              <View style={styles.strengthsBox}>
                <Text style={styles.strengthsTitle}>STRENGTHS</Text>
                {player.strengths.map((s) => (
                  <Text key={s} style={styles.strengthLine}>• {s}</Text>
                ))}
              </View>
              <View style={styles.watchBox}>
                <Text style={styles.watchTitle}>AREAS TO WATCH</Text>
                {player.watchAreas.map((s) => (
                  <Text key={s} style={styles.watchLine}>• {s}</Text>
                ))}
              </View>
            </View>
          )}

          {tab === 'Videos' && (
            <View style={styles.videoGrid}>
              {Array.from({ length: player.videoCount }).map((_, i) => (
                <View key={i} style={styles.videoThumb}>
                  <View style={styles.videoPlay}>
                    <Feather name="play" size={12} color={colors.white} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Save to folder (spec §21) */}
      <Modal visible={saveOpen} transparent animationType="fade" onRequestClose={() => setSaveOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSaveOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Save Player</Text>
            {FOLDERS.map((f) => (
              <Pressable
                key={f}
                style={styles.folderRow}
                onPress={() => {
                  setSavedFolder(f);
                  setSaveOpen(false);
                }}
              >
                <View style={styles.radioDot}>{savedFolder === f && <View style={styles.radioDotFill} />}</View>
                <Text style={styles.folderText}>{f}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.folderRow}>
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={[styles.folderText, { color: colors.primary }]}>Create New Folder</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Scout Notes (spec §22) — private to the scout */}
      <Modal visible={notesOpen} transparent animationType="fade" onRequestClose={() => setNotesOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setNotesOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Scout Notes</Text>
            <Text style={styles.notesHint}>Private — players can't see these.</Text>
            <View style={styles.notesBox}>
              <TextInput
                placeholder="e.g. Very quick winger. Good 1v1. Need to watch full match before making a decision."
                placeholderTextColor={colors.textPlaceholder}
                style={styles.notesInput}
                multiline
                value={note}
                onChangeText={setNote}
              />
            </View>
            <Pressable style={styles.saveNoteBtn} onPress={() => setNotesOpen(false)}>
              <Text style={styles.saveNoteText}>Save Note</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Invite to Trial — scout-initiated, distinct from a player browsing
          and applying themselves (trial_applications.source='invited') */}
      <Modal visible={inviteOpen} transparent animationType="fade" onRequestClose={() => setInviteOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setInviteOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Invite to Trial</Text>
            <Text style={styles.notesHint}>Choose one of your open trials to invite {player.name} to.</Text>
            {MOCK_TRIALS.map((trial) => (
              <Pressable
                key={trial.id}
                style={styles.trialInviteRow}
                onPress={() => {
                  setInvitedTrialTitle(trial.title);
                  setInviteOpen(false);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.folderText}>{trial.title}</Text>
                  <Text style={styles.trialInviteMeta}>{trial.location} · Deadline {trial.deadline}</Text>
                </View>
                <View style={styles.radioDot}>
                  {invitedTrialTitle === trial.title && <View style={styles.radioDotFill} />}
                </View>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  notFound: { textAlign: 'center', marginTop: 40, fontFamily: fontFamily.regular, color: colors.textMuted },
  cover: { height: 160 },
  coverImage: { width: '100%', height: '100%' },
  coverMask: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 24, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  coverTop: { position: 'absolute', top: 8, left: 20 },
  headerBlock: { alignItems: 'center', marginTop: -44, paddingHorizontal: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.surface },
  name: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary, marginTop: 10 },
  meta: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textBody, marginTop: 2 },
  metaSub: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 1 },
  ovrPill: { backgroundColor: '#F0F5FF', borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 },
  ovrPillText: { fontFamily: fontFamily.bold, fontSize: fontSize.bodySm, color: colors.primary },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' },
  saveActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 10 },
  saveActionText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  messageActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 10 },
  messageActionText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.white },
  notesActionBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  inviteActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: radii.pill,
    paddingHorizontal: 16, paddingVertical: 10, marginTop: 10, alignSelf: 'stretch',
  },
  inviteActionText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.primary },
  verifyHint: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.goldDark, marginTop: 8 },
  tabRow: { flexDirection: 'row', marginTop: 24, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingHorizontal: 20 },
  tabItem: { marginRight: 20, paddingBottom: 10 },
  tabLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textMuted },
  tabLabelActive: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
  tabIndicator: { height: 2, backgroundColor: colors.primary, borderRadius: 1, marginTop: 8 },
  panel: { padding: 20 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailCell: { width: '47%', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 12 },
  detailLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted },
  detailValue: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary, marginTop: 3 },
  disclaimer: { flexDirection: 'row', gap: 8, backgroundColor: '#EBF2FF', borderRadius: radii.md, padding: 10, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.primaryDark, lineHeight: 16 },
  overallCard: { backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 16, alignItems: 'center' },
  overallLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  overallValue: { fontFamily: fontFamily.extraBold, fontSize: 40, color: colors.primary },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillName: { width: 90, fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  skillTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  skillFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  skillVal: { width: 24, textAlign: 'right', fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  confDot: { width: 8, height: 8, borderRadius: 4 },
  strengthsBox: { backgroundColor: '#F0FDF4', borderRadius: radii.md, padding: 14, gap: 4 },
  strengthsTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: colors.success, letterSpacing: 1, marginBottom: 4 },
  strengthLine: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody },
  watchBox: { backgroundColor: '#FFF8E1', borderRadius: radii.md, padding: 14, gap: 4 },
  watchTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: colors.goldDark, letterSpacing: 1, marginBottom: 4 },
  watchLine: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  videoThumb: { width: '31.5%', aspectRatio: 9 / 14, borderRadius: radii.sm, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  videoPlay: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary, marginBottom: 14 },
  folderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  radioDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioDotFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  folderText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  trialInviteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  trialInviteMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  notesHint: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 12 },
  notesBox: { borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, padding: 12, minHeight: 100, marginBottom: 14 },
  notesInput: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  saveNoteBtn: { backgroundColor: colors.primary, borderRadius: radii.lg, height: 48, alignItems: 'center', justifyContent: 'center' },
  saveNoteText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.white },
});
