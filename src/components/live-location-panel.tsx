import { useState, useMemo } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { LocationIcon } from '@/components/icons';
import { showAlert } from '@/lib/alert';
import { distanceKm, estimateDriveMinutes, formatDistance } from '@/lib/geo';
import { tapLight } from '@/lib/haptics';
import { startSharing, stopSharing, useThreadLocationShares } from '@/lib/location-share';
import { Fonts, Radii, Spacing, Type, useColors, type ColorPalette } from '@/theme';

// react-native-maps has no web renderer — only require it off web.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Maps = Platform.OS === 'web' ? null : (require('react-native-maps') as typeof import('react-native-maps'));

function timeAgoShort(ms: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  return `${minutes} min ago`;
}

type LiveLocationPanelProps = {
  conversationId: string;
  myUserId: string | undefined;
  otherName: string;
};

/**
 * Opt-in, foreground-only live location for one chat — either side can start or
 * stop it, and it's always scoped to this one conversation. See lib/location-share.ts.
 */
export function LiveLocationPanel({ conversationId, myUserId, otherName }: LiveLocationPanelProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const shares = useThreadLocationShares(conversationId);
  const mine = shares.find((s) => s.userId === myUserId);
  const theirs = shares.find((s) => s.userId !== myUserId);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const sharing = mine !== undefined;
  const km = mine && theirs ? distanceKm(mine, theirs) : null;

  const toggle = async () => {
    if (busy) return;
    tapLight();
    setBusy(true);
    if (sharing) {
      await stopSharing(conversationId);
    } else {
      const problem = await startSharing(conversationId);
      if (problem) showAlert('Couldn’t share your location', problem);
      else setExpanded(true);
    }
    setBusy(false);
  };

  // Only your own pin — sharing the other person's location out of the app isn't yours to give.
  const shareWithSomeone = () => {
    if (!mine) return;
    tapLight();
    const url = `https://maps.google.com/?q=${mine.latitude},${mine.longitude}`;
    Share.share({ message: `Meeting on PaGaraji — here's where I am: ${url}`, url });
  };

  if (!sharing && !theirs) {
    if (Platform.OS === 'web') return null; // nothing to preview on web, and starting a share needs the phone anyway
    return (
      <Pressable style={({ pressed }) => [styles.prompt, pressed && styles.pressed]} onPress={toggle} disabled={busy}>
        <LocationIcon size={15} color={Colors.header} />
        <Text style={styles.promptText}>{busy ? 'Starting…' : 'Share your live location'}</Text>
      </Pressable>
    );
  }

  return (
    <View>
      <Pressable style={({ pressed }) => [styles.statusRow, pressed && styles.pressed]} onPress={() => setExpanded((e) => !e)}>
        <LocationIcon size={15} color={Colors.header} />
        <Text style={styles.statusText} numberOfLines={1}>
          {km !== null
            ? `${formatDistance(km)} away · ~${estimateDriveMinutes(km)} min`
            : sharing
              ? 'Sharing your live location'
              : `${otherName} is sharing their location`}
        </Text>
        {sharing && (
          <Pressable
            hitSlop={8}
            disabled={busy}
            onPress={(e) => {
              e.stopPropagation();
              toggle();
            }}>
            <Text style={styles.stop}>{busy ? '…' : 'Stop'}</Text>
          </Pressable>
        )}
      </Pressable>
      {expanded && <LiveMap mine={mine} theirs={theirs} otherName={otherName} />}
      {expanded && sharing && (
        <Pressable style={({ pressed }) => [styles.shareLink, pressed && styles.pressed]} onPress={shareWithSomeone}>
          <Text style={styles.shareLinkText}>Share this with someone</Text>
        </Pressable>
      )}
    </View>
  );
}

function LiveMap({
  mine,
  theirs,
  otherName,
}: {
  mine?: { latitude: number; longitude: number; updatedAt: number };
  theirs?: { latitude: number; longitude: number; updatedAt: number };
  otherName: string;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  if (Platform.OS === 'web' || !Maps) {
    return (
      <View style={[styles.mapBox, styles.webFallback]}>
        <Text style={styles.webFallbackText}>Open PaGaraji on your phone to see the live map.</Text>
      </View>
    );
  }
  const MapView = Maps.default;
  const { Marker } = Maps;
  const center = mine ?? theirs;
  if (!center) return null;

  return (
    <View style={styles.mapBox}>
      <MapView
        style={StyleSheet.absoluteFill}
        userInterfaceStyle={Platform.OS === 'ios' ? 'dark' : undefined}
        initialRegion={{ ...center, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        showsCompass={false}
        toolbarEnabled={false}>
        {mine && (
          <Marker coordinate={mine} title="You" description={timeAgoShort(mine.updatedAt)}>
            <View style={[styles.pin, styles.pinMine]} />
          </Marker>
        )}
        {theirs && (
          <Marker coordinate={theirs} title={otherName} description={timeAgoShort(theirs.updatedAt)}>
            <View style={[styles.pin, styles.pinTheirs]} />
          </Marker>
        )}
      </MapView>
    </View>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  promptText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cardImage,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusText: {
    flex: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
  },
  stop: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.danger,
    textDecorationLine: 'underline',
  },
  shareLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  shareLinkText: {
    fontFamily: Fonts.bodyBold,
    fontSize: Type.small,
    color: Colors.ink,
    textDecorationLine: 'underline',
  },
  mapBox: {
    height: 180,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: Colors.cardImage,
  },
  webFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  webFallbackText: {
    fontFamily: Fonts.bodyRegular,
    fontSize: Type.small,
    color: Colors.muted,
    textAlign: 'center',
  },
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
  },
  pinMine: {
    backgroundColor: Colors.header,
    borderColor: '#FFFFFF',
  },
  pinTheirs: {
    backgroundColor: Colors.accent,
    borderColor: Colors.ink,
  },
});
}
