# Component library

Copy these into `src/components/`, adapt colors/fonts to `theme.ts`. All are
pure Remotion/CSS — deterministic, render-safe, no external assets.

## theme.ts pattern

```tsx
// src/theme.ts — fill from the chosen style preset + extracted brand colors
import { loadFont as loadDisplay } from "@remotion/google-fonts/Sora";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

const display = loadDisplay("normal", { weights: ["700", "800"], subsets: ["latin"] });
const body = loadBody("normal", { weights: ["400", "600"], subsets: ["latin"] });

export const theme = {
  bg: "#0b0b12",
  accent: "#7c5cff",       // ← use the product's brand color when available
  accent2: "#22d3ee",
  text: "#ffffff",
  textDim: "rgba(255,255,255,0.65)",
  fontDisplay: display.fontFamily,
  fontBody: body.fontFamily,
};
```

## PhoneFrame (iPhone-style mockup)

Renders children as the phone's screen content. Parametric width.

```tsx
import React from "react";

export const PhoneFrame: React.FC<{
  width?: number;
  children: React.ReactNode;
}> = ({ width = 380, children }) => {
  const height = width * (19.5 / 9);
  const radius = width * 0.155;
  const bezel = Math.max(10, width * 0.032);
  const button = (style: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        width: 4,
        borderRadius: 2,
        background: "#26272b",
        ...style,
      }}
    />
  );
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        padding: bezel,
        background: "linear-gradient(145deg, #3a3d42, #17181c 60%, #2c2e33)",
        boxShadow:
          "0 60px 120px rgba(0,0,0,0.45), 0 12px 32px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.18)",
        position: "relative",
      }}
    >
      {button({ left: -3, top: height * 0.22, height: height * 0.045 })}
      {button({ left: -3, top: height * 0.3, height: height * 0.08 })}
      {button({ left: -3, top: height * 0.4, height: height * 0.08 })}
      {button({ right: -3, top: height * 0.3, height: height * 0.13 })}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: radius - bezel,
          overflow: "hidden",
          position: "relative",
          background: "#000",
        }}
      >
        {children}
      </div>
    </div>
  );
};
```

The screen is deliberately clean — **no notch or dynamic island** (they read
as visual noise at video sizes). Don't add one unless the user asks.

Sizing guidance: 16:9 frame → phone width ~360–420 px as a side element,
~500 px as the hero. 9:16 frame → phone width ~55–65 % of composition width,
centered. Animate entrance with `translate` (slide up 60–120 px) + `opacity`,
or a slow continuous float: `translate: \`0px ${Math.sin(frame / 25) * 8}px\``.

## BrowserFrame (macOS-style browser window)

```tsx
import React from "react";

export const BrowserFrame: React.FC<{
  width?: number;
  height?: number;
  url?: string;
  dark?: boolean;
  children: React.ReactNode;
}> = ({ width = 1200, height = 750, url = "app.example.com", dark = false, children }) => {
  const c = dark
    ? { bar: "#26272b", body: "#151619", pill: "#1c1d21", text: "#9a9ba1", border: "rgba(255,255,255,0.08)" }
    : { bar: "#f1f2f4", body: "#ffffff", pill: "#e4e6e9", text: "#5f6368", border: "rgba(0,0,0,0.08)" };
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 50px 100px rgba(0,0,0,0.35)",
        border: `1px solid ${c.border}`,
        background: c.body,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ height: 52, background: c.bar, display: "flex", alignItems: "center", padding: "0 20px", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#28c840" }} />
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ background: c.pill, borderRadius: 8, padding: "6px 26px", fontSize: 17, color: c.text, fontFamily: "sans-serif" }}>
            {url}
          </div>
        </div>
        <div style={{ width: 39 }} />
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
    </div>
  );
};
```

## Inside the frames: recreate the app's REAL screens

Scenes must show *this product's* interface, rebuilt in JSX — not generic
dashboards and not icon metaphors. Someone who uses the app should recognize
their screen in the video. Recipe:

1. Open the real component/page source for the feature (Phase 4 screen spec).
   Note the layout regions, the actual nav/button/label texts, the chart
   types, the colors and radii.
2. Rebuild a simplified version: keep the recognizable structure and the REAL
   labels, drop the noise (settings rows, footers, edge-case UI). Use bolder
   spacing and slightly larger type than the real app — it's viewed as video.
