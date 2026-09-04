import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  spacing,
  useThemeColors,
} from '../../src/theme';
import { Logo } from '../../src/components/Logo';
import { Kicker } from '../../src/components/Kicker';
import { Button, LinkButton } from '../../src/components/Button';
import { QueryState } from '../../src/components/QueryState';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as trialsRepository from '../../src/repositories/trialsRepository';

// Canvas screen 42 DEEP LINK · TRIAL.
//
//   navy ground, gold mark
//   TRIAL INVITE
//   "Nairobi FC invited you"
//   "U19 Open Trial · 14 Sep · Nairobi"
//   [Open in Matobev]
//   DEEP LINK · matobev://trial/nfc-u19
//
// The route is `/invite/[token]` where the token is the trial id, so the
// app.json scheme ("matobev") resolves matobev://invite/<id> straight here.
//
// -- WHAT THIS SCREEN WILL AND WILL NOT SHOW --
//
// A trial is public, so the club, title, date and location render whether or
// not the viewer is signed in. Applying is not: it needs a player account and,
// under 18, guardian consent. So the button routes rather than acts -- signed
// in it opens the trial, signed out it starts signup and comes back. Nothing
// here writes anything.
export default function TrialInvite() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const { token } = useLocalSearchParams<{ token?: string }>();
  const signedIn = useSessionStore((s) => s.status) === 'signed-in';

  const { data: trial, isLoading, error, refetch } = useQuery({
    queryKey: ['trialInvite', token],
    enabled: !!token,
    queryFn: () => trialsRepository.getTrialById(token!),
  });

  const open = () => {
    if (!token) return;
    if (signedIn) router.replace({ pathname: '/trial/[id]', params: { id: token } });
    // A signed-out viewer needs an account before they can apply. role-select
    // is the honest next step, not a login wall with no explanation.
    else router.replace('/role-select');
  };

  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="inviteGlow" cx="50%" cy="20%" r="60%">
            <Stop offset="0" stopColor="#b5d9fd" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#b5d9fd" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#inviteGlow)" />
      </Svg>

      <SafeAreaView style={styles.body} edges={['top', 'bottom']}>
        <View style={styles.hero}>
          <Logo variant="gold" size={cx(44)} />
          <Kicker tone="inherit" style={styles.kicker}>
            Trial invite
          </Kicker>

          <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
            <Text style={styles.title} maxFontSizeMultiplier={1.3}>
              {trial?.club ? `${trial.club} invited you` : 'You have been invited'}
            </Text>
            <Text style={styles.meta}>
              {[trial?.title, trial?.trial_date, trial?.location].filter(Boolean).join(' · ')}
            </Text>
          </QueryState>
        </View>

        <View style={{ flex: 1 }} />

        <Button label="Open in Matobev" variant="gold" onPress={open} />
        {!signedIn && (
          <LinkButton label="I already have an account" onPress={() => router.replace('/login')} />
        )}
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.primaryDark },
    body: { flex: 1, paddingHorizontal: cx(26), paddingBottom: cx(20) },
    hero: { alignItems: 'center', marginTop: cx(60) },
    kicker: { color: colors.gold, marginTop: spacing.xl },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.display,
      color: colors.white,
      textAlign: 'center',
      marginTop: 6,
    },
    meta: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      marginTop: 8,
    },
  });
}
