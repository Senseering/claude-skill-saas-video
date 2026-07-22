# Remotion build guide (condensed)

Everything needed to scaffold, animate, time, and render the video. If a
`remotion-best-practices` skill exists in the environment, load it as well —
it goes deeper on transitions, text animation, effects, and fonts.

## Scaffold

```bash
npx create-video@latest --yes --blank --no-tailwind <project-dir>
cd <project-dir>
npx remotion add @remotion/media        # <Audio>, <Video>
npx remotion add @remotion/transitions  # TransitionSeries
npx remotion add @remotion/google-fonts # type-safe font loading
npm i mediabunny                        # audio duration measurement
```

Assets (generated audio, logos) go in `public/` and are referenced with
`staticFile()`.

## Non-negotiable animation rules

- Animate **only** from `useCurrentFrame()` via `interpolate()` (or `spring()`
  for physics). CSS transitions, CSS animations, and Tailwind animation classes
  DO NOT render — frames are captured independently.
- Keep `interpolate()` inline in the `style` prop and prefer individual
  transform properties over composed strings:

```tsx
style={{
  opacity: interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1), // smooth ease-out, good default
  }),
  scale: String(interpolate(frame, [0, 20], [0.9, 1], { extrapolateRight: "clamp" })),
  translate: `0px ${interpolate(frame, [0, 20], [40, 0], { extrapolateRight: "clamp" })}px`,
}}
```

- Always clamp (`extrapolateLeft`/`extrapolateRight`) unless motion should continue.
- No `Math.random()` — everything must be deterministic per frame. For organic
  motion use `Math.sin(frame / n)`; for pseudo-randomness use the `random(seed)`
  helper from `remotion`.
- Delay/limit elements with `<Sequence from={n} durationInFrames={m}>`
  (absolute-fill by default; `layout="none"` for inline).

## Project shape for this skill

```
src/
  Root.tsx          # Composition + calculateMetadata
  theme.ts          # colors/fonts from the style preset + brand colors
  Video.tsx         # TransitionSeries over scenes + Soundtrack
  scenes/           # one component per scene
  components/       # PhoneFrame, BrowserFrame, KeywordCaptions, Soundtrack, ...
public/audio/       # generated TTS + music
audio-config.json
scripts/replicate-audio.mjs
```

## Audio-driven scene timing (the core pattern)

Scene lengths come from the real TTS files. Never hardcode them.

```ts
// src/get-audio-duration.ts
import { Input, ALL_FORMATS, UrlSource } from "mediabunny";

export const getAudioDuration = async (src: string) => {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(src, { getRetryDelay: () => null }),
  });
  return input.computeDuration(); // seconds
};
```

```tsx
// src/Root.tsx
import { Composition, CalculateMetadataFunction, staticFile } from "remotion";
import { getAudioDuration } from "./get-audio-duration";
import { MarketingVideo, VideoProps, scenes } from "./Video";

export const FPS = 30;
export const TRANSITION_FRAMES = 15;          // 0.5 s
const SCENE_TAIL_SECONDS = 0.6;               // breathing room after the voice
// Keep SCENE_TAIL_SECONDS * FPS >= TRANSITION_FRAMES so the transition overlap
// never eats spoken audio.

const calculateMetadata: CalculateMetadataFunction<VideoProps> = async ({ props }) => {
  const durations = await Promise.all(
    props.scenes.map((s) =>
      s.audio ? getAudioDuration(staticFile(s.audio)) : Promise.resolve(null),
    ),
  );
  const timedScenes = props.scenes.map((scene, i) => ({
    ...scene,
    audioDurationInSeconds: durations[i] ?? 0,
    durationInFrames: durations[i]
      ? Math.round((durations[i] + SCENE_TAIL_SECONDS) * FPS)
      : (scene.durationInFrames ?? Math.round(1.4 * FPS)), // chapter words: fixed length
  }));
  const total =
    timedScenes.reduce((sum, s) => sum + s.durationInFrames, 0) -
    TRANSITION_FRAMES * (timedScenes.length - 1); // transitions overlap scenes
  return { durationInFrames: total, props: { ...props, scenes: timedScenes } };
};

export const RemotionRoot = () => (
  <Composition
    id="MarketingVideo"
    component={MarketingVideo}
    fps={FPS}
    width={1920}   // 16:9 → 1920×1080, 9:16 → 1080×1920, 1:1 → 1080×1080
    height={1080}
    durationInFrames={900} // placeholder, overridden by calculateMetadata
    defaultProps={{ scenes }}
    calculateMetadata={calculateMetadata}
  />
);
```

## Assembling scenes with TransitionSeries

`TransitionSeries` children must be `.Sequence`/`.Transition` elements directly
— build a flat array, don't wrap in fragments:

