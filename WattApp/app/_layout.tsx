import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import BottomNav from './components/BottomNav';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname() || '';
  const showBottomNav = !(pathname === '/' || pathname.endsWith('/index') || pathname.startsWith('/register'));

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Hide headers globally so pages don't show route names like "home/home" */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      {showBottomNav ? <BottomNav /> : null}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
