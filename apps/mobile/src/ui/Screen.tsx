import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button.tsx';
import { COLORS, SPACING } from './theme.ts';

export interface ScreenProps {
  title: string;
  /** Una línea debajo del título, en es-AR con voseo. */
  subtitle?: string;
  /** Muestra "Volver" (router.back) arriba a la izquierda. */
  back?: boolean;
  children?: ReactNode;
}

/** Pantalla placeholder: título, bajada y acciones, con safe area para landscape (notch). */
export function Screen({ title, subtitle, back = false, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.root,
        { paddingLeft: insets.left + SPACING.lg, paddingRight: insets.right + SPACING.lg },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACING.md, paddingBottom: insets.bottom + SPACING.md },
        ]}
      >
        <View style={styles.header}>
          {back ? (
            <Button label="Volver" onPress={() => router.back()} style={styles.back} />
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.actions}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, justifyContent: 'center', gap: SPACING.lg },
  header: { gap: SPACING.xs },
  back: { alignSelf: 'flex-start', minWidth: 0, marginBottom: SPACING.sm },
  title: { color: COLORS.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 15, maxWidth: 520 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});