3. Put it inside `BrowserFrame` / `PhoneFrame`, matching how the product is
   actually used.
4. Animate one realistic interaction **for the whole time the voice talks**:
   data arriving, a marker moving, a row being added, a filter applied, a
   chart drawing in. Use `atWord()` so the interaction lands exactly when the
   narrator mentions it.
5. Icons are accents (stat cards, list bullets) — never the main visual of a
   scene whose feature has a screen. Purely conceptual claims (privacy, speed)
   may use one strong metaphor visual instead.

Charts: animated SVG — bars via height interpolation, lines via
`strokeDashoffset` from path length to 0, live feeds by appending dots/rows on
a frame schedule.

## Word timings: sync visuals to the narration

Shared util — the timing backbone for keyword captions AND scene choreography.

```tsx
// src/components/word-timings.ts
export type WordTiming = { word: string; index: number; startSeconds: number };

// Proportional estimate: TTS time is distributed over the narration by
// character count. Good enough to land events on the right word.
export const estimateWordTimings = (
  narration: string,
  audioDurationInSeconds: number,
): WordTiming[] => {
  const words = narration.split(/\s+/).filter(Boolean);
  const totalChars = words.join("").length || 1;
  let elapsed = 0;
  return words.map((word, index) => {
    const startSeconds = (elapsed / totalChars) * audioDurationInSeconds;
    elapsed += word.length;
    return { word, index, startSeconds };
  });
};

export const cleanWord = (w: string) =>
  w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

// Frame at which `word` is spoken (first word if a phrase is passed).
// THE tool for choreography: make things happen when the narrator says them.
export const atWord = (
  narration: string,
  word: string,
  audioDurationInSeconds: number,
  fps: number,
  occurrence = 1,
): number => {
  const target = cleanWord(word.split(/\s+/)[0]);
  let seen = 0;
  for (const t of estimateWordTimings(narration, audioDurationInSeconds)) {
    if (cleanWord(t.word) === target && ++seen === occurrence) {
      return Math.round(t.startSeconds * fps);
    }
  }
  return 0;
};
```

Scene usage — every visual event gets a beat frame from the narration:

```tsx
const { fps } = useVideoConfig();
const netIn = atWord(NARRATION, "sensors", audioDurationInSeconds, fps);
const countIn = atWord(NARRATION, "live", audioDurationInSeconds, fps);

// the counter appears exactly when the narrator says "live":
opacity: interpolate(frame, [countIn, countIn + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
```

## Keep every scene alive (anti-slideshow)

A scene is on screen for its full narration — entrances that all finish in the
first second leave a frozen slide for the remaining seconds. Budget motion in
three layers:

1. **Ambient, always running**: a slow zoom on the whole scene content
   (`scale: interpolate(frame, [0, sceneDuration], [1, 1.05])`), drifting
   background, pulsing accents, floating mockups
   (`translate: \`0px ${Math.sin(frame / 25) * 8}px\``).
2. **Beats, word-timed**: one visual event per narration beat via `atWord()` —
   an element enters, a value changes, a highlight moves. Spread beats across
   the ENTIRE narration, including its last third.
3. **Living data inside mockups**: counters counting, rows streaming in, chart
   lines progressing, the cursor moving — schedules that continue until the
   scene ends.

Rule of thumb: at any moment something should be mid-motion; no visible freeze
longer than ~1.5 s. The three-stills QA check (20 % / 55 % / 85 %) catches
violations — if two stills look identical, add a layer.

## KeywordCaptions (only the most important words, synced to the voice)

Flashes the scene's keywords large on screen as they are spoken. The keywords
themselves are chosen in Phase 4 under the **billboard test** — this component only
displays them; it cannot rescue badly chosen ones. One instance per scene,
rendered inside that scene's `TransitionSeries.Sequence` (frame 0 = scene start).

