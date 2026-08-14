import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { fontFamily, fontSize, radii, useThemeColors } from '../../src/theme';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { AppTextField } from '../../src/components/AppTextField';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import { POSITIONS } from '../../src/constants/football';
import { showAlert } from '../../src/lib/alert';
import { QueryState } from '../../src/components/QueryState';

function parseDate(text: string): string | null {
  const parts = text.split(/\D+/).filter(Boolean);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (y.length !== 4) return null;
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Active Trials (spec §13) + Create Trial (spec §14). Tapping a trial opens
// Trial Management / Applicant review (app/trial/[id].tsx, spec §15).
export default function Trials() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
    open: { bg: colors.successTint, text: colors.success },
    closed: { bg: colors.surfaceMuted, text: colors.textMuted },
    cancelled: { bg: colors.dangerTint, text: colors.error },
  };
  const [createOpen, setCreateOpen] = useState(false);
  const scoutVerified = useSessionStore((s) => s.scoutVerified);
  const userId = useSessionStore((s) => s.session?.user.id);

  const [title, setTitle] = useState('');
  const [club, setClub] = useState('');
  const [location, setLocation] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [positions, setPositions] = useState<string[]>([]);
  const [trialDate, setTrialDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [publishing, setPublishing] = useState(false);

  const PAGE_SIZE = 20;
  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['myTrials', userId],
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => trialsRepository.listMyTrials(userId!, { page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });
  // A working scout's all-time trial history only grows -- paged load-more
  // instead of fetching every trial they've ever created, up front, every
  // time this screen opens.
  const trials = data?.pages.flatMap((p) => p.items) ?? [];

  const { data: counts } = useQuery({
    queryKey: ['trialApplicantCounts', trials.map((t) => t.id)],
    enabled: !!trials.length,
    queryFn: () => trialsRepository.getApplicantCounts(trials.map((t) => t.id)),
  });

  const resetForm = () => {
    setTitle(''); setClub(''); setLocation(''); setAgeMin(''); setAgeMax('');
    setPositions([]); setTrialDate(''); setDeadline(''); setDescription('');
  };

  const togglePosition = (p: string) =>
    setPositions((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]));

  const publish = async () => {
    if (!userId) return;
    const trialDateIso = parseDate(trialDate);
    const deadlineIso = parseDate(deadline);
    if (!title.trim() || !club.trim() || !location.trim() || !trialDateIso || !deadlineIso) {
      showAlert('Missing details', 'Fill in title, club, location, trial date and deadline (DD / MM / YYYY).');
      return;
    }
    setPublishing(true);
    try {
      await trialsRepository.createTrial({
        scoutId: userId,
        title: title.trim(),
        club: club.trim(),
        location: location.trim(),
        ageMin: ageMin ? Number(ageMin) : undefined,
        ageMax: ageMax ? Number(ageMax) : undefined,
        positions,
        trialDate: trialDateIso,
        applicationDeadline: deadlineIso,
        description: description.trim() || undefined,
      });
      resetForm();
      setCreateOpen(false);
      refetch();
    } catch (err) {
      showAlert('Could not create trial', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const renderTrial = useCallback(
    ({ item: trial }: { item: (typeof trials)[number] }) => {
      const statusStyle = STATUS_STYLE[trial.status] ?? STATUS_STYLE.open;
      return (
        <Pressable style={styles.card} onPress={() => router.push({ pathname: '/trial/[id]', params: { id: trial.id } })}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>{trial.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{trial.status}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>{trial.club} · {trial.location}</Text>
          <Text style={styles.cardMeta}>Positions: {trial.positions.join(', ') || 'Any'} · Ages {trial.age_min ?? '—'}-{trial.age_max ?? '—'}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardApplicants}>{counts?.[trial.id] ?? 0} Applicants</Text>
            <Text style={styles.cardDeadline}>Deadline: {trial.application_deadline}</Text>
          </View>
        </Pressable>
      );
    },
    [counts, styles, STATUS_STYLE]
  );

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

      <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
      {!trials.length ? (
        <View style={styles.empty}>
          <Feather name="clipboard" size={28} color={colors.textPlaceholder} />
          <Text style={styles.emptyTitle}>You don't have any active trials.</Text>
          <Text style={styles.emptySub}>Create a trial to start recruiting.</Text>
          {scoutVerified && (
            <PrimaryButton label="Create Trial" onPress={() => setCreateOpen(true)} style={{ marginTop: 16, width: 200 }} />
          )}
        </View>
      ) : (
        <FlatList
          data={trials}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          initialNumToRender={10}
          windowSize={7}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} /> : null}
          renderItem={renderTrial}
        />
      )}
      </QueryState>

      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Pressable onPress={() => setCreateOpen(false)}>
              <Feather name="x" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.title}>Create Trial</Text>
            <View style={{ width: 22 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <AppTextField label="Trial Title" placeholder="e.g. U21 Winger Trial" value={title} onChangeText={setTitle} />
            <AppTextField label="Club / Organization" placeholder="Your club or organization" value={club} onChangeText={setClub} />
            <AppTextField label="Location" placeholder="City, Country" value={location} onChangeText={setLocation} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <AppTextField label="Age Min" placeholder="16" keyboardType="numeric" value={ageMin} onChangeText={setAgeMin} />
              <AppTextField label="Age Max" placeholder="21" keyboardType="numeric" value={ageMax} onChangeText={setAgeMax} />
            </View>
            <View>
              <Text style={styles.label}>Positions</Text>
              <View style={styles.wrapRow}>
                {POSITIONS.map((p) => {
                  const active = positions.includes(p);
                  return (
                    <Pressable key={p} style={[styles.optionPill, active && styles.optionPillActive]} onPress={() => togglePosition(p)}>
                      <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>{p}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <AppTextField label="Trial Date" placeholder="DD / MM / YYYY" value={trialDate} onChangeText={setTrialDate} />
            <AppTextField label="Application Deadline" placeholder="DD / MM / YYYY" value={deadline} onChangeText={setDeadline} />
            <View>
              <Text style={styles.label}>Description</Text>
              <View style={styles.descBox}>
                <TextInput
                  placeholder="What should players bring or know?"
                  placeholderTextColor={colors.textPlaceholder}
                  style={styles.descInput}
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </View>
            <PrimaryButton
              label={publishing ? 'Publishing…' : 'Publish Trial'}
              onPress={publish}
              disabled={publishing}
              loading={publishing}
              style={{ marginTop: 12 }}
            />
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.display, color: colors.textPrimary },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 9 },
  createBtnText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.white },
  verifyNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningTint, marginHorizontal: 20, borderRadius: radii.md, padding: 10, marginBottom: 8 },
  verifyNoticeText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: '#7A5C00', flex: 1 },
  list: { padding: 20, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
  emptyTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodyLg, color: colors.textPrimary, marginTop: 8, textAlign: 'center' },
  emptySub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary, flex: 1 },
  statusBadge: { backgroundColor: colors.successTint, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.success, textTransform: 'capitalize' },
  cardMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider },
  cardApplicants: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.primary },
  cardDeadline: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted },
  formContent: { padding: 20, gap: 14 },
  label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textLabel, marginBottom: 5 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  optionPillActive: { backgroundColor: colors.primary },
  optionPillText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  optionPillTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  descBox: { borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, padding: 12, minHeight: 90 },
  descInput: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top' },
  });
}
