import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { fontFamily, fontSize, radii, useThemeColors } from '../theme';
import * as newsRepository from '../repositories/newsRepository';
import { getPublicStorageUrl } from '../lib/publicUrl';

const LAST_SEEN_KEY = 'matobev-last-seen-news-id';

// A quiet way to surface a new announcement without adding another
// permanent badge to check -- fires at most once per post, the first time
// Home mounts after it's published. Never re-shows the same post twice
// (tracked locally, same AsyncStorage pattern as useThemeStore), and never
// competes with the News screen itself, which stays the full list.
export function NewsPopup() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const [visible, setVisible] = useState(false);

  const { data: latest } = useQuery({
    queryKey: ['latestNewsForPopup'],
    queryFn: async () => (await newsRepository.listPublishedNews({ pageSize: 1 })).items[0] ?? null,
  });

  useEffect(() => {
    if (!latest) return;
    AsyncStorage.getItem(LAST_SEEN_KEY).then((lastSeenId) => {
      if (lastSeenId !== latest.id) setVisible(true);
    });
  }, [latest]);

  const dismiss = () => {
    if (latest) AsyncStorage.setItem(LAST_SEEN_KEY, latest.id).catch(() => {});
    setVisible(false);
  };

  const readMore = () => {
    dismiss();
    // Trial-originated posts (see 20260815020000_trials_as_news.sql) go
    // straight to the real trial, same reasoning as news.tsx's own list.
    if (latest?.trial_id) {
      router.push({ pathname: '/trial/[id]', params: { id: latest.trial_id } });
    } else {
      router.push('/news');
    }
  };

  if (!latest) return null;
  const coverUrl = getPublicStorageUrl('post-images', latest.cover_image_path);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Dismiss announcement">
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()} accessible={false}>
          {!!coverUrl && <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="contain" />}
          <View style={styles.body}>
            <Text style={styles.eyebrow}>{latest.trial_id ? 'New trial' : "What's new"}</Text>
            <Text style={styles.title}>{latest.title}</Text>
            <Text style={styles.excerpt} numberOfLines={3}>{latest.body}</Text>
            <View style={styles.actions}>
              <Pressable onPress={dismiss} style={styles.dismissBtn} accessibilityRole="button" accessibilityLabel="Dismiss">
                <Text style={styles.dismissText}>Not now</Text>
              </Pressable>
              <Pressable onPress={readMore} style={styles.readBtn}>
                <Text style={styles.readText}>{latest.trial_id ? 'View Trial' : 'Read more'}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 28 },
    card: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: radii.xl, overflow: 'hidden' },
    cover: { width: '100%', height: 150, backgroundColor: colors.surfaceMuted },
    body: { padding: 20, gap: 6 },
    eyebrow: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: colors.primary, letterSpacing: 0.5, textTransform: 'uppercase' },
    title: { fontFamily: fontFamily.bold, fontSize: fontSize.headingLg, color: colors.textPrimary },
    excerpt: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textBody, lineHeight: 20, marginTop: 2 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 14 },
    dismissBtn: { paddingVertical: 8, paddingHorizontal: 4 },
    dismissText: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.textMuted },
    readBtn: { backgroundColor: colors.primary, borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 18 },
    readText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.white },
  });
}
