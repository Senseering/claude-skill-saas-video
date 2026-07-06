# Style presets

Five presets. Present the 3–4 that best fit the product; users can mix or
describe their own. Every preset defines: palette, fonts
(`@remotion/google-fonts/<Name>` import names), motion language, caption
treatment, mockup usage, a **transition kit** (built from the cinematic
patterns in components.md — never a plain fade between every scene), and a
ready Lyria-2 music prompt.

**Brand color rule:** when Phase 2 extracted brand colors, they replace the
preset's accent (and possibly background) as long as contrast stays strong.
The preset supplies everything the brand doesn't.

---

## 1. Gradient Launch — modern SaaS launch (default recommendation)

Feels like: Stripe/Linear launch video. Dark, premium, vibrant.

- **Palette**: bg `#0b0b12`, accent `#7c5cff`, accent2 `#22d3ee`, text white,
  dim `rgba(255,255,255,0.65)`. Background: `AnimatedGradient` with
  `[accent, accent2, "#f472b6"]` blobs on the dark base.
- **Fonts**: display `Sora` (700/800), body `Inter` (400/600).
- **Motion**: smooth ease-out everything (`Easing.bezier(0.16, 1, 0.3, 1)`),
  12–20 frame entrances, slow continuous drift on backgrounds and mockups.