```tsx
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { cleanWord, estimateWordTimings } from "./word-timings";

type Timing = { word: string; startFrame: number; endFrame: number };

export const estimateKeywordTimings = ({
  narration,
  keywords,
  audioDurationInSeconds,
  fps,
}: {
  narration: string;
  keywords: string[];
  audioDurationInSeconds: number;
  fps: number;
}): Timing[] => {
  const words = estimateWordTimings(narration, audioDurationInSeconds);
  const timings: Timing[] = [];
  let searchFrom = 0;
  for (const keyword of keywords) {
    const first = cleanWord(keyword.split(/\s+/)[0]);
    const hit = words.find((w) => w.index >= searchFrom && cleanWord(w.word) === first);
    if (!hit) continue; // keyword must literally appear in the narration
    searchFrom = hit.index + 1;
    timings.push({ word: keyword, startFrame: Math.round(hit.startSeconds * fps), endFrame: 0 });
  }
  timings.forEach((t, i) => {
    t.endFrame = timings[i + 1]?.startFrame ?? Math.round(audioDurationInSeconds * fps + fps * 0.5);
  });
  return timings;
};

export const KeywordCaptions: React.FC<{
  narration: string;
  keywords: string[];
  audioDurationInSeconds: number;
  fontSize?: number;
  bottom?: number;
}> = ({ narration, keywords, audioDurationInSeconds, fontSize = 72, bottom = 120 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timings = useMemo(
    () => estimateKeywordTimings({ narration, keywords, audioDurationInSeconds, fps }),
    [narration, keywords, audioDurationInSeconds, fps],
  );
  const active = timings.find((t) => frame >= t.startFrame && frame < t.endFrame);
  if (!active) return null;
  const local = frame - active.startFrame;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bottom }}>
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontSize,
          fontWeight: 800,
          color: theme.text,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          textShadow: "0 4px 30px rgba(0,0,0,0.45)",
          opacity: interpolate(local, [0, 5], [0, 1], { extrapolateRight: "clamp" }),
          scale: String(
            interpolate(local, [0, 8], [0.82, 1], {
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          ),
        }}
      >
        {active.word}
      </div>
    </AbsoluteFill>
  );
};
```

Rules: keywords must appear verbatim in the narration; 0–4 per scene; each
must pass the billboard test *standalone* — 2–4-word claims with a noun like
"10× faster deploys", "zero config", "100% anonymous". Lone adjectives/verbs
ripped from a sentence ("PACKED", "FASTER") read as random words to a muted
viewer, as do connective fragments ("right now", "works with"). Scenes with no
billboard-worthy phrase get zero keywords. Style presets may restyle (accent
color, highlighter background, lowercase serif, etc.).

## Soundtrack (looping music with fades and ducking)

```tsx
import React from "react";
import { interpolate, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";

export const Soundtrack: React.FC<{
  file: string;
  volume?: number; // level under the voiceover
}> = ({ file, volume = 0.18 }) => {
  const { fps, durationInFrames } = useVideoConfig();
  return (
    <Audio
      src={staticFile(file)}
      loop
      loopVolumeCurveBehavior="extend"
      volume={(f) =>
        interpolate(
          f,
          [0, 1.5 * fps, durationInFrames - 2.5 * fps, durationInFrames - 0.5 * fps],
          [0, volume, volume, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      }
    />
  );
};
```

For voiceless videos raise `volume` to 0.3–0.4. For a louder intro before the
voice starts, add an extra keyframe pair at the scene-1 hook.

## AnimatedGradient (background)

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

const Blob: React.FC<{ color: string; size: number; x: number; y: number; drift: number; frame: number }> =
  ({ color, size, x, y, drift, frame }) => (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(60px)",
        translate: `${Math.sin(frame / 40 + drift) * 60}px ${Math.cos(frame / 55 + drift) * 40}px`,
      }}
    />
  );

export const AnimatedGradient: React.FC<{ base: string; colors: string[] }> = ({ base, colors }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: base, overflow: "hidden" }}>
      {colors.map((color, i) => (
        <Blob
          key={i}
          color={color}
          size={900 - i * 150}
          x={[10, 60, 35][i % 3]}
          y={[15, 55, 70][i % 3]}
          drift={i * 2.1}
          frame={frame}
        />
      ))}
    </AbsoluteFill>
  );
};
```

## GridBackground (for Dark Tech)

```tsx
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export const GridBackground: React.FC<{ base: string; line: string }> = ({ base, line }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: base }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          backgroundPosition: `0px ${(frame * 0.3) % 80}px`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
    </AbsoluteFill>
  );
};
```

## GlassCard (feature cards)

```tsx
import React from "react";

export const GlassCard: React.FC<{ width?: number; children: React.ReactNode }> = ({ width, children }) => (
  <div
    style={{
      width,
      padding: "36px 44px",
      borderRadius: 24,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.15)",
      backdropFilter: "blur(24px)",
      boxShadow: "0 30px 60px rgba(0,0,0,0.25)",
    }}
  >
    {children}
  </div>
);
```

## CTAEndCard (final scene)

```tsx
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

