import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, useThemeColors } from '../src/theme';
import { NoticeBox, ProgressSteps } from '../src/components/NoticeBox';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as verificationRepository from '../src/repositories/verificationRepository';
import * as profileRepository from '../src/repositories/profileRepository';
import { showAlert } from '../src/lib/alert';
import { QueryState } from '../src/components/QueryState';
import { SkeletonRow } from '../src/components/Skeleton';

type DocType = 'id_document' | 'proof_of_organization' | 'certification';

type SlotDef = { type: DocType; label: string; description: string; required: boolean };

const SLOTS: SlotDef[] = [
  {
    type: 'id_document',
    label: 'ID Document',
    description: 'A government-issued ID (national ID, passport, or driver’s license).',
    required: true,
  },
  {
    type: 'proof_of_organization',
    label: 'Proof of Organization / Club Affiliation',
    description: 'A letter, badge, or contract showing your club/organization and role.',
    required: true,
  },
  {
    type: 'certification',
    label: 'Coaching / Scouting Certification',
    description: 'Optional — strengthens your application if you have one.',
    required: false,
  },
];

type PickedFile = { name: string; uri: string; mimeType?: string | null };

// Maps directly onto scout_verification_documents (document_type,
// storage_path, file_name) — picking happens locally here; the actual
// Storage upload + row insert lands when this screen gets wired to real
// Supabase, same as the rest of the app right now.
export default function ScoutVerification() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<Partial<Record<DocType, PickedFile>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Revisiting this screen after already submitting (a past session, or
  // just navigating back) always showed the blank form again -- `submitted`
  // was local-only state, so there was no way to tell "already submitted,
  // under review" from "never submitted", and a rejected scout had no
  // visible reason at all.
  const {
    data: scout,
    isLoading: loadingScout,
    error: scoutError,
    refetch: refetchScout,
  } = useQuery({
    queryKey: ['scoutVerificationStatus', userId],
    enabled: !!userId,
    queryFn: () => profileRepository.getMyScout(userId!),
  });
  const {
    data: existingDocs,
    isLoading: loadingDocs,
    error: docsError,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ['scoutVerificationDocs', userId],
    enabled: !!userId,
    queryFn: () => verificationRepository.listMyDocuments(userId!),
  });
  const alreadyUnderReview = scout?.verification_status === 'pending' && (existingDocs?.length ?? 0) > 0;
  const rejected = scout?.verification_status === 'rejected';

  const requiredMet = SLOTS.filter((s) => s.required).every((s) => files[s.type]);

  const pick = async (type: DocType) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFiles((f) => ({ ...f, [type]: { name: asset.name, uri: asset.uri, mimeType: asset.mimeType } }));
  };

  const remove = (type: DocType) => setFiles((f) => { const next = { ...f }; delete next[type]; return next; });

  const submit = async () => {
    if (!requiredMet) {
      showAlert('Missing documents', 'Upload your ID document and proof of organization before submitting.');
      return;
    }
    if (!userId) {
      showAlert('Not signed in', 'Your session isn\'t ready yet — please try again in a moment.');
      return;
    }
    setSubmitting(true);
    try {
      const entries = Object.entries(files) as [DocType, PickedFile][];
      for (const [type, file] of entries) {
        await verificationRepository.uploadVerificationDocument(userId, type, file.uri, file.name, file.mimeType);
      }
      queryClient.invalidateQueries({ queryKey: ['scoutVerificationDocs', userId] });
      setSubmitted(true);
    } catch (err) {
      showAlert('Submission failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Previously neither query's isLoading/error was ever checked -- a failed
  // fetch (network drop, RLS denial) silently rendered the blank upload form
  // instead of the real state, so a rejected or already-under-review scout
  // had no way to tell why nothing looked right.
  if (loadingScout || loadingDocs || scoutError || docsError) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
          <Text style={styles.headerTitle}>Verification Documents</Text>
          <View style={{ width: 36 }} />
        </View>
        <QueryState
          isLoading={loadingScout || loadingDocs}
          error={scoutError || docsError}
          onRetry={() => {
            refetchScout();
            refetchDocs();
          }}
          skeleton={<SkeletonRow count={4} />}
        >
          <View />
        </QueryState>
      </SafeAreaView>
    );
  }

  if (submitted || alreadyUnderReview) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.successWrap}>
          <View style={styles.successBadge}>
            <Feather name="check" size={32} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Documents Submitted</Text>
          <Text style={styles.successSub}>
            Our team will review your submission, usually within 1–2 business days. We'll notify you once a decision is made.
          </Text>
          <PrimaryButton label="Back to Dashboard" onPress={() => router.replace('/(scout-tabs)/home')} style={{ width: '100%', marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" accessibilityLabel="Go back" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Verification Documents</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Canvas 48 SCOUT PATH · ID CHECK is step 3 of 4. */}
        <ProgressSteps step={3} total={4} style={styles.steps} />

        {/*
          The canvas prints the reason under the upload slots, and it is the
          reason: this check is what is_verified_scout() gates on, and that
          function is what every RLS policy protecting a minor consults. An
          unverified scout is not merely un-badged -- the database will not
          return an under-18 player's row to them at all.
        */}
        <NoticeBox style={styles.why}>
          Minors are invisible to unverified accounts. This check is why.
        </NoticeBox>

        {rejected && (
          <View style={styles.rejectedBanner}>
            <Feather name="x-circle" size={16} color={colors.error} />
            <Text style={styles.rejectedBannerText}>
              {scout?.verification_notes || "Your previous submission wasn't approved."} Please review and resubmit below.
            </Text>
          </View>
        )}
        <Text style={styles.intro}>
          Submit the documents below so our team can verify your scout account. Verified scouts can message players
          and create public trials.
        </Text>

        {SLOTS.map((slot) => {
          const file = files[slot.type];
          return (
            <View key={slot.type} style={styles.slot}>
              <View style={styles.slotHeader}>
                <Text style={styles.slotLabel}>
                  {slot.label} {slot.required && <Text style={styles.required}>*</Text>}
                </Text>
                {!slot.required && <Text style={styles.optionalTag}>Optional</Text>}
              </View>
              <Text style={styles.slotDescription}>{slot.description}</Text>

              {file ? (
                <View style={styles.filePill}>
                  <Feather name="file-text" size={16} color={colors.primary} />
                  <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                  <Pressable onPress={() => remove(slot.type)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove document">
                    <Feather name="x" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.uploadBtn} onPress={() => pick(slot.type)}>
                  <Feather name="upload" size={16} color={colors.primary} />
                  <Text style={styles.uploadText}>Upload file</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {!requiredMet && (
          <Text style={styles.missingHint}>Upload your ID document and proof of organization to submit.</Text>
        )}
        <PrimaryButton
          label={submitting ? 'Submitting…' : 'Submit for Review'}
          onPress={submit}
          loading={submitting}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  steps: { marginBottom: 16 },
  why: { marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  content: { padding: 20, paddingTop: 8, gap: 18 },
  intro: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, lineHeight: 20 },
  rejectedBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.dangerTint, borderRadius: radii.md, padding: 12 },
  rejectedBannerText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.error, lineHeight: 18 },
  slot: { gap: 6 },
  slotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.textPrimary },
  required: { color: colors.error },
  optionalTag: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.textPlaceholder },
  slotDescription: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.borderDashed, borderStyle: 'dashed',
    borderRadius: radii.md, backgroundColor: colors.surfaceMuted, paddingVertical: 14,
  },
  uploadText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.primary },
  filePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.infoTint, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 12,
  },
  fileName: { flex: 1, fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textPrimary },
  missingHint: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: -8 },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successBadge: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.successTint, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary, marginBottom: 8 },
  successSub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  });
}
