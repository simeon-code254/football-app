import { Component, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { fontFamily, fontSize, spacing, useThemeColors, type ThemeColors } from '../theme';
import { PrimaryButton } from './PrimaryButton';

type Props = { children: ReactNode; colors: ThemeColors };
type State = { error: Error | null };

// React only supports catching render-time errors via a class component's
// getDerivedStateFromError/componentDidCatch -- there's no hook equivalent,
// so the theme hook can't be called directly inside this class. The
// exported ErrorBoundary below is a thin functional wrapper that calls
// useThemeColors() and passes the result down as a prop instead, so this
// still re-renders correctly when the theme toggles. Mounted once around
// <Stack> in app/app/_layout.tsx.
class ErrorBoundaryClass extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Unhandled render error caught by ErrorBoundary:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { colors } = this.props;
    if (this.state.error) {
      const styles = makeStyles(colors);
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

export function ErrorBoundary({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  return <ErrorBoundaryClass colors={colors}>{children}</ErrorBoundaryClass>;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.dangerTint,
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
}
