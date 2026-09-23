import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { SegmentedControl } from '@/components/segmented-control';
import { success } from '@/lib/haptics';
import { signInWithPassword, signUpWithPassword } from '@/store/auth';
import type { AccountRole } from '@/store/profile';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

const MODES = ['Sign in', 'Create account'] as const;
type Mode = (typeof MODES)[number];

const ROLE_CHOICES = ["I'm buying", "I'm selling"] as const;
type RoleChoice = (typeof ROLE_CHOICES)[number];

const MIN_PASSWORD = 8;

export default function SignInScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('Sign in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleChoice, setRoleChoice] = useState<RoleChoice>("I'm buying");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const creating = mode === 'Create account';

  const changeMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setNotice(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (creating && name.trim().length < 2) {
      setError('Enter your name. Buyers and sellers see it.');
      return;
    }
    if (creating && password.length < MIN_PASSWORD) {
      setError(`Choose a password with at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (!creating && password === '') {
      setError('Enter your password.');
      return;
    }

    setBusy(true);
    if (creating) {
      const role: AccountRole = roleChoice === "I'm selling" ? 'seller' : 'buyer';
      const result = await signUpWithPassword(name.trim(), trimmedEmail, password, role);
      setBusy(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.needsConfirmation) {
        setNotice(`We sent a confirmation link to ${trimmedEmail}. Open it, then come back and choose Sign in.`);
        return;
      }
    } else {
      const problem = await signInWithPassword(trimmedEmail, password);
      setBusy(false);
      if (problem) {
        setError(problem);
        return;
      }
    }
    success();
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title={creating ? 'Create account' : 'Sign in'}
        subtitle={creating ? 'Takes a minute. You can browse without an account.' : 'Welcome back.'}
      />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <SegmentedControl options={MODES} value={mode} onChange={changeMode} />

        {creating && (
          <View style={styles.field}>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              style={styles.input}
              placeholder="Tadiwa Moyo"
              placeholderTextColor={Colors.placeholder}
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          </View>
        )}

        {creating && (
          <View style={styles.field}>
            <Text style={styles.label}>Mostly here to...</Text>
            <SegmentedControl options={ROLE_CHOICES} value={roleChoice} onChange={setRoleChoice} />
            <Text style={styles.hint}>Just sets what you see first — you can still do both either way.</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor={Colors.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder={creating ? `At least ${MIN_PASSWORD} characters` : 'Your password'}
            placeholderTextColor={Colors.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={creating ? 'new-password' : 'current-password'}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        {notice && <Text style={styles.notice}>{notice}</Text>}

        <Button
          label={busy ? 'One moment…' : creating ? 'Create account' : 'Sign in'}
          variant="primary"
          onPress={handleSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  form: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  field: {
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.muted,
  },
  hint: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.caption,
    color: Colors.muted,
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.ink,
    paddingVertical: Spacing.sm,
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    color: Colors.ink,
  },
  error: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    color: Colors.danger,
  },
  notice: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Type.small,
    lineHeight: 19,
    color: Colors.ink,
  },
});
}
