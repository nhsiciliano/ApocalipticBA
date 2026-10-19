import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { COLORS, SPACING } from './theme.ts';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  /** Navega a la ruta (push) si no hay `onPress`. */
  href?: Href;
  /** `primary` usa el acento del meteorito; `ghost` es solo borde. */
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, href, variant = 'ghost', disabled, style }: ButtonProps) {
  const router = useRouter();
  const handlePress = () => {
    if (onPress) onPress();
    else if (href) router.push(href);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled ?? false }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.ghost,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, variant === 'primary' && styles.labelPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 160,
  },
  primary: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  ghost: { backgroundColor: 'transparent', borderColor: COLORS.border },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  label: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  labelPrimary: { color: COLORS.background },
});
