import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { fontFamily, fontSize, radii, spacing, useThemeColors, useIsDark, elevation } from '../theme';
import { useAlertStore } from '../store/useAlertStore';

// Mounted once in app/_layout.tsx. Reads from useAlertStore so `showAlert()`
// (src/lib/alert.ts) works identically on every platform — see that file for
// why RN's own Alert.alert can't be relied on here.
export function GlobalAlert() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const styles = makeStyles(colors);
  const { visible, title, message, buttons, hide } = useAlertStore();

  const handlePress = (onPress?: () => void) => {
    hide();
    onPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => handlePress()}>
      <View accessibilityViewIsModal style={styles.backdrop}>
        <View style={[styles.card, elevation('overlay', isDark)]}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={buttons.length > 2 ? styles.buttonsStacked : styles.buttonsRow}>
            {buttons.map((btn, i) => (
              <Pressable
                key={`${btn.text}-${i}`}
                style={[
                  styles.button,
                  buttons.length <= 2 && { flex: 1 },
                  btn.style === 'cancel' && styles.buttonCancel,
                  btn.style === 'destructive' && styles.buttonDestructive,
                  i > 0 && (buttons.length > 2 ? styles.buttonStackedSpacing : styles.buttonRowSpacing),
                ]}
                onPress={() => handlePress(btn.onPress)}
                accessibilityRole="button"
                accessibilityLabel={btn.text}
              >
                <Text
                  style={[
                    styles.buttonText,
                    btn.style === 'cancel' && styles.buttonTextCancel,
                    btn.style === 'destructive' && styles.buttonTextDestructive,
                  ]}
                >
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: 20,
    },
    title: { fontFamily: fontFamily.bold, fontSize: fontSize.bodyLg, color: colors.textPrimary, textAlign: 'center' },
    message: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
    buttonsRow: { flexDirection: 'row', marginTop: 20 },
    buttonsStacked: { flexDirection: 'column', marginTop: 20 },
    button: {
      backgroundColor: colors.primary,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    buttonRowSpacing: { marginLeft: 10 },
    buttonStackedSpacing: { marginTop: 10 },
    buttonCancel: { backgroundColor: colors.surfaceMuted },
    buttonDestructive: { backgroundColor: colors.error },
    buttonText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.bodySm, color: colors.white },
    buttonTextCancel: { color: colors.textMuted },
    buttonTextDestructive: { color: colors.white },
  });
}
