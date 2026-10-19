import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING } from './theme.ts';

export interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Selector de opciones excluyentes para los ajustes. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.group}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.option, selected && styles.selected]}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', gap: SPACING.xs, marginBottom: SPACING.sm },
  label: { color: COLORS.muted, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  group: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  option: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selected: { borderColor: COLORS.accent, backgroundColor: COLORS.surface },
  optionLabel: { color: COLORS.muted, fontSize: 14 },
  optionLabelSelected: { color: COLORS.text, fontWeight: '600' },
});
