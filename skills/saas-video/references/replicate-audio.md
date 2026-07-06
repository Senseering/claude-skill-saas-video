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
- Punctuation shapes prosody: commas and em-dashes create pauses; end every
  clip with terminal punctuation.
- Numbers: write them the way they should be read ("over ten thousand teams").
- If (and only if) the discovered schema has a dedicated style/instructions
  parameter, use it for delivery hints ("enthusiastic, energetic delivery").
  Do **not** embed stage directions in the text field — the model may read
  them aloud.

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
```

The script polls until each prediction finishes, downloads files as
`public/audio/<id>.<ext>`, prints progress to stderr and a JSON summary (with
durations when `ffprobe` is installed) to stdout. On failure it retries once.

After generation, confirm every expected file exists in `public/audio/` before
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
