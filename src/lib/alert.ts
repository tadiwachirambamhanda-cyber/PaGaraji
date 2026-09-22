import { Alert, Platform, type AlertButton } from 'react-native';

type BrowserDialogs = { confirm: (message: string) => boolean; alert: (message: string) => void };

/**
 * Same call shape as `Alert.alert`, but it also works in a browser, where React
 * Native's Alert does nothing (validation messages and delete confirmations
 * would silently vanish).
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const dialogs = globalThis as unknown as BrowserDialogs;
  const text = message ? `${title}\n\n${message}` : title;
  const actions = buttons?.filter((b) => b.style !== 'cancel') ?? [];
  const hasCancel = buttons?.some((b) => b.style === 'cancel') ?? false;

  if (hasCancel && actions.length > 0) {
    if (dialogs.confirm(text)) actions[0].onPress?.();
    return;
  }
  dialogs.alert(text);
  actions[0]?.onPress?.();
}
