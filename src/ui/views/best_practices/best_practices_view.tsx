import { memo } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { ScreenScaffold } from '../../components/screen-scaffold';
import { Box, Button, Text } from '../../components';
import { useTheme } from '../../design-system';
import { Section, Code, Pill } from '../../components';
import {
  useVirtualizationLab,
  useMountCounter,
  useMemoizationLab,
  useRenderCounter,
  useAccessibilityLab,
  ITEM_COUNTS,
} from './best_practices_hooks';

/**
 * BestPracticesView — a dumb structure. All state/behaviour lives in the
 * co-located hooks (best_practices_hooks.ts); this file only renders.
 *
 * The capstone topic: performance, accessibility, maintainability, TS
 * discipline, security, state hygiene, error handling — grounded in THIS app's
 * own conventions. Three LIVE labs (virtualization, memoization, a11y) drive
 * the points home. The view's `FlatList`s use `nestedScrollEnabled` + a
 * bounded-height container; the scaffold's `scrollable={false}` prop is set so
 * the scaffold does NOT wrap a FlatList in a ScrollView.
 *
 * Single-file helpers stay local per convention. No `any`; strict +
 * erasure-clean (const-object + literal unions, never `enum`).
 */
export function BestPracticesView() {
  return (
    <ScreenScaffold
      title="Best Practices"
      scrollable={false}
    >
      <IntroCard />
      <PerformancePrinciplesCard />
      <VirtualizationLabCard />
      <MemoizationLabCard />
      <AccessibilityPrinciplesCard />
      <AccessibilityLabCard />
      <CodeQualityCard />
      <DoDontCard />
      <TypeScriptDisciplineCard />
      <SecurityCard />
      <StateHygieneCard />
      <ErrorHandlingHygieneCard />
      <RecapCard />
    </ScreenScaffold>
  );
}

