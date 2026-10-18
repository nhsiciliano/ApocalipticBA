export type HapticImpact = 'light' | 'medium' | 'heavy';
export type HapticNotification = 'success' | 'warning' | 'error';

export interface HapticsAdapter {
  impact(kind: HapticImpact): void;
  notification(kind: HapticNotification): void;
}
