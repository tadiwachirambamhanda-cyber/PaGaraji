/**
 * Turns what someone typed into an international number like +263771234567, or null if it
 * can't be one. A leading 0 is read as a Zimbabwe number (077... becomes +26377...).
 */
export function toE164(input: string): string | null {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/\D/g, '');
  if (!hasPlus) {
    if (digits.startsWith('00')) digits = digits.slice(2);
    else if (digits.startsWith('0')) digits = `263${digits.slice(1)}`;
  }
  return /^\d{9,15}$/.test(digits) ? `+${digits}` : null;
}
