import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { COLORS } from '../src/ui/theme.ts';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    <>
      <StatusBar hidden />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'fade',
        }}
      />
    </>
  );
}
