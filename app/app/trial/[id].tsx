import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { IconButton } from '../../src/components/IconButton';
import { getTrialById, applicantPlayer, getMyApplication, type ApplicantStatus, type MockApplicant, type MyApplicationStatus } from '../../src/data/mockTrials';
import { useSessionStore } from '../../src/store/useSessionStore';
import { PrimaryButton } from '../../src/components/PrimaryButton';

const MY_STATUS_STYLE: Record<MyApplicationStatus, { bg: string; text: string; label: string }> = {
  invited: { bg: '#EBF2FF', text: colors.primary, label: 'Invited' },
  pending: { bg: '#FFF8E1', text: colors.goldDark, label: 'Applied — Pending' },
  shortlisted: { bg: '#EBF2FF', text: colors.primary, label: 'Shortlisted' },
  accepted: { bg: '#F0FDF4', text: colors.success, label: 'Accepted' },
  rejected: { bg: '#FEF2F2', text: colors.error, label: 'Rejected' },
};

const STATUS_TABS: { key: 'all' | ApplicantStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

// Trial Management + Applicant review (spec §14/§15): trial detail header,
// status tabs, per-applicant Shortlist/Accept/Reject, and bulk selection.
export default function TrialDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trial = getTrialById(id);
  const [applicants, setApplicants] = useState<MockApplicant[]>(trial?.applicants ?? []);
  const [tab, setTab] = useState<'all' | ApplicantStatus>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const role = useSessionStore((s) => s.role);
  const [justApplied, setJustApplied] = useState(false);

  if (!trial) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.notFound}>Trial not found.</Text>
      </SafeAreaView>
    );
  }

  if (role === 'player') {
    const mine = getMyApplication(trial.id);
    const status = justApplied ? 'pending' : mine?.status;
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <IconButton icon="chevron-left" onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Trial Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.infoCard}>
            <Text style={styles.trialTitle}>{trial.title}</Text>
            <Text style={styles.trialClub}>{trial.club}</Text>
            <View style={styles.infoGrid}>
              <InfoCell label="Location" value={trial.location} />
              <InfoCell label="Age" value={trial.ageRange} />
              <InfoCell label="Position" value={trial.position} />
              <InfoCell label="Deadline" value={trial.deadline} />
            </View>
            <Text style={styles.trialDesc}>{trial.description}</Text>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {status ? (
              <View style={[styles.myStatusBanner, { backgroundColor: MY_STATUS_STYLE[status].bg }]}>
                <Feather name="check-circle" size={16} color={MY_STATUS_STYLE[status].text} />
                <Text style={[styles.myStatusText, { color: MY_STATUS_STYLE[status].text }]}>
                  {MY_STATUS_STYLE[status].label}
                </Text>
              </View>
            ) : (
              <PrimaryButton label="Apply for Trial" onPress={() => setJustApplied(true)} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const setStatus = (playerId: string, status: ApplicantStatus) => {
    setApplicants((list) => list.map((a) => (a.playerId === playerId ? { ...a, status } : a)));
  };

  const filtered = tab === 'all' ? applicants : applicants.filter((a) => a.status === tab);
  const toggleSelect = (playerId: string) =>
    setSelected((s) => (s.includes(playerId) ? s.filter((x) => x !== playerId) : [...s, playerId]));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Trial Management</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.trialTitle}>{trial.title}</Text>
          <Text style={styles.trialClub}>{trial.club}</Text>
          <View style={styles.infoGrid}>
            <InfoCell label="Location" value={trial.location} />
            <InfoCell label="Age" value={trial.ageRange} />
            <InfoCell label="Position" value={trial.position} />
            <InfoCell label="Deadline" value={trial.deadline} />
          </View>
          <Text style={styles.trialDesc}>{trial.description}</Text>
        </View>

        <View style={styles.tabsRow}>
          {STATUS_TABS.map((t) => {
            const active = tab === t.key;
            const count = t.key === 'all' ? applicants.length : applicants.filter((a) => a.status === t.key).length;
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
              <Pressable
                style={styles.bulkBtn}
                onPress={() => {
                  selected.forEach((id) => setStatus(id, 'shortlisted'));
                  setSelected([]);
                }}
              >
                <Text style={styles.bulkBtnText}>Shortlist</Text>
              </Pressable>
              <Pressable style={[styles.bulkBtn, styles.bulkBtnGhost]}>
                <Text style={[styles.bulkBtnText, { color: colors.primary }]}>Message</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.applicantList}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No applicants in this stage yet.</Text>
          ) : (
            filtered.map((a) => {
              const player = applicantPlayer(a);
              const isSelected = selected.includes(a.playerId);
              return (
                <View key={a.playerId} style={styles.applicantCard}>
                  <Pressable onPress={() => toggleSelect(a.playerId)} style={styles.checkbox}>
                    <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxActive]}>
                      {isSelected && <Feather name="check" size={12} color={colors.white} />}
                    </View>
                  </Pressable>
                  <Image source={{ uri: player.avatar }} style={styles.applicantAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.applicantName}>{player.name}</Text>
                    <Text style={styles.applicantMeta}>
                      {player.age} · {player.position} · {player.flag} {player.country}
                    </Text>
                    <Text style={styles.applicantOvr}>{player.overall} OVR</Text>
                  </View>
                  <View style={styles.applicantActions}>
                    <Pressable style={styles.viewProfileBtn} onPress={() => router.push({ pathname: '/player/[id]', params: { id: player.id } })}>
                      <Text style={styles.viewProfileText}>View Profile</Text>
                    </Pressable>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      <Pressable style={styles.smallActionBtn} onPress={() => setStatus(a.playerId, 'shortlisted')}>
                        <Text style={styles.smallActionText}>Shortlist</Text>
                      </Pressable>
                      <Pressable style={[styles.smallActionBtn, { backgroundColor: '#F0FDF4' }]} onPress={() => setStatus(a.playerId, 'accepted')}>
                        <Text style={[styles.smallActionText, { color: colors.success }]}>Accept</Text>
                      </Pressable>
                      <Pressable style={[styles.smallActionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => setStatus(a.playerId, 'rejected')}>
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