- **Captions**: white uppercase keywords, bottom-center (KeywordCaptions default).
- **Mockups**: GlassCard features, BrowserFrame (dark) or PhoneFrame hero.
- **Transition kit**: staggered element swaps on the persistent gradient
  backdrop (cards fly up and fade, the next scene's content rises in);
  zoom-through into a screen for the feature reveal; optional `FloatingHero`
  (browser or phone) as the visual through-line — only if it changes
  size/role every scene and sits out at least one chapter (mockup budget
  applies); one quiet whoosh on the main cut only; `fade()` reserved for the
  end card.
- **Music prompt**: `"modern commercial electro-pop, punchy sidechained synth
  bass, bright plucks, tight four-on-the-floor kick at 122 BPM, euphoric
  chorus lift with a big drum fill, glossy radio-ready production, wide
  stereo, confident, energetic, instrumental"`.
- Best for: dev tools with polish, B2B SaaS, launches, 16:9.

## 2. Dark Tech — developer tools / infrastructure

Feels like: terminal-native, Vercel/GitHub vibe.

- **Palette**: bg `#0a0a0f`, accent electric `#22e584` (or brand neon), text
  `#e8e8ea`, dim `rgba(232,232,234,0.55)`. Background: `GridBackground` with
  `rgba(255,255,255,0.05)` lines + one accent glow blob.
- **Fonts**: display `Space Grotesk` (700), body `Inter`; code/label accents
  `JetBrains Mono` (400) — version numbers, CLI commands, metric labels.
- **Motion**: fast and precise — 8–12 frame entrances, linear or sharp bezier,
  elements snap into place; subtle scanline/typewriter accents (string slicing,
  never per-character opacity).
- **Captions**: accent-colored keywords in `JetBrains Mono`, lowercase, with a
  `>` prefix.
- **Mockups**: BrowserFrame (dark) with terminal-style panels; animated
  monospace command lines; bar/line charts in accent color.
- **Transition kit**: hard cuts on the persistent grid backdrop — panels and
  terminal lines snap out, the next scene's elements snap in; black
  interstitial word-slams between chapters; a 2-frame position/invert jitter
  on cuts for a glitch feel; at most one quiet whip on the biggest cut.
- **Music prompt**: `"cinematic dark electronic, driving 126 BPM techno pulse,
  distorted 808 bass hits, glitchy percussion fills, tense risers releasing
  into a heavy drop, modern tech-trailer energy, punchy loud mix,
  instrumental"`.
- Best for: CLIs, APIs, infra, developer audiences.

## 3. Clean Light — calm, trustworthy B2B

Feels like: Notion/Figma marketing page in motion.

- **Palette**: bg `#fafafa`, surface white, accent = brand color (fallback
  `#2563eb`), text `#111318`, dim `#5f6368`. Soft shadows
  (`0 20px 50px rgba(0,0,0,0.08)`), no glass.
- **Fonts**: display `DM Serif Display` (400) or `Sora` for headlines, body `Inter`.
- **Motion**: gentle — 20–28 frame fades and 20 px rises, generous holds,
  nothing bounces.
- **Captions**: dark text keywords with an accent underline or highlighter
  sweep, not uppercase.
- **Mockups**: BrowserFrame (light) with airy stylized UI; lots of whitespace.
- **Transition kit**: gentle element cross-fades on the persistent light
  backdrop — outgoing content drifts up and fades over ~18 frames while the
  incoming rises to meet it; sparse page-turn SFX; a `FloatingHero` browser
  drifting between two positions.
- **Music prompt**: `"warm acoustic-electronic crossover, felt piano, soft
  plucked guitar, gentle 100 BPM beat with claps, hopeful build with subtle
  strings, premium advert feel, polished modern production, instrumental"`.
- Best for: fintech, health, legal, enterprise buyers.

## 4. Kinetic Bold — high-energy social

Feels like: hype launch on TikTok. The typography IS the visual.

- **Palette**: alternating full-bleed scene backgrounds — accent, `#111`,
  `#f5f0e8`, accent2 — with maximum-contrast text on each.
- **Fonts**: display `Archivo Black` or `Bebas Neue` at extreme sizes (140–260 px
  at 1080 wide), body `Inter` (rarely used).
- **Motion**: words slam in (scale 1.4 → 1 in 4–6 frames), quick rotations
  ±3 deg, background color swaps on the beat, 6–10 frame slide transitions.
- **Captions**: none needed separately — the keywords are the main visuals,
  centered, full-frame. Give every narration phrase its screen moment.
- **Mockups**: minimal; occasional PhoneFrame popping in at an angle
  (`rotate: "-6deg"`).
- **Transition kit**: the background color slam IS the cut (hard cut to a new
  full-bleed color on the beat) — the words themselves slam in and out, the
  screen never slides; interstitial word-slams constantly (each held readable
  ≥ 15 frames) — this style is basically interstitials with narration. The
  music's beat does the punching; keep SFX to 1–2 quiet whips max.
- **Music prompt**: `"big-room trap hip-hop hybrid, booming 808 bass, hard
  snares at 140 BPM, bold brass stabs, DJ-style cuts and stutter fills, hype
  anthem energy, loud punchy modern mix, instrumental"`.
- Best for: 9:16 and 1:1, waitlists, consumer hype, ≤ 30 s.

## 5. Soft Playful — friendly consumer apps

Feels like: Duolingo/Headspace warmth.

- **Palette**: pastel gradient bg (`#ffe8d6` → `#ffd6e8` or brand-tinted
  pastels), accent saturated brand color, text `#3a2e39`, white rounded-XL
  cards (radius 32).
- **Fonts**: display `Baloo 2` (700), body `Quicksand` (500/600).
- **Motion**: springy — use `spring()` with overshoot
  (`config: { damping: 12, stiffness: 120 }`) for pops; blobby shapes wobble
  via `Math.sin`; things wiggle ±2 deg on hold.
- **Captions**: keywords in white pill badges with the accent as text color,
  slight rotation per word.
- **Mockups**: PhoneFrame hero front and center; emoji as icon accents are fine.
- **Transition kit**: elements bounce out and in with spring timing on the
  persistent pastel backdrop (cards squash away, blobs wobble as new content
  pops in); a single soft switch pop on the hero card entrance; if a
  `FloatingHero` phone is used, it stars in max two scenes and bounces
  corners with ±10° rotation.
- **Music prompt**: `"feel-good indie pop, bouncy bassline, bright marimba and
  ukulele accents, claps and finger snaps at 112 BPM, cheerful whistling hook,
  sunny advert energy, crisp modern production, instrumental"`.
- Best for: consumer/mobile apps, onboarding, education.

---

## Format adjustments

- **9:16 (1080×1920)**: stack vertically — headline top third, mockup middle,
  captions lower third. PhoneFrame at 55–65 % of width. Text sizes as at 1080
  wide. Safe areas: ≥ 120 px top/bottom (platform UI overlays chrome there).
- **1:1 (1080×1080)**: center-weighted single-column layouts; browser mockups
  at ~85 % width; trim headline lengths.
- **16:9 (1920×1080)**: scale text up (~1.5× the 1080-wide minimums); side-by-side
  is allowed (text left, mockup right) but never more than two zones.
