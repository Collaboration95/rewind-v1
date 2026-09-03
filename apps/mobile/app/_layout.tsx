import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '../components/tokens';
import { LocalSessionProvider } from '../features/session/LocalSessionProvider';

export default function RootLayout() {
  return (
    <LocalSessionProvider>
      <>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.ink },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
        </Stack>
      </>
    </LocalSessionProvider>
  );
}
