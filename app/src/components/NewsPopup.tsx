import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import * as newsRepository from '../repositories/newsRepository';
import { getPublicStorageUrl } from '../lib/publicUrl';
import { FullScreenAlert } from './FullScreenAlert';

const LAST_SEEN_KEY = 'matobev-last-seen-news-id';

// A quiet way to surface a new announcement without adding another
// permanent badge to check -- fires at most once per post, the first time
// Home mounts after it's published. Never re-shows the same post twice
// (tracked locally, same AsyncStorage pattern as useThemeStore), and never
// competes with the News screen itself, which stays the full list.
/** Same 200wpm estimate the feed and the article use. */
function readingMinutes(body: string | null | undefined): number {
  if (!body) return 1;
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
}

export function NewsPopup() {
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
  const isTrial = !!latest.trial_id;

  return (
    <FullScreenAlert
      visible={visible}
      kicker={isTrial ? 'Trial near you' : 'Matobev news'}
      tag={isTrial ? undefined : 'Scouting'}
      title={latest.title}
      body={isTrial ? undefined : latest.body}
      meta={
        isTrial
          ? undefined
          : `${new Date(latest.published_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${readingMinutes(latest.body)} min read`
      }
      imageUri={coverUrl}
      primaryLabel={isTrial ? 'Read more' : 'Read more'}
      onPrimary={readMore}
      onClose={dismiss}
    />
  );
}
