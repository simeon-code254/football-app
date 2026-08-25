import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  radii,
  spacing,
  useThemeColors,
} from '../../src/theme';
import { Field } from '../../src/components/Field';
import { Kicker } from '../../src/components/Kicker';
import { Button } from '../../src/components/Button';
import { VerificationBadge } from '../../src/components/VerificationBadge';
import { useSessionStore } from '../../src/store/useSessionStore';
import * as clubsRepository from '../../src/repositories/clubsRepository';
import { showAlert } from '../../src/lib/alert';

// Canvas screen 55 CLUB EDIT PROFILE.
//
//   "Edit club profile"                                   SAVE
//   [NF crest]  CREST · "PNG or SVG · square, 512px minimum"
//   CLUB NAME / ABOUT / CITY / LEAGUE
//   [Save changes]
//
// The crest requirement is quoted from the canvas because it is a real
// constraint: screen 49 notes the crest "appears on every trial you post and
// every message you send", so a low-resolution one degrades everywhere at once.
export default function ClubProfile() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const club = useSessionStore((s) => s.club);
  const hydrate = useSessionStore((s) => s.hydrate);
  const session = useSessionStore((s) => s.session);
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [city, setCity] = useState('');
  const [league, setLeague] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!club) return;
    setName(club.name ?? '');
    setAbout(club.about ?? '');
    setCity(club.city ?? '');
    setLeague(club.league ?? '');
  }, [club]);

  const save = async () => {
    if (!club || saving) return;
    setSaving(true);
    try {
      await clubsRepository.updateClub(club.id, {
        name: name.trim() || null,
        about: about.trim() || null,
        city: city.trim() || null,
        league: league.trim() || null,
      });
      await hydrate(session);
      await queryClient.invalidateQueries({ queryKey: ['clubHome'] });
      showAlert('Saved', 'Your club profile is up to date.');
    } catch {
      showAlert('Could not save', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (name || 'Club')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit club profile</Text>
          <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityLabel="Settings">
            <Feather name="settings" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.crestRow}>
            <View style={styles.crest}>
              <Text style={styles.crestText}>{initials}</Text>
              {club?.verification_status === 'verified' && (
                <View style={styles.crestBadge}>
                  <VerificationBadge role="club" size={16} glyph="mark" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Kicker>Crest</Kicker>
              <Text style={styles.crestHint}>PNG or SVG · square, 512px minimum</Text>
              <Text style={styles.crestWhy}>
                It appears on every trial you post and every message you send.
              </Text>
            </View>
          </View>

          <View style={styles.fields}>
            <Field label="Club name" value={name} onChangeText={setName} autoCapitalize="words" />
            <Field
              label="About"
              value={about}
              onChangeText={setAbout}
              multiline
              numberOfLines={4}
              style={styles.about}
            />
            <View style={styles.pair}>
              <Field label="City" value={city} onChangeText={setCity} style={{ flex: 1 }} autoCapitalize="words" />
              <Field label="League" value={league} onChangeText={setLeague} style={{ flex: 1 }} autoCapitalize="characters" />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Save changes" variant="navy" loading={saving} onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: cx(16),
    },
    title: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.display, color: colors.textPrimary },
    scroll: { paddingHorizontal: cx(16), paddingBottom: spacing.xl },
    crestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.lg },
    crest: {
      width: 58,
      height: 58,
      borderRadius: radii.xl,
      backgroundColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    crestBadge: { position: 'absolute', bottom: -4, right: -5 },
    crestText: { fontFamily: fontFamilyDisplay.extraBold, fontSize: fontSize.heading, color: colors.primaryDark },
    crestHint: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textBody, marginTop: 2 },
    crestWhy: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
    fields: { gap: spacing.lg, marginTop: spacing.xl },
    about: { minHeight: 96 },
    pair: { flexDirection: 'row', gap: spacing.md },
    footer: { paddingHorizontal: cx(16), paddingBottom: spacing.md },
  });
}