```tsx
// src/Video.tsx
import React from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { TRANSITION_FRAMES } from "./Root";
import { Soundtrack } from "./components/Soundtrack";

export const MarketingVideo: React.FC<VideoProps> = ({ scenes }) => {
  const items: React.ReactNode[] = [];
  scenes.forEach((scene, i) => {
    if (i > 0) {
      items.push(
        <TransitionSeries.Transition
          key={`t-${i}`}
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />,
      );
    }
    items.push(
      <TransitionSeries.Sequence key={scene.id} durationInFrames={scene.durationInFrames}>
        <SceneRenderer scene={scene} index={i} />
        {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
      </TransitionSeries.Sequence>,
    );
  });

  return (
    <AbsoluteFill>
      <Backdrop /> {/* rendered ONCE — scenes keep transparent backgrounds */}
      <TransitionSeries>{items}</TransitionSeries>
      <Soundtrack file="audio/music.wav" />
    </AbsoluteFill>
  );
};
```

The backdrop lives OUTSIDE the series, so a cut never moves the frame — it
only swaps foreground elements. **Screen-level moves (`slide()`, `wipe()`,
`flip()`, `clockWipe()`) are banned** — they read as a template slideshow.
Join scenes with a **10–15 frame `fade()`** by default: it blends the
outgoing exit motion into the incoming entrance so no single frame is a
"snap". A true hard cut is reserved for deliberately punchy styles (Kinetic
Bold) landing on a music beat. Everything else is element choreography:
scene N's elements begin exiting ~15 frames *before* the cut (inside the
audio tail padding, after the voice has finished) and scene N+1's elements
are still entering ~12 frames *after* it — the fade catches both sides
mid-motion, so the energy never stops dead. Helpers in components.md.

## Smoothness is non-negotiable

Abrupt animation is the #1 "feels cheap" reaction. Hard rules:

- Every visible change animates over **at least 8–12 eased frames** —
  `Easing.out(Easing.cubic)` for entrances, `Easing.in(Easing.cubic)` for
  exits, `Easing.inOut(Easing.cubic)` for movement. Never linear for
  position, never a 2–3 frame opacity pop.
- Nothing appears or disappears instantly, nothing teleports. If a value
  changes (a counter, a highlight, a color), it transitions.
- Exits and entrances **overlap in time** — outgoing elements are still
  leaving while incoming ones arrive. Exit-finishes → dead frame → entrance
  reads as a stutter.
- Fast styles stay smooth: "quick" means 8–10 eased frames, not 2 raw ones.

## Every scene must look different (variety)

If all scenes share one shell (centered content + caption strip at the bottom),
the video feels like a template no matter how good each scene is. Give every
scene a distinct **silhouette** — assign a different one per scene in the plan:

1. Full-bleed typography, no mockup
2. Device hero centered (phone/browser dominates the frame)
3. Split: copy on one side, device on the other (mirror it next time)
4. UI full-frame: browser mockup at ~90 % width, camera slowly zooming in
5. UI close-up: ONE real component (counter, chart, notification card)
   rebuilt huge with no device chrome, doing its real behavior
6. Chapter word (1.2–1.6 s, no narration) — one word rising onto the
   persistent backdrop; no full-bleed slam
7. End card

**Mockup budget**: device frames star in at most half the scenes — the phone
specifically in at most two per video. A phone in nearly every scene is the
fastest way to make the video boring; a UI close-up carries a feature just as
well without the repetition.

Vary the cuts the same way — one `fade()` everywhere is the transition version
of a slideshow. But the variety comes from **element choreography, never from
moving the screen**: the backdrop persists across every cut, and what changes
per cut is *how the elements leave and arrive* — fly up and fade, scale down
into a dot, the chart collapsing while the next scene's counter pops in, a
zoom-through into a screen, a chapter word given its own quiet beat. Two
adjacent cuts shouldn't use the same exit/enter move. Use the preset's transition kit (styles.md) built from the
cinematic patterns in components.md: staggered element exits/entrances, a
`FloatingHero` device that travels across cuts, zoom-throughs into screens,
chapter words — with at most a couple of quiet SFX accents across the whole
video (restraint rules in components.md). QA check: lay the per-scene stills
side by side — no
two scenes should share a layout, and the hero device must never sit in the
same spot twice.

## Choreography: fill the whole scene with motion

The most common failure mode is a scene whose entrances all finish in the
first second — the remaining 3–6 s of narration play over a freeze-frame and
the video feels like a slideshow. Every scene needs three motion layers
(details and code in `components.md`):

1. **Ambient**: something always moving — a slow zoom over the full scene
   (`scale: interpolate(frame, [0, sceneDurationInFrames], [1, 1.05])`),
   drifting background, pulsing accents, floating mockups.
2. **Beats**: derive frame numbers from the narration with `atWord()` and
   schedule one visual event per beat — spread across the ENTIRE narration,
   including its last third. The thing the narrator mentions appears when
   they mention it.
3. **Living data**: counters, streaming rows, progressing charts, a moving
   cursor inside mockups — schedules that run until the scene ends.

No visible freeze longer than ~1.5 s. Scenes receive
`audioDurationInSeconds` as a prop (set in `calculateMetadata`) so beats can
be computed per scene.

## Fonts

```tsx
import { loadFont } from "@remotion/google-fonts/Inter";
const { fontFamily } = loadFont("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
```

Call at module top level (e.g. in `theme.ts`); rendering blocks until loaded.

