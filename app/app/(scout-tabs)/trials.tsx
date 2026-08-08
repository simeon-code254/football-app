import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../../src/theme';
import { MOCK_TRIALS } from '../../src/data/mockTrials';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { AppTextField } from '../../src/components/AppTextField';
import { useSessionStore } from '../../src/store/useSessionStore';

// Active Trials (spec §13) + Create Trial (spec §14). Tapping a trial opens
// Trial Management / Applicant review (app/trial/[id].tsx, spec §15).
export default function Trials() {
  const [createOpen, setCreateOpen] = useState(false);
  const scoutVerified = useSessionStore((s) => s.scoutVerified);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Trials</Text>
        <Pressable
          style={[styles.createBtn, !scoutVerified && { opacity: 0.5 }]}
          onPress={() => scoutVerified && setCreateOpen(true)}
        >
          <Feather name="plus" size={16} color={colors.white} />
          <Text style={styles.createBtnText}>Create</Text>
        </Pressable>
      </View>

      {!scoutVerified && (
        <View style={styles.verifyNotice}>
          <Feather name="alert-circle" size={14} color={colors.goldDark} />
          <Text style={styles.verifyNoticeText}>Verification required before creating public trials.</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {MOCK_TRIALS.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="clipboard" size={28} color={colors.textPlaceholder} />
            <Text style={styles.emptyTitle}>You don't have any active trials.</Text>
            <Text style={styles.emptySub}>Create a trial to start recruiting.</Text>
            <PrimaryButton label="Create Trial" onPress={() => setCreateOpen(true)} style={{ marginTop: 16, width: 200 }} />
          </View>
        ) : (
          MOCK_TRIALS.map((trial) => (
            <Pressable key={trial.id} style={styles.card} onPress={() => router.push({ pathname: '/trial/[id]', params: { id: trial.id } })}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{trial.title}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>Open</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>{trial.club} · {trial.location}</Text>
              <Text style={styles.cardMeta}>Positions: {trial.position} · Ages {trial.ageRange}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardApplicants}>{trial.applicants.length} Applicants</Text>
                <Text style={styles.cardDeadline}>Deadline: {trial.deadline}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Pressable onPress={() => setCreateOpen(false)}>
              <Feather name="x" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.title}>Create Trial</Text>
            <View style={{ width: 22 }} />
          </View>
          <ScrollView contentContainerStyle={styles.formContent}>
            <AppTextField label="Trial Title" placeholder="e.g. U21 Winger Trial" />
            <AppTextField label="Club / Organization" placeholder="Your club or organization" />
            <AppTextField label="Location" placeholder="City, Country" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <AppTextField label="Age Min" placeholder="16" keyboardType="numeric" />
              <AppTextField label="Age Max" placeholder="21" keyboardType="numeric" />
            </View>
            <AppTextField label="Positions" placeholder="e.g. LW / RW" />
            <AppTextField label="Trial Date" placeholder="DD / MM / YYYY" />
            <AppTextField label="Application Deadline" placeholder="DD / MM / YYYY" />
            <View>
              <Text style={styles.label}>Description</Text>
              <View style={styles.descBox}>
                <TextInput
                  placeholder="What should players bring or know?"
                  placeholderTextColor={colors.textPlaceholder}
                  style={styles.descInput}
                  multiline
                />
              </View>
            </View>
            <PrimaryButton
              label="Publish Trial"
              onPress={() => setCreateOpen(false)}
              style={{ marginTop: 12 }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.display, color: colors.textPrimary },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 9 },
  createBtnText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.white },
  verifyNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8E1', marginHorizontal: 20, borderRadius: radii.md, padding: 10, marginBottom: 8 },
  verifyNoticeText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: '#7A5C00', flex: 1 },
  list: { padding: 20, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary, marginTop: 8, textAlign: 'center' },
  emptySub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary, flex: 1 },
  statusBadge: { backgroundColor: '#F0FDF4', borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.success },
  cardMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  cardApplicants: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.primary },
  cardDeadline: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted },
  formContent: { padding: 20, gap: 14 },
  label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textLabel, marginBottom: 5 },
  descBox: { borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, padding: 12, minHeight: 90 },
  descInput: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top' },
});
