---
name: saas-video
description: >-
  Turn a software repo into a polished marketing video: Remotion animations with
  device mockups and keyword captions, AI voiceover (Replicate
  google/gemini-3.1-flash-tts), and an AI soundtrack (Replicate google/lyria-2),
  rendered to MP4. Analyzes the repo for marketable features, interviews the user
  (features, length, aspect ratio, style, voice, music), then builds and renders
  the video. Use when the user asks for a marketing, promo, launch, product,
  explainer, or demo video for their software or SaaS.
---

# SaaS Marketing Video

Produce a rendered MP4 marketing video for a software product. Everything on
screen is code-generated Remotion animation — kinetic typography, device
mockups (iPhone / browser / laptop frames), stylized UI recreations, animated
backgrounds. No screenshots. The voiceover and music come from Replicate.

## Reference files (load on demand, relative to this skill's directory)

| File | Load when |
|---|---|
| `references/replicate-audio.md` | Before generating any audio (Phase 5) — voices, prompts, config format, mixing levels |
| `references/styles.md` | Before presenting style options (Phase 3) and while building scenes (Phase 6) |
| `references/remotion-guide.md` | Before scaffolding or writing any Remotion code (Phase 6) |
| `references/components.md` | While building scenes (Phase 6) — copy-paste device mockups, keyword captions, backgrounds |

If a `remotion-best-practices` skill is available in this environment, load it
too when building — it is more detailed than the condensed guide here.

## Ground rules

- **Money gate.** Replicate calls cost API credits. Never call Replicate before
  the user has approved the script/scene plan (Phase 4 → 5 boundary).
- **Ask, don't assume.** Features, duration, aspect ratio, style, voice, music,
  and output location all come from the user. Use the AskUserQuestion tool when
  available (multi-select for features; users can always answer free-form).
- **Verify visually.** Render still frames and look at them before the final
  render. Never deliver a video whose frames you have not seen.
