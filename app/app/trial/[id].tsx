import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors } from '../../src/theme';
import { NoticeBox } from '../../src/components/NoticeBox';
import { ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Kicker } from '../../src/components/Kicker';
import { Chip } from '../../src/components/Chip';
import { Button } from '../../src/components/Button';
import { cx, fontFamilyDisplay, spacing } from '../../src/theme';

/** First and last initial of a club name, for the crest tile. */
function clubInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '')).toUpperCase();
}

/** One cell of canvas 57's 2x2 fact grid. */
function Fact({
  styles,
  label,
  value,
  tone,
}: {
  styles: Record<string, object>;
  label: string;
  value: string | null;
  tone?: 'success';
}) {
  return (
    <View style={styles.factCell as object}>
      <Kicker size={10}>{label}</Kicker>
      <Text style={[styles.factValue as object, tone === 'success' ? (styles.factSuccess as object) : null]}>
        {value || '—'}
      </Text>
    </View>
  );
}
import { IconButton } from '../../src/components/IconButton';
import { AppTextField } from '../../src/components/AppTextField';
import { images } from '../../src/constants/images';
import { POSITIONS } from '../../src/constants/football';
import { useSessionStore } from '../../src/store/useSessionStore';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import * as trialsRepository from '../../src/repositories/trialsRepository';
import type { ApplicantStatus } from '../../src/repositories/trialsRepository';
import { showAlert } from '../../src/lib/alert';
import { successFeedback } from '../../src/lib/haptics';
import { QueryState } from '../../src/components/QueryState';
import { SkeletonCards } from '../../src/components/Skeleton';
import { getPublicStorageUrl } from '../../src/lib/publicUrl';

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

// Mirrors (scout-tabs)/trials.tsx's own parseDate/formatDate pair -- the
// create and edit forms both work in DD / MM / YYYY text, ISO on the wire.
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

