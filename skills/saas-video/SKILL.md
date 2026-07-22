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

## The workflow is not optional — never skip straight to building

The most common request is terse: *"create a video, here's the repo path."*
That is the NORMAL way this skill is invoked — it is **not** permission to skip
ahead and start building. A one-line request means "you drive the questions",
not "assume everything and go". Walk these gates in order and **STOP** at each
until the user has answered; never collapse them:

1. **Analyze the repo yourself** (Phase 2). Never ask the user what the product
   does or which features it has — mine that from the code.
2. **Interview the user** (Phase 3) before writing anything. At minimum you
   MUST ask: **which features to highlight**, the **target group**, and the
   **placement/duration/aspect/style** and **voice/language/music**. Use the
   AskUserQuestion tool. Do not guess these from the repo and proceed.
3. **Get script approval** (Phase 4). Present the narration + scene plan and
   wait for an explicit "yes" before any Remotion code or any Replicate call.

If you find yourself scaffolding a Remotion project or calling Replicate and
the user has not answered the interview and approved a script, you have
skipped the point of this skill — stop and back up.

## Reference files (load on demand, relative to this skill's directory)

| File | Load when |
|---|---|
| `references/replicate-audio.md` | Before writing the narration (Phase 4) and before generating any audio (Phase 5) — voices, style prompt, duration model, TTS pitfalls, config format, mixing levels |
| `references/styles.md` | Before presenting style options (Phase 3) and while building scenes (Phase 6) |
| `references/remotion-guide.md` | Before scaffolding or writing any Remotion code (Phase 6) |
| `references/components.md` | While building scenes (Phase 6) — copy-paste device mockups, keyword captions, backgrounds |

If a `remotion-best-practices` skill is available in this environment, load it
too when building — it is more detailed than the condensed guide here.

## Ground rules

- **Money gate.** Replicate calls cost API credits. Never call Replicate before
  the user has approved the script/scene plan (Phase 4 → 5 boundary).
- **Ask, don't assume.** Which features to highlight, target group, duration,
  aspect ratio, style, voice, music, and output location all come from the
  user — never inferred from the repo alone. Use the AskUserQuestion tool when
  available (multi-select for features; users can always answer free-form). A
  short request ("just make a video, here's the path") is the norm and is NOT a
  license to skip the interview.
- **Verify visually.** Render still frames and look at them before the final
  render. Never deliver a video whose frames you have not seen.
- **Verify audibly — and measure what you can.** Prosody (question intonation,
  a mispronounced brand name) is only findable by listening; clip length and
  dropouts are measurable, and the script checks them for you. Trust the
  measurement for length, trust ears for everything else, and never claim a
  prosody problem is machine-checked.
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
3. Note whether `ffmpeg`/`ffprobe` and ImageMagick (`montage`) exist. None is
   strictly required, but without them you lose the clip-length sanity check
   and `calibrate` (Phase 5, `ffprobe`), the `tempo` control (`ffmpeg`), and
   the QA contact sheet (Phase 7). Suggest `brew install ffmpeg imagemagick`
   if they're missing — the length check in particular catches a failure mode
   nothing else in the pipeline reports.

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
- **Data-viz language** (when the product renders maps/charts/particles): open
  those components and copy the exact visualization vocabulary — heatmap ramps
  (every hex stop), marker fill + stroke, path styles (glow + core color
  pairs), particle head/tail colors, chart series colors, legend gradients,
  live-indicator styling. The app's real color ramp instead of a generic one
  is the difference between "inspired by the product" and "recognizably the
  product".
- **World specifics**: the deployment city, real street/place names, real
  device IDs, real event names. These feed the Phase 4 screen specs —
  specificity is what makes recreated canvases believable.
- **UI inventory** (whenever the product has a UI): the app's actual screens
  and views, found via routes and page components, and which screen each
  candidate feature lives on. This matters as much as the feature list: scenes
  are built from recreations of these real screens, so the video shows *this
  product's* interface — not generic dashboards or icon metaphors.

## Phase 3 — Interview the user

Round 1 — content:
- **Target group**: who is the ONE viewer this video speaks to? Offer 3–4
  concrete roles derived from the Phase 2 analysis (e.g. "event organizers",
  "city planners", "retail ops leads") plus free-form. One video = one
  viewer: this person becomes the protagonist of the through-line, and the
  hook's pain, the vocabulary, and every example follow from it. If the user
  names two audiences, recommend two videos rather than one blurry one.
