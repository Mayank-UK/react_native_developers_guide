import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { ScreenScaffold } from '../components/screen-scaffold';
import { Box, Button, Text, useTheme } from '../design-system';
import { Section, Code } from '../components';

/**
 * Interactive Behaviours screen — how RN responds to touch, focus, hover, and
 * gestures. Every concept ships a LIVE demo you can tap/long-press/focus.
 *
 * RN-standard distinctions woven through the cards:
 *  - Pressable is the modern standard (TouchableOpacity is legacy).
 *  - Hover only exists on web/mouse — touch has no hover event.
 *  - Haptics live in expo-haptics (not a dep here), so demonstrated in prose
 *    guarded by Platform.OS — no new dependency is added by this screen.
 */
export function InteractiveScreen() {
  return (
    <ScreenScaffold
      title="Interactive Behaviours"
      subtitle="Touch, focus, hover — what RN gives you"
    >
      <PressableIntroCard />
      <PressStatesCard />
      <PressedRenderPropCard />
      <DisabledCard />
      <FocusCard />
      <HoverCard />
      <GesturesCard />
      <HapticsCard />
    </ScreenScaffold>
  );
}

/* ------------------------------------------------------------------ */
/* Shared helpers (local)                                              */
/* ------------------------------------------------------------------ */

