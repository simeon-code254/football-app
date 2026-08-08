import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fontFamily, fontSize, radii } from '../src/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { IconButton } from '../src/components/IconButton';
import { AppTextField } from '../src/components/AppTextField';
import { TypeaheadField } from '../src/components/TypeaheadField';
import { AFRICAN_COUNTRIES } from '../src/constants/africanCountries';

// Scouts had no way to edit their profile after signup, same gap as the
// player side — this is the scout counterpart (lighter than the player's
// 4-step wizard since a scout profile has fewer fields).
export default function ScoutEditProfile() {
  const [fullName, setFullName] = useState('Simeon Anyal');
  const [organization, setOrganization] = useState('Matobev Talent Partners');
  const [country, setCountry] = useState('Kenya');
  const [bio, setBio] = useState(
    'Independent scout focused on East African wingers and attacking talent, working with academies across Kenya, Uganda and Tanzania.'
  );

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

        <PrimaryButton label="Save Changes" onPress={() => router.replace('/(scout-tabs)/profile')} style={{ marginTop: 8 }} />
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
