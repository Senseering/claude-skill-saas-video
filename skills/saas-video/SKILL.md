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
- **UI inventory** (whenever the product has a UI): the app's actual screens
  and views, found via routes and page components, and which screen each
  candidate feature lives on. This matters as much as the feature list: scenes
  are built from recreations of these real screens, so the video shows *this
  product's* interface — not generic dashboards or icon metaphors.

## Phase 3 — Interview the user

Round 1 — content:
- Which features to highlight? Multi-select from your Phase 2 list, and make
  clear they can steer in a completely different direction with a free-form
  answer instead.
- **Call to action**: the ONE specific action viewers should take at the end
  — "Start your free trial", "Book a 10-minute demo", "Join the waitlist" —
  plus its URL. Vague endings ("Learn more") measurably underperform; get
  the real next step.

Round 2 — format (load `references/styles.md` first):
- **Placement first**: where will the video live? This determines everything
  else (the format data from analyses of 500+ SaaS launch videos):
  - *Homepage hero / YouTube*: full animated explainer, 16:9, **60–75 s is
    the sweet spot — past 90 s viewers bail**;
  - *Feed launch post (LinkedIn / X / Product Hunt)*: fast text-driven format
    (Kinetic Bold territory), 15–30 s, 1:1 or 9:16, built to stop a scroll —
    works best paired with a deeper explainer elsewhere;
  - *Landing-page section / in-app*: single-feature spot, 15–30 s, 16:9.
  Derive your duration/aspect/style *recommendations* from this answer
  instead of asking all three cold.
- **Duration**: 15 s (one punchy message), 30 s (hook + 2 beats + CTA, feed
  default), 60–75 s (homepage explainer: hook + 3–4 beats + CTA), or custom
  — warn on anything over 90 s.
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
- **Sound effects**: subtle (2–4 quiet accents at the biggest moments — the
  default) or none.

## Phase 4 — Script and scene plan (approval gate)

First, study the screens behind the selected features: read the actual
component/page source (layout regions, real nav/button/label texts, chart
types, colors, sample data shapes) and write a short **screen spec** per
feature scene. Scenes recreate these real screens — someone who knows the app
must recognize it in the video.

Then write the narration and scene plan:

- **Pacing**: TTS speaks ≈ 2.5 words/second. A 30 s video holds ~70 words total.
  Leave breathing room — under-write rather than over-write.
- **Through-line first (der rote Faden)**: before writing any scene, pick ONE
  viewer (a specific role), ONE core use case (the one that kills the biggest
  pain — the product does fifty things; this video nails one, the rest
  deserve their own videos later), ONE tension the hook opens, and ONE story
  arc that resolves it — then let the selected features enter as beats of
  that story,
  in the order the viewer would actually meet them. Never present features as
  a list ("it also does X… and Y…"). Arcs that work:
  - *A day with the product*: one concrete scenario; each feature appears the
    moment the protagonist needs it;
  - *Problem → agitate → solve → payoff*: features are the steps that solve
    the opening problem;
  - *Before / after*: the same situation without and then with the product.
  Every scene's narration must connect to the previous one — so / then / now
  that / because — cause and effect, one continuous thought. Connectives must
  be **earned**: "then" only when it really is the next step in the story,
  "so" only for a real consequence — a "then" gluing two unrelated features
  is worse than no connective. **Seam test**: read scene N's last sentence
  and scene N+1's first sentence as one pair; if the join is a non sequitur
  ("…so you can run it anywhere in public. Then compare weeks…"), rewrite one
  side. And the connection lives in the *content*, never in a conjunction
  bolted onto the front: each scene is a separate voice clip heard right
  after a visual cut, so an opener like "But a single sensor only sees its
  own corner." sounds like the video skipped a beat. Never start a scene's
  narration with a bare But / And / So / Then — bake the pivot into the
  sentence itself ("One sensor alone only sees its own corner.").
  **Shuffle test**:
  if the feature scenes could be reordered without anyone noticing, there is
  no thread; rewrite. A 30 s video carries at most 3 feature beats — cut
  features rather than the story.
- **Structure**: Hook (opens the tension — **never the logo**: viewers don't
  care about the brand yet, so the product name and logo first appear after
  the tension exists, usually not before the solution beat) → story beats
  (one per scene) → CTA end card that resolves it with the **specific action
  from the interview** ("Start your free trial", "Book a 10-minute demo") —
  never "Learn more". For ≥ 30 s videos,
  consider 1–2 chapter-word beats between chapters (no narration): one word
  given a quiet moment on the persistent backdrop — not a hard slam.