function formatDateForInput(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Trial Management + Applicant review (spec §14/§15): trial detail header,
// status tabs, per-applicant Shortlist/Accept/Reject, and bulk selection.
export default function TrialDetail() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const MY_STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: colors.warningTint, text: colors.goldDark, label: 'Applied — Pending' },
    shortlisted: { bg: colors.infoTint, text: colors.primary, label: 'Shortlisted' },
    accepted: { bg: colors.successTint, text: colors.success, label: 'Accepted' },
    rejected: { bg: colors.dangerTint, text: colors.error, label: 'Rejected' },
    withdrawn: { bg: colors.surfaceMuted, text: colors.textMuted, label: 'Withdrawn' },
  };
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useSessionStore((s) => s.role);
  const userId = useSessionStore((s) => s.session?.user.id);
  const [tab, setTab] = useState<'all' | ApplicantStatus>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '', club: '', location: '', ageMin: '', ageMax: '',
    positions: [] as string[], trialDate: '', deadline: '', description: '',
  });
  const [editCoverUri, setEditCoverUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: trial, isLoading: loadingTrial, error: trialError, refetch: refetchTrial } = useQuery({
    queryKey: ['trial', id],
    enabled: !!id,
    queryFn: () => trialsRepository.getTrialById(id),
  });

  const { data: myApplication, isLoading: loadingMyApplication, refetch: refetchMyApplication } = useQuery({
    queryKey: ['myApplicationForTrial', id, userId],
    enabled: role === 'player' && !!userId && !!id,
    queryFn: () => trialsRepository.getMyApplicationForTrial(userId!, id),
  });

  const APPLICANT_PAGE_SIZE = 20;
  const {
    data: applicantPages,
    refetch: refetchApplicants,
    fetchNextPage: fetchMoreApplicants,
    hasNextPage: hasMoreApplicants,
    isFetchingNextPage: isFetchingApplicants,
  } = useInfiniteQuery({
    queryKey: ['trialApplicants', id, tab],
    enabled: role === 'scout' && !!id,
    initialPageParam: 0,
    // Status filtering happens server-side now -- filtering an already-
    // paginated fetch client-side (the old approach) silently breaks once a
    // popular trial has more applicants than fit on one page: a tab could
    // show 3 of 50 real matches just because the rest hadn't loaded yet.
    queryFn: ({ pageParam }) =>
      trialsRepository.listApplicants(id, { status: tab === 'all' ? undefined : tab, page: pageParam, pageSize: APPLICANT_PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });
  const applicants = applicantPages?.pages.flatMap((p) => p.items) ?? [];

  const { data: statusCounts, refetch: refetchStatusCounts } = useQuery({
    queryKey: ['trialApplicantStatusCounts', id],
    enabled: role === 'scout' && !!id,
    queryFn: () => trialsRepository.getApplicantStatusCounts(id),
  });
  const totalApplicantCount = Object.values(statusCounts ?? {}).reduce((sum, n) => sum + n, 0);

  // These must stay above the early `return` below -- every hook in this
  // component (including the useCallback here) has to run unconditionally
  // on every render. Defining renderApplicant's useCallback after an early
  // return meant it was skipped entirely while the trial was still loading,
  // then suddenly called on the next render once `trial` resolved -- a real
  // "Rendered more hooks than during the previous render" crash, not a
  // theoretical one (React's Rules of Hooks require the exact same hooks,
  // same order, every render).
  const setStatus = async (applicationId: string, status: ApplicantStatus) => {
    try {
      await trialsRepository.updateApplicationStatus(applicationId, status);
      await Promise.all([refetchApplicants(), refetchStatusCounts()]);
    } catch (err) {
      showAlert('Could not update status', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  const toggleSelect = (applicationId: string) =>
    setSelected((s) => (s.includes(applicationId) ? s.filter((x) => x !== applicationId) : [...s, applicationId]));

  const bulkShortlist = async () => {
    await Promise.all(selected.map((appId) => trialsRepository.updateApplicationStatus(appId, 'shortlisted')));
    setSelected([]);
    refetchApplicants();
    refetchStatusCounts();
  };

  const renderApplicant = useCallback(
    ({ item: a }: { item: (typeof applicants)[number] }) => {
      const player = a.players;
      const isSelected = selected.includes(a.id);
      const age = ageFromDob(player?.date_of_birth ?? null);
      return (
        <View style={styles.applicantCard}>
          <Pressable
            onPress={() => toggleSelect(a.id)}
            style={styles.checkbox}
            accessibilityRole="checkbox"
            accessibilityLabel="Select applicant"
            accessibilityState={{ checked: isSelected }}
          >
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
              <Pressable style={[styles.smallActionBtn, { backgroundColor: colors.successTint }]} onPress={() => setStatus(a.id, 'accepted')}>
                <Text style={[styles.smallActionText, { color: colors.success }]}>Accept</Text>
              </Pressable>
              <Pressable style={[styles.smallActionBtn, { backgroundColor: colors.dangerTint }]} onPress={() => setStatus(a.id, 'rejected')}>
                <Text style={[styles.smallActionText, { color: colors.error }]}>Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    },
    [selected, colors, styles]
  );

  if (loadingTrial || trialError || !trial) {
    return (
      <SafeAreaView style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <QueryState isLoading={loadingTrial} error={trialError} onRetry={refetchTrial} skeleton={<SkeletonCards count={1} />}>
          <Text style={styles.notFound}>Trial not found.</Text>
        </QueryState>
      </SafeAreaView>
    );
  }

  const coverUrl = getPublicStorageUrl('post-images', trial.cover_image_path);

  const apply = async () => {
    if (!userId) return;
    setApplying(true);
    try {
      await trialsRepository.applyToTrial(userId, trial.id);
      successFeedback();
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
      <View style={styles.root}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/*
            Canvas 57: a 172px photo hero under a navy-to-paper wash, with the
            back control and a TRIAL kicker over it. The wash ends at the paper
            colour so the card below rides up into it seamlessly.
          */}
          <View style={styles.hero}>
            {!!coverUrl && (
              <ImageBackground source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            )}
            <LinearGradient
              colors={['rgba(10,27,51,0.6)', 'rgba(10,27,51,0.2)', colors.background]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
            <SafeAreaView edges={['top']}>
              <View style={styles.heroBar}>
                <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
                  <Feather name="chevron-left" size={16} color={colors.white} />
                </Pressable>
                <Kicker size={fontSize.caption} tone="inherit" style={{ color: colors.white }}>
                  Trial
                </Kicker>
              </View>
            </SafeAreaView>
          </View>

          <View style={styles.body}>
            {/* Crest + title, riding up over the hero's lower edge. */}
            <View style={styles.titleRow}>
              <View style={styles.crest}>
                <Text style={styles.crestText}>{clubInitials(trial.club)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trialTitle} numberOfLines={2}>
                  {trial.title}
                </Text>
                <Kicker size={fontSize.caption}>{trial.club}</Kicker>
              </View>
            </View>

            {/* Canvas 57's 2x2 fact grid. */}
            <View style={styles.factGrid}>
              <Fact styles={styles} label="Date" value={trial.trial_date} />
              <Fact
                styles={styles}
                label="Ages"
                value={
                  trial.age_min != null || trial.age_max != null
                    ? `${trial.age_min ?? '—'} – ${trial.age_max ?? '—'}`
                    : 'Any'
                }
              />
              <Fact styles={styles} label="Venue" value={trial.location} />
              {/*
                Entry is always Free and always green. Not a field: the trials
                table has no fee column, because Matobev does not allow clubs to
                charge players -- the same rule locked on canvas 30.
              */}
              <Fact styles={styles} label="Entry" value="Free" tone="success" />
            </View>

            <Kicker style={styles.sectionKicker}>Positions wanted</Kicker>
            <View style={styles.chipRow}>
              {(trial.positions.length ? trial.positions : ['Any']).map((pos) => (
                <Chip key={pos} label={pos} variant="filled" />
              ))}
            </View>

            {!!trial.description && <Text style={styles.trialDesc}>{trial.description}</Text>}

            {/*
            Canvas 57 puts this immediately above the apply button, not in a
            help screen. It is the last thing a player reads before committing
            to travel, which is exactly where trial fraud is intercepted --
            the counterpart to the same warning on the trials list.
          */}
            <NoticeBox tone="danger" icon="alert-circle" style={styles.safety}>
              <Text style={styles.safetyStrong}>Never pay to attend.</Text> Report anyone asking
              for money.
            </NoticeBox>

            {loadingMyApplication ? (
              // Don't flash "Apply to this trial" while we still don't know
              // whether an application already exists -- that gap is what
              // let a real double-tap or a fast reopen insert a duplicate
              // row and hit the trial_applications unique-constraint 409.
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: 14 }} />
            ) : status ? (
              <View style={[styles.myStatusBanner, { backgroundColor: MY_STATUS_STYLE[status]?.bg }]}>
                <Feather name="check-circle" size={16} color={MY_STATUS_STYLE[status]?.text} />
                <Text style={[styles.myStatusText, { color: MY_STATUS_STYLE[status]?.text }]}>
                  {myApplication?.source === 'invited' && status === 'pending' ? 'Invited' : MY_STATUS_STYLE[status]?.label}
                </Text>
              </View>
            ) : (
              <Button
                label="Apply to this trial"
                variant="navy"
                onPress={apply}
                disabled={applying}
                loading={applying}
                style={{ marginTop: 10 }}
              />
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  const openEdit = () => {
    setEditForm({
      title: trial.title,
      club: trial.club,
      location: trial.location,
      ageMin: trial.age_min != null ? String(trial.age_min) : '',
      ageMax: trial.age_max != null ? String(trial.age_max) : '',
      positions: trial.positions,
      trialDate: formatDateForInput(trial.trial_date),
      deadline: formatDateForInput(trial.application_deadline),
      description: trial.description ?? '',
    });
    setEditCoverUri(null);
    setEditOpen(true);
  };

  const toggleEditPosition = (p: string) =>
    setEditForm((f) => ({ ...f, positions: f.positions.includes(p) ? f.positions.filter((x) => x !== p) : [...f.positions, p] }));

  const pickEditCoverImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert(
        'Permission needed',
        'Allow photo library access to set a cover image.',
        perm.canAskAgain || Platform.OS === 'web'
          ? undefined
          : [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    setEditCoverUri(result.assets[0].uri);
  };

  const saveEdit = async () => {
    const trialDateIso = parseDate(editForm.trialDate);
    const deadlineIso = parseDate(editForm.deadline);
    if (!editForm.title.trim() || !editForm.club.trim() || !editForm.location.trim() || !trialDateIso || !deadlineIso) {
      showAlert('Missing details', 'Fill in title, club, location, trial date and deadline (DD / MM / YYYY).');
      return;
    }
    setSaving(true);
    try {
      await trialsRepository.updateTrial(trial.id, {
        title: editForm.title.trim(),
        club: editForm.club.trim(),
        location: editForm.location.trim(),
        ageMin: editForm.ageMin ? Number(editForm.ageMin) : undefined,
        ageMax: editForm.ageMax ? Number(editForm.ageMax) : undefined,
        positions: editForm.positions,
        trialDate: trialDateIso,
        applicationDeadline: deadlineIso,
        description: editForm.description.trim() || undefined,
      });
      if (editCoverUri && userId) {
        try {
          await trialsRepository.uploadTrialCoverImage(userId, trial.id, editCoverUri);
        } catch (err) {
          showAlert('Trial updated, cover image failed', err instanceof Error ? err.message : 'Please try again.');
        }
      }
      setEditOpen(false);
      await refetchTrial();
    } catch (err) {
      showAlert('Could not update trial', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteTrial = () => {
    showAlert(
      'Delete this trial?',
      'This permanently removes the trial and cannot be undone. Applicants will no longer see it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await trialsRepository.deleteTrial(trial.id);
              router.back();
            } catch (err) {
              showAlert('Could not delete trial', err instanceof Error ? err.message : 'Please try again.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Trial Management</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <IconButton icon="edit-2" accessibilityLabel="Edit trial" onPress={openEdit} />
          <IconButton icon="trash-2" accessibilityLabel="Delete trial" onPress={deleting ? undefined : confirmDeleteTrial} />
        </View>
      </View>

      <FlashList
        data={applicants}
        keyExtractor={(a) => a.id}
        showsVerticalScrollIndicator={false}
        onEndReached={() => hasMoreApplicants && !isFetchingApplicants && fetchMoreApplicants()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isFetchingApplicants ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} /> : null}
        ListHeaderComponent={
          <>
            {!!coverUrl && <Image source={{ uri: coverUrl }} style={styles.trialCover} contentFit="contain" />}
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
                const count = t.key === 'all' ? totalApplicantCount : statusCounts?.[t.key] ?? 0;
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
          </>
        }
        contentContainerStyle={styles.applicantList}
        ListEmptyComponent={<Text style={styles.emptyText}>No applicants in this stage yet.</Text>}
        renderItem={renderApplicant}
      />

      <Modal visible={editOpen} animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <SafeAreaView accessibilityViewIsModal style={styles.root} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Pressable onPress={() => setEditOpen(false)} accessibilityRole="button" accessibilityLabel="Close">
              <Feather name="x" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>Edit Trial</Text>
            <View style={{ width: 22 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <View>
                <Text style={styles.label}>Cover Image (optional)</Text>
                <Pressable style={styles.coverPicker} onPress={pickEditCoverImage}>
                  {editCoverUri || coverUrl ? (
                    <Image source={{ uri: editCoverUri ?? coverUrl! }} style={styles.coverPickerImage} contentFit="contain" />
                  ) : (
                    <>
                      <Feather name="image" size={22} color={colors.textPlaceholder} />
                      <Text style={styles.coverPickerText}>Add a cover image</Text>
                    </>
                  )}
                </Pressable>
              </View>
              <AppTextField label="Trial Title" value={editForm.title} onChangeText={(v) => setEditForm((f) => ({ ...f, title: v }))} />
              <AppTextField label="Club / Organization" value={editForm.club} onChangeText={(v) => setEditForm((f) => ({ ...f, club: v }))} />
              <AppTextField label="Location" value={editForm.location} onChangeText={(v) => setEditForm((f) => ({ ...f, location: v }))} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <AppTextField label="Age Min" keyboardType="numeric" value={editForm.ageMin} onChangeText={(v) => setEditForm((f) => ({ ...f, ageMin: v }))} />
                <AppTextField label="Age Max" keyboardType="numeric" value={editForm.ageMax} onChangeText={(v) => setEditForm((f) => ({ ...f, ageMax: v }))} />
              </View>
              <View>
                <Text style={styles.label}>Positions</Text>
                <View style={styles.wrapRow}>
                  {POSITIONS.map((p) => {
                    const active = editForm.positions.includes(p);
                    return (
                      <Pressable key={p} style={[styles.optionPill, active && styles.optionPillActive]} onPress={() => toggleEditPosition(p)}>
                        <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>{p}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <AppTextField label="Trial Date" placeholder="DD / MM / YYYY" value={editForm.trialDate} onChangeText={(v) => setEditForm((f) => ({ ...f, trialDate: v }))} />
              <AppTextField label="Application Deadline" placeholder="DD / MM / YYYY" value={editForm.deadline} onChangeText={(v) => setEditForm((f) => ({ ...f, deadline: v }))} />
              <View>
                <Text style={styles.label}>Description</Text>
                <View style={styles.descBox}>
                  <TextInput
                    placeholderTextColor={colors.textPlaceholder}
                    style={styles.descInput}
                    multiline
                    value={editForm.description}
                    onChangeText={(v) => setEditForm((f) => ({ ...f, description: v }))}
                  />
                </View>
              </View>
              <PrimaryButton label={saving ? 'Saving…' : 'Save Changes'} onPress={saveEdit} disabled={saving} loading={saving} style={{ marginTop: 12 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: { height: cx(172), backgroundColor: colors.primaryDark },
  heroBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: cx(14), paddingTop: 10 },
  // Rides up over the hero's lower edge, as the canvas does at -40.
  body: { paddingHorizontal: cx(18), marginTop: -cx(40) },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  crest: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.gold,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crestText: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.bodySm, color: colors.primaryDark },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  factCell: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 10,
  },
  factValue: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.bodyLg, color: colors.textPrimary, marginTop: 2 },
  factSuccess: { color: colors.success },
  sectionKicker: { marginTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  safety: { marginTop: 12 },
  safetyStrong: { fontFamily: fontFamily.bold },
  notFound: { textAlign: 'center', marginTop: 40, fontFamily: fontFamily.regular, color: colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  trialCover: { marginHorizontal: 20, height: 160, borderRadius: radii.lg, marginBottom: 16, backgroundColor: colors.surfaceMuted },
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
  bulkBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, backgroundColor: colors.infoTint, borderRadius: radii.md, padding: 10, marginBottom: 12 },
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
  viewProfileText: { fontFamily: fontFamily.medium, fontSize: fontSize.caption, color: colors.textPrimary },
  smallActionBtn: { backgroundColor: colors.surface, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 5 },
  smallActionText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.caption, color: colors.textPrimary },
  myStatusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radii.md, padding: 14 },
  myStatusText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm },
  formContent: { padding: 20, gap: 14 },
  label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textLabel, marginBottom: 5 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  optionPillActive: { backgroundColor: colors.primary },
  optionPillText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textBody },
  optionPillTextActive: { color: colors.white, fontFamily: fontFamily.semiBold },
  descBox: { borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, padding: 12, minHeight: 90 },
  descInput: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top' },
  coverPicker: { height: 120, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverPickerImage: { width: '100%', height: '100%' },
  coverPickerText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textPlaceholder, marginTop: 6 },
  });
}
