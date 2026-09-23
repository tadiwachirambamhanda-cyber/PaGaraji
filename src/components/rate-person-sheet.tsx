import { useState, useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/button';
import { StarIcon } from '@/components/icons';
import { tapLight } from '@/lib/haptics';
import { Fonts, Spacing, Type, useColors, type ColorPalette } from '@/theme';

type RatePersonSheetProps = {
  visible: boolean;
  onClose: () => void;
  personName: string;
  /** Returns an error message on failure, or null on success — the sheet closes itself on success. */
  onSubmit: (rating: number, comment: string) => Promise<string | null>;
};

/** Rates whoever's on the other side of a deal — a buyer rating a seller, or a seller rating a buyer. */
export function RatePersonSheet({ visible, onClose, personName, onSubmit }: RatePersonSheetProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  const submit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true);
    const problem = await onSubmit(rating, comment);
    setSubmitting(false);
    if (!problem) close();
  };

  return (
    <BottomSheet visible={visible} onClose={close}>
      <Text style={styles.title}>Rate {personName}</Text>
      <Text style={styles.subtitle}>How did it go? This helps other people trust who they’re dealing with.</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
            hitSlop={6}
            onPress={() => {
              tapLight();
              setRating(value);
            }}>
            <StarIcon size={32} color={value <= rating ? Colors.accent : Colors.border} />
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Add a comment (optional)"
        placeholderTextColor={Colors.placeholder}
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={500}
      />
      <Button
        label={submitting ? 'Submitting…' : rating === 0 ? 'Pick a rating first' : 'Submit rating'}
        variant="primary"
        onPress={submit}
      />
    </BottomSheet>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  title: {
    fontFamily: Fonts.headingBold,
    fontSize: Type.title,
    color: Colors.ink,
  },
  subtitle: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.ink,
    borderRadius: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.body,
    color: Colors.ink,
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
}