- **Copy quality**: the narration must survive being read aloud. Every
  sentence carries ONE concrete idea in plain spoken language — "you" language,
  active voice, specifics and numbers instead of adjectives. The hook names
  the viewer's problem or makes one bold claim in words a person would
  actually say; never open with abstract poetry about the product. Banned
  filler: "turns X into Y", "seamlessly", "empowers", "unlock", "like never
  before", "a new way to". Also banned: **stage-directing the visuals** —
  "now watch the crowd flow", "see here", "this is the dashboard". The
  animations are stylized recreations, not a 1:1 demo, so narration that
  points at the screen overpromises; state the capability instead ("The map
  shows crowds build, zone by zone."). Test: read each line aloud — if it
  could be about any product, rewrite it.
- **TTS-safe sentence shapes**: the TTS renders periods reliably but mangles
  subtle comma prosody — a comma before a trailing clause often collapses
  ("…flow between zones, and where the hotspots build" comes out as two
  rushed sentences with the gap eaten). At most one comma per sentence; never
  attach a clause with ", and" / ", so" — start a new sentence instead; no
  subject-less trailing clauses; no triple lists ("compare weeks, spot every
  peak, and staff the busy days" → two sentences, max two items each). When
  a pause matters, end the sentence — the period is the only pause you can
  trust.
- **Per scene**:
  - id and narration (1–2 spoken sentences, written for the ear);
  - **visual**: which real screen is recreated inside which vehicle — browser
    frame, phone frame, or a chrome-less **UI close-up** of one component —
    and the one interaction that animates while the voice
    talks (e.g. "live map view with area polygons; device dots keep appearing
    and the count badge ticks up"). Abstract/icon visuals are a last resort
    for claims with no UI (e.g. privacy) — never for a feature that has a screen;
  - **on-screen keywords** (0–4, verbatim from the narration): the payoff
    words — benefits, numbers, the product name. Apply the **billboard test**
    to each keyword *on its own*: would it work as a billboard line for this
    product, without hearing the voice? Prefer 2–4-word claims with a noun:
    "LIVE CROWD COUNT", "100% ANONYMOUS", "ZERO SETUP". Lone adjectives or
    verbs ripped from a sentence fail ("PACKED", "FASTER", "BUILDS" — random
    words to a muted viewer), as do connective fragments ("right now", "how
    busy", "works with"). A scene with no billboard-worthy phrase gets zero
    keywords — nothing beats nonsense;
  - **beats**: which narration word triggers which visual event — the
    choreography input for Phase 6;
  - **silhouette + cut**: which layout silhouette the scene uses (variety
    section of the guide) and which transition from the preset's kit leads
    into it — no two adjacent scenes share either. Device frames may star in
    at most half the scenes, the phone specifically in at most two per video;
    a chrome-less UI close-up of one component usually beats another phone
    scene. Cuts move **elements, not the screen**: no slide/push/wipe
    presentations. The backdrop persists across the cut while scene N's
    elements exit staggered and scene N+1's elements enter, blended by a
    10–15 frame fade so no frame is a snap; zoom-throughs
    and chapter words carry the big moments.
- **One narrator**: exactly one voice AND one delivery-style prompt for the
  whole video (see `replicate-audio.md` — varying the style per clip makes the
  narrator sound like a different person between scenes).

Present the through-line as one sentence first ("A festival organizer wonders
if the east entrance is overcrowded — CityPulse answers it live, then proves
it's private"), then the plan as a table (scene, narration, keywords, screen +
interaction) plus the voice, music prompt, style, duration, placement, and
CTA choices. State that generating audio calls the paid Replicate API.
**Get explicit approval before continuing.**

## Phase 5 — Generate audio

Load `references/replicate-audio.md`, then:

1. Copy `scripts/replicate-audio.mjs` from this skill into the project's
   `scripts/` directory (the generated project stays self-contained).
2. Discover current model schemas (voice list may have changed):
   `node scripts/replicate-audio.mjs schema google/gemini-3.1-flash-tts`
   and `... schema google/lyria-2`.
3. Write `audio-config.json`: one TTS clip **per scene** (per-scene files make
   scene timing and single-scene regeneration trivial) + **two music
   candidates** (`music-a`, `music-b`) with distinct prompts built per the
   music-prompt axes in the reference — never one generic prompt.
4. Run `node scripts/replicate-audio.mjs generate audio-config.json`.
   Files land in `public/audio/`. Verify every expected file exists.
5. Have the user listen to both music candidates
   (`open public/audio/music-a.wav`) and pick; wire the winner into
   `Soundtrack`.
6. Ask the user to spot-check the narration clips too (`open public/audio/`).
   If a clip sounds rushed or a pause got eaten, **rephrase the sentence**
   per the TTS-safe shape rules (usually: split at the comma) and regenerate
   only that clip id — regenerating the identical text tends to reproduce
   the artifact.
7. Download the needed sound effects (free, no API) into `public/sfx/` —
   list and placement rules in `components.md` (SfxLayer).

## Phase 6 — Build the Remotion project

Load `references/remotion-guide.md`, `references/components.md`, and the chosen
preset in `references/styles.md`. Then:

1. Scaffold with `npx create-video@latest --yes --blank --no-tailwind <dir>`
   and install the extra packages listed in the guide.
2. Create `src/theme.ts` from the style preset, substituting extracted brand
   colors where they fit.
3. Copy the needed components from `components.md` (device frames, keyword
   captions, soundtrack, backgrounds) and adapt them to the theme.
4. Build one component per scene, recreating the real screen from its Phase 4
   screen spec inside a device frame, with the distinct layout silhouette the
   plan assigned. Captions are overlays — never reserve blank space for them;
   every layout must look complete and balanced with zero captions visible.
   Scene lengths are **driven by the actual TTS audio
   durations** via `calculateMetadata` (pattern in the guide) — never
   hardcode scene durations.
5. Choreograph every scene across its FULL duration (choreography section of
   the guide): time visual events to narration beats with the `atWord()`
   helper, keep an ambient motion layer running throughout, and never let the
   frame freeze for more than ~1.5 s. Front-loading all animation into the
   first second produces a slideshow — the #1 quality killer.
6. Wire scenes into a `TransitionSeries` with per-scene voiceover audio and
   the looping, ducked soundtrack. Render the backdrop ONCE, outside the
   series, and give scenes transparent backgrounds — cuts then never move
   the frame, only swap foreground elements. Cut with the preset's kit
   (element exits/entrances, `FloatingHero`, chapter words, zoom-throughs —
   see components.md): **elements move, the screen never slides**, and never
   a plain fade between every scene.
7. If the user opted into sound effects, add an `SfxLayer` with **2–4 quiet
   effects total** (volume ≈ 0.15–0.25) at the biggest moments only — the main
   chapter cut, the hero number landing, the final CTA. Never one per cut,
   never meme sounds; full restraint rules in `components.md`.

## Phase 7 — Visual QA (required)

For every scene, render stills at ~20 %, ~55 %, and ~85 % of its duration
(`npx remotion still <CompId> out/qa/<scene>-55.png --frame=<n> --scale=0.5`),
then **look at every image** and check:

- The three stills of each scene differ visibly. If two look identical, the
  scene is frozen there — add choreography (this is the slideshow check).
- No dead zones: no region of the frame sits empty waiting for a later
  element (the classic failure: a blank bottom third reserved for a caption
  that hasn't fired). Every still must look complete even with no caption
  active. Check the video's very first frame too — it must already be
  mid-motion, not settled and waiting.
- Cuts are smooth: for every cut, render stills bracketing it (cut − 6,
  cut − 1, cut + 4) and flip through them — the change between neighbors
  must be gradual, with elements mid-fade and mid-move on both sides. Any
  element that pops in at full opacity, vanishes in a frame, or jumps
  position between neighboring stills is abrupt — ease it and overlap the
  exit/entrance across the fade.
- One clear focal point; text inside safe areas and not overflowing; readable
  contrast; keyword captions legible; mockups not clipped.
- The recreated screens actually resemble the product — compare against the
  real component code, not memory.
- The UI inside mockups holds up **as UI**: everything aligned to a grid,
  nothing overlapping or clipped, charts fully drawn in their settled state,
  numbers and labels internally consistent and plausible for the product
  (the count matches the chart, the labels match the domain). For UI-heavy
  scenes render the ~85 % still at `--scale=1` — half-size hides broken UI.
  If a screen reads as element soup, simplify: fewer, bigger, aligned
  elements.
- Variety: lay one still per scene side by side — no two scenes share the same
  layout silhouette, and the hero device never sits in the same spot twice.

Fix and re-render stills until clean. Offer `npx remotion studio` if the user
wants to preview interactively.

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
- Front-loaded animation: entrances that all finish in the first second leave
  the rest of the scene as a freeze-frame. Spread events across the narration
  with `atWord()` and keep ambient motion running.
- SFX on every cut reads as a TikTok meme edit. 2–4 quiet whitelist effects
  per video, total — and a feature-list script with no through-line feels like
  a slideshow no matter how good the scenes are.
- Abrupt = cheap. Any visible change faster than ~8 frames or without easing
  reads as a glitch. Exits overlap entrances across a 10–15 frame fade so the
  motion never stops dead; true hard cuts belong only to Kinetic Bold.
- TTS input drift: every voiceover clip must have identical input except
  `text` (same voice, same style prompt verbatim) — otherwise the narrator
  audibly changes between scenes. The generation script errors on drift.
- Music from Lyria-2 is ~30 s — loop it with `<Audio loop>` for longer videos
  (the `Soundtrack` component in `components.md` handles loop + fades + ducking).
- Never commit `.env` or the Replicate token; add `out/` and `node_modules/` to
  the generated project's `.gitignore`.