## Layout and text rules for video

- One focal point per frame. One main message + one supporting visual + a
  background accent is a full scene — resist dashboard-like clutter.
- Safe area: keep key content ≥ 80 px from left/right and ≥ 100 px from
  top/bottom (at 1080 px width; scale proportionally).
- Minimum sizes at 1080 px width (scale up for 1920): headline 84 px,
  supporting text 44 px, labels 32 px. If unsure, bigger.
- Lay out readable content with flex/grid + `gap` in reserved slots; use
  absolute positioning only for backgrounds and decoration. Animate elements
  *into* their slot (opacity/transform), never into space another element owns.
- **Captions are overlays, not layout slots.** Never reserve empty space for
  the keyword captions: most frames have no caption active, so a reserved
  strip is a dead gap (the classic failure: a static hook scene with a blank
  bottom third waiting for its first keyword). Compose the scene to fill the
  frame as if captions didn't exist; the caption floats over the lower part
  with its own contrast (text shadow / soft backing glow) when it fires.
- **No dead zones.** A region that sits empty waiting for a future element is
  a layout bug. If a third of the frame is blank in the 20 % QA still,
  rebalance the composition (bigger focal element, recentered stack) instead
  of waiting for something to fill it.
- Let time solve crowding: reveal things one after another instead of side by side.
- Strong text/background contrast; add a backing shape or dim the background
  when in doubt.

## Audience/industry variants (one composition, an `industry` prop)

Audience cuts of the same ad — salons, trades, clinics — are nearly free, and
they are a standard ad requirement. Do NOT fork the project: keep **one** scene
tree and select a per-industry config object with a prop.

```tsx
// src/industries.ts
export type Industry = "hair" | "trades";

export const INDUSTRIES = {
  hair: {
    verb: "book",                                   // narration-matched wording
    services: ["Balayage", "Cut & finish"],         // sample data in the recreated screen
    closing: "Built for salons.",
  },
  trades: {
    verb: "schedule",
    services: ["Boiler service", "Leak repair"],
    closing: "Built for the trades.",
  },
} as const satisfies Record<Industry, unknown>;
```

```tsx
// src/Root.tsx — one Composition per industry, same component
{(Object.keys(INDUSTRIES) as Industry[]).map((industry) => (
  <Composition
    key={industry}
    id={`MarketingVideo-${industry}`}
    component={MarketingVideo}
    fps={FPS} width={1080} height={1920}
    durationInFrames={900}
    defaultProps={{ industry, scenes: scenesFor(industry) }}
    calculateMetadata={calculateMetadata}
  />
))}
```

Only the scenes that actually name the trade get their own voiceover — in
practice the hook and the closing line. `scenesFor(industry)` swaps just those
audio filenames; every middle scene keeps the shared WAV:

```ts
// scene-01-hair.wav / scene-01-trades.wav, but scene-02..04.wav shared
const scenesFor = (industry: Industry) =>
  scenes.map((s) => ({ ...s, audio: s.perIndustry ? `${s.id}-${industry}.wav` : s.audio }));
```

Marginal cost per extra industry: **2 TTS clips and one config object.** The
audio config gets those two clips (same voice and style prompt as everything
else — the drift guard still applies), and everything else is reused.

QA every variant separately with its own contact sheet: the failure this
pattern invites is a variant showing another industry's sample data (salon
services in the trades cut), and only a per-variant sheet shows it.

## Verification and rendering

```bash
# Interactive preview for the user:
npx remotion studio

# Final render (h264 MP4 by default):
npx remotion render MarketingVideo out/final.mp4
```

**QA contact sheet** (the standard pass — one image per composition): render
once at `--scale=0.5`, then cut stills at ~20 %, ~55 %, and ~85 % of every
scene and tile them, one column per scene:

```bash
npx remotion render MarketingVideo out/qa.mp4 --scale=0.5
ffmpeg -ss <seconds> -i out/qa.mp4 -frames:v 1 out/qa/<scene>-55.png   # per still
montage out/qa/*.png -tile <sceneCount>x3 -geometry +4+4 out/qa/contact.png
```

Scene boundaries come from the same numbers `calculateMetadata` uses —
cumulative `durationInFrames` minus `TRANSITION_FRAMES` per elapsed cut. The
three stills of a scene must differ visibly; identical stills mean the scene is
frozen there and needs more choreography.

For frame-exact work — bracketing a cut, or inspecting a UI-heavy scene at full
size — use `remotion still` directly:

```bash
npx remotion still MarketingVideo out/qa/scene-01.png --frame=45 --scale=1
```

First render downloads a headless Chrome — slow once, then cached.

## Optional: word-accurate caption timing

The default `KeywordCaptions` component (see `components.md`) estimates word
timing proportionally from character offsets — good enough for 2–4 keywords per
scene. If the user wants word-perfect timing (e.g. dense TikTok-style captions),
transcribe the generated TTS with `@remotion/install-whisper-cpp` to get word
timestamps in the `Caption` format, then render with
`createTikTokStyleCaptions()` from `@remotion/captions`. That is a heavier
dependency — only reach for it when estimation visibly misses.