export const CTAEndCard: React.FC<{ name: string; tagline: string; url: string }> = ({ name, tagline, url }) => {
  const frame = useCurrentFrame();
  const enter = (from: number) => ({
    opacity: interpolate(frame, [from, from + 12], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
    translate: `0px ${interpolate(frame, [from, from + 12], [30, 0], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    })}px`,
  });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 28 }}>
      <div style={{ fontFamily: theme.fontDisplay, fontSize: 130, fontWeight: 800, color: theme.text, ...enter(0) }}>
        {name}
      </div>
      <div style={{ fontFamily: theme.fontBody, fontSize: 46, color: theme.textDim, ...enter(8) }}>{tagline}</div>
      <div
        style={{
          fontFamily: theme.fontBody,
          fontSize: 38,
          fontWeight: 600,
          color: theme.text,
          background: theme.accent,
          padding: "18px 48px",
          borderRadius: 999,
          marginTop: 12,
          ...enter(16),
        }}
      >
        {url}
      </div>
    </AbsoluteFill>
  );
};
```

## Cinematic cuts (transitions with character)

A fade between every scene reads as a slideshow. Each style preset names a
"transition kit" (styles.md); these are the building blocks.

### FloatingHero — a device that travels across scenes

The signature move: a phone/browser that survives every cut and visibly flies
to a new position, rotation, and size per scene. Render it as a sibling
**above** `<TransitionSeries>` so it persists across transitions. Keyframes
are GLOBAL frames — use the scene start frames computed in `calculateMetadata`
(cumulative durations minus transition overlaps).

```tsx
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

type HeroKeyframe = {
  frame: number;
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
};

export const FloatingHero: React.FC<{
  keyframes: HeroKeyframe[]; // frames strictly increasing
  children: React.ReactNode;
}> = ({ keyframes, children }) => {
  const frame = useCurrentFrame();
  const frames = keyframes.map((k) => k.frame);
  const opts = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: Easing.inOut(Easing.cubic),
  };
  const get = (sel: (k: HeroKeyframe) => number) =>
    interpolate(frame, frames, keyframes.map(sel), opts);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        translate: `${get((k) => k.x)}px ${get((k) => k.y) + Math.sin(frame / 30) * 6}px`,
        scale: String(get((k) => k.scale ?? 1)),
        rotate: `${get((k) => k.rotate ?? 0)}deg`,
        opacity: get((k) => k.opacity ?? 1),
      }}
    >
      {children}
    </div>
  );
};
```

```tsx
// sceneStart(i) = cumulative durations of scenes 0..i-1 minus i * TRANSITION_FRAMES
<AbsoluteFill>
  <TransitionSeries>{items}</TransitionSeries>
  <FloatingHero
    keyframes={[
      { frame: 0, x: 1180, y: 260, rotate: -8 },
      { frame: sceneStart(1), x: 240, y: 180, rotate: 6, scale: 0.85 },
      { frame: sceneStart(2), x: 760, y: 140, rotate: -4, scale: 1.15 },
      { frame: sceneStart(3), x: 900, y: -1400, rotate: -25 }, // fly out before the CTA
    ]}
  >
    <PhoneFrame width={340}>{/* screen content */}</PhoneFrame>
  </FloatingHero>
  <Soundtrack file="audio/music.wav" />
</AbsoluteFill>
```

Rules: scenes under a FloatingHero must reserve empty layout space where the
hero will sit (it floats over them); fly it out (offscreen or opacity 0 over
~10 frames) before scenes where it doesn't belong; never park it in the same
spot twice.

### Interstitial — a full scene as a transition

A 0.6–0.9 s full-bleed beat between chapters: hard background slam + one huge
word ("LIVE.", "PRIVATE.", the product name). Insert as a normal
`TransitionSeries.Sequence` with **no narration audio** and a fixed duration
(18–27 frames), joined with hard cuts or 6-frame fades.

```tsx
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

