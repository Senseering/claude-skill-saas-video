# Generating voiceover and music with Replicate

Two models, both called through `scripts/replicate-audio.mjs` (zero-dependency
Node 18+ script, copied into the generated project):

- **Voiceover**: [`google/gemini-3.1-flash-tts`](https://replicate.com/google/gemini-3.1-flash-tts)
  — fast, expressive TTS with ~30 voices and 70+ languages.
- **Music**: [`google/lyria-2`](https://replicate.com/google/lyria-2)
  — 48 kHz stereo music from a text prompt, clips of roughly 30 seconds.

## Token

The script reads `REPLICATE_API_TOKEN` from the environment or a `.env` file in
the working directory (or one directory up). Tokens come from
https://replicate.com/account/api-tokens. Never print, echo, or commit the token.

## Always discover the schema first

Model inputs on Replicate change over time. Before writing the audio config, run:

```bash
node scripts/replicate-audio.mjs schema google/gemini-3.1-flash-tts
node scripts/replicate-audio.mjs schema google/lyria-2
```

This prints the current input schema (parameter names, types, defaults, enums —
including the authoritative voice list). Build the config's `input` objects
**strictly from the discovered schema**; the parameter names below are the
expected shape but the live schema wins.

## Voice catalog (Gemini TTS prebuilt voices)

Verify against the live schema — names occasionally change. All voices speak all
supported languages; pick by character, write the narration in the target language.

Good defaults for marketing narration:

| Voice | Character | Fits |
|---|---|---|
| Sulafat | warm | friendly all-rounder, consumer products (safe default) |
| Puck | upbeat | energetic launches, social formats |
| Charon | informative | dev tools, technical B2B |
| Kore | firm | confident enterprise pitch |
| Achird | friendly | approachable onboarding tone |
| Sadaltager | knowledgeable | expert explainer |
| Zephyr | bright | light, optimistic consumer feel |
| Fenrir | excitable | high-energy hype videos |
| Achernar | soft | calm, premium, minimal styles |
| Gacrux | mature | trust-heavy sectors (fintech, health) |

Other prebuilt voices typically available: Leda, Orus, Aoede, Callirrhoe,
Autonoe, Enceladus, Iapetus, Umbriel, Algieba, Despina, Erinome, Algenib,
Rasalgethi, Laomedeia, Alnilam, Schedar, Pulcherrima, Zubenelgenubi,
Vindemiatrix, Sadachbia.

When asking the user, offer 3–4 voices that fit the chosen style with one-word
characters — don't dump the full table.

## Writing TTS text

- One clip per scene. Per-scene files give exact scene timing and let you
  regenerate a single scene cheaply.
- Write for the ear: short sentences, contractions, no abbreviations
  ("A P I" vs "API" — spell out anything ambiguous the way it should be spoken).
- **Punctuation is the pause instrument, and pauses cost real time.** The
  period is the only pause the TTS renders reliably — a comma before a
  trailing clause often collapses ("…flow between zones, and where the
  hotspots build" comes out as two rushed sentences with the gap eaten). But
  every period *buys* silence, typically 0.2–0.6 s depending on the style
  prompt, so a script of one-word sentences ("Forget nothing. Never
  double-book. Remember every customer.") reads as a list and burns ~8 s of
  pure silence in a 30 s ad. Spend the budget deliberately:
  - **commas inside an enumeration** keep it flowing at speed;
  - **a period where a pause must land** — above all right before the
    punchline, so it has room to land;
  - roughly **6–8 sentence-ends per 30 s** of narration (calibrate to confirm).
  Never attach a clause with ", and" / ", so" where you actually want a
  pause — start a new sentence. No subject-less trailing clauses. End every
  clip with terminal punctuation.
- Don't stage-direct the visuals ("now watch…", "see here…") — the animations
  are stylized recreations, not a screen recording; state the capability.
- Never open a clip with a bare conjunction (But / And / So / Then) — every
  clip is heard fresh after a visual cut, so it sounds like a skipped beat.
  Put the contrast inside the sentence: "One sensor alone only sees its own
  corner."
- Numbers: write them the way they should be read ("over ten thousand teams").
- If (and only if) the discovered schema has a dedicated style/instructions
  parameter, use it for delivery hints — see the style-prompt section below.
  Do **not** embed stage directions in the text field — the model may read
  them aloud.
- Run the script's TTS-pitfalls checklist over the finished text before
  generating (colons, standalone brand names, minimal pairs — below).

## One narrator, one delivery (critical)

Every voiceover clip in a video must use an **identical input except `text`**:
same voice, same language, and — the trap — the exact same style/instructions
prompt, verbatim. Writing per-scene delivery prompts ("warm and inspiring" for
one scene, "calm and reassuring" for the next, "memorable closing line" for
the CTA) makes the same voice sound like a *different narrator* in every scene,
which reads as a bug in the final video. Pick one delivery that fits the whole
script and reuse the string.

The `generate` command enforces this for narration clips (those with a `text`
input): clips sharing a model must have identical inputs apart from `text`, or
the script exits with an error listing the differing fields. Pass
`--allow-input-drift` only for intentional multi-voice videos (e.g. a
two-person dialogue). Music clips are exempt — two Lyria candidates with
different prompts are fine.

## The style prompt: word rate and pause length are separate knobs

This is the highest-leverage control in the whole audio phase, and the one
that most often gets blamed on the script instead. The style prompt moves
**two independent things**: how fast words are spoken, and how long the
narrator stops at a sentence end. Measured on identical text with nothing but
the prompt changed, word rate ranged 8–19 chars/s and sentence-end pauses
0.2–0.6 s — the same 30 s script landing anywhere between 22 s and 44 s.

Write the prompt as **separate clauses, one per knob**, so you can move one
without disturbing the others:

```
"<rate> — <pause> — <emphasis>"

e.g. "fast and tight delivery — stop properly at a full stop, a clear
      half-second beat — lean on the key word of each sentence"
```

- **rate clause** ("fast and tight", "unhurried and calm") — words per second.
- **pause clause** — sentence-end silence. Without an explicit one, a "fast"
  prompt eats the gaps (0.23 s) and every punchline lands on top of the next
  sentence; "a clear half-second beat" restores them (0.58 s) at the same
  word rate.
- **emphasis clause** — which word carries each sentence.

Two rules that come straight from a wasted generation run:

1. **Diagnose pauses before words.** "Too slow" and "rushed, nothing lands"
   are almost always about the *pauses*, not the word rate — and rewriting the
   script is the wrong fix for both. Reach for the pause clause first.
2. **Change ONE clause per iteration, then re-measure** (`calibrate`, below).
   A full rewrite meant to add emphasis silently dropped "fast and tight" and
   the model halved the *word rate* instead of lengthening the *pauses* —
   a whole regeneration run spent going backwards.

## Predicting and verifying clip length

Runtime is predictable from the text with a two-term model:

```
seconds ≈ characters / charsPerSecond + sentenceEnds * pauseSeconds
```

(`sentenceEnds` = runs of `.` `!` `?`.) The two constants belong to **one
voice + language + style-prompt combination** — never carry numbers over from
another video; fit them:

```bash
node scripts/replicate-audio.mjs calibrate audio-config.json
```

It least-squares-fits both constants from the clips already on disk (needs
`ffprobe` and ≥ 3 narration clips) and prints them ready to paste into the
config:

```json
{ "outputDir": "public/audio",
  "speech": { "charsPerSecond": 16.7, "pauseSeconds": 0.58 },
  "clips": [ ... ] }
```

Two payoffs. **At script time** you can check the target runtime *before*
paying for a generation run, instead of discovering it after rendering.
**At debug time** the model separates "slow speaker" from "lots of pauses" —
by ear those are indistinguishable, and that is exactly where debugging
stalls.

`generate` also checks every narration clip against the prediction after
download and warns when it is more than 1.6× or less than 0.5× of it:

```
warn: scene-03 length 17.6s vs ~6.8s predicted (2.6x) — possible double read; listen or regenerate
```

That catches an otherwise **invisible** failure mode: the model occasionally
reads a text twice. Nothing else notices, because scene lengths follow the
audio — the scene just silently becomes 10 s too long. The JSON summary
carries `lengthOk: false` for the same clips. Thresholds are loose by design;
tighten the *model* with `calibrate`, not the thresholds. Without `ffprobe`
the check is skipped with a note (the rest still works).

Re-run `calibrate` whenever the voice, language, or style prompt changes, and
regenerate a bad clip before calibrating on it — the residual table in the
output makes an outlier obvious.

## Tempo without regenerating (`tempo` / `retempo`)

For "make it 5 % faster" there is no need to pay for a new clip. Add a
per-clip `tempo` (a sibling of `input`, so it never counts as narrator drift):

```json
{ "id": "scene-02", "model": "google/gemini-3.1-flash-tts", "tempo": 1.05,
  "input": { "text": "...", "voice": "Charon" } }
```

After download, the script applies pitch-neutral `ffmpeg atempo` and keeps the
untouched original as `<id>.raw.wav`. Remotion only ever reads `<id>.wav`.
Change the number and re-derive from the raw file at any time — free,
idempotent, reversible:

```bash
node scripts/replicate-audio.mjs retempo audio-config.json          # all clips
node scripts/replicate-audio.mjs retempo audio-config.json scene-02 # one clip
```

Deleting `tempo` and re-running `retempo` restores the original. Raw files are
kept for every clip and can be deleted once the video is final.

**The limit — do not use this as a cure-all:** `atempo` scales words and
pauses *equally*. It buys length; it cannot buy emphasis. If the complaint is
"the punchline doesn't land", the fix is the pause clause of the style prompt
or the punctuation in the script — not tempo. Tempo is also allowed on music
clips, but there it is pointless: regenerate with a different BPM in the
prompt instead.

## TTS pitfalls checklist (run over the text before generating)

Textual causes with audible effects. All of these were caught by a client, not
by the producer — check them at script sign-off. Extend the list per language
as you learn more:

- **A colon produces question intonation.** After a colon the model keeps the
  pitch contour rising, as if introducing a list — "Job posting: someone who
  takes your appointments." is heard as a question. Before a punchline, use a
  period and a complete declarative sentence.
- **A foreign brand name alone in a sentence gets nativized.** "Overview. For
  everyone…" was read as "*Über*view" by the German voice; every occurrence
  *inside* a sentence ("Book with Overview…") was correct. Never leave a brand
  name as a one-word sentence in the TTS text.
- **Minimal pairs get confused.** German "du lebst ihn" was heard as "du
  liebst ihn". Scan the script for near-homophones (de: lebst/liebst,
  Kunde/kannte) and rephrase around them.

**Be honest about what is checkable.** Intonation is *not* reliably detectable
by machine — an attempt at F0-based question detection produced false
positives on octave jumps and breath releases, and the clip a client heard as
a question actually measured as *falling* at the end. Fix the textual causes
above and verify by listening. Length and dropouts, by contrast, are reliably
measurable — that is what the duration check is for.

## Writing the Lyria-2 music prompt

Generic prompts produce elevator music — "uplifting modern electronic,
energetic, instrumental" is exactly how you get a boring track. A commercial-
sounding prompt is *specific* on five axes:

1. **Genre with attitude**: "big-room trap hybrid", "cinematic dark
   electronic", "modern commercial electro-pop" — not just "electronic".
2. **Tempo**: name a BPM ("126 BPM", "at 140 BPM"). It anchors the energy.
3. **Signature instruments**: "punchy sidechained synth bass", "booming 808s",
   "felt piano", "brass stabs" — 2–4 concrete sounds.
4. **Production adjectives**: "glossy radio-ready production", "loud punchy
   mix", "wide stereo" — this is what separates commercial from stock.
5. **Arc**: "tense risers releasing into a heavy drop", "euphoric chorus lift
   with a big drum fill" — a 30 s clip needs one moment of payoff.

Plus always **"instrumental"** in the prompt and
`"negative_prompt": "vocals, singing"` (schema permitting) — vocals fight the
voiceover. Each style preset in `styles.md` ships a ready prompt built this
way; adapt it to the user's taste and ask for reference genres/artists if they
have opinions.

**Generate two candidates.** Music taste is personal and a re-roll is cheap.
Add two clips with distinct prompts (e.g. `music-a` safer, `music-b` bolder),
then have the user listen (`open public/audio/music-a.wav`) and pick. Wire the
winner into `Soundtrack`; keep the loser on disk in case they change their mind.

Output is ~30 s of 48 kHz stereo WAV. For longer videos, loop it in Remotion
(`<Audio loop>`); the `Soundtrack` component handles loop, fades, and ducking.

## Sound effects (free — not Replicate)

Sparingly: 2–4 quiet effects in a whole 30 s video (a whoosh on the main cut,
a soft accent when the hero number lands), volumes 0.12–0.25, whitelist
sounds only — never the meme sounds in the library, and never one per cut.
See the `SfxLayer` section in `components.md` for the whitelist, download
command, and restraint rules. No schema discovery or API cost involved.

## Config and run

```json
{
  "outputDir": "public/audio",
  "speech": { "charsPerSecond": 16.7, "pauseSeconds": 0.58 },
  "clips": [
    { "id": "scene-01", "model": "google/gemini-3.1-flash-tts",
      "input": { "text": "Tired of deploys that take all afternoon?", "voice": "Puck" } },
    { "id": "scene-02", "model": "google/gemini-3.1-flash-tts",
      "input": { "text": "Acme ships your code in under a minute.", "voice": "Puck" } },
    { "id": "music", "model": "google/lyria-2",
      "input": { "prompt": "uplifting modern electronic, warm analog synths, steady beat, energetic, instrumental",
                 "negative_prompt": "vocals, singing" } }
  ]
}
```

```bash
node scripts/replicate-audio.mjs generate audio-config.json          # everything
node scripts/replicate-audio.mjs generate audio-config.json scene-02 # one clip
node scripts/replicate-audio.mjs calibrate audio-config.json         # fit "speech"
node scripts/replicate-audio.mjs retempo audio-config.json           # re-apply tempo, no API call
```

The script polls until each prediction finishes, downloads files as
`public/audio/<id>.<ext>` (keeping `<id>.raw.<ext>` alongside), prints
progress to stderr and a JSON summary (with durations and `lengthOk` when
`ffprobe` is installed) to stdout. On failure it retries once.

After generation, read the warnings and have the user spot-check the clips.
The two failure classes need opposite fixes:

- **Generation failure** — a `warn:` line or `lengthOk: false`: the model read
  the text twice, or cut it short. The text is fine, so **regenerating the
  same clip id is the right move** (and usually succeeds).
- **Prosody artifact** — the clip sounds rushed, or a pause got swallowed.
  Regenerating identical text reproduces it. **Rephrase** instead (usually:
  split at the comma into two sentences, per the punctuation rules above) and
  regenerate only that clip id — or, if the whole video has the problem, fix
  the pause clause of the style prompt and regenerate all narration.

Also confirm every expected file exists in `public/audio/` before
building the video.

## Mixing levels (used by the `Soundtrack` component)

- Voiceover: full volume (1.0).
- Music under voiceover: 0.15–0.22. Music without voiceover (intro/outro or
  voiceless videos): 0.3–0.4.
- Fade music in over ~1.5 s, fade out over the final ~2 s.

## Costs

Every clip is a paid API call. A typical 30 s video = 4–6 TTS clips + 1 music
clip — usually well under a dollar, but check current pricing on the model
pages. This is why the script/scene plan must be approved before Phase 5, and
why regeneration targets single clip ids.
