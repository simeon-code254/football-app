import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { IconButton } from '../../src/components/IconButton';
import { images } from '../../src/constants/images';
import { useSessionStore } from '../../src/store/useSessionStore';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import type { ApplicantStatus } from '../../src/repositories/trialsRepository';
import { showAlert } from '../../src/lib/alert';
import { QueryState } from '../../src/components/QueryState';

const MY_STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#FFF8E1', text: colors.goldDark, label: 'Applied — Pending' },
  shortlisted: { bg: '#EBF2FF', text: colors.primary, label: 'Shortlisted' },
  accepted: { bg: '#F0FDF4', text: colors.success, label: 'Accepted' },
  rejected: { bg: '#FEF2F2', text: colors.error, label: 'Rejected' },
  withdrawn: { bg: colors.surfaceMuted, text: colors.textMuted, label: 'Withdrawn' },
};

const STATUS_TABS: { key: 'all' | ApplicantStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

// Trial Management + Applicant review (spec §14/§15): trial detail header,
// status tabs, per-applicant Shortlist/Accept/Reject, and bulk selection.
export default function TrialDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useSessionStore((s) => s.role);
  const userId = useSessionStore((s) => s.session?.user.id);
  const [tab, setTab] = useState<'all' | ApplicantStatus>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);

  const { data: trial, isLoading: loadingTrial, error: trialError, refetch: refetchTrial } = useQuery({
    queryKey: ['trial', id],
    enabled: !!id,
    queryFn: () => trialsRepository.getTrialById(id),
  });

  const { data: myApplication, refetch: refetchMyApplication } = useQuery({
    queryKey: ['myApplicationForTrial', id, userId],
    enabled: role === 'player' && !!userId && !!id,
    queryFn: () => trialsRepository.getMyApplicationForTrial(userId!, id),
  });

  const { data: applicants, refetch: refetchApplicants } = useQuery({
    queryKey: ['trialApplicants', id],
    enabled: role === 'scout' && !!id,
    queryFn: () => trialsRepository.listApplicants(id),
  });

  if (loadingTrial || trialError || !trial) {
    return (
      <SafeAreaView style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <QueryState isLoading={loadingTrial} error={trialError} onRetry={refetchTrial}>
          <Text style={styles.notFound}>Trial not found.</Text>
        </QueryState>
      </SafeAreaView>
    );
  }

  const apply = async () => {
    if (!userId) return;
    setApplying(true);
    try {
      await trialsRepository.applyToTrial(userId, trial.id);
      await refetchMyApplication();
    } catch (err) {
      showAlert('Could not apply', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setApplying(false);
    }
  };

  if (role === 'player') {
    const status = myApplication?.status;
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Trial Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.infoCard}>
            <Text style={styles.trialTitle}>{trial.title}</Text>
            <Text style={styles.trialClub}>{trial.club}</Text>
            <View style={styles.infoGrid}>
              <InfoCell label="Location" value={trial.location} />
              <InfoCell label="Age" value={`${trial.age_min ?? '—'}-${trial.age_max ?? '—'}`} />
              <InfoCell label="Position" value={trial.positions.join(', ') || 'Any'} />
              <InfoCell label="Deadline" value={trial.application_deadline} />
            </View>
            {!!trial.description && <Text style={styles.trialDesc}>{trial.description}</Text>}
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {status ? (
              <View style={[styles.myStatusBanner, { backgroundColor: MY_STATUS_STYLE[status]?.bg }]}>
                <Feather name="check-circle" size={16} color={MY_STATUS_STYLE[status]?.text} />
                <Text style={[styles.myStatusText, { color: MY_STATUS_STYLE[status]?.text }]}>
                  {myApplication?.source === 'invited' && status === 'pending' ? 'Invited' : MY_STATUS_STYLE[status]?.label}
                </Text>
              </View>
            ) : (
              <PrimaryButton label={applying ? 'Applying…' : 'Apply for Trial'} onPress={apply} disabled={applying} loading={applying} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const setStatus = async (applicationId: string, status: ApplicantStatus) => {
    try {
      await trialsRepository.updateApplicationStatus(applicationId, status);
      await refetchApplicants();
    } catch (err) {
      showAlert('Could not update status', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const list = applicants ?? [];
  const filtered = tab === 'all' ? list : list.filter((a) => a.status === tab);
  const toggleSelect = (applicationId: string) =>
    setSelected((s) => (s.includes(applicationId) ? s.filter((x) => x !== applicationId) : [...s, applicationId]));

  const bulkShortlist = async () => {
    await Promise.all(selected.map((appId) => trialsRepository.updateApplicationStatus(appId, 'shortlisted')));
    setSelected([]);
    refetchApplicants();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Trial Management</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.trialTitle}>{trial.title}</Text>
          <Text style={styles.trialClub}>{trial.club}</Text>
          <View style={styles.infoGrid}>
            <InfoCell label="Location" value={trial.location} />
            <InfoCell label="Age" value={`${trial.age_min ?? '—'}-${trial.age_max ?? '—'}`} />
            <InfoCell label="Position" value={trial.positions.join(', ') || 'Any'} />
            <InfoCell label="Deadline" value={trial.application_deadline} />
          </View>
          {!!trial.description && <Text style={styles.trialDesc}>{trial.description}</Text>}
        </View>

        <View style={styles.tabsRow}>
          {STATUS_TABS.map((t) => {
            const active = tab === t.key;
            const count = t.key === 'all' ? list.length : list.filter((a) => a.status === t.key).length;
            return (
              <Pressable key={t.key} style={[styles.tabChip, active && styles.tabChipActive]} onPress={() => setTab(t.key)}>
                <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                  {t.label} {count > 0 ? `(${count})` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selected.length > 0 && (
          <View style={styles.bulkBar}>
            <Text style={styles.bulkText}>{selected.length} selected</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.bulkBtn} onPress={bulkShortlist}>
                <Text style={styles.bulkBtnText}>Shortlist</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.applicantList}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No applicants in this stage yet.</Text>
          ) : (
            filtered.map((a) => {
              const player = a.players;
              const isSelected = selected.includes(a.id);
              const age = ageFromDob(player?.date_of_birth ?? null);
              return (
                <View key={a.id} style={styles.applicantCard}>
                  <Pressable onPress={() => toggleSelect(a.id)} style={styles.checkbox}>
                    <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxActive]}>
                      {isSelected && <Feather name="check" size={12} color={colors.white} />}
                    </View>
                  </Pressable>
                  <Image source={{ uri: player?.profiles?.avatar_url || images.avatarMale }} style={styles.applicantAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.applicantName}>{player?.profiles?.full_name || 'Unnamed player'}</Text>
                    <Text style={styles.applicantMeta}>
                      {age ?? '—'} · {player?.primary_position ?? '—'} · {player?.countries?.name ?? '—'}
                    </Text>
                    <Text style={styles.applicantOvr}>{player?.overall_rating ?? '—'} OVR</Text>
                  </View>
                  <View style={styles.applicantActions}>
                    <Pressable style={styles.viewProfileBtn} onPress={() => router.push({ pathname: '/player/[id]', params: { id: a.player_id } })}>
                      <Text style={styles.viewProfileText}>View Profile</Text>
                    </Pressable>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      <Pressable style={styles.smallActionBtn} onPress={() => setStatus(a.id, 'shortlisted')}>
                        <Text style={styles.smallActionText}>Shortlist</Text>
                      </Pressable>
                      <Pressable style={[styles.smallActionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => setStatus(a.id, 'accepted')}>
                        <Text style={[styles.smallActionText, { color: colors.success }]}>Accept</Text>
                      </Pressable>
                      <Pressable style={[styles.smallActionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => setStatus(a.id, 'rejected')}>
                        <Text style={[styles.smallActionText, { color: colors.error }]}>Reject</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  notFound: { textAlign: 'center', marginTop: 40, fontFamily: fontFamily.regular, color: colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  infoCard: { marginHorizontal: 20, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 16, marginBottom: 16 },
  trialTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary },
  trialClub: { fontFamily: fontFamily.medium, fontSize: fontSize.bodySm, color: colors.textMuted, marginTop: 2, marginBottom: 12 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  infoCell: { width: '47%' },
  infoLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textMuted },
  infoValue: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary, marginTop: 2 },
  trialDesc: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody, lineHeight: 19 },
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  tabChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  tabChipActive: { backgroundColor: colors.primary },
  tabChipText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  tabChipTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  bulkBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, backgroundColor: '#EBF2FF', borderRadius: radii.md, padding: 10, marginBottom: 12 },
  bulkText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.primary },
  bulkBtn: { backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6 },
  bulkBtnGhost: { backgroundColor: colors.surface },
  bulkBtnText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.white },
  applicantList: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  emptyText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center', marginTop: 20 },
  applicantCard: { flexDirection: 'row', gap: 10, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, padding: 12, alignItems: 'flex-start' },
  checkbox: { paddingTop: 4 },
  checkboxBox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxBoxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  applicantAvatar: { width: 44, height: 44, borderRadius: 22 },
  applicantName: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  applicantMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 1 },
  applicantOvr: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, color: colors.primary, marginTop: 3 },
  applicantActions: { alignItems: 'flex-end' },
  viewProfileBtn: { backgroundColor: colors.surface, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
  viewProfileText: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.textPrimary },
  smallActionBtn: { backgroundColor: colors.surface, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 5 },
  smallActionText: { fontFamily: fontFamily.semiBold, fontSize: 10, color: colors.textPrimary },
  myStatusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radii.md, padding: 14 },
  myStatusText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm },
});
