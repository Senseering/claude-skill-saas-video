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
        <div /* dynamic island */
          style={{
            position: "absolute",
            top: width * 0.035,
            left: "50%",
            translate: "-50% 0",
            width: width * 0.29,
            height: width * 0.085,
            borderRadius: 999,
            background: "#000",
          }}
        />
      </div>
    </div>
  );
};
```

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

## Inside the frames: stylized UI, not screenshots

Recreate a *simplified, idealized* version of the product UI — bolder spacing,
fewer elements, brand colors. Recipe:

- Layout: sidebar (list of pill rows) + header + 2–3 stat cards + one chart.
- Reveal elements one by one with staggered `<Sequence from={...}>` or
  staggered `interpolate` delays (`const d = index * 4`).
- Charts: animated SVG. Bars: `height: interpolate(frame, [d, d + 20], [0, v])`.
  Lines: animate `strokeDashoffset` from path length to 0.
- Highlight the feature being narrated: a rounded rectangle outline in
  `theme.accent` that fades/scales in around the relevant UI element, or a
  gentle zoom of the whole frame (`scale` 1 → 1.06 over the scene).
- Text inside mockups is decorative — shapes and short labels beat sentences.

## KeywordCaptions (only the most important words, synced to the voice)

Estimates when each keyword is spoken from its character position in the
narration, then flashes it large on screen. One instance per scene, rendered
inside that scene's `TransitionSeries.Sequence` (frame 0 = scene start).

```tsx
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

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
  const clean = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
  const words = narration.split(/\s+/).filter(Boolean);
  const totalChars = words.join("").length || 1;
  let elapsed = 0;
  const startSeconds = words.map((w) => {
    const start = (elapsed / totalChars) * audioDurationInSeconds;
    elapsed += w.length;
    return start;
  });
  const timings: Timing[] = [];
  let searchFrom = 0;
  for (const keyword of keywords) {
    const first = clean(keyword.split(/\s+/)[0]);
    const idx = words.findIndex((w, i) => i >= searchFrom && clean(w) === first);
    if (idx === -1) continue; // keyword must literally appear in the narration
    searchFrom = idx + 1;
    timings.push({ word: keyword, startFrame: Math.round(startSeconds[idx] * fps), endFrame: 0 });
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

Rules: keywords must appear verbatim in the narration; 2–4 per scene; keep them
short ("10× faster", "zero config"). Style presets may restyle (accent color,
highlighter background, lowercase serif, etc.).

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