function PressableIntroCard() {
  return (
    <Section
      title="Pressable — the modern standard"
      explanation="React Native 0.63 replaced the old TouchableOpacity/TouchableHighlight family with Pressable, a single primitive that gives you full control over the pressed state via a render-prop. The older Touchables still ship for backwards compat but are considered legacy. This app's Button is built on Pressable."
    >
      <Box gap="xs">
        <Code>{`<Pressable onPress={...}>
  {({ pressed }) => <View style={{ opacity: pressed ? 0.6 : 1 }} />}
</Pressable>`}</Code>
        <Text variant="caption" tone="muted">
          The handlers you'll reach for: `onPress`, `onLongPress`,
          `onPressIn`, `onPressOut`, plus `disabled`.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Press / long-press / press-in / press-out events                 */
/* ------------------------------------------------------------------ */

type LogEntry = { id: number; text: string };

function PressStatesCard() {
  const { theme } = useTheme();
  const [log, setLog] = useState<LogEntry[]>([]);
  const [seq, setSeq] = useState(1);
  const idRef = useState({ next: 1 })[0];

  const push = (text: string) => {
    const entry: LogEntry = { id: idRef.next++, text };
    setSeq((n) => n + 1);
    setLog((cur) => [entry, ...cur].slice(0, 6));
  };

  return (
    <Section
      title="Press events — live"
      explanation="Press, long-press, press-in, press-out each fire their own callback. Tap the pad: press-in/out fire the instant your finger lands/leaves; press fires on release (a successful tap); long-press fires after the hold threshold (~500ms)."
    >
      <Box gap="sm">
        <View
          style={{
            borderColor: theme.colors.primary,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderRadius: theme.radii.md,
            padding: theme.spacing.lg,
            alignItems: 'center',
          }}
        >
          <Pressable
            onPressIn={() => push('press-in  (finger down)')}
            onPressOut={() => push('press-out (finger up)')}
            onPress={() => push('press     (tap)')}
            onLongPress={() => push('long-press (held)')}
            delayLongPress={500}
            style={({ pressed }) => [
              {
                backgroundColor: pressed ? theme.colors.primary : theme.colors.surfaceVariant,
                paddingHorizontal: theme.spacing.xl,
                paddingVertical: theme.spacing.md,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            {({ pressed }) => (
              <Text
                variant="body"
                tone={pressed ? 'onPrimary' : 'primary'}
                style={{ fontWeight: '700' }}
              >
                {pressed ? '…holding' : 'Tap / hold me'}
              </Text>
            )}
          </Pressable>
        </View>
        <Text variant="small" tone="muted">
          Event log (most recent first, render #{seq}):
        </Text>
        <View style={{ gap: theme.spacing.xxs, minHeight: 20 }}>
          {log.length === 0 ? (
            <Text variant="caption" tone="muted">
              — nothing yet
            </Text>
          ) : (
            log.map((e) => (
              <View
                key={e.id}
                style={{
                  backgroundColor: theme.colors.surfaceVariant,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xxs,
                  borderRadius: theme.radii.sm,
                }}
              >
                <Text variant="caption" style={{ fontFamily: 'monospace' }}>
                  {e.text}
                </Text>
              </View>
            ))
          )}
        </View>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. The `pressed` render-prop                                        */
/* ------------------------------------------------------------------ */

function PressedRenderPropCard() {
  const { theme } = useTheme();
  return (
    <Section
      title="The pressed render-prop"
      explanation="The `style` and children of a Pressable can both be functions of `{ pressed, hovered } }`. That lets you show a visible response — scale, colour swap, shadow — without state. Compare: the legacy Touchables baked a fixed opacity into the component; Pressable hands you the truth."
    >
      <Box gap="sm" style={{ alignItems: 'center' }}>
        <Pressable
          style={({ pressed }) => [
            {
              transform: [{ scale: pressed ? 0.92 : 1 }],
              backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary,
              paddingHorizontal: theme.spacing.xl,
              paddingVertical: theme.spacing.md,
              borderRadius: theme.radii.full,
            },
          ]}
        >
          {({ pressed }) => (
            <Text variant="body" tone="onPrimary" style={{ fontWeight: '700' }}>
              {pressed ? 'Pushed in' : 'Push me'}
            </Text>
          )}
        </Pressable>
        <Text variant="caption" tone="muted">
          No state — the whole response is derived from `pressed`.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Disabled state                                                   */
/* ------------------------------------------------------------------ */

function DisabledCard() {
  const [enabled, setEnabled] = useState(false);
  return (
    <Section
      title="disabled — blocking interaction"
      explanation="Set `disabled` on any Pressable (or pass it through to the app's Button). Disabled controls render faded (opacity 0.5 here) and drop press events entirely — useful for guarding submit until a form is valid."
    >
      <Box gap="sm">
        <Button
          title={enabled ? 'Submit (enabled)' : 'Submit (disabled)'}
          variant="filled"
          disabled={!enabled}
          onPress={() => {
            /* would submit */
          }}
        />
        <Button
          title={enabled ? 'Disable' : 'Enable submit'}
          variant="outline"
          onPress={() => setEnabled((v) => !v)}
        />
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Focus (TextInput)                                                */
/* ------------------------------------------------------------------ */

function FocusCard() {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('');
  return (
    <Section
      title="Focus — TextInput"
      explanation="Focus is the keyboard-input state. TextInput fires onFocus/onBlur; autoFocus grabs focus on mount. There's no CSS :focus — you style the focus ring yourself from the focused flag. (Try focusing the field below: the border turns primary.)"
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Box gap="xs">
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Tap to focus…"
            placeholderTextColor={theme.colors.textMuted}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              borderWidth: 2,
              borderColor: focused ? theme.colors.primary : theme.colors.border,
              borderRadius: theme.radii.md,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              color: theme.colors.text,
              backgroundColor: theme.colors.background,
              fontSize: 16,
            }}
          />
          <Box row gap="sm" style={{ alignItems: 'center' }}>
            <Text variant="small" tone="muted">
              status:
            </Text>
            <Text variant="small" tone={focused ? 'primary' : 'muted'} style={{ fontWeight: '600' }}>
              {focused ? 'focused' : 'blurred'}
            </Text>
          </Box>
          <Text variant="caption" tone="muted">
            Note the keyboard pops on native; this screen wraps the field in a
            KeyboardAvoidingView (covered on the Responsive screen).
          </Text>
        </Box>
      </KeyboardAvoidingView>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Hover (web-only)                                                 */
/* ------------------------------------------------------------------ */

function HoverCard() {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const isWeb = Platform.OS === 'web';
  return (
    <Section
      title="Hover — web / mouse only"
      explanation="An important RN-vs-web distinction: touch devices have NO hover. A finger is either touching or not. onHoverIn/onHoverOut fire only on web (and other pointer platforms), so you must not hide information behind a hover state on mobile. Use a tap or long-press instead."
    >
      <Box gap="sm">
        <Pressable
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          style={{
            backgroundColor: hovered ? theme.colors.primary : theme.colors.surfaceVariant,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.radii.md,
            alignItems: 'center',
          }}
        >
          <Text
            variant="body"
            tone={hovered ? 'onPrimary' : 'primary'}
            style={{ fontWeight: '700' }}
          >
            {hovered ? 'Hovering (web)' : 'Hover me (web only)'}
          </Text>
        </Pressable>
        <Text variant="caption" tone="muted">
          Platform.OS === '{Platform.OS}'. The handler is wired up;{' '}
          {isWeb
            ? "you're on web, so hover works."
            : "but you're on a touch platform, so it stays in the resting state — exactly the point."}
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Gestures (gesture-handler / Reanimated)                          */
/* ------------------------------------------------------------------ */

function GesturesCard() {
  const { theme } = useTheme();
  return (
    <Section
      title="Gestures — gesture-handler + Reanimated"
      explanation="For anything beyond a tap (swipe, drag, pinch, double-tap), the RN standard is react-native-gesture-handler (already a dep here, wired in _layout via GestureHandlerRootView) paired with react-native-reanimated for 60fps animations running on the UI thread. This screen's tap/long-press demos above cover the Pressable-based common case; richer gestures use those libraries."
    >
      <Box gap="xs">
        <Code>{`import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const pan = Gesture.Pan().onUpdate((e) => { ... });
<GestureDetector gesture={pan}><View /></GestureDetector>`}</Code>
        <View
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.radii.md,
            padding: theme.spacing.sm,
          }}
        >
          <Text variant="caption" tone="muted">
            Pan/swipe/drag would inflate this screen significantly; the tap +
            long-press demos above are Pressable's built-in subset and cover most
            real button interactions.
          </Text>
        </View>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Haptics (guarded — no dep added)                                 */
/* ------------------------------------------------------------------ */

function HapticsCard() {
  return (
    <Section
      title="Haptics — guarded (not a dependency here)"
      explanation="Tactile feedback (the small buzz on long-press / success) is part of a polished native feel. In Expo it lives in `expo-haptics` — which is NOT installed in this app, so rather than add a dependency this card shows the standard call shape, guarded by Platform.OS so web export still works."
    >
      <Box gap="xs">
        <Code>{`import * as Haptics from 'expo-haptics';

if (Platform.OS !== 'web') {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}`}</Code>
        <Text variant="caption" tone="muted">
          Haptics are physical (native only); they're a no-op on web. Keep them
          behind a Platform guard and call from an onPress/onLongPress, never on
          every render.
        </Text>
      </Box>
    </Section>
  );
}
