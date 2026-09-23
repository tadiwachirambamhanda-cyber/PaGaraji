// Keeps listings, requests and supplier status fresh whenever the app returns to the foreground.
import '@/lib/refresh';

import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
} from '@expo-google-fonts/barlow';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSettingsHydrated } from '@/store/settings';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useSettingsHydrated();
  const [fontsLoaded] = useFonts({
    ArchivoBlack_400Regular,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Barlow_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded && hydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated]);

  if (!fontsLoaded || !hydrated) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="dark" />
      <View style={styles.backdrop}>
        <View style={styles.frame}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="listing/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="request/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="my-listings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="saved-parts" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="become-supplier" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="my-vehicle" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="sign-in" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="list-part" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="post" options={{ animation: 'slide_from_bottom' }} />
          </Stack>
        </View>
      </View>
    </ThemeProvider>
  );
}

// In a desktop browser the app sits in a phone-width column instead of stretching edge to edge.
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#171310' : undefined,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    alignSelf: 'center',
    overflow: 'hidden',
  },
});