- Which features to highlight? Multi-select from your Phase 2 list, and make
  clear they can steer in a completely different direction with a free-form
  answer instead.
- **Status quo**: what does that viewer do today instead — a spreadsheet, a
  manual process, gut feeling, a named competitor? The hook attacks the
  status quo, and before/after arcs need the "before". The repo can't tell
  you this; the user can.
- **Proof points**: real numbers or names the video may show — user count,
  accuracy, time saved, a recognizable customer. Concrete beats generic in
  hooks and keywords, and nothing may be invented: no number from the user,
  no number on screen.
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
- **Address register** (only if the chosen language distinguishes formal and
  informal address — German du/Sie, French tu/vous, Spanish tú/usted, Dutch
  je/u…): ask which one. Informal (duzen) is the norm for modern SaaS and
  consumer marketing — recommend it there; formal (siezen) fits enterprise,
  government, and regulated industries (banking, legal, health). Skip the
  question entirely for languages without the distinction (English).
- **Music**: suggest a vibe matching the chosen style preset (each preset in
  `styles.md` has a music prompt), offer alternatives or no music.
- **Sound effects**: subtle (2–4 quiet motion sounds — whoosh/switch/
  page-turn — at the biggest moments, the default) or none. **Never bright
  "pling"/chime/ding/bell/sparkle/notification sounds** — they read as cheap
  and app-notify-y; whitelist only (see `components.md`).

## Phase 4 — Script and scene plan (approval gate)

First, study the screens behind the selected features: read the actual
component/page source (layout regions, real nav/button/label texts, chart
types, colors, sample data shapes) and write a short **screen spec** per
feature scene. Scenes recreate these real screens — someone who knows the app
must recognize it in the video.

The spec covers the **content canvas**, not just the chrome: any real-world
canvas the app renders (map, calendar, document, feed, terminal) must itself
be believable at video distance — one abstract canvas (straight grid lines +
rectangles as a "map", a chart with no axis, an editor full of lorem) poisons
every scene that contains it, no matter how faithful the surrounding chrome
is. For a map: a curved river, an irregular street network with road
hierarchy (dark casing under brighter core strokes), city blocks with rooftop
texture, parks, and 5–8 REAL street/place names from the deployment city as
dim labels. Specificity sells authenticity — use the real city, device IDs,
and event names mined in Phase 2.

Then write the narration and scene plan:

- **Pacing**: TTS speaks ≈ 2.5 words/second, so a 30 s video holds ~70 words —
  use that for the first draft, then check the real number: per clip,
  `seconds ≈ characters / charsPerSecond + sentenceEnds × pauseSeconds`, and
  the video ≈ the sum of those plus per-scene tails minus transition overlaps.
  **Sentence-ends are half the runtime** — each buys 0.2–0.6 s of silence, so
  cutting words barely shortens a script while cutting periods does. After the
  first generation run `calibrate` (replicate-audio.md) to fit both constants
  for this voice + language + style prompt and re-check the target runtime
  *before* regenerating anything. Leave breathing room — under-write rather
  than over-write.