function IntroCard() {
  return (
    <Section title="Writing better React Native">
      <Text variant="body">
        "Best practice" in React Native is not a checklist of snippets — it is
        the discipline of keeping the{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          JS thread cheap
        </Text>
        , the{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          UI usable by everyone
        </Text>
        , and the{' '}
        <Text variant="body" tone="primary" style={{ fontWeight: '600' }}>
          codebase habitable
        </Text>{' '}
        a year from now. This screen teaches those three by showing the trade
        offs in this app's own code, with live demos.
      </Text>
      <Box p="sm" radius="md" bg="surfaceVariant">
        <Text variant="small" tone="muted">
          <Text style={{ fontWeight: '600' }}>How to read this screen.</Text>{' '}
          Each section pairs a short principle with a LIVE demo. Press the
          controls and watch the measurement change — that feedback loop is the
          whole point. Principles cite the real files that embody them.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Performance principles                                           */
/* ------------------------------------------------------------------ */

const PERF_ROWS: ReadonlyArray<{ title: string; tag: string; body: string }> = [
  {
    title: 'Virtualize long lists',
    tag: 'FlatList / FlashList',
    body: 'Never `.map` a large array into nodes — every item mounts and stays in the tree. FlatList (and FlashList) mount only the visible window + a small overscan, recycling rows as you scroll. Try it live below.',
  },
  {
    title: 'Stabilize references',
    tag: 'React.memo / useCallback',
    body: 'A new object/array/function identity on every render defeats React.memo and re-renders every child. Wrap handlers in useCallback, derive objects in useMemo, and pass primitives where possible. Live demo below.',
  },
  {
    title: 'Use a stable keyExtractor',
    tag: 'key',
    body: 'An index key breaks on reorder/insert (React unmounts+remounts the wrong rows). A stable id key lets React reconcile by identity and preserves component + scroll state.',
  },
  {
    title: 'Move heavy work off the JS thread',
    tag: 'InteractionManager',
    body: 'Defer non-critical work until after interactions finish (InteractionManager.runAfterInteractions) so list swipes and touches stay at 60fps. For real heavy lifting, offload to a native module or a Web Worker (web).',
  },
  {
    title: 'Optimize images',
    tag: 'expo-image',
    body: 'Images are the biggest source of bridge traffic + memory. Use expo-image (cache, downscale, placeholder/blurhash) and serve correctly sized assets; never ship a 4000px photo into a 200px thumbnail.',
  },
  {
    title: 'Reduce bridge traffic',
    tag: 'batch writes',
    body: 'Each native call crosses the bridge. Batch reads/writes (e.g. one AsyncStorage multiSet), avoid per-frame native calls in animations (use Reanimated worklets, which run on the UI thread).',
  },
];

function PerformancePrinciplesCard() {
  return (
    <Section
      title="Performance — keep the JS thread cheap"
      explanation="RN renders on two threads: the JS thread runs your React logic; the native thread renders. Slow JS = dropped frames. Every principle below is about giving the JS thread less work."
    >
      <Box gap="xs">
        {PERF_ROWS.map((r) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.title}
              </Text>
              <Pill>{r.tag}</Pill>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.body}
            </Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. LIVE — Virtualization lab                                        */
/* ------------------------------------------------------------------ */

function VirtualRow({ label }: { label: string }) {
  useMountCounter();
  return (
    <Box p="xs" bg="surfaceVariant" radius="sm">
      <Text variant="caption" style={{ fontFamily: 'monospace' }}>
        {label}
      </Text>
    </Box>
  );
}

function VirtualizationLabCard() {
  const { mode, count, setCount, run, mounts, elapsedMs, data } = useVirtualizationLab();
  const { theme } = useTheme();

  return (
    <Section
      title="LIVE — virtualization lab: .map vs FlatList"
      explanation="Pick a size and a strategy, then press Run. The lab counts how many Row components actually MOUNT (not how many items exist) and measures the render time. FlatList mounts only the visible window; naive .map mounts every single one."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Text variant="caption" tone="muted">
            items:
          </Text>
          {ITEM_COUNTS.map((n) => (
            <Button
              key={n}
              title={n >= 1000 ? `${n / 1000}k` : String(n)}
              variant={count === n ? 'filled' : 'outline'}
              onPress={() => setCount(n)}
            />
          ))}
        </Box>

        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button
            title="Run FlatList"
            variant={mode === 'flatlist' ? 'filled' : 'outline'}
            onPress={() => run('flatlist', count)}
          />
          <Button
            title="Run Naive .map"
            variant={mode === 'naive' ? 'filled' : 'outline'}
            onPress={() => run('naive', count)}
          />
        </Box>

        <Box p="sm" radius="md" bg="surfaceVariant" gap="xs">
          <Box row gap="sm" style={{ alignItems: 'center' }}>
            <Pill tone={mode === 'flatlist' ? 'success' : 'danger'}>
              {mode === 'flatlist' ? 'FlatList' : 'Naive .map'}
            </Pill>
            <Text variant="small" style={{ fontFamily: 'monospace' }}>
              {count.toLocaleString()} items
            </Text>
          </Box>
          <Box row gap="lg" mt="xs">
            <Metric label="Rows mounted" value={mounts === null ? '—' : mounts.toString()} />
            <Metric
              label="Render time"
              value={elapsedMs === null ? '—' : `${elapsedMs} ms`}
            />
          </Box>
          <Text variant="caption" tone="muted" mt="xxs">
            {mounts === null
              ? 'Press Run to measure.'
              : mode === 'flatlist'
                ? `FlatList mounted ~${mounts} rows — the visible window + overscan. The other ${count - mounts} items never entered the tree.`
                : `Naive .map mounted all ${mounts} rows. At ${count} items that is ${Math.max(0, count - 0)}x more work than necessary and grows linearly with your data.`}
          </Text>
        </Box>

        {/* The actual rendered list — capped height so it stays scrollable in-page. */}
        <View
          style={{
            height: 160,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.md,
            overflow: 'hidden',
          }}
        >
          {mode === 'flatlist' ? (
            <FlatList
              data={data}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => <VirtualRow label={`Item #${item}`} />}
              initialNumToRender={8}
              windowSize={3}
              nestedScrollEnabled
            />
          ) : (
            <FlatList
              data={[{ __naive: true }]}
              keyExtractor={() => 'naive'}
              renderItem={() => (
                <View>
                  {data.map((item) => (
                    <VirtualRow key={item} label={`Item #${item}`} />
                  ))}
                </View>
              )}
              nestedScrollEnabled
            />
          )}
        </View>

        <Code>{`// GOOD — only the visible window mounts:
<FlatList
  data={items}
  keyExtractor={(it) => it.id}        // stable id, never the index
  renderItem={({ item }) => <Row item={item} />}
  initialNumToRender={8}
  windowSize={3}
/>

// BAD — every item mounts, however long the list:
{items.map((it, i) => <Row key={i} item={it} />)}`}</Code>
      </Box>
    </Section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="h2" style={{ fontFamily: 'monospace' }}>
        {value}
      </Text>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* 4. LIVE — Memoization lab                                           */
/* ------------------------------------------------------------------ */

/** A child that counts how many times it renders. */
function CountingChild({ onPoke, memoized }: { onPoke: () => void; memoized: boolean }) {
  const renders = useRenderCounter();
  return (
    <Box p="sm" radius="sm" bg="surfaceVariant">
      <Box row gap="sm" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Text variant="caption" tone="muted">
            Child renders
          </Text>
          <Text variant="h3" style={{ fontFamily: 'monospace' }}>
            {renders}
          </Text>
        </Box>
        <Button title="Poke child" variant="outline" onPress={onPoke} />
      </Box>
      <Text variant="caption" tone="muted" mt="xxs">
        {memoized
          ? 'memo(CountingChild) + useCallback(onPoke) — skips re-render when only the parent changes.'
          : 'No memo, fresh inline handler — re-renders on every parent render.'}
      </Text>
    </Box>
  );
}

const MemoizedCountingChild = memo(CountingChild);

function MemoizationLabCard() {
  const {
    parentTick,
    bumpParent,
    memoized,
    toggleMemoized,
    pokeCount,
    stablePoke,
    unstablePoke,
  } = useMemoizationLab();

  return (
    <Section
      title="LIVE — memoization lab: React.memo + useCallback"
      explanation="The parent owns state that changes when you bump it. Toggle whether the child is wrapped in React.memo and whether its onPress is a stable useCallback. Watch the child's render counter: with memo + a stable handler, bumping the parent does NOT re-render the child."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Button title="Bump parent" onPress={bumpParent} />
          <Button
            title={memoized ? 'memo: ON' : 'memo: OFF'}
            variant={memoized ? 'filled' : 'outline'}
            onPress={toggleMemoized}
          />
          <Text variant="caption" tone="muted">
            parent tick: {parentTick} · pokes: {pokeCount}
          </Text>
        </Box>

        {memoized ? (
          <MemoizedCountingChild onPoke={stablePoke} memoized={memoized} />
        ) : (
          <CountingChild onPoke={unstablePoke} memoized={memoized} />
        )}

        <Text variant="caption" tone="muted">
          With <Text style={{ fontFamily: 'monospace' }}>memo: ON</Text>, bumping
          the parent does not re-render the child because its props (the{' '}
          <Text style={{ fontFamily: 'monospace' }}>useCallback</Text> handler +
          the primitives) are referentially identical. Toggle it off and the
          fresh inline handler breaks that equality — the child re-renders every
          time. This is exactly why this app's Button takes primitives and a
          single onPress.
        </Text>

        <Code>{`// GOOD — stable handler identity so memoized children skip renders:
const handlePress = useCallback(() => {
  setCount((c) => c + 1);
}, []);
return <MemoizedRow onPress={handlePress} value={value} />;

// BAD — new function identity every render defeats React.memo:
return <MemoizedRow onPress={() => setCount(c + 1)} value={value} />;`}</Code>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Accessibility principles                                         */
/* ------------------------------------------------------------------ */

const A11Y_ROWS: ReadonlyArray<{ prop: string; title: string; body: string }> = [
  {
    prop: 'accessibilityRole',
    title: 'Say what it IS',
    body: '.button / .header / .image / .link. The screen reader announces the role, so "Save" is read as "Save, button". The app Button already sets .button.',
  },
  {
    prop: 'accessibilityLabel',
    title: 'Say what it MEANS',
    body: 'A visible icon-only control has no readable text. Provide a label a sightless user understands: accessibilityLabel="Add to favourites".',
  },
  {
    prop: 'accessibilityHint',
    title: 'Say what it DOES',
    body: 'Optional expansion of intent: "Adds this post to your saved list". Keep labels short; put the why in the hint.',
  },
  {
    prop: 'accessibilityState',
    title: 'Say its STATE',
    body: '{ disabled, selected, checked, expanded }. The app Button sets { disabled } so a disabled control is announced as such, not just dimmed.',
  },
  {
    prop: 'hitSlop',
    title: 'Minimum tap targets',
    body: 'A 24px icon is hard to tap. hitSlop extends the tappable area without changing the visual size; aim for 44x44pt (Apple) / 48x48dp (Google) minimum.',
  },
];

function AccessibilityPrinciplesCard() {
  return (
    <Section
      title="Accessibility — usable by everyone"
      explanation="RN ships real accessibility props that map to the platform screen readers (VoiceOver / TalkBack). This app's own Button sets accessibilityRole + accessibilityState (see button.tsx) — every interactive primitive should do the same."
    >
      <Box gap="xs">
        {A11Y_ROWS.map((r) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" tone="primary" style={{ fontFamily: 'monospace', fontWeight: '600' }}>
              {r.prop}
            </Text>
            <Text variant="caption" style={{ fontWeight: '600' }} mt="xxs">
              {r.title}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.body}
            </Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. LIVE — Accessibility lab                                         */
/* ------------------------------------------------------------------ */

const HIT_SLOP_DEFAULT = { top: 0, bottom: 0, left: 0, right: 0 } as const;
const HIT_SLOP_WIDE = { top: 12, bottom: 12, left: 12, right: 12 } as const;

function AccessibilityLabCard() {
  const {
    role,
    toggleRole,
    label,
    toggleLabel,
    hint,
    toggleHint,
    hitSlop,
    toggleHitSlop,
    presses,
    press,
    announced,
    selected,
  } = useAccessibilityLab();
  const { theme } = useTheme();

  return (
    <Section
      title="LIVE — accessibility lab"
      explanation="Toggle the a11y props on the star button and read what a screen reader would actually announce. The dashed outline shows the hitSlop-extended tap target."
    >
      <Box gap="sm">
        <Box row gap="xs" style={{ flexWrap: 'wrap' }}>
          <Button title={role ? 'role ✓' : 'role ✗'} variant={role ? 'filled' : 'outline'} onPress={toggleRole} />
          <Button title={label ? 'label ✓' : 'label ✗'} variant={label ? 'filled' : 'outline'} onPress={toggleLabel} />
          <Button title={hint ? 'hint ✓' : 'hint ✗'} variant={hint ? 'filled' : 'outline'} onPress={toggleHint} />
          <Button title={hitSlop ? 'hitSlop ✓' : 'hitSlop ✗'} variant={hitSlop ? 'filled' : 'outline'} onPress={toggleHitSlop} />
        </Box>

        <Box p="md" radius="md" bg="surfaceVariant" center>
          <Pressable
            onPress={press}
            hitSlop={hitSlop ? HIT_SLOP_WIDE : HIT_SLOP_DEFAULT}
            accessibilityRole={role ? 'button' : undefined}
            accessibilityLabel={label ? 'Bookmark' : undefined}
            accessibilityHint={hint ? 'Saves this post to your list' : undefined}
            accessibilityState={presses > 0 ? { selected } : undefined}
            style={{
              width: 44,
              height: 44,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: theme.colors.primary,
              borderRadius: theme.radii.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="h3" tone="primary">
              ★
            </Text>
          </Pressable>
        </Box>

        <Box p="sm" radius="md" bg="background" gap="xxs">
          <Text variant="caption" tone="muted">
            Screen reader announces:
          </Text>
          <Text variant="small" style={{ fontWeight: '600' }}>
            “{announced.trim() || '(nothing readable)'}”
          </Text>
          <Text variant="caption" tone="muted" mt="xxs">
            tap target: {hitSlop ? '44 + 24 hitSlop ≈ 68pt (comfortable)' : '44pt (minimum)'} ·
            presses: {presses}
          </Text>
        </Box>

        <Text variant="caption" tone="muted">
          Turn the label OFF and the announcement collapses to a bare "★" —
          unusable for a sightless user. Turn it back ON and add the role to get
          "Bookmark, button". This is precisely why the app's Button component
          owns <Text style={{ fontFamily: 'monospace' }}>accessibilityRole</Text>{' '}
          and <Text style={{ fontFamily: 'monospace' }}>accessibilityState</Text>{' '}
          centrally instead of asking every call site to remember.
        </Text>
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Code quality / maintainability                                   */
/* ------------------------------------------------------------------ */

const QUALITY_ROWS: ReadonlyArray<{ title: string; where: string; body: string }> = [
  {
    title: 'DRY / KISS / SOLID',
    where: 'ARCHITECTURE.md',
    body: 'One responsibility per module (SOLID by layer), the simplest thing that works (KISS), and a single source for every repeated idea (DRY). The layering invariant — deps point inward — is the architectural expression of this.',
  },
  {
    title: 'Single source of truth',
    where: 'routes.ts + tokens.ts',
    body: 'Routes live once in routes.ts (consumed by the hub AND the drawer). Colors/spacing/radii live once in tokens.ts. Adding a screen is a one-line change in routes.ts + one file under app/.',
  },
  {
    title: 'Const-object over enum',
    where: 'erasableSyntaxOnly',
    body: '`const Foo = {…} as const; type Foo = (typeof Foo)[keyof typeof Foo]` gives runtime values + a literal union with no non-erasable syntax. The tsconfig enforces it.',
  },
  {
    title: 'Result<T> at boundaries',
    where: 'core/result.ts',
    body: 'Every fallible domain call returns a Result, not a throw. Forces the caller to acknowledge failure at the type level — no forgotten try/catch.',
  },
  {
    title: 'Co-located tests',
    where: '*.spec.ts',
    body: 'Each spec sits beside its module. Discovery is automatic; ownership is obvious; moving a module moves its tests. 8 suites, 42 tests, all green.',
  },
  {
    title: 'Consistent naming',
    where: 'mirrors sibling guides',
    body: 'domain/data/core/ui layer names, *-screen.tsx topic screens, thin app/*.tsx routes. A reader of the web/Flutter guides recognizes the structure instantly.',
  },
];

function CodeQualityCard() {
  return (
    <Section
      title="Maintainability — the principles this app follows"
      explanation="Habitable code is the sum of small, boring disciplines. These are the ones encoded in ARCHITECTURE.md + agentic_development.md, each tied to a concrete file."
    >
      <Box gap="xs">
        {QUALITY_ROWS.map((r) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant">
            <Box row gap="sm" style={{ flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.title}
              </Text>
              <Text variant="caption" tone="primary" style={{ fontFamily: 'monospace' }}>
                {r.where}
              </Text>
            </Box>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.body}
            </Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Do / Don't comparison                                            */
/* ------------------------------------------------------------------ */

const DO_DONT_ROWS: ReadonlyArray<{ topic: string; good: string; bad: string; why: string }> = [
  {
    topic: 'List rendering',
    good: '<FlatList data=… keyExtractor={(it)=>it.id} />',
    bad: '{items.map((it,i) => <Row key={i} />)}',
    why: 'FlatList virtualizes; index keys break on insert/reorder.',
  },
  {
    topic: 'Handler identity',
    good: 'const fn = useCallback(() => …, []);',
    bad: 'onPress={() => …}',
    why: 'Stable identity lets memoized children skip re-renders.',
  },
  {
    topic: 'Failure handling',
    good: 'const r = await repo.getPosts(); if (!r.ok) …',
    bad: 'try { await api() } catch {} // swallowed',
    why: 'Result forces acknowledgement; silent catches hide bugs.',
  },
  {
    topic: 'Untyped input',
    good: 'function parse(v: unknown): Result<T>',
    bad: 'function parse(v: any): T',
    why: 'unknown forces validation before use; any disables the type check.',
  },
  {
    topic: 'State shape',
    good: 'const [state, dispatch] = useReducer(reducer, init);',
    bad: 'useState × 6, set individually',
    why: 'A reducer keeps related state transitions atomic and traceable.',
  },
  {
    topic: 'Secrets',
    good: 'EXPO_PUBLIC_API_URL via app.config.ts → AppConfig',
    bad: 'hard-coded API key in a component',
    why: 'Public env vars are baked into the bundle — never put secrets there (see Environments screen).',
  },
];

function DoDontCard() {
  return (
    <Section
      title="Do / Don't — the quick reference"
      explanation="The patterns that come up most often, side by side. Each row is a decision you will make weekly."
    >
      <Box gap="sm">
        {DO_DONT_ROWS.map((r) => (
          <Box key={r.topic} p="sm" radius="sm" bg="surfaceVariant" gap="xs">
            <Text variant="small" style={{ fontWeight: '700' }}>
              {r.topic}
            </Text>
            <Box row gap="xs" style={{ alignItems: 'flex-start' }}>
              <Pill tone="success">DO</Pill>
              <Text variant="caption" style={{ fontFamily: 'monospace', flex: 1 }}>
                {r.good}
              </Text>
            </Box>
            <Box row gap="xs" style={{ alignItems: 'flex-start' }}>
              <Pill tone="danger">DON&apos;T</Pill>
              <Text variant="caption" style={{ fontFamily: 'monospace', flex: 1 }}>
                {r.bad}
              </Text>
            </Box>
            <Text variant="caption" tone="muted">
              {r.why}
            </Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 9. TypeScript discipline                                            */
/* ------------------------------------------------------------------ */

const TS_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'No any, ever',
    body: 'any disables the type check exactly where bugs hide. Use unknown for untrusted input (DTOs, AsyncStorage reads) and narrow with a type guard before touching it.',
  },
  {
    title: 'strict + noUncheckedIndexedAccess',
    body: 'array[i] is T | undefined, not T. map.get(k) is T | undefined. The compiler makes you handle the missing case — that is the whole point.',
  },
  {
    title: 'erasableSyntaxOnly',
    body: 'Bans runtime-emitting TS (enums, parameter properties, namespaces). Keeps types genuinely type-only, so the build output is predictable and tree-shakeable.',
  },
  {
    title: 'Types at the boundary, inference inside',
    body: 'Annotate public APIs and untrusted boundaries; let the compiler infer the rest. Annotated locals just duplicate work and drift.',
  },
];

function TypeScriptDisciplineCard() {
  return (
    <Section
      title="TypeScript discipline — the type system as a guardrail"
      explanation="The tsconfig in this repo is strict on purpose: strict, noUncheckedIndexedAccess, erasableSyntaxOnly, jsx: react-jsx. Types catch bugs at compile time; relaxing them trades away that guarantee."
    >
      <Box gap="xs">
        {TS_ROWS.map((r) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              {r.title}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.body}
            </Text>
          </Box>
        ))}
      </Box>
      <Code>{`// unknown, not any, for untrusted input. Forces validation first:
function toPost(dto: unknown): Result<Post> {
  if (!isPostDTO(dto)) return failed(new ParseFailure());
  return success(mapDTO(dto));
}

// const-object + literal union, not enum (erasableSyntaxOnly-clean):
const ApiScenario = { Success: 'success', NetworkError: 'network', ServerError: 'server' } as const;
type ApiScenario = (typeof ApiScenario)[keyof typeof ApiScenario];

// noUncheckedIndexedAccess: arr[i] is T | undefined, so you MUST narrow:
const first = posts[0];
if (first) handle(first); // the type system made you check.`}</Code>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 10. Security                                                        */
/* ------------------------------------------------------------------ */

const SEC_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Validate at the boundary',
    body: 'Every DTO from the network / AsyncStorage is `unknown` until a type guard (isPostDTO) proves otherwise. Never spread raw remote JSON straight into domain models — see data/remote/dtos.ts.',
  },
  {
    title: 'No secrets in the client',
    body: 'There is no "client secret" — the bundle is public. API keys that must live client-side are scoped (rate-limited, domain-restricted) and treated as compromised-by-design.',
  },
  {
    title: 'Least privilege for dependencies',
    body: 'Audit deps; a transitive package can read everything the app can. Pin versions (this repo does); run npm audit; prefer well-maintained, narrow-purpose packages.',
  },
  {
    title: 'Fail closed',
    body: 'On a validation or auth failure, refuse the value and surface a Failure — never fall back to a permissive default that lets bad data through.',
  },
];

function SecurityCard() {
  return (
    <Section
      title="Security — validate, isolate, least privilege"
      explanation="A client app is untrusted code running on a hostile device. Treat every external value as adversarial and every bundled value as public."
    >
      <Box gap="xs">
        {SEC_ROWS.map((r) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              {r.title}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.body}
            </Text>
          </Box>
        ))}
      </Box>
      <Text variant="caption" tone="muted">
        Ties to the{' '}
        <Text style={{ fontFamily: 'monospace' }}>Environments</Text> screen: build
        config comes from <Text style={{ fontFamily: 'monospace' }}>EXPO_PUBLIC_*</Text> via{' '}
        <Text style={{ fontFamily: 'monospace' }}>app.config.ts</Text> → AppConfig. Anything in
        a <Text style={{ fontFamily: 'monospace' }}>*_PUBLIC</Text> var ships in the bundle —
        so only non-secret pointers go there; real secrets live behind your API.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 11. State hygiene                                                   */
/* ------------------------------------------------------------------ */

const STATE_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Server state ≠ client state',
    body: 'Posts come from the repository (offline-first, cached). They are not "your" state to mutate freely — they are a reflection of a remote source. TanStack Query / SWR exist precisely to manage this distinction.',
  },
  {
    title: 'Lift only as high as needed',
    body: 'State at the right level (local for one input, screen-scoped for a form, app-scoped for theme/auth). Over-lifting causes a re-render storm; under-lifting causes prop-drilling.',
  },
  {
    title: 'Derive, do not duplicate',
    body: 'If B is computable from A, store A and derive B (useMemo). Storing both invites them to drift out of sync — a whole class of bugs deleted.',
  },
  {
    title: 'Atomic transitions',
    body: 'useReducer groups related state so a single action moves the machine from one valid state to the next. Multiple independent useStates updated in sequence can flash through invalid intermediate states.',
  },
];

function StateHygieneCard() {
  return (
    <Section
      title="State & architecture hygiene"
      explanation="Where state lives decides how the app scales. Keep state at the edges (servers where possible), derive don't duplicate, and keep transitions atomic."
    >
      <Box gap="xs">
        {STATE_ROWS.map((r) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              {r.title}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.body}
            </Text>
          </Box>
        ))}
      </Box>
      <Text variant="caption" tone="muted">
        Ties to the <Text style={{ fontFamily: 'monospace' }}>State Management</Text>{' '}
        screen: server-state (posts) flows through the repository + useReducer
        machine in usePosts; only ephemeral UI state (theme mode, screen toggles)
        stays local. Immutability is enforced by the reducer contract.
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 12. Error handling hygiene                                          */
/* ------------------------------------------------------------------ */

const ERR_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Return Result, do not throw, across the domain',
    body: 'Inside data/, exceptions are typed AppExceptions (Network/Server/Storage/Parse). The moment they cross into the domain they become a Result — the UI never imports HTTP concepts.',
  },
  {
    title: 'Never swallow',
    body: 'An empty catch hides the failure from the user AND the log. At minimum, log + classify into a Failure so the pipeline can route it to the right severity.',
  },
  {
    title: 'Preserve the cause chain',
    body: 'AppException.cause and Failure.cause chain recursively. A compound failure ("stale cache because network failed because timeout") reconstructs the whole story for logs (Failure.chain).',
  },
  {
    title: 'Severity drives UI',
    body: 'Critical = full-screen ShowError; Warning/Info = non-blocking toast. One mechanism, two loudness levels — the screen decides how loudly to interrupt.',
  },
];

function ErrorHandlingHygieneCard() {
  return (
    <Section
      title="Error handling — Result at boundaries, never swallow"
      explanation="The two-stage pipeline (AppException → Failure → Result) exists so failures are semantic values, not lost stack traces. The discipline: never swallow, always classify."
    >
      <Box gap="xs">
        {ERR_ROWS.map((r) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant">
            <Text variant="small" style={{ fontWeight: '600' }}>
              {r.title}
            </Text>
            <Text variant="caption" tone="muted" mt="xxs">
              {r.body}
            </Text>
          </Box>
        ))}
      </Box>
      <Code>{`// GOOD — classify + return; the caller can't ignore failure:
async function getPosts(): Promise<Result<Post[]>> {
  const r = await safeRepositoryCall(() => this.remote.all());
  return r; // Success<Post[], warning?> | Failed
}

// BAD — swallow + return a permissive empty:
try { return await api(); }
catch { return []; }   // user never learns the call failed`}</Code>
      <Text variant="caption" tone="muted">
        Ties to the <Text style={{ fontFamily: 'monospace' }}>Exception Handling</Text>{' '}
        screen: severity drives presentation — Critical renders ShowError full-screen;
        Warning/Info renders a non-blocking toast; Success may carry a non-blocking
        warning (stale cache + network failure in one value).
      </Text>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* 13. Recap                                                           */
/* ------------------------------------------------------------------ */

const RECAP_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Keep the JS thread cheap',
    body: 'Virtualize lists, memoize children, stabilize handlers, move heavy work off-thread. Frames are a budget; spend them on the user, not the framework.',
  },
  {
    title: 'Build for the sightless user',
    body: 'Role + label + state + hitSlop on every interactive element. The app Button owns this centrally — follow that pattern.',
  },
  {
    title: 'One source of truth',
    body: 'Routes in routes.ts, tokens in tokens.ts, env in AppConfig. Adding a thing is one line in one place; never duplicate a fact.',
  },
  {
    title: 'Types as guardrails',
    body: 'strict + unknown + Result + const-object. The compiler enforces what review would otherwise have to catch.',
  },
  {
    title: 'Fail loud, classify, route',
    body: 'Result at the boundary, cause chains preserved, severity driving the UI. Never swallow a failure.',
  },
  {
    title: 'Server state is not yours',
    body: 'Reflect it, cache it, but do not mutate it freely. Derive what you can; keep transitions atomic.',
  },
];

function RecapCard() {
  return (
    <Section
      title="Recap — best practice in one breath"
      explanation="Six habits. Live them and the app stays fast, usable, and habitable."
    >
      <Box gap="xs">
        {RECAP_ROWS.map((r, i) => (
          <Box key={r.title} p="sm" radius="sm" bg="surfaceVariant" row gap="sm">
            <Text variant="small" tone="primary" style={{ fontWeight: '700' }}>
              {i + 1}.
            </Text>
            <Box flex={1}>
              <Text variant="small" style={{ fontWeight: '600' }}>
                {r.title}
              </Text>
              <Text variant="caption" tone="muted" mt="xxs">
                {r.body}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

// Re-export the type unions so the spec can avoid importing the view.
