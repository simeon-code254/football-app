import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, radii, spacing, useThemeColors, type ThemeColors } from '../src/theme';
import { IconButton } from '../src/components/IconButton';
import { QueryState } from '../src/components/QueryState';
import { SkeletonRow } from '../src/components/Skeleton';
import { useSessionStore } from '../src/store/useSessionStore';
import * as blocksRepository from '../src/repositories/blocksRepository';
import * as profileRepository from '../src/repositories/profileRepository';
import { images } from '../src/constants/images';
import { showAlert } from '../src/lib/alert';

// A block a user cannot undo is a trap, not a control -- and the block
// sheet explicitly promises "You can undo this in Settings", so this
// screen is what makes that promise true.
export default function BlockedAccounts() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['blockedAccounts', userId],
    enabled: !!userId,
    queryFn: async () => {
      const ids = await blocksRepository.listBlockedIds(userId!);
      if (!ids.length) return [];
      // Reuses the existing public view rather than reading `profiles`
      // directly -- it carries no contact details and is the same source
      // every other people-list in the app already uses.
      const page = await profileRepository.listPlayerPublicViews({ ids }, { pageSize: ids.length });
      const byId = new Map(page.items.map((p) => [p.id, p]));
      return ids.map((id) => ({ id, profile: byId.get(id) ?? null }));
    },
  });

  const unblock = (id: string, name: string) => {
    showAlert('Unblock this person?', `${name} will be able to see your profile and contact you again.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          try {
            await blocksRepository.unblockUser(userId!, id);
            queryClient.invalidateQueries({ queryKey: ['blockedAccounts', userId] });
            queryClient.invalidateQueries({ queryKey: ['blockedIds', userId] });
          } catch (err) {
            showAlert('Could not unblock', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.headerTitle}>Blocked accounts</Text>
        <View style={{ width: 36 }} />
      </View>

      <QueryState isLoading={isLoading} error={error} onRetry={refetch} skeleton={<SkeletonRow count={3} />}>
        <FlashList
          data={data ?? []}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.lede}>
              Blocked people can't message you or see you in Discover. They're never told they've been blocked.
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="shield" size={26} color={colors.textPlaceholder} />
              <Text style={styles.emptyText}>You haven't blocked anyone.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = item.profile?.full_name ?? 'This account';
            return (
              <View style={styles.row}>
                <Image
                  source={{ uri: item.profile?.avatar_url ?? images.avatarMale }}
                  style={styles.avatar}
                  cachePolicy="memory-disk"
                  transition={200}
                />
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                <Pressable
                  onPress={() => unblock(item.id, name)}
                  style={styles.unblockBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Unblock ${name}`}
                >
                  <Text style={styles.unblockText}>Unblock</Text>
                </Pressable>
              </View>
            );
          }}
        />
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
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      lineHeight: 20,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    list: { paddingBottom: spacing.xxl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    avatar: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
    name: { flex: 1, fontFamily: fontFamily.medium, fontSize: fontSize.body, color: colors.textPrimary },
    unblockBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceMuted,
    },
    unblockText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.primary },
    empty: { alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.md },
    emptyText: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textMuted },
  });
}