- **Through-line first (der rote Faden)**: before writing any scene, lock ONE
  viewer (the target group chosen in Round 1), ONE core use case (the one
  that kills the biggest pain — the product does fifty things; this video
  nails one, the rest deserve their own videos later), ONE tension the hook
  opens (built on the Round 1 status quo — that's the "before" the video
  attacks), and ONE story arc that resolves it — then let the selected
  features enter as beats of that story,
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
  active voice, specifics and numbers instead of adjectives (only the proof
  points the user supplied in Round 1 — never invent a stat). The hook names
  the viewer's problem or makes one bold claim in words a person would
  actually say; never open with abstract poetry about the product. Banned
  filler: "turns X into Y", "seamlessly", "empowers", "unlock", "like never
  before", "a new way to". Also banned: **stage-directing the visuals** —
  "now watch the crowd flow", "see here", "this is the dashboard". The
  animations are stylized recreations, not a 1:1 demo, so narration that
  points at the screen overpromises; state the capability instead ("The map
  shows crowds build, zone by zone."). Test: read each line aloud — if it
  could be about any product, rewrite it.
- **Address register**: if the language has one (Round 3 choice), it applies
  EVERYWHERE — narration, keyword captions, CTA button text, recreated UI
  labels, satellite cards. A "du" narration ending on a "Starten Sie" button
  reads as a bug; check every on-screen string against the chosen register.
- **Punctuation is the emphasis tool** — not word choice. The TTS renders
  periods reliably but mangles subtle comma prosody, so a comma before a
  trailing clause often collapses ("…flow between zones, and where the
  hotspots build" comes out as two rushed sentences with the gap eaten).
  The period is the only pause you can trust — **and every period costs
  0.2–0.6 s of silence**, so it is a budget, not a free safety measure. Both
  extremes fail: one-word sentences ("Forget nothing. Never double-book.
  Remember every customer.") read well on paper but sound like a read-aloud
  list and burn ~8 s of silence per 30 s ad; turning everything into
  comma-chains races through and leaves the punchline no room to land. What
  works: **commas inside the enumeration, a full stop only right before the
  punchline** — about 6–8 sentence-ends per 30 s. Word count barely changes;
  the length lives in the pauses. Never attach a clause with ", and" / ", so"
  where you want a pause — start a new sentence; no subject-less trailing
  clauses.
- **TTS pitfalls sign-off** (checklist in `replicate-audio.md`): before the
  script is approved, read it for the three textual causes of mispronunciation
  — a **colon** before a punchline (the model keeps the pitch rising and reads
  it as a question; use a period and a full declarative sentence), a **brand
  name standing alone as a one-word sentence** (a name foreign to the
  narration language gets nativized — "Overview." was read as "*Über*view" by
  a German voice), and **minimal pairs** the listener could mishear (de:
  lebst/liebst) — rephrase around them. Every one of these was caught by the
  client, not the producer.
- **Per scene**:
  - id and narration (1–2 spoken sentences, written for the ear);
  - **visual**: which real screen is recreated inside which vehicle — browser
    frame, phone frame, or a chrome-less **UI close-up** of one component —
    and the one interaction that animates while the voice
    talks (e.g. "live map view with area polygons; device dots keep appearing
    and the count badge ticks up"). Abstract/icon visuals are a last resort
    for claims with no UI (e.g. privacy) — never for a feature that has a screen;
  - **on-screen keywords** (0–4, verbatim from the narration): the payoff
    words — benefits, numbers, the product name. Each must appear in the
    narration as a **contiguous phrase**, word for word — the caption matcher
    requires the whole phrase in order and throws otherwise. Apply the
    **billboard test** to each keyword *on its own*: would it work as a
    billboard line for this product, without hearing the voice? Prefer 2–4-word claims with a noun:
    "LIVE CROWD COUNT", "100% ANONYMOUS", "ZERO SETUP". Lone adjectives or
    verbs ripped from a sentence fail ("PACKED", "FASTER", "BUILDS" — random
    words to a muted viewer), as do connective fragments ("right now", "how
    busy", "works with"). A scene with no billboard-worthy phrase gets zero
    keywords — nothing beats nonsense;
  - **beats**: which narration word triggers which visual event — the
    choreography input for Phase 6. Beats must **transform, not decorate**:
    the weakest beat is "X fades in when the narrator says X"; the strongest
    is a before→after state change on the recreated UI that enacts the claim
    — raw MAC addresses visibly masking to "7A ·· ·· ·· 1C" on "anonymous",
    one spotlighted sensor (dark veil + dashed range ring) becoming a full
    mesh on "dozens", a coverage polygon sweeping closed on "net". For each
    scene's key claim ask: what can the UI itself DO to prove this? Reserve
    plain appear/fade for secondary elements;
  - **silhouette + cut**: which layout silhouette the scene uses (variety
    section of the guide) and which transition from the preset's kit leads
    into it — no two adjacent scenes share either. Device frames may star in
    at most half the scenes, the phone specifically in at most two per video;
    a chrome-less UI close-up of one component usually beats another phone
    scene. Cuts move **elements, not the screen**: no slide/push/wipe
    presentations. The backdrop persists across the cut while scene N's
    elements exit staggered and scene N+1's elements enter, blended by a
    10–15 frame fade so no frame is a snap; zoom-throughs
    and chapter words carry the big moments. **Cross-scene payoffs**: when
    adjacent scenes show the same world at different scales (device map →
    full-bleed map), plan the zoom-through to dive literally from one into
    the other — same canvas component, same coordinates on both sides of the
    cut. Decide this at scene-plan time, not in the edit.
- **One narrator**: exactly one voice AND one delivery-style prompt for the
  whole video (see `replicate-audio.md` — varying the style per clip makes the
  narrator sound like a different person between scenes). Build that prompt
  from the three separate clauses in the reference (word rate / pause length /
  emphasis) — they are independent knobs, and "too slow" or "rushed" is almost
  always the **pause** clause, not the rate. When tuning it later, change
  **one clause per iteration** and re-measure; a full rewrite silently drops a
  clause and costs a whole generation run.

Present the through-line as one sentence first ("A festival organizer wonders
if the east entrance is overcrowded — CityPulse answers it live, then proves
it's private"), then the plan as a table (scene, narration, keywords, screen +
interaction) plus the target group, voice, music prompt, style, duration,
placement, and CTA choices. State that generating audio calls the paid
Replicate API. **Get explicit approval before continuing.**

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
5. **Read the length warnings** — the script checks every narration clip
   against its predicted duration and prints `warn: … possible double read`
   (or truncation) plus `lengthOk: false` in the JSON. Never skip past one:
   the model occasionally reads a text twice, and because scene lengths follow
   the audio, nothing else in the pipeline will ever complain — the scene just
   silently runs 10 s long. This is a *generation* failure, so regenerating
   the same clip id is the right fix. Then run
   `node scripts/replicate-audio.mjs calibrate audio-config.json`, paste the
   fitted `speech` constants into the config, and check the total runtime
   against the target before building anything.
6. Have the user listen to both music candidates
   (`open public/audio/music-a.wav`) and pick; wire the winner into
   `Soundtrack`.
7. Ask the user to spot-check the narration clips too (`open public/audio/`).
   If a clip sounds rushed or a pause got eaten, **rephrase the sentence**
   per the punctuation rules (usually: split at the comma) and regenerate
   only that clip id — regenerating the identical text tends to reproduce
   the artifact. If the *whole* video is off-pace, fix the style prompt's
   pause clause instead of the script. For a small global speed change, add a
   per-clip `tempo` and run `retempo` — free and reversible, but it scales
   words and pauses equally, so it buys length, never emphasis.
8. Download the needed sound effects (free, no API) into `public/sfx/` —
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
   plan assigned. Build any real-world canvas the app renders (map, calendar,
   feed) **once** as a reusable component — one believable canvas lifts every
   scene that shows it. In 9:16, give device scenes an `overlay` slot for
   satellite cards (styles.md). Captions are overlays — never reserve blank
   space for them; every layout must look complete and balanced with zero
   captions visible. Scene lengths are **driven by the actual TTS audio
   durations** via `calculateMetadata` (pattern in the guide) — never
   hardcode scene durations.
5. Keep canvas overlays in the canvas's coordinate space: pins, routes, and
   coverage shapes render in a second SVG with the **identical `viewBox` +
   `preserveAspectRatio`** stacked on the canvas — never %-positioned HTML in
   a parallel space (a `slice`-cropped container with a different aspect
   ratio silently misaligns every pin). Export the canvas geometry (street
   polylines, intersection points) and make every scene consume it: routes
   follow actual streets, sensors sit on actual intersections, and
   `pointAlong()` (components.md) drives particles and arrowhead angles.
6. Choreograph every scene across its FULL duration (choreography section of
   the guide): time visual events to narration beats with the `atWord()`
   helper, keep an ambient motion layer running throughout, and never let the
   frame freeze for more than ~1.5 s. Ambient life belongs **inside the
   world**, not just on the camera — traffic dots moving along the map's
   roads, pedestrian dots on lanes, water shimmer, wobbling signal bars,
   running from frame 0 (this cures "scene opens dead while the entrances
   play" without front-loading the choreography). Front-loading all animation
   into the first second produces a slideshow — the #1 quality killer.
7. Wire scenes into a `TransitionSeries` with per-scene voiceover audio and
   the looping, ducked soundtrack. Render the backdrop ONCE, outside the
   series, and give scenes transparent backgrounds — cuts then never move
   the frame, only swap foreground elements. Cut with the preset's kit
   (element exits/entrances, `FloatingHero`, chapter words, zoom-throughs —
   see components.md): **elements move, the screen never slides**, and never
   a plain fade between every scene.
8. If the user opted into sound effects, add an `SfxLayer` with **2–4 quiet
   effects total** (volume ≈ 0.15–0.25) at the biggest moments only — the main
   chapter cut and the hero screen/number landing. Whitelist only (whoosh,
   whip, switch, page-turn, click). Never one per cut, never meme sounds, and
   **never a "pling"/chime/ding/bell/sparkle/notification** sound — especially
   not on the CTA. Full restraint rules in `components.md`.
9. Add the finishing layer (components.md): a global `Grain` overlay above
   all scenes (breaks banding in big dark gradients), a static screen-glare
   gradient on device mockups, a looping shine sweep across the CTA button,
   and micro-life on chapter-word holds. Cheap, global, reads as production
   value.

## Phase 7 — Visual QA (required)

Build a **contact sheet** — one image per video that shows every scene at
three moments. Render the video once at `--scale=0.5`, compute each scene's
boundaries from the audio durations (the same numbers `calculateMetadata`
uses: clip length + tail, minus transition overlaps), pull a still at 20 %,
55 % and 85 % of every scene with `ffmpeg -ss <seconds> -i out/qa.mp4
-frames:v 1 out/qa/<scene>-55.png`, then tile them into a single image with
ImageMagick — **one column per scene, three rows**:

```bash
montage out/qa/*.png -tile <sceneCount>x3 -geometry +4+4 out/qa/contact.png
```

If ImageMagick is missing, `ffmpeg -filter_complex tile` does the same job; if
neither is available, fall back to reading the individual stills. One glance
at one image then answers most of the checklist below — and it is far cheaper
than 15–20 `remotion still` calls, each of which re-bundles the project. Build
one sheet **per composition** (per format, per industry variant): a single
sheet is what catches a variant showing another industry's sample data.

**Look at the sheet** and check:

- The three stills of each scene differ visibly. If two look identical, the
  scene is frozen there — add choreography (this is the slideshow check).
- No dead zones: no region of the frame sits empty waiting for a later
  element (the classic failure: a blank bottom third reserved for a caption
  that hasn't fired). Every still must look complete even with no caption
  active. Check the video's very first frame too — it must already be
  mid-motion, not settled and waiting.
- Cuts are smooth: for every cut, render bracketing stills with
  `npx remotion still` (cut − 6, cut − 1, cut + 4) — frame-exact work the
  contact sheet can't do — and flip through them; the change between neighbors
  must be gradual, with elements mid-fade and mid-move on both sides. Any
  element that pops in at full opacity, vanishes in a frame, or jumps
  position between neighboring stills is abrupt — ease it and overlap the
  exit/entrance across the fade.
- Caption-zone collision (9:16 especially): any element borrowing the
  below-device zone (satellite cards) has fully vacated **≥ 4 frames before**
  the scene's first keyword caption fires — compute the caption's first word
  with `atWord()`.
- One clear focal point; text inside safe areas and not overflowing; readable
  contrast; keyword captions legible; mockups not clipped.
- The recreated screens actually resemble the product — compare against the
  real component code, not memory. In a variant video, the sample data belongs
  to *this* variant's industry (a hair-salon service in the trades cut is the
  classic leak).
- On-screen text still matches what the voice says in that scene. Scene
  strings are hardcoded, so a narration edit silently leaves them behind — the
  voice saying "du erlebst ihn jeden Tag" over a screen still reading "Du
  lebst ihn." only ever shows up here.
- The UI inside mockups holds up **as UI**: everything aligned to a grid,
  nothing overlapping or clipped, charts fully drawn in their settled state,
  numbers and labels internally consistent and plausible for the product
  (the count matches the chart, the labels match the domain). For UI-heavy
  scenes render the ~85 % still at `--scale=1` — half-size hides broken UI.
  If a screen reads as element soup, simplify: fewer, bigger, aligned
  elements.
- Variety: lay one still per scene side by side — no two scenes share the same
  layout silhouette, and the hero device never sits in the same spot twice.

Fix and rebuild the contact sheet until clean. Offer `npx remotion studio` if
the user wants to preview interactively.

## Phase 8 — Render and deliver

- `npx remotion render <CompId> out/<product>-<format>.mp4`
- Report the absolute output path, total duration, and format.
- Explain how to iterate: edit scenes and re-render; regenerate one scene's
  voice with `node scripts/replicate-audio.mjs generate audio-config.json scene-02`;
  tweak in Remotion Studio. Nothing needs to be regenerated unless the
  narration text or music prompt changed.

## Iterating on feedback

- Copy/visual changes: edit the scene components, rebuild the Phase 7 contact
  sheet, re-render.
- **Narration changes** — every text edit desynchronises three things that
  fail silently. Run all four steps, every time:
  1. Update `audio-config.json` and regenerate **only** the affected clip ids
     (durations adapt automatically); read the length warning.
  2. Re-read that scene's component and update every **hardcoded on-screen
     string** to match the new line — the visual does not follow the voice.
  3. Check every `atWord()` target and keyword in that scene still occurs in
     the new text, and at the intended occurrence. The helpers throw on a
     miss, so a stale target fails the render loudly — but a target that still
     matches a *different* occurrence won't, and that is the one that moves a
     caption onto the wrong beat.
  4. Rebuild the contact sheet for that scene.
- New format (e.g. 9:16 after 16:9): add a second `<Composition>` with new
  dimensions, adjust layout constants per `styles.md`, reuse all audio.
- **Audience/industry variants** (the same ad recut for salons, trades, …):
  one composition with an `industry` prop, per-industry voiceover only for the
  scenes that name the trade — the pattern is in `remotion-guide.md`. Marginal
  cost is ~2 TTS clips and one config object per industry, so when a second
  audience shares the pain and the story and differs only in vocabulary and
  sample data, this is a variant pass, not a second video.

## The improvement pass

When asked to improve an existing video rather than build one:

1. **Diagnose before touching code**: render the current cut once at
   `--scale=0.35`, then extract 15–20 evenly spaced frames with ffmpeg
   (`ffmpeg -i out/final.mp4 -vf fps=0.5 out/qa/f%02d.png` — far cheaper
   than many `remotion still` calls, each of which re-bundles the project)
   and montage them into one contact sheet as in Phase 7.
   Re-read the real product's screens, then write a defect list.
2. **Order fixes by screen-time impact**: a shared canvas component that
   appears in 3 scenes outranks any single-scene fix.
3. **Keep the approved narration and music untouched** — a drastic visual
   pass costs zero Replicate credits. Tell the user this up front.
4. **Verify** with the standard Phase 7 pass PLUS full-scale (`--scale=1`)
   stills of UI-heavy scenes and bracket stills around the flashiest cut.

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
  per video, total — motion sounds only (whoosh/switch/page-turn). **A bright
  "pling"/chime/ding/sparkle sound reads as a phone notification and cheapens
  the whole video** — never add one, least of all on the CTA. And a
  feature-list script with no through-line feels like a slideshow no matter how
  good the scenes are.
- Abrupt = cheap. Any visible change faster than ~8 frames or without easing
  reads as a glitch. Exits overlap entrances across a 10–15 frame fade so the
  motion never stops dead; true hard cuts belong only to Kinetic Bold.
- TTS input drift: every voiceover clip must have identical input except
  `text` (same voice, same style prompt verbatim) — otherwise the narrator
  audibly changes between scenes. The generation script errors on drift.
- **A silently double-read clip is invisible without the length check.** Scene
  lengths follow the audio, so a clip the model read twice produces no error
  and no log — the scene is simply 10 s too long. Never ignore a `warn:`
  length line from `generate`.
- A **colon** makes the voice ask a question (the pitch keeps rising), and a
  **brand name alone as a sentence** gets nativized ("Overview." → "Überview").
  Both are textual bugs — fix the script, not the audio. Intonation is not
  machine-checkable; verify by listening.
- `atempo` (the `tempo` field) scales words and pauses equally: it buys
  length, never emphasis. Reach for the style prompt's pause clause when a
  punchline doesn't land.
- Music from Lyria-2 is ~30 s — loop it with `<Audio loop>` for longer videos
  (the `Soundtrack` component in `components.md` handles loop + fades + ducking).
- Never commit `.env` or the Replicate token; add `out/` and `node_modules/` to
  the generated project's `.gitignore`.