export const Interstitial: React.FC<{ word: string; bg: string; color: string }> = ({
  word,
  bg,
  color,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: bg, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: theme.fontDisplay,
          fontSize: 190,
          fontWeight: 900,
          color,
          letterSpacing: "-0.02em",
          opacity: interpolate(frame, [0, 3], [0, 1], { extrapolateRight: "clamp" }),
          scale: String(
            interpolate(frame, [0, 6], [1.35, 1], {
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }),
          ),
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
};
```

### Zoom-through cut (into a screen)

End scene A by scaling the entire scene into the device's screen; scene B
starts slightly overscaled and settles:

- Scene A, last ~12 frames: scene wrapper `scale: 1 → 5` with
  `transformOrigin` at the screen center, `opacity: 1 → 0` over the final 4 frames.
- Scene B, first ~10 frames: `scale: 1.15 → 1`.
- Pair with an 8-frame `fade()` transition; if this is the video's main cut,
  a quiet whoosh (volume ≈ 0.2) fits here.

### SfxLayer — sound effects (use sparingly)

SFX are seasoning, not percussion — overdone they read as an annoying TikTok
meme edit. Hard rules:

- **Budget: 2–4 effects TOTAL in a 30 s video.** Not one per cut — pick only
  the biggest moments: the main chapter cut, the hero number landing, the
  final CTA.
- **Whitelist**: `whoosh.wav`, `whip.wav`, `switch.wav`, `page-turn.wav`,
  `mouse-click.wav` from remotion.media. Everything else in that library is a
  meme sound (vine-boom, anime-wow, bruh…) — never use them in a marketing
  video.
- **Volume 0.12–0.25** — felt, not noticed. Soften a whoosh further with
  `playbackRate={1.15}`. Place effects in the gaps between narration
  sentences (cuts naturally fall there), never over a word.
- Cursor clicks only when the cursor is the scene's focal point, at ≤ 0.2.
- **Default when unsure: leave it out.** The music carries the energy. Have
  the user preview and cut anything they consciously notice twice.

For render reliability, download the files into `public/sfx/`
(`curl -o public/sfx/whoosh.wav https://remotion.media/whoosh.wav`) and
reference via `staticFile()`.

```tsx
import React from "react";
import { Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";

// Rendered once at the top level; frames are GLOBAL.
export const SfxLayer: React.FC<{
  events: { frame: number; src: string; volume?: number }[];
}> = ({ events }) => (
  <>
    {events.map((e, i) => (
      <Sequence key={i} from={e.frame}>
        <Audio src={staticFile(e.src)} volume={e.volume ?? 0.2} />
      </Sequence>
    ))}
  </>
);
```

Placement: cut-aligned effects go at `sceneStart(i) - TRANSITION_FRAMES / 2`.
A typical 30 s video: one quiet whoosh on the main chapter cut, one switch/
page-turn when the hero screen lands, one soft accent on the CTA — done.

## Cursor (animated pointer for UI recreations)

Moves between waypoints and shows a click ripple on arrival — turns a static
mockup into a demo. Waypoint `atFrame`s must be strictly increasing; derive
them with `atWord()` so clicks land on the narration.

```tsx
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

export const Cursor: React.FC<{
  waypoints: { x: number; y: number; atFrame: number }[]; // atFrame strictly increasing
}> = ({ waypoints }) => {
  const frame = useCurrentFrame();
  if (waypoints.length < 2) return null;
  const frames = waypoints.map((w) => w.atFrame);
  const ease = {
    extrapolateLeft: "clamp" as const,
    extrapolateRight: "clamp" as const,
    easing: Easing.inOut(Easing.quad),
  };
  const x = interpolate(frame, frames, waypoints.map((w) => w.x), ease);
  const y = interpolate(frame, frames, waypoints.map((w) => w.y), ease);
  return (
    <>
      {waypoints.slice(1).map((w, i) => {
        const t = frame - w.atFrame;
        if (t < 0 || t > 18) return null; // click ripple on arrival
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: w.x - 22,
              top: w.y - 22,
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.9)",
              opacity: 1 - t / 18,
              scale: String(0.4 + (t / 18) * 0.8),
            }}
          />
        );
      })}
      <svg
        viewBox="0 0 24 24"
        width={30}
        style={{ position: "absolute", left: x, top: y, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}
      >
        <path d="M5 3l14 8-6 1.5L9.5 19z" fill="#fff" stroke="#000" strokeWidth={1.2} />
      </svg>
    </>
  );
};
```

## Entrance stagger helper

```tsx
export const staggered = (frame: number, index: number, step = 5, duration = 14) => ({
  opacity: interpolate(frame, [index * step, index * step + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  }),
  translate: `0px ${interpolate(frame, [index * step, index * step + duration], [26, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })}px`,
});
```
