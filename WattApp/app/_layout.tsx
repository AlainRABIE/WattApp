import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { Animated, useEffect } from 'react';
import type { StackCardInterpolationProps } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StripeProvider } from '@stripe/stripe-react-native';
import { getAuth } from 'firebase/auth';
import app from '../constants/firebaseConfig';

import { useColorScheme } from '@/hooks/use-color-scheme';
import BottomNav from './components/BottomNav';
import { STRIPE_CONFIG } from '../constants/stripeConfig';
import { NotificationService } from '../services/NotificationService';
import React from 'react';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Animation de transition personnalisée (fade + scale)
const customTransition = {
  cardStyleInterpolator: ({ current, next, layouts }: StackCardInterpolationProps) => {
    return {
      cardStyle: {
        opacity: current.progress,
        transform: [
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.95, 1],
            }),
          },
        ],
      },
    };
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname() || '';
  const showBottomNav = !(
    pathname === '/' || 
    pathname.endsWith('/index') || 
    pathname.startsWith('/register') ||
    pathname.startsWith('/write/custom') ||
    pathname.includes('/write/') ||
    pathname.includes('/read') ||
    pathname.startsWith('/community/') || // Cacher pour toutes les pages de chat communautaire
    pathname.startsWith('/chat/') || // Cacher pour toutes les pages de chat direct (DM)
    pathname.startsWith('/payment/') // Cacher pour les pages de paiement
  );

  // Initialiser les notifications au démarrage
  useEffect(() => {
    const initializeNotifications = async () => {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (user) {
        await NotificationService.initialize(user.uid);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <StripeProvider publishableKey={STRIPE_CONFIG.PUBLISHABLE_KEY}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {/* Hide headers globally so pages don't show route names like "home/home" */}
          <Stack
            screenOptions={{
              headerShown: false,
              ...customTransition,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          {showBottomNav ? <BottomNav /> : null}
          <StatusBar style="auto" />
        </ThemeProvider>
      </GestureHandlerRootView>
    </StripeProvider>
  );
}
