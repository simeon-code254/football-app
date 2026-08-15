import { ReactNode, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, spacing, useThemeColors } from '../theme';
import { PrimaryButton } from './PrimaryButton';

function messageFor(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return 'Something went wrong. Please try again.';
}

type Props = {
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyIcon?: React.ComponentProps<typeof Feather>['name'];
  emptyMessage?: string;
  children: ReactNode;
};

// Before this, useQuery's `error` was never read anywhere in the app -- a
// failed fetch (network drop, RLS denial) rendered identically to "no data
// yet," with no way for the user to tell the difference or retry. Used as
// an early-return guard at the top of a screen's render:
//
//   <QueryState isLoading={isLoading} error={error} onRetry={refetch}>
//     {...real content using data...}
//   </QueryState>
//
// Checks in priority order: loading, then error, then (optional) empty,
// then renders children. Screens that already have their own FlatList
// empty-state copy can keep using `isEmpty`/`emptyMessage` here instead of
// duplicating it, or omit both and handle empty lists themselves.
export function QueryState({ isLoading, error, onRetry, isEmpty, emptyIcon, emptyMessage, children }: Props) {
  const colors = useThemeColors();
  const styles = makeStyles(colors);

  // Postgrest/Auth errors carry a `hint`/`details`/`code` that `.message`
  // alone doesn't show -- logging only the message (as the UI necessarily
  // does) hides that, so the full object always goes to console too. Also
  // the only way to see what actually failed when it's not a real Error
  // instance (a raw network failure, a cancelled request, etc).
  useEffect(() => {
    if (error) console.error('QueryState error:', error);
  }, [error]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={28} color={colors.error} style={{ marginBottom: 10 }} />
        <Text style={styles.title}>Couldn't load this</Text>
        <Text style={styles.message}>{messageFor(error)}</Text>
        {onRetry && <PrimaryButton label="Retry" onPress={onRetry} style={{ marginTop: 16, minWidth: 140 }} height={44} />}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.center}>
        {emptyIcon && <Feather name={emptyIcon} size={28} color={colors.textPlaceholder} style={{ marginBottom: 10 }} />}
        <Text style={styles.message}>{emptyMessage ?? 'Nothing here yet.'}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

function makeStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, minHeight: 200 },
    title: { fontFamily: fontFamily.semiBold, fontSize: fontSize.body, color: colors.textPrimary, textAlign: 'center' },
    message: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.bodySm,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 4,
      lineHeight: 20,
    },
  });
}
