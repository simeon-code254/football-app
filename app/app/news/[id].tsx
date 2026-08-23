import { View, Text, StyleSheet, ScrollView, Pressable, ImageBackground, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
import { QueryState } from '../../src/components/QueryState';
import { getPublicStorageUrl } from '../../src/lib/publicUrl';
import * as newsRepository from '../../src/repositories/newsRepository';

// Canvas screen 60 NEWS ARTICLE.
//
//   full-bleed cover photo with back + share
//   [SCOUTING] gold kicker band
//   "Three Kenyan teenagers signed from Matobev clips this month"
//   BY THE MATOBEV DESK · 21 AUG · 3 MIN
//   body copy
//   MORE IN SCOUTING
//
// -- READING TIME IS COMPUTED, NOT TYPED --
//
// The canvas prints "3 MIN". `news_posts` has no reading-time column, so it is
// derived from the body at 200 words per minute rather than left out or
// hardcoded. That is an estimate and is fine to show as one; unlike a rating,
// nobody makes a decision on it.
const WORDS_PER_MINUTE = 200;

export default function NewsArticle() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['newsArticle', id],
    enabled: !!id,
    queryFn: async () => {
      // No single-post getter exists; the published list is small and already
      // cached, so this reads from it rather than adding a query for one row.
      const page = await newsRepository.listPublishedNews({ pageSize: 50 });
      return page.items.find((p) => p.id === id) ?? null;
    },
  });

  const cover = data?.cover_image_path ? getPublicStorageUrl('post-images', data.cover_image_path) : null;
  const minutes = data?.body ? Math.max(1, Math.round(data.body.trim().split(/\s+/).length / WORDS_PER_MINUTE)) : null;
  const published = data?.published_at ? new Date(data.published_at) : null;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          {!!cover && (
            <ImageBackground source={{ uri: cover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          <LinearGradient
            colors={['rgba(10,27,51,0.55)', 'transparent', 'rgba(10,27,51,0.35)']}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={['top']}>
            <View style={styles.coverBar}>
              <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
                <Feather name="chevron-left" size={22} color={colors.white} />
              </Pressable>
              <Pressable
                onPress={() =>
                  data && Share.share({ message: `${data.title} — Matobev` }).catch(() => {})
                }
                hitSlop={10}
                accessibilityLabel="Share this article"
              >
                <Feather name="share" size={18} color={colors.white} />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        <QueryState isLoading={isLoading} error={error} onRetry={refetch} isEmpty={!data}>
          <View style={styles.body}>
            <View style={styles.band}>
              <Kicker size={fontSize.caption} tone="inherit" style={{ color: colors.goldDark }}>
                Matobev news
              </Kicker>
            </View>

            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              {data?.title}
            </Text>

            <Kicker style={styles.byline}>
              {[
                'By the Matobev desk',
                published ? published.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : null,
                minutes ? `${minutes} min` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Kicker>

            <View style={styles.rule} />

            {/*
              Paragraphs split on blank lines. news_posts.body is plain text
              written in the admin dashboard, not markdown, so nothing is
              parsed -- rendering it as one block would run the whole article
              together.
            */}
            {(data?.body ?? '')
              .split(/\n\s*\n/)
              .map((para, i) => (
                <Text key={i} style={styles.para}>
                  {para.trim()}
                </Text>
              ))}
          </View>
        </QueryState>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: spacing.xxl },
    cover: { height: cx(180), backgroundColor: colors.primaryDark },
    coverBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: cx(16),
      paddingTop: spacing.sm,
    },
    body: { paddingHorizontal: cx(18), marginTop: spacing.lg },
    band: {
      alignSelf: 'flex-start',
      backgroundColor: colors.warningTint,
      borderRadius: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.hero,
      lineHeight: fontSize.hero * 1.1,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    byline: { marginTop: spacing.md },
    rule: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.lg },
    para: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodyLg,
      lineHeight: fontSize.bodyLg * 1.6,
      color: colors.textBody,
      marginBottom: spacing.lg,
    },
  });
}
