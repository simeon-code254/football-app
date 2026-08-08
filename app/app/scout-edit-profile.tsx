import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fontFamily, fontSize, radii } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';
import { TypeaheadField } from '../src/components/TypeaheadField';
import { AFRICAN_COUNTRIES } from '../src/constants/africanCountries';
import { useSessionStore } from '../src/store/useSessionStore';
import * as profileRepository from '../src/repositories/profileRepository';

// Scouts had no way to edit their profile after signup, same gap as the
// player side — this is the scout counterpart (lighter than the player's
// 4-step wizard since a scout profile has fewer fields).
export default function ScoutEditProfile() {
  const session = useSessionStore((s) => s.session);
  const hydrate = useSessionStore((s) => s.hydrate);
  const userId = session?.user.id;

  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [countryCodeByName, setCountryCodeByName] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [profile, scout, countries] = await Promise.all([
          profileRepository.getMyProfile(userId),
          profileRepository.getMyScout(userId),
          profileRepository.getCountries(),
        ]);
        setCountryCodeByName(Object.fromEntries(countries.map((c) => [c.name, c.code])));
        setFullName(profile.full_name ?? '');
        setOrganization(scout?.organization ?? '');
        setCountry(scout?.country_code ? countries.find((c) => c.code === scout.country_code)?.name ?? '' : '');
        setBio(scout?.bio ?? '');
      } catch (err) {
        Alert.alert('Could not load profile', err instanceof Error ? err.message : 'Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await Promise.all([
        profileRepository.updateProfileFields(userId, { full_name: fullName.trim() || null }),
        profileRepository.updateScout(userId, {
          organization: organization.trim() || null,
          country_code: country ? countryCodeByName[country] ?? null : null,
          bio: bio.trim() || null,
        }),
      ]);
      await hydrate(session);
      router.replace('/(scout-tabs)/profile');
    } catch (err) {
      Alert.alert('Could not save profile', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppTextField label="Full Name" icon="user" placeholder="Your name" value={fullName} onChangeText={setFullName} />
        <AppTextField label="Organization / Club" icon="briefcase" placeholder="Club or organization" value={organization} onChangeText={setOrganization} />
        <TypeaheadField label="Country" value={country} onChange={setCountry} options={AFRICAN_COUNTRIES} placeholder="e.g. Kenya" />
        <View>
          <Text style={styles.label}>Bio</Text>
          <View style={styles.bioBox}>
            <TextInput
              placeholder="Tell players what you're looking for"
              placeholderTextColor={colors.textPlaceholder}
              style={styles.bioInput}
              multiline
              maxLength={300}
              value={bio}
              onChangeText={setBio}
            />
          </View>
          <Text style={styles.charCount}>{bio.length} / 300</Text>
        </View>

        <PrimaryButton
          label={saving ? 'Saving…' : 'Save Changes'}
          onPress={save}
          disabled={saving}
          loading={saving}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary },
  content: { padding: 20, paddingTop: 8, gap: 14 },
  label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm, color: colors.textLabel, marginBottom: 5 },
  bioBox: { borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.inputBackground, padding: 12, minHeight: 100 },
  bioInput: { fontFamily: fontFamily.regular, fontSize: fontSize.bodySm, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.textPlaceholder, textAlign: 'right', marginTop: 4 },
});
