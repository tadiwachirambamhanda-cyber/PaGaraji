import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when the project URL and key are set in .env.local. Same answer everywhere, so screens render the same. */
export const backendEnabled = Boolean(url && anonKey);

// The web build is also rendered once on a server (no `window`) when the site is exported.
// Login storage needs a browser, so the client is only created where one exists.
const canCreateClient = Platform.OS !== 'web' || typeof window !== 'undefined';

/**
 * The online backend. It is `null` until the two EXPO_PUBLIC_SUPABASE_* values are set in
 * .env.local (and during server-side rendering), and the app then keeps working on-device.
 */
export const supabase =
  url && anonKey && canCreateClient
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// On phones, only refresh the login while the app is on screen.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
