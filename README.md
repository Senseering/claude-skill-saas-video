# 🎬 saas-video — marketing videos for your repo, made by Claude Code

A [Claude Code](https://claude.com/claude-code) skill that turns any software
repo into a polished marketing video in one conversation:

- **Remotion animations** — your app's real screens recreated in code inside
  device mockups (iPhone / browser frames), with word-synced choreography,
  kinetic typography, and animated backgrounds. No screenshots — but
  recognizably *your* product.
- **AI voiceover** — [google/gemini-3.1-flash-tts](https://replicate.com/google/gemini-3.1-flash-tts)
  on Replicate (30 voices, 70+ languages).
- **AI soundtrack** — [google/lyria-2](https://replicate.com/google/lyria-2)
  on Replicate (48 kHz stereo music from a text prompt); two candidates are
  generated so you pick the vibe. Plus a few subtle, optional sound effects —
  felt, not noticed.
- **Cinematic cuts** — a hero device that flies across scene boundaries,
  zoom-throughs into screens, interstitial word-slams; every scene gets a
  distinct layout.
- **Keyword captions** — while the voice talks, only the most important words
  flash on screen, synced to the narration.
- Rendered to an **MP4** in 16:9, 9:16, or 1:1.

Claude analyzes your repo, proposes the most marketable features, interviews
you (features, length, format, style, voice, music), writes the script, asks
for your approval, then generates the audio, builds the Remotion project, and
renders the video. The generated project stays editable — tweak a scene and
re-render anytime.

## Requirements

| What | Why |
|---|---|
| [Claude Code](https://claude.com/claude-code) | runs the skill |
| Node.js ≥ 18 | Remotion + the audio generation script |
| A [Replicate](https://replicate.com) account + API token | voiceover & music (paid API, typically well under $1 per video) |
| ~2 GB free disk | Remotion downloads a headless Chrome on first render |

Set your Replicate token before generating audio (Claude will remind you):

```bash
export REPLICATE_API_TOKEN=r8_...        # or put it in a .env file
```

Get a token at https://replicate.com/account/api-tokens.

## Installation

Inside Claude Code, run:

```
/plugin marketplace add Senseering/claude-skill-saas-video
/plugin install saas-video@senseering
```

That's it. Restart isn't required; the skill is available immediately.

<details>
<summary>Manual installation (without the plugin system)</summary>

```bash
git clone https://github.com/Senseering/claude-skill-saas-video.git
cp -r claude-skill-saas-video/skills/saas-video ~/.claude/skills/
```

Or copy it into a single project's `.claude/skills/` directory instead.
</details>

## Usage

Open Claude Code **in the repo you want to market** (or point the skill at one)
and say something like:

```
Create a marketing video for this repo
```

```
Make a 30-second vertical promo video for our app
```

Claude will then:

1. **Check prerequisites** — Replicate token, Node version.
2. **Analyze your repo** — README, docs, routes, components → the most
   marketable features, plus your brand colors and logo if it finds them.
3. **Interview you** — pick features (or steer in a different direction),
   duration (15/30/60 s), aspect ratio, visual style (5 presets from
   "Gradient Launch" to "Kinetic Bold"), voiceover yes/no + voice + language,
   music vibe, and where to put the project.
4. **Write the script** — narration, on-screen keywords, and a visual concept
   per scene. **Nothing is generated until you approve** (this is the step
   that starts spending Replicate credits).
5. **Generate audio** — per-scene voiceover clips + a music track.
6. **Build & verify** — scaffolds a Remotion project, builds the scenes,
   checks rendered still frames of every scene.
7. **Render** — final MP4, ready to post.

### Iterating

The Remotion project is a normal React project — ask Claude to change copy,
colors, or pacing and re-render. Regenerating a single scene's voiceover:

```bash
node scripts/replicate-audio.mjs generate audio-config.json scene-02
```

Or preview and scrub interactively:

```bash
npx remotion studio
```

## What's in this repo

```
.claude-plugin/
  plugin.json               # plugin manifest
  marketplace.json          # lets you install via /plugin marketplace add
skills/saas-video/
  SKILL.md                  # the workflow Claude follows
  references/
    replicate-audio.md      # TTS & music: voices, prompts, mixing levels
    remotion-guide.md       # condensed Remotion best practices
    styles.md               # 5 visual style presets
    components.md           # device mockups, keyword captions, backgrounds (TSX)
  scripts/
    replicate-audio.mjs     # zero-dependency Replicate client (schema discovery,
                            # generation, polling, downloads)
```

## Troubleshooting

- **"REPLICATE_API_TOKEN is not set"** — export it or add it to a `.env` file
  in the project directory. Never commit it.
- **First render is slow** — Remotion downloads headless Chrome once; later
  renders are fast.
- **Voice list looks different** — the skill discovers the current model schema
  at runtime (`node scripts/replicate-audio.mjs schema google/gemini-3.1-flash-tts`),
  so it adapts when Replicate updates the models.
- **Want a second format?** — ask Claude for a 9:16 variant after the 16:9
  render; all audio is reused, only the layout is adapted.

## Updating

```
/plugin marketplace update senseering
```

## License

MIT
