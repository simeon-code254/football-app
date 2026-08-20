import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors, useIsDark, elevation } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { QueryState } from '../src/components/QueryState';
import { SkeletonRow } from '../src/components/Skeleton';
import { SelectField } from '../src/components/SelectField';
import { useSessionStore } from '../src/store/useSessionStore';
import * as prefsRepository from '../src/repositories/notificationPrefsRepository';
import { MUTABLE_GROUPS } from '../src/repositories/notificationPrefsRepository';
import { getPushPermission } from '../src/lib/push';
import { showAlert } from '../src/lib/alert';
import { tapFeedback } from '../src/lib/haptics';

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

export default function NotificationSettings() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notificationPrefs', userId],
    enabled: !!userId,
    queryFn: () => prefsRepository.getPrefs(userId!),
  });

  const [muted, setMuted] = useState<string[]>([]);
  const [quietFrom, setQuietFrom] = useState<number | null>(null);
  const [quietTo, setQuietTo] = useState<number | null>(null);
  const [permission, setPermission] = useState<string>('undetermined');

  useEffect(() => {
    if (!data) return;
    setMuted(data.muted_types ?? []);
    setQuietFrom(data.quiet_from_minute != null ? prefsRepository.utcMinutesToLocal(data.quiet_from_minute) : null);
    setQuietTo(data.quiet_to_minute != null ? prefsRepository.utcMinutesToLocal(data.quiet_to_minute) : null);
  }, [data]);

  useEffect(() => {
    getPushPermission().then(setPermission).catch(() => {});
  }, []);

  // Saved on every change rather than behind a Save button -- these are
  // preferences, not a form, and a toggle that needs confirming reads as
  // broken.
  const persist = async (nextMuted: string[], nextFrom: number | null, nextTo: number | null) => {
    if (!userId) return;
    try {
      await prefsRepository.savePrefs(userId, {
        muted_types: nextMuted,
        quiet_from_minute: nextFrom != null ? prefsRepository.localMinutesToUtc(nextFrom) : null,
        quiet_to_minute: nextTo != null ? prefsRepository.localMinutesToUtc(nextTo) : null,
      });
    } catch (err) {
      showAlert('Could not save', err instanceof Error ? err.message : 'Please try again.');
      refetch();
    }
  };

  const toggleGroup = (types: readonly string[], enabled: boolean) => {
    tapFeedback();
    const next = enabled
      ? muted.filter((t) => !types.includes(t))
      : Array.from(new Set([...muted, ...types]));
    setMuted(next);
    persist(next, quietFrom, quietTo);
  };

  const setQuiet = (from: number | null, to: number | null) => {
    setQuietFrom(from);
    setQuietTo(to);
    persist(muted, from, to);
  };

  const quietEnabled = quietFrom != null && quietTo != null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonRow count={6} />}>
        <ScrollView contentContainerStyle={styles.content}>
          {permission === 'denied' && (
            // Without this the toggles below look functional while nothing
            // can actually arrive -- the OS decides, and on iOS a refusal
            // can only be undone in Settings.
            <Pressable style={styles.warn} onPress={() => router.push('/settings')}>
              <Feather name="alert-circle" size={15} color={colors.error} />
              <Text style={styles.warnText}>
                Notifications are turned off for Matobev in your phone's settings. These preferences won't take
                effect until you turn them back on there.
              </Text>
            </Pressable>
          )}

          <Text style={styles.sectionLabel}>What you get notified about</Text>
          <View style={[styles.card, elevation('raised', isDark)]}>
            {MUTABLE_GROUPS.map((g, i) => {
              const enabled = !g.types.some((t) => muted.includes(t));
              return (
                <View key={g.key} style={[styles.row, i < MUTABLE_GROUPS.length - 1 && styles.rowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{g.label}</Text>
                    <Text style={styles.rowSub}>{g.description}</Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={(v) => toggleGroup(g.types, v)}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    accessibilityLabel={g.label}
                  />
                </View>
              );
            })}
          </View>
          {/* Explains an absence the user would otherwise notice and
              mistrust: why account and moderation notices have no switch. */}
          <Text style={styles.note}>
            Account and moderation notices — like a suspension or a video being removed — always send. You need to
            know when something happens to your account.
          </Text>

          <Text style={styles.sectionLabel}>Quiet hours</Text>
          <View style={[styles.card, elevation('raised', isDark)]}>
            <View style={[styles.row, quietEnabled && styles.rowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Pause notifications overnight</Text>
                <Text style={styles.rowSub}>Nothing arrives during these hours</Text>
              </View>
              <Switch
                value={quietEnabled}
                onValueChange={(v) => (v ? setQuiet(22 * 60, 7 * 60) : setQuiet(null, null))}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel="Quiet hours"
              />
            </View>

            {quietEnabled && (
              <View style={styles.quietRow}>
                <View style={{ flex: 1 }}>
                  <SelectField
                    label="From"
                    value={prefsRepository.formatMinutes(quietFrom!)}
                    options={HOURS}
                    onChange={(v: string) => setQuiet(Number(v.slice(0, 2)) * 60, quietTo)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <SelectField
                    label="Until"
                    value={prefsRepository.formatMinutes(quietTo!)}
                    options={HOURS}
                    onChange={(v: string) => setQuiet(quietFrom, Number(v.slice(0, 2)) * 60)}
                  />
                </View>
              </View>
            )}
          </View>
          <Text style={styles.note}>
            Quiet hours use your phone's current time zone. If you move countries, set them again.
          </Text>
        </ScrollView>
      </QueryState>
    </SafeAreaView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.title, color: colors.textPrimary },
    content: { padding: spacing.lg, paddingBottom: spacing.huge },
    sectionLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: colors.textMuted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
    rowTitle: { fontFamily: fontFamily.medium, fontSize: fontSize.body, color: colors.textPrimary },
    rowSub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    quietRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, paddingTop: spacing.md },
    note: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: colors.textPlaceholder,
      lineHeight: 17,
      marginTop: spacing.md,
    },
    warn: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
      backgroundColor: colors.dangerTint,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    warnText: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textBody, lineHeight: 17 },
  });
}
