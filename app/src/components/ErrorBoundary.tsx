import { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, spacing } from '../theme';
import { PrimaryButton } from './PrimaryButton';

type Props = { children: ReactNode };
type State = { error: Error | null };

// React only supports catching render-time errors via a class component's
// getDerivedStateFromError/componentDidCatch -- there's no hook equivalent.
// Without this, any screen that throws during render white-screens the
// whole app with no recovery. Mounted once around <Stack> in
// app/app/_layout.tsx.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Unhandled render error caught by ErrorBoundary:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={styles.root}>
          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <Feather name="alert-triangle" size={28} color={colors.error} />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              An unexpected error occurred. You can try again, or restart the app if the problem continues.
            </Text>
            <PrimaryButton label="Try Again" onPress={this.reset} style={{ width: '100%', marginTop: 24 }} />
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontFamily: fontFamily.bold, fontSize: fontSize.title, color: colors.textPrimary, textAlign: 'center' },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
