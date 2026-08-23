import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  cx,
  fontFamily,
  fontFamilyDisplay,
  fontSize,
  spacing,
  useThemeColors,
} from '../src/theme';
import { Field } from '../src/components/Field';
import { NoticeBox } from '../src/components/NoticeBox';
import { Button } from '../src/components/Button';
import { useSessionStore } from '../src/store/useSessionStore';
import * as guardianRepository from '../src/repositories/guardianRepository';
import { showAlert } from '../src/lib/alert';

// Canvas screen 08 GUARDIAN CONSENT.
//
//   "Parent or guardian"                      .h 20px w800
//   "Because you're under 18, a parent has to agree before your videos get
//    analysed."
//   [notice] "You can still post highlights without this. Only AI analysis
//            needs consent."
//   THEIR NAME / EMAIL / RELATIONSHIP
//   [Send them the link]  with a mail glyph
//
// -- THE NOTICE IS THE POINT OF THE SCREEN --
//
// Consent gates AI analysis and nothing else. A minor can post highlights,
// be discovered and be messaged without it. Saying so plainly here matters
// because the alternative reading -- "no parent, no app" -- is the one a
// 15-year-old will assume, and it is wrong. The database agrees: migration
// 20260820151000 is named guardian_consent_ai_uploads_only.
export default function GuardianConsent() {
  const colors = useThemeColors();
  const styles = makeStyles(colors);
  const player = useSessionStore((s) => s.player);
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('');
  const [sending, setSending] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSend = name.trim().length > 1 && emailValid && relationship.trim().length > 1;

  const send = async () => {
    setTouched(true);
    if (!canSend || sending || !player) return;
    setSending(true);
    try {
      await guardianRepository.requestConsent(player.id, {
        name: name.trim(),
        email: email.trim(),
        relationship: relationship.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: ['guardianConsent', player.id] });
      showAlert(
        'Link sent',
        'We emailed ' + name.trim() + '. Your videos can be analysed once they approve.'
      );
      router.back();
    } catch {
      showAlert('Could not send the link', 'Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Parent or guardian
          </Text>
          <Text style={styles.lede}>
            Because you&apos;re under 18, a parent has to agree before your videos get analysed.
          </Text>

          <NoticeBox style={styles.notice}>
            You can still post highlights without this. Only AI analysis needs consent.
          </NoticeBox>

          <View style={styles.fields}>
            <Field
              label="Their name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              textContentType="name"
              error={touched && name.trim().length <= 1 ? 'Enter their full name.' : undefined}
            />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              error={touched && !emailValid ? 'Enter a valid email address.' : undefined}
            />
            <Field
              label="Relationship"
              value={relationship}
              onChangeText={setRelationship}
              autoCapitalize="words"
              hint="For example: Mother, Father, Guardian."
              error={
                touched && relationship.trim().length <= 1 ? 'Tell us how they are related.' : undefined
              }
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label="Send them the link"
            variant="navy"
            loading={sending}
            disabled={!canSend}
            onPress={send}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingHorizontal: cx(22), paddingBottom: spacing.xl },
    title: {
      fontFamily: fontFamilyDisplay.extraBold,
      fontSize: fontSize.headingLg,
      color: colors.textPrimary,
    },
    lede: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.body,
      lineHeight: fontSize.body * 1.5,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    notice: { marginTop: spacing.md },
    fields: { gap: spacing.lg, marginTop: spacing.lg },
    footer: { paddingHorizontal: cx(22), paddingTop: spacing.md },
  });
}
