import { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors } from '../src/theme';
import { PlayerCard } from '../src/components/PlayerCard';
import { QueryState } from '../src/components/QueryState';
import { SkeletonRow } from '../src/components/Skeleton';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import * as profileRepository from '../src/repositories/profileRepository';
import type { PlayerPublicView } from '../src/repositories/profileRepository';
import { images } from '../src/constants/images';
import { showAlert } from '../src/lib/alert';

const PAGE_SIZE = 20;

// Signed-out browse. The single biggest activation problem this app had was
// that it asked for a lot before showing anything: sign up, leave for an
// email round-trip, come back, complete a wizard, upload a video, wait for
// processing -- ten to twenty minutes before the first moment of value,
// against an industry target measured in seconds.
//
// This screen is the answer: real players, real ratings, visible before any
// commitment. It reads `player_public_view`, which is already readable
// without a session and deliberately contains no contact details.
//
// What stays behind sign-up, on purpose: video (footage of players, many of
// whom are minors), messaging, attribute breakdowns and everything gated by
// is_verified_scout(). Registration is prompted by intent -- when someone
// tries to do one of those things -- rather than at the door.
export default function Browse() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['browsePlayers'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      profileRepository.listPlayerPublicViews({ sortBy: 'rating' }, { page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  });

  const players = data?.pages.flatMap((p) => p.items) ?? [];

  // Every locked action funnels through here, and each one names what the
  // account is actually for. A prompt that says "Sign up to continue" tells
  // the user nothing; naming the action is what makes it worth doing.
  const promptSignUp = useCallback((reason: string) => {
    showAlert('Create a free account', reason, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Create account', onPress: () => router.push('/role-select') },
    ]);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: PlayerPublicView }) => (
      <PlayerCard
        name={item.full_name ?? 'Player'}
        positionLine={[item.primary_position, item.nationality_name].filter(Boolean).join(' · ')}
        avatar={item.avatar_url ?? images.avatarMale}
        rating={Math.round(item.overall_rating ?? 0)}
        onPress={() => promptSignUp(`See ${item.full_name ?? 'this player'}'s highlights and full profile.`)}
      />
    ),
    [promptSignUp]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.headerTitle}>Players on Matobev</Text>
        <View style={{ width: 36 }} />
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonRow />}>
        <FlashList
          data={players}
          // View columns are all nullable in the generated types (Postgres
          // can't guarantee non-null through a view), so fall back to the
          // index rather than risking duplicate empty-string keys.
          keyExtractor={(p, index) => p.id ?? String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <Text style={styles.lede}>
              Real players, rated by Matobev's analysis engine. Create a free account to watch highlights, apply
              for trials, and be seen by verified scouts.
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={26} color={colors.textPlaceholder} />
              <Text style={styles.emptyText}>No players to show yet.</Text>
            </View>
          }
        />
      </QueryState>

      <View style={styles.cta}>
        <PrimaryButton label="Create Free Account" onPress={() => router.push('/role-select')} />
        <Pressable onPress={() => router.push('/login')} hitSlop={10} style={styles.loginWrap}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLink}>Log in</Text>
          </Text>
        </Pressable>
      </View>
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
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      lineHeight: 20,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    list: { paddingBottom: spacing.xxl },
    empty: { alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.md },
    emptyText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
    cta: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      backgroundColor: colors.surface,
    },
    loginWrap: { alignItems: 'center', marginTop: spacing.md },
    loginText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
    loginLink: { fontFamily: fontFamily.semiBold, color: colors.primary },
  });
}
