import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { fontFamily, fontSize, radii, spacing, useThemeColors, useIsDark, elevation } from '../theme';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import * as reportsRepository from '../repositories/reportsRepository';
import type { ReportTargetType } from '../repositories/reportsRepository';
import * as blocksRepository from '../repositories/blocksRepository';
import { showAlert } from '../lib/alert';

type Props = {
  visible: boolean;
  title: string;
  targetType: ReportTargetType;
  targetId: string;
  reporterId: string;
  /**
   * Profile id to block. Omitted for targets where blocking is meaningless
   * (your own content), which also hides the Block action entirely.
   */
  blockableProfileId?: string;
  onBlocked?: () => void;
  onClose: () => void;
};

// One shared report sheet reused at every attachment point (Reels, player
// profile, message threads) -- same backdrop+sheet pattern already used for
// Save/Notes/Invite in player/[id].tsx, just factored out since this one
// needs to be reachable from several unrelated screens.
export function ReportModal({ visible, title, targetType, targetId, reporterId, blockableProfileId, onBlocked, onClose }: Props) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      showAlert('Add a reason', 'Tell us what the issue is before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await reportsRepository.createReport({ reporterId, targetType, targetId, reason: reason.trim() });
      showAlert('Report submitted', "Thanks — our team will review this.");
      setReason('');
      onClose();
    } catch (err) {
      showAlert('Could not submit report', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Blocking is immediate and does not wait on a moderator. Reporting asks
  // someone else to act later; blocking is the control the user holds
  // themselves, which matters most in exactly the situation this app has to
  // take seriously -- an adult contacting a young player.
  const confirmBlock = () => {
    if (!blockableProfileId) return;
    showAlert(
      'Block this person?',
      "They won't be able to message you, and you won't see them in your feed. They are not told they've been blocked. You can undo this in Settings.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blocksRepository.blockUser(reporterId, blockableProfileId);
              showAlert('Blocked', 'They can no longer contact you.');
              onBlocked?.();
              onClose();
            } catch (err) {
              showAlert('Could not block', err instanceof Error ? err.message : 'Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityViewIsModal style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close report dialog">
        <Pressable style={[styles.sheet, elevation('overlay', isDark)]} onPress={(e) => e.stopPropagation()} accessible={false}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>Tell us what's wrong. Reports are reviewed by our team, not shown publicly.</Text>
          <View style={styles.inputBox}>
            <TextInput
              placeholder="What's the issue?"
              placeholderTextColor={colors.textPlaceholder}
              style={styles.input}
              multiline
              value={reason}
              onChangeText={setReason}
              editable={!submitting}
            />
          </View>
          <View style={styles.actions}>
            <SecondaryButton label="Cancel" onPress={onClose} style={{ flex: 1 }} />
            <PrimaryButton label={submitting ? 'Submitting…' : 'Submit'} onPress={submit} disabled={submitting} style={{ flex: 1 }} />
          </View>

          {/* Separated from Report on purpose. Reporting asks a moderator to
              act later; blocking takes effect immediately and is the user's
              own control -- required by both app stores, and the more
              important of the two when someone feels unsafe right now. */}
          {!!blockableProfileId && (
            <Pressable
              onPress={confirmBlock}
              style={styles.blockRow}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Block this person"
            >
              <Text style={styles.blockText}>Block this person</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg },
    title: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary },
    hint: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4, marginBottom: 14 },
    inputBox: {
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      padding: 12,
      minHeight: 100,
      marginBottom: 16,
    },
    input: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
    blockRow: { alignItems: 'center', marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
    blockText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.error },
    actions: { flexDirection: 'row', gap: 10 },
  });
}
