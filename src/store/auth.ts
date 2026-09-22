import type { Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

import { pullProfile } from '@/lib/profile-sync';
import { supabase } from '@/lib/supabase';
import { resetProfile } from '@/store/profile';

export type SignInTarget = { email: string } | { phone: string };

let session: Session | null = null;
// Without a backend there is nothing to wait for.
let ready = supabase === null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

if (supabase) {
  supabase.auth
    .getSession()
    .then(({ data }) => {
      session = data.session;
    })
    .catch(() => {
      // Offline or storage unavailable — start signed out.
    })
    .finally(() => {
      ready = true;
      emitChange();
    });

  supabase.auth.onAuthStateChange((event, next) => {
    session = next;
    emitChange();
    // Deferred: Supabase asks that its own calls are not made inside this callback.
    if (event === 'SIGNED_IN' && next) setTimeout(() => pullProfile(next.user.id), 0);
  });
}

function friendlyError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes('rate limit') || text.includes('too many')) return 'Too many tries. Wait a minute and try again.';
  if (text.includes('invalid login credentials')) return 'Wrong email or password.';
  if (text.includes('already registered') || text.includes('already been registered'))
    return 'That email already has an account. Choose Sign in instead.';
  if (text.includes('password should be') || text.includes('weak password')) return 'Choose a longer, harder-to-guess password.';
  if (text.includes('error sending') && text.includes('email')) return 'The confirmation email couldn’t be sent. Try again later.';
  if (text.includes('expired') || text.includes('invalid')) return 'That code is wrong or has expired. Try again or ask for a new one.';
  if (text.includes('sms') || text.includes('provider')) return 'Phone sign-in isn’t switched on yet. Use your email for now.';
  if (text.includes('network') || text.includes('fetch')) return 'Couldn’t reach the server. Check your connection and try again.';
  return message;
}

/** Sends a one-time code by email or SMS. Returns an error message, or null on success. */
export async function sendCode(target: SignInTarget): Promise<string | null> {
  if (!supabase) return 'Sign-in isn’t set up yet.';
  const { error } = await supabase.auth.signInWithOtp(target);
  return error ? friendlyError(error.message) : null;
}

/** Checks the code the person typed. Returns an error message, or null when signed in. */
export async function verifyCode(target: SignInTarget, token: string): Promise<string | null> {
  if (!supabase) return 'Sign-in isn’t set up yet.';
  const { error } =
    'email' in target
      ? await supabase.auth.verifyOtp({ email: target.email, token, type: 'email' })
      : await supabase.auth.verifyOtp({ phone: target.phone, token, type: 'sms' });
  return error ? friendlyError(error.message) : null;
}

/** Signs in an existing account with its password. Returns an error message, or null when signed in. */
export async function signInWithPassword(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'Sign-in isn’t set up yet.';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? friendlyError(error.message) : null;
}

/**
 * Creates an account. If the project requires email confirmation there's no session yet, and
 * `needsConfirmation` is true; otherwise the person is signed in straight away.
 */
export async function signUpWithPassword(
  name: string,
  email: string,
  password: string,
): Promise<{ error: string | null; needsConfirmation: boolean }> {
  if (!supabase) return { error: 'Sign-in isn’t set up yet.', needsConfirmation: false };
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error) return { error: friendlyError(error.message), needsConfirmation: false };
  return { error: null, needsConfirmation: data.session === null };
}

export async function signOut() {
  await supabase?.auth.signOut();
  // Don't leave this person's name and number on the phone for the next one.
  resetProfile();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSession() {
  return useSyncExternalStore(subscribe, () => session);
}

/** True once the saved login has been looked up, so screens don't flash "signed out". */
export function useAuthReady() {
  return useSyncExternalStore(subscribe, () => ready);
}