- **Benefits, not implementation.** Marketing copy sells outcomes ("Ship in
  minutes"), not tech ("Uses a Rust-based build pipeline").

## Phase 0 — Preflight

1. Check the Replicate token: `[ -n "$REPLICATE_API_TOKEN" ] && echo set`.
   Also check for a `.env` containing `REPLICATE_API_TOKEN` in the working
   directory. If missing, tell the user immediately (don't wait until Phase 5):
   get a token at https://replicate.com/account/api-tokens, then
   `export REPLICATE_API_TOKEN=r8_...` or put it in a `.env` file. Analysis
   phases can proceed without it, but stop before Phase 5 until it is set.
2. Check `node --version` is ≥ 18 (needed for Remotion and the audio script).
3. Note whether `ffprobe` exists (nice for logging audio durations; not required).

## Phase 1 — Locate the product

- If the current working directory is a software repo, confirm with the user
  that this is the product to market.
- If not (or the user wants a different product), ask for the repo path.

## Phase 2 — Mine the repo for marketing material

Read broadly but cheaply: README, package.json / pyproject / go.mod, docs/,
landing or marketing pages, route definitions, and the main feature modules.
Extract:

- **Product name and one-line value proposition.**
- **Audience** (developers? teams? consumers?).
- **5–7 marketable features**, each phrased as a user benefit with a short
  punchy label (e.g. "Real-time collaboration — see teammates' cursors live").
- **Brand assets**: brand colors (tailwind.config, CSS custom properties, theme
  files), logo files (public/, assets/), font choices. Using the product's real
  brand colors in the video is a big quality win — extract them if they exist.

## Phase 3 — Interview the user

Round 1 — content:
- Which features to highlight? Multi-select from your Phase 2 list, and make
  clear they can steer in a completely different direction with a free-form
  answer instead.

Round 2 — format (load `references/styles.md` first):
- **Duration**: 15 s (one punchy message), 30 s (hook + 2 features + CTA,
  recommended default), 45–60 s (hook + 3–4 features + CTA), or custom.
- **Aspect ratio**: 16:9 (1920×1080, YouTube/website), 9:16 (1080×1920,
  Reels/TikTok/Shorts), 1:1 (1080×1080, feeds). One primary format per run;
  other formats can be produced afterwards as a variant pass.
- **Style**: present the 3–4 presets from `styles.md` that best fit the product,
  with one-line descriptions. Users can mix or describe their own.
- **Output location**: where to scaffold the Remotion project (e.g.
  `marketing-video/` inside the repo — recommended, stays editable), a sibling
  directory, or a temp dir delivering only the MP4. Always ask.

Round 3 — audio:
- **Voiceover**: yes/no. If yes: voice character (pick 3–4 fitting voices from
  the catalog in `references/replicate-audio.md` and describe them, e.g.
  "Sulafat — warm, friendly narrator") and **language** (the TTS speaks 70+
  languages; narration is simply written in the target language).
- **Music**: suggest a vibe matching the chosen style preset (each preset in
  `styles.md` has a music prompt), offer alternatives or no music.

## Phase 4 — Script and scene plan (approval gate)

Write the narration and scene plan:

- **Pacing**: TTS speaks ≈ 2.5 words/second. A 30 s video holds ~70 words total.
  Leave breathing room — under-write rather than over-write.
- **Structure**: Hook (problem or bold claim) → features (one scene each, one
  idea per scene) → CTA end card (product name, tagline, URL).
- **Per scene**: id, narration (1–2 spoken sentences, written for the ear),
  on-screen keywords (2–4 punchy words/phrases from the narration — only the
  most important words appear on screen), and a one-line visual concept
  (e.g. "phone mockup slides up, notification cards pop in").

Present the plan as a table (scene, narration, keywords, visual) plus the voice,
music prompt, style, duration, and format choices. State that generating audio
calls the paid Replicate API. **Get explicit approval before continuing.**

## Phase 5 — Generate audio

Load `references/replicate-audio.md`, then:

1. Copy `scripts/replicate-audio.mjs` from this skill into the project's
   `scripts/` directory (the generated project stays self-contained).
2. Discover current model schemas (voice list may have changed):
   `node scripts/replicate-audio.mjs schema google/gemini-3.1-flash-tts`
   and `... schema google/lyria-2`.
3. Write `audio-config.json`: one TTS clip **per scene** (per-scene files make
   scene timing and single-scene regeneration trivial) + one music clip.
4. Run `node scripts/replicate-audio.mjs generate audio-config.json`.
   Files land in `public/audio/`. Verify every expected file exists.

## Phase 6 — Build the Remotion project

Load `references/remotion-guide.md`, `references/components.md`, and the chosen
preset in `references/styles.md`. Then:

1. Scaffold with `npx create-video@latest --yes --blank --no-tailwind <dir>`
   and install the extra packages listed in the guide.
2. Create `src/theme.ts` from the style preset, substituting extracted brand
   colors where they fit.
3. Copy the needed components from `components.md` (device frames, keyword
   captions, soundtrack, backgrounds) and adapt them to the theme.
4. Build one component per scene. Scene lengths are **driven by the actual TTS
   audio durations** via `calculateMetadata` (pattern in the guide) — never
   hardcode scene durations.
5. Wire scenes into a `TransitionSeries` with per-scene voiceover audio and the
   looping, ducked soundtrack.

## Phase 7 — Visual QA (required)

For every scene, render a still at its midpoint
(`npx remotion still <CompId> out/qa/<scene>.png --frame=<n> --scale=0.5`),
then **look at each image** and check: one clear focal point, text inside safe
areas and not overflowing, readable contrast, keyword captions legible, mockups
not clipped. Fix and re-render stills until clean. Offer
`npx remotion studio` if the user wants to preview interactively.

## Phase 8 — Render and deliver

- `npx remotion render <CompId> out/<product>-<format>.mp4`
- Report the absolute output path, total duration, and format.
- Explain how to iterate: edit scenes and re-render; regenerate one scene's
  voice with `node scripts/replicate-audio.mjs generate audio-config.json scene-02`;
  tweak in Remotion Studio. Nothing needs to be regenerated unless the
  narration text or music prompt changed.

## Iterating on feedback

- Copy/visual changes: edit the scene components, re-run Phase 7 stills, re-render.
- Narration changes: update `audio-config.json`, regenerate **only** the
  affected clip ids, re-render (durations adapt automatically).
- New format (e.g. 9:16 after 16:9): add a second `<Composition>` with new
  dimensions, adjust layout constants per `styles.md`, reuse all audio.

## Pitfalls

- Remotion renders in a headless Chrome that downloads on first run — the first
  render is slow; that's normal.
- CSS transitions/animations and Tailwind animation classes do not render in
  Remotion. Animate only with `useCurrentFrame()` + `interpolate()`.
- `durationInFrames` must be a positive integer — `Math.round()` everything
  derived from audio durations.
- Transitions overlap scenes: total duration = sum of scenes − sum of
  transitions. Keep per-scene tail padding ≥ transition length so voiceover
  never gets cut.
- Music from Lyria-2 is ~30 s — loop it with `<Audio loop>` for longer videos
  (the `Soundtrack` component in `components.md` handles loop + fades + ducking).
- Never commit `.env` or the Replicate token; add `out/` and `node_modules/` to
  the generated project's `.gitignore`.
