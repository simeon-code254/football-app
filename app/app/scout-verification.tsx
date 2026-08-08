import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, radii, spacing } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';

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
  const [files, setFiles] = useState<Partial<Record<DocType, PickedFile>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    if (!requiredMet) return;
    setSubmitting(true);
    // TODO(backend wiring): upload each file to the `verification-documents`
    // bucket at `{scout_id}/{filename}`, insert one scout_verification_documents
    // row per file, no need to touch scouts.verification_status here — an
    // admin reviews the submission and flips it separately.
    await new Promise((res) => setTimeout(res, 600));
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
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
        <IconButton icon="chevron-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Verification Documents</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                  <Pressable onPress={() => remove(slot.type)} hitSlop={8}>
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

        <PrimaryButton
          label={submitting ? 'Submitting…' : 'Submit for Review'}
          onPress={submit}
          disabled={!requiredMet}
          loading={submitting}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  content: { padding: 20, paddingTop: 8, gap: 18 },
  intro: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, lineHeight: 20 },
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
    backgroundColor: '#EBF2FF', borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 12,
  },
  fileName: { flex: 1, fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textPrimary },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successBadge: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary, marginBottom: 8 },
  successSub: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
