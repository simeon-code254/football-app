import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useQuery } from '@tanstack/react-query';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
} from '../../src/theme';
import { Kicker } from '../../src/components/Kicker';
import { InitialsAvatar } from '../../src/components/InitialsAvatar';
import { QueryState } from '../../src/components/QueryState';
import { SkeletonRow } from '../../src/components/Skeleton';
import { useSessionStore } from '../../src/store/useSessionStore';
import { showAlert } from '../../src/lib/alert';
import * as clubsRepository from '../../src/repositories/clubsRepository';

// Canvas screen 53 CLUB TEAM.
//
//   "Your scouts"                      "5 SEATS · 2 FREE"
//   JM  James Mwangi   HEAD OF SCOUTING   [ADMIN]
//   LK  Lucy Kariuki   SCOUT · WEST REGION [SCOUT]
//   DO  Daniel Ochieng PENDING INVITE      [SENT]
//   + Invite a scout · 2 SEATS LEFT ON YOUR PLAN
//
// -- SEATS ARE COUNTED FROM THE DATABASE, AND ENFORCED THERE --
//
// The header reads seat_limit from the club row and subtracts the live member
// count; it does not hardcode 5. And the "seats left" figure here is advisory
// only -- the real limit is a trigger (enforce_club_seat_limit) that rejects an
// over-limit insert. Two admins inviting simultaneously on two devices would
// both see a free seat; only one insert survives. Seats are a billing boundary,
// so the client is not allowed to be the thing that guards them.
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', scout: 'Scout' };

export default function ClubTeam() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const clubId = useSessionStore((s) => s.session?.user.id);
  const club = useSessionStore((s) => s.club);

  const { data: members, isLoading, error, refetch } = useQuery({
    queryKey: ['clubMembers', clubId],
    enabled: !!clubId,
    queryFn: () => clubsRepository.listMembers(clubId!),
  });

  const limit = club?.seat_limit ?? null;
  const used = members?.length ?? 0;
  const free = limit == null ? null : Math.max(0, limit - used);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Your scouts
          </Text>
          <Kicker>
            {limit == null ? '—' : `${limit} seats · ${free} free`}
          </Kicker>
        </View>

        <QueryState
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          skeleton={<SkeletonRow count={3} />}
          isEmpty={!members?.length}
          emptyIcon="users"
          emptyMessage="No scouts yet. Invite one to start building your shortlist."
        >
          <View style={styles.list}>
            {(members ?? []).map((m) => {
              const pending = m.status === 'invited';
              const name = m.profiles?.full_name ?? 'Invited scout';
              return (
                <View key={m.id} style={styles.row}>
                  <InitialsAvatar name={name} uri={m.profiles?.avatar_url} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    <Kicker size={fontSize.caption}>
                      {pending ? 'Pending invite' : ROLE_LABEL[m.member_role] ?? m.member_role}
                    </Kicker>
                  </View>
                  <View style={[styles.tag, pending && styles.tagPending]}>
                    <Text style={[styles.tagText, pending && styles.tagTextPending]}>
                      {pending ? 'Sent' : ROLE_LABEL[m.member_role] ?? m.member_role}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      showAlert(
                        `Remove ${name}?`,
                        'They lose access to this club immediately. The seat is freed straight away.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: async () => {
                              await clubsRepository.removeMember(m.id);
                              refetch();
                            },
                          },
                        ]
                      )
                    }
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${name}`}
                  >
                    <Feather name="x" size={16} color={colors.textPlaceholder} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </QueryState>

        <Pressable
          style={[styles.invite, free === 0 && styles.inviteFull]}
          disabled={free === 0}
          onPress={() =>
            showAlert(
              'Invite a scout',
              'Scout invitations are sent by email from the club dashboard. This is not wired to a mail provider yet.'
            )
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: free === 0 }}
        >
          <Feather name="plus" size={16} color={free === 0 ? colors.textDisabled : colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.inviteText, free === 0 && { color: colors.textDisabled }]}>
              Invite a scout
            </Text>
            <Kicker size={fontSize.caption}>
              {free == null
                ? 'Checking your plan'
                : free === 0
                  ? 'No seats left on your plan'
                  : `${free} seat${free === 1 ? '' : 's'} left on your plan`}
            </Kicker>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: cx(16), paddingBottom: spacing.xxl },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: spacing.lg,
    },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.textPrimary,
    },
    list: { gap: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    name: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
    tag: {
      backgroundColor: colors.successTint,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    tagPending: { backgroundColor: colors.warningTint },
    tagText: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.caption,
      color: colors.success,
    },
    tagTextPending: { color: colors.goldDark },
    invite: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.borderDashed,
    },
    inviteFull: { opacity: 0.6 },
    inviteText: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.bodyLg,
      color: colors.textPrimary,
    },
  });
}
