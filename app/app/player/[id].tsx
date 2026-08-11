import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { IconButton } from '../../src/components/IconButton';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as profileRepository from '../../src/repositories/profileRepository';
import * as videosRepository from '../../src/repositories/videosRepository';
import * as scoutingRepository from '../../src/repositories/scoutingRepository';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import { showAlert } from '../../src/lib/alert';
import { QueryState } from '../../src/components/QueryState';

const TABS = ['Overview', 'AI Analysis', 'Videos'] as const;

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
  const role = useSessionStore((s) => s.role);
  const scoutVerified = useSessionStore((s) => s.scoutVerified);
  const viewerId = useSessionStore((s) => s.session?.user.id);

  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [saveOpen, setSaveOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['playerDetail', id],
    enabled: !!id,
    queryFn: async () => {
      const publicView = await profileRepository.getPlayerPublicView(id);
      const attributes = await profileRepository.getPlayerAttributes(id, publicView.primary_position === 'GK');
      const videos = await videosRepository.getMyVideos(id);
      return { publicView, attributes, videos };
    },
  });

  useEffect(() => {
    if (role === 'scout' && viewerId && id && viewerId !== id) {
      profileRepository.logProfileView(viewerId, id).catch(() => {});
    }
  }, [role, viewerId, id]);

  const { data: scoutData, refetch: refetchScoutData } = useQuery({
    queryKey: ['playerDetailScoutData', id, viewerId],
    enabled: role === 'scout' && !!viewerId && !!id,
    queryFn: async () => {
      const [folders, savedRow, noteText, trials, matchScore] = await Promise.all([
        scoutingRepository.listFolders(viewerId!),
        scoutingRepository.isPlayerSaved(viewerId!, id),
        scoutingRepository.getNote(viewerId!, id),
        trialsRepository.listMyTrials(viewerId!),
        scoutingRepository.getMatchScore(viewerId!, id),
      ]);
      return {
        folders,
        savedFolderId: savedRow?.folder_id ?? null,
        note: noteText,
        openTrials: trials.filter((t) => t.status === 'open'),
        matchScore,
      };
    },
  });

  const { data: thumbUrls } = useQuery({
    queryKey: ['playerDetailThumbs', data?.videos.map((v) => v.id)],
    enabled: tab === 'Videos' && !!data?.videos.length,
    queryFn: async () => {
      const urls = await Promise.all(
        data!.videos.map((v) => videosRepository.getVideoUrl(v.thumbnail_path || v.storage_path))
      );
      return Object.fromEntries(data!.videos.map((v, i) => [v.id, urls[i]]));
    },
  });

  const openNotes = () => {
    setNote(scoutData?.note ?? '');
    setNotesOpen(true);
  };

  const saveNote = async () => {
    if (!viewerId) return;
    setSavingNote(true);
    try {
      await scoutingRepository.upsertNote(viewerId, id, note);
      await refetchScoutData();
      setNotesOpen(false);
    } catch (err) {
      showAlert('Could not save note', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingNote(false);
    }
  };

  const saveToFolder = async (folderId: string) => {
    if (!viewerId) return;
    try {
      await scoutingRepository.savePlayerToFolder(viewerId, id, folderId);
      await refetchScoutData();
      setSaveOpen(false);
    } catch (err) {
      showAlert('Could not save player', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const createFolderAndSave = async () => {
    if (!viewerId || !newFolderName.trim()) return;
    try {
      const folder = await scoutingRepository.createFolder(viewerId, newFolderName.trim());
      setNewFolderName('');
      await saveToFolder(folder.id);
    } catch (err) {
      showAlert('Could not create folder', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const inviteToTrial = async (trialId: string) => {
    if (!viewerId) return;
    try {
      await trialsRepository.inviteToTrial(viewerId, trialId, id);
      await refetchScoutData();
      setInviteOpen(false);
      showAlert('Invited', 'The player has been invited to this trial.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      showAlert('Could not invite player', message.includes('duplicate') ? 'Already invited or applied to this trial.' : message);
    }
  };

  if (isLoading || error || !data) {
    return (
      <SafeAreaView style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
          <Text style={styles.notFound}>Player not found.</Text>
        </QueryState>
      </SafeAreaView>
    );
  }

  const player = data.publicView;
  const savedFolderName = scoutData?.folders.find((f) => f.id === scoutData.savedFolderId)?.name ?? null;
  const presentAttrCount = data.attributes.filter((a) => a.value != null).length;
  const totalAttrCount = data.attributes.length;
  const isProvisionalRating = presentAttrCount > 0 && presentAttrCount < totalAttrCount;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <Image source={{ uri: player.avatar_url ?? images.avatarMale }} style={styles.coverImage} />
          <View style={styles.coverMask} />
          <View style={styles.coverTop}>
            <IconButton icon="chevron-left" light accessibilityLabel="Go back" onPress={() => router.back()} />
          </View>
        </View>

        <View style={styles.headerBlock}>
          <Image source={{ uri: player.avatar_url ?? images.avatarMale }} style={styles.avatar} />
          <Text style={styles.name}>{player.full_name || 'Unnamed player'}</Text>
          <Text style={styles.meta}>
            {player.primary_position} · {player.nationality_name}
          </Text>
          <Text style={styles.metaSub}>{player.age ? `${player.age} years old` : ''} {player.club ? `· ${player.club}` : ''}</Text>
          <View style={styles.pillRow}>
            <View style={styles.ovrPill}>
              <Text style={styles.ovrPillText}>{player.overall_rating ?? '—'} OVR</Text>
            </View>
            {role === 'scout' && scoutData?.matchScore != null && (
              <View style={styles.matchPill}>
                <Text style={styles.matchPillText}>{scoutData.matchScore}% Match</Text>
              </View>
            )}
          </View>

          {role === 'scout' && (
            <View style={styles.actionsRow}>
              <Pressable style={styles.saveActionBtn} onPress={() => setSaveOpen(true)}>
                <Feather name="heart" size={15} color={savedFolderName ? '#EF4444' : colors.textPrimary} />
                <Text style={styles.saveActionText}>{savedFolderName ? `Saved · ${savedFolderName}` : 'Save'}</Text>
              </Pressable>
              <Pressable
                style={[styles.messageActionBtn, !scoutVerified && { opacity: 0.5 }]}
                onPress={() => scoutVerified && router.push({ pathname: '/(scout-tabs)/messages', params: { playerId: id } })}
              >
                <Feather name="message-circle" size={15} color={colors.white} />
                <Text style={styles.messageActionText}>Message</Text>
              </Pressable>
              <Pressable style={styles.notesActionBtn} onPress={openNotes}>
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
              <Text style={styles.inviteActionText}>Invite to Trial</Text>
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
                  ['Position', player.primary_position ?? '—'],
                  ['Age', player.age != null ? String(player.age) : '—'],
                  ['Country', player.nationality_name ?? '—'],
                  ['Club', player.club || '—'],
                  ['Foot', player.preferred_foot ?? '—'],
                  ['Videos', String(player.video_count ?? 0)],
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
                <Text style={styles.overallValue}>{player.overall_rating ?? '—'}</Text>
                {isProvisionalRating && (
                  <Text style={styles.provisionalNote}>
                    Provisional ({presentAttrCount}/{totalAttrCount} attributes assessed)
                  </Text>
                )}
              </View>

              <View style={{ gap: 10 }}>
                {data.attributes.map((a) => (
                  <View key={a.key} style={styles.skillRow}>
                    <Text style={styles.skillName}>{a.displayName}</Text>
                    <View style={styles.skillTrack}>
                      <View style={[styles.skillFill, { width: `${a.value ?? 0}%` }]} />
                    </View>
                    <Text style={styles.skillVal}>{a.value ?? '—'}</Text>
                    {a.confidence && <View style={[styles.confDot, { backgroundColor: CONFIDENCE_COLOR[a.confidence] }]} />}
                  </View>
                ))}
                {data.attributes.every((a) => a.value == null) && (
                  <Text style={styles.disclaimerText}>No AI ratings yet — this player hasn't had a highlight analyzed.</Text>
                )}
              </View>
            </View>
          )}

          {tab === 'Videos' && (
            <View style={styles.videoGrid}>
              {!data.videos.length && <Text style={styles.disclaimerText}>No videos uploaded yet.</Text>}
              {data.videos.map((v) => (
                <View key={v.id} style={styles.videoThumb}>
                  {thumbUrls?.[v.id] && <Image source={{ uri: thumbUrls[v.id] }} style={StyleSheet.absoluteFill} />}
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
            {(scoutData?.folders ?? []).map((f) => (
              <Pressable key={f.id} style={styles.folderRow} onPress={() => saveToFolder(f.id)}>
                <View style={styles.radioDot}>{scoutData?.savedFolderId === f.id && <View style={styles.radioDotFill} />}</View>
                <Text style={styles.folderText}>{f.name}</Text>
              </Pressable>
            ))}
            <View style={styles.newFolderRow}>
              <TextInput
                placeholder="New folder name"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.newFolderInput}
                value={newFolderName}
                onChangeText={setNewFolderName}
              />
              <Pressable style={styles.newFolderBtn} onPress={createFolderAndSave} disabled={!newFolderName.trim()}>
                <Feather name="plus" size={16} color={colors.primary} />
              </Pressable>
            </View>
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
            <Pressable style={styles.saveNoteBtn} onPress={saveNote} disabled={savingNote}>
              <Text style={styles.saveNoteText}>{savingNote ? 'Saving…' : 'Save Note'}</Text>
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
            <Text style={styles.notesHint}>Choose one of your open trials to invite {player.full_name} to.</Text>
            {!scoutData?.openTrials.length && <Text style={styles.notesHint}>You have no open trials — create one first.</Text>}
            {(scoutData?.openTrials ?? []).map((trial) => (
              <Pressable key={trial.id} style={styles.trialInviteRow} onPress={() => inviteToTrial(trial.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.folderText}>{trial.title}</Text>
                  <Text style={styles.trialInviteMeta}>{trial.location} · Deadline {trial.application_deadline}</Text>
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
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  ovrPill: { backgroundColor: '#F0F5FF', borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6 },
  ovrPillText: { fontFamily: fontFamily.bold, fontSize: fontSize.bodySm, color: colors.primary },
  matchPill: { backgroundColor: '#F0FDF4', borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6 },
  matchPillText: { fontFamily: fontFamily.bold, fontSize: fontSize.bodySm, color: colors.success },
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
  provisionalNote: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.goldDark, marginTop: 6 },
  overallLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 1 },
  overallValue: { fontFamily: fontFamily.extraBold, fontSize: 40, color: colors.primary },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillName: { width: 90, fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  skillTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  skillFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  skillVal: { width: 24, textAlign: 'right', fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textPrimary },
  confDot: { width: 8, height: 8, borderRadius: 4 },
  videoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  videoThumb: { width: '31.5%', aspectRatio: 9 / 14, borderRadius: radii.sm, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  videoPlay: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: 20, paddingBottom: 32 },
  sheetTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary, marginBottom: 14 },
  folderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  radioDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioDotFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  folderText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  newFolderRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  newFolderInput: { flex: 1, height: 42, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, paddingHorizontal: 12, fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary },
  newFolderBtn: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  trialInviteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  trialInviteMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  notesHint: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 12 },
  notesBox: { borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, padding: 12, minHeight: 100, marginBottom: 14 },
  notesInput: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  saveNoteBtn: { backgroundColor: colors.primary, borderRadius: radii.lg, height: 48, alignItems: 'center', justifyContent: 'center' },
  saveNoteText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.white },
});
