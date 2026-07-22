#!/usr/bin/env node
/**
 * Replicate audio generation helper for the saas-video skill.
 * Zero dependencies — requires Node 18+ (built-in fetch).
 *
 * Commands:
 *   node replicate-audio.mjs schema <owner/model>
 *       Print the model's CURRENT input schema (parameter names, defaults,
 *       allowed values such as the TTS voice list). Always run this before
 *       writing an audio config — model inputs can change over time.
 *
 *   node replicate-audio.mjs generate <config.json> [clipId ...]
 *       Generate every clip in the config (or only the named clip ids,
 *       useful for regenerating a single scene) and download the audio
 *       files into the configured output directory. Every narration clip is
 *       checked against the predicted duration afterwards — that is what
 *       catches a clip the model silently read twice.
 *
 *   node replicate-audio.mjs calibrate <config.json>
 *       Fit the two duration-model constants (charsPerSecond, pauseSeconds)
 *       from the clips already generated, and print them ready to paste into
 *       the config's "speech" field. Needs ffprobe.
 *
 *   node replicate-audio.mjs retempo <config.json> [clipId ...]
 *       Re-apply each clip's "tempo" from its preserved .raw file. Free,
 *       idempotent, reversible — no API call. Needs ffmpeg.
 *
 * Auth: REPLICATE_API_TOKEN from the environment, or a .env file in the
 * current directory or one directory up.
 *
 * Config format:
 * {
 *   "outputDir": "public/audio",
 *   "speech": { "charsPerSecond": 12, "pauseSeconds": 0.4 },
 *   "clips": [
 *     { "id": "scene-01", "model": "google/gemini-3.1-flash-tts", "tempo": 1.05,
 *       "input": { "text": "Meet Acme — the fastest way to ship.", "voice": "Sulafat" } },
 *     { "id": "music", "model": "google/lyria-2",
 *       "input": { "prompt": "uplifting modern electronic, warm synths, instrumental",
 *                  "negative_prompt": "vocals, singing" } }
 *   ]
 * }
 *
 * The "input" object is passed to the Replicate API verbatim, so it must
 * match the schema reported by the `schema` command. "speech" (optional)
 * holds the duration-model constants for this voice + language + style
 * prompt; "tempo" (optional, per clip) is applied locally with ffmpeg after
 * download and deliberately sits OUTSIDE "input" so it never counts as
 * narrator drift.
 */

import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  renameSync,
  rmSync,
  readdirSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const API = "https://api.replicate.com/v1";

// Duration model: chars / charsPerSecond + sentenceEnds * pauseSeconds.
// Word rate and pause length are independent — the TTS style prompt moves
// them separately. These defaults are deliberately mid-range (observed rates
// span roughly 8-19 chars/s depending on the style prompt); run `calibrate`
// after the first generation and paste the fitted values into the config.
const SPEECH_DEFAULTS = { charsPerSecond: 12, pauseSeconds: 0.4 };

// Loose on purpose: only catch real generation failures (a clip read twice,
// a truncated clip), never nag about ordinary prompt variation.
const LENGTH_MAX_RATIO = 1.6;
const LENGTH_MIN_RATIO = 0.5;

const die = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

const loadToken = () => {
  if (process.env.REPLICATE_API_TOKEN) {
    return process.env.REPLICATE_API_TOKEN.trim();
  }
  for (const file of [".env", path.join("..", ".env")]) {
    if (!existsSync(file)) continue;
    const match = readFileSync(file, "utf8").match(
      /^\s*(?:export\s+)?REPLICATE_API_TOKEN\s*=\s*["']?([^"'\s#]+)/m,
    );
    if (match) return match[1];
  }
  die(
    "REPLICATE_API_TOKEN is not set. Export it or add it to a .env file.\n" +
      "Get a token at https://replicate.com/account/api-tokens",
  );
};

let cachedToken;
const getToken = () => (cachedToken ??= loadToken());

const api = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `${options.method ?? "GET"} ${url} -> ${res.status}: ${body.slice(0, 500)}`,
    );
  }
  return res.json();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const showSchema = async (model) => {
  const data = await api(`${API}/models/${model}`);
  const input = data.latest_version?.openapi_schema?.components?.schemas?.Input;
  console.log(
    JSON.stringify(
      {
        model,
        description: data.description,
        input: input ?? "no schema published for this model",
      },
      null,
      2,
    ),
  );
};

// Replicate outputs vary in shape (string URL, array, or object) — find the
// first file URL wherever it is.
const firstUrl = (output) => {
  if (typeof output === "string") {
    return output.startsWith("http") ? output : null;
  }
  if (Array.isArray(output)) {
    for (const item of output) {
      const url = firstUrl(item);
      if (url) return url;
    }
  } else if (output && typeof output === "object") {
    for (const value of Object.values(output)) {
      const url = firstUrl(value);
      if (url) return url;
    }
  }
  return null;
};

const EXT_BY_TYPE = {
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/aac": "aac",
  "audio/mp4": "m4a",
};

const runPrediction = async (model, input) => {
  let prediction = await api(`${API}/models/${model}/predictions`, {
    method: "POST",
    headers: { Prefer: "wait=60" },
    body: JSON.stringify({ input }),
  });
  while (prediction.status === "starting" || prediction.status === "processing") {
    await sleep(2500);
    prediction = await api(prediction.urls.get);
  }
  if (prediction.status !== "succeeded") {
    throw new Error(
      `prediction ${prediction.id} ${prediction.status}: ${prediction.error ?? "unknown error"}`,
    );
  }
  const url = firstUrl(prediction.output);
  if (!url) {
    throw new Error(
      `no file URL in output: ${JSON.stringify(prediction.output).slice(0, 300)}`,
    );
  }
  return url;
};

const download = async (url, dir, id) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const urlExt = path.extname(new URL(url).pathname).slice(1).toLowerCase();
  const contentType = res.headers.get("content-type")?.split(";")[0] ?? "";
  const ext = urlExt || EXT_BY_TYPE[contentType] || "wav";
  const file = path.join(dir, `${id}.${ext}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
};

const probeSeconds = (file) => {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file,
      ],
      { encoding: "utf8" },
    );
    return Math.round(parseFloat(out.trim()) * 100) / 100;
  } catch {
    return null; // ffprobe not installed — Remotion measures durations itself
  }
};

const round2 = (n) => Math.round(n * 100) / 100;

const sentenceEnds = (text) => (text.match(/[.!?]+/g) ?? []).length;

const predictSeconds = (text, speech) =>
  text.length / speech.charsPerSecond + sentenceEnds(text) * speech.pauseSeconds;

// The untouched download is kept as <id>.raw.<ext> so tempo can be applied,
// changed, or undone later without paying for the clip again. Remotion only
// ever reads <id>.<ext>.
const rawPath = (file) => file.replace(/(\.[^.]+)$/, ".raw$1");

const findClipFile = (dir, id, raw = false) => {
  if (!existsSync(dir)) return null;
  const base = raw ? `${id}.raw` : id;
  for (const name of readdirSync(dir)) {
    const ext = path.extname(name);
    if (ext && name.slice(0, -ext.length) === base) return path.join(dir, name);
  }
  return null;
};

const clipTempo = (clip) => {
  if (clip.tempo === undefined || clip.tempo === null) return 1;
  // atempo is pitch-neutral and takes 0.5-2.0 per filter instance (chain them
  // for more). Narration tempo lives around 0.9-1.15, so one instance is ample.
  if (typeof clip.tempo !== "number" || !(clip.tempo >= 0.5 && clip.tempo <= 2)) {
    die(`clip "${clip.id}": "tempo" must be a number between 0.5 and 2.0`);
  }
  return clip.tempo;
};

const applyTempo = (rawFile, outFile, tempo) => {
  // Render to a temp file and swap only on success, so a failed ffmpeg run
  // never leaves a truncated clip where the finished audio used to be.
  const tmp = `${outFile}.tmp${path.extname(outFile)}`;
  try {
    execFileSync(
      "ffmpeg",
      ["-y", "-v", "error", "-i", rawFile, "-filter:a", `atempo=${tempo}`, tmp],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    renameSync(tmp, outFile);
    return true;
  } catch {
    if (existsSync(tmp)) rmSync(tmp, { force: true });
    return false; // ffmpeg missing or failed — caller keeps the untouched audio
  }
};

// Guards against silent generation failures: a clip the model read twice comes
// back ~2x too long, and because scene lengths follow the audio nothing else
// ever complains. Warns only — the clip is already paid for, and the JSON
// summary carries lengthOk so the caller can decide.
const checkLength = (id, actual, predicted) => {
  const ratio = actual / predicted;
  const detail = `${id} length ${actual}s vs ~${round2(predicted)}s predicted (${ratio.toFixed(1)}x)`;
  if (ratio > LENGTH_MAX_RATIO) {
    process.stderr.write(`warn: ${detail} — possible double read; listen or regenerate\n`);
    return false;
  }
  if (ratio < LENGTH_MIN_RATIO) {
    process.stderr.write(`warn: ${detail} — possible truncation; listen or regenerate\n`);
    return false;
  }
  return true;
};

// Narration clips (those with a "text" input) sharing a model must have
// identical inputs except "text" — a different voice or style prompt per
// scene makes the narrator audibly change between scenes. Music clips are
// exempt: several candidates with different prompts are legitimate.
const findInputDrift = (clips) => {
  const byModel = new Map();
  for (const clip of clips) {
    if (clip.input?.text === undefined) continue;
    if (!byModel.has(clip.model)) byModel.set(clip.model, []);
    byModel.get(clip.model).push(clip);
  }
  const drift = [];
  for (const [model, group] of byModel) {
    if (group.length < 2) continue;
    const keys = new Set(
      group.flatMap((clip) => Object.keys(clip.input).filter((k) => k !== "text")),
    );
    for (const key of keys) {
      const values = new Set(group.map((clip) => JSON.stringify(clip.input[key])));
      if (values.size > 1) drift.push(`${model}: "${key}" differs across clips`);
    }
  }
  return drift;
};

const generate = async (configPath, onlyIds, allowDrift) => {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const outputDir = config.outputDir ?? "public/audio";
  const speech = { ...SPEECH_DEFAULTS, ...(config.speech ?? {}) };
  mkdirSync(outputDir, { recursive: true });

  // Check the FULL config, not just the requested subset, so regenerating a
  // single clip still catches drift against its siblings.
  const drift = findInputDrift(config.clips);
  if (drift.length && !allowDrift) {
    die(
      "TTS inputs differ across clips — the narrator would sound different per scene:\n" +
        drift.map((d) => `  - ${d}`).join("\n") +
        "\nMake every input identical except \"text\", or pass --allow-input-drift.",
    );
  }

  const clips = onlyIds.length
    ? config.clips.filter((clip) => onlyIds.includes(clip.id))
    : config.clips;
  if (!clips.length) die(`no matching clips in ${configPath}`);
  clips.forEach(clipTempo); // validate every tempo before spending money

  const results = [];
  let probeNoted = false;
  for (const clip of clips) {
    process.stderr.write(`generating ${clip.id} (${clip.model})... `);
    let url;
    try {
      url = await runPrediction(clip.model, clip.input);
    } catch (err) {
      process.stderr.write(`\n  retrying after error: ${err.message}\n  `);
      await sleep(5000);
      url = await runPrediction(clip.model, clip.input);
    }
    const file = await download(url, outputDir, clip.id);
    const raw = rawPath(file);
    copyFileSync(file, raw);
    const rawSeconds = probeSeconds(raw);
    process.stderr.write(`ok -> ${file}${rawSeconds ? ` (${rawSeconds}s)` : ""}\n`);

    const result = { id: clip.id, file, seconds: rawSeconds };
    // Check the RAW duration: the model predicts what the TTS emitted, and
    // tempo is our own deterministic post-step.
    if (clip.input?.text !== undefined) {
      if (rawSeconds === null) {
        if (!probeNoted) {
          process.stderr.write("note: ffprobe not found — skipping length checks\n");
          probeNoted = true;
        }
      } else {
        const predicted = predictSeconds(clip.input.text, speech);
        result.predictedSeconds = round2(predicted);
        result.lengthOk = checkLength(clip.id, rawSeconds, predicted);
      }
    }

    const tempo = clipTempo(clip);
    if (tempo !== 1) {
      if (applyTempo(raw, file, tempo)) {
        result.tempo = tempo;
        result.rawSeconds = rawSeconds;
        result.seconds = probeSeconds(file) ?? rawSeconds;
        process.stderr.write(
          `  ${clip.id} tempo ${tempo}: ${rawSeconds}s -> ${result.seconds}s\n`,
        );
      } else {
        process.stderr.write(
          `warn: ${clip.id} tempo ${tempo} not applied — ffmpeg not found; raw kept, run retempo later\n`,
        );
      }
    }
    results.push(result);
  }
  console.log(JSON.stringify(results, null, 2));
};

// Re-derive every clip's audio from its .raw original at the config's current
// tempo. Always reads the raw file, so running it twice changes nothing and
// deleting "tempo" restores the untouched clip.
const retempo = (configPath, onlyIds) => {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const outputDir = config.outputDir ?? "public/audio";
  const clips = onlyIds.length
    ? config.clips.filter((clip) => onlyIds.includes(clip.id))
    : config.clips;
  if (!clips.length) die(`no matching clips in ${configPath}`);

  const results = [];
  for (const clip of clips) {
    const raw = findClipFile(outputDir, clip.id, true);
    if (!raw) {
      process.stderr.write(`skip ${clip.id}: no raw file (regenerate to create one)\n`);
      continue;
    }
    const file = raw.replace(/\.raw(\.[^.]+)$/, "$1");
    const tempo = clipTempo(clip);
    if (tempo === 1) {
      copyFileSync(raw, file);
      process.stderr.write(`${clip.id} tempo 1: restored original\n`);
    } else if (applyTempo(raw, file, tempo)) {
      process.stderr.write(
        `${clip.id} tempo ${tempo}: ${probeSeconds(raw)}s -> ${probeSeconds(file)}s\n`,
      );
    } else {
      die(`ffmpeg is required to apply tempo (clip "${clip.id}")`);
    }
    results.push({
      id: clip.id,
      file,
      tempo,
      seconds: probeSeconds(file),
      rawSeconds: probeSeconds(raw),
    });
  }
  console.log(JSON.stringify(results, null, 2));
};

// Least-squares fit of duration ~ a*chars + p*sentenceEnds over the clips
// already on disk. The constants belong to ONE voice + language + style
// prompt combination — refit whenever any of those change.
const calibrate = (configPath) => {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const outputDir = config.outputDir ?? "public/audio";
  const rows = [];
  for (const clip of config.clips) {
    const text = clip.input?.text;
    if (text === undefined) continue; // music clips carry no text
    const file =
      findClipFile(outputDir, clip.id, true) ?? findClipFile(outputDir, clip.id);
    if (!file) {
      process.stderr.write(`skip ${clip.id}: no audio file\n`);
      continue;
    }
    const actual = probeSeconds(file);
    if (actual === null) die("ffprobe is required for calibrate — install ffmpeg");
    rows.push({ id: clip.id, chars: text.length, sentenceEnds: sentenceEnds(text), actual });
  }
  if (rows.length < 3) die("need >= 3 generated narration clips to calibrate");

  let cc = 0, cs = 0, ss = 0, cd = 0, sd = 0;
  for (const r of rows) {
    cc += r.chars * r.chars;
    cs += r.chars * r.sentenceEnds;
    ss += r.sentenceEnds * r.sentenceEnds;
    cd += r.chars * r.actual;
    sd += r.sentenceEnds * r.actual;
  }
  const det = cc * ss - cs * cs;
  let a, pause, note;
  if (Math.abs(det) < 1e-9) {
    // Sentence-end counts carry no independent information (all equal, or
    // exactly proportional to length) — fit the rate only.
    a = cd / cc;
    pause = SPEECH_DEFAULTS.pauseSeconds;
    note =
      "sentence-end counts too uniform to identify the pause term — pauseSeconds left at the default; vary sentence counts across clips and re-run";
  } else {
    a = (ss * cd - cs * sd) / det;
    pause = (cc * sd - cs * cd) / det;
  }
  const charsPerSecond = 1 / a;
  if (pause < 0 || !(charsPerSecond >= 5 && charsPerSecond <= 30)) {
    process.stderr.write(
      "warn: ill-conditioned fit — clip texts are too similar; vary sentence counts and lengths, and check the residuals below\n",
    );
  }

  const speech = { charsPerSecond: round2(charsPerSecond), pauseSeconds: round2(pause) };
  console.log(
    JSON.stringify(
      {
        speech,
        clips: rows.map((r) => {
          const fitted = r.chars * a + r.sentenceEnds * pause;
          return { ...r, fitted: round2(fitted), residual: round2(r.actual - fitted) };
        }),
        note:
          note ??
          'paste "speech" into the config to tighten generate\'s length check; a large residual means a bad clip — regenerate it and re-run calibrate',
      },
      null,
      2,
    ),
  );
};

const [command, ...rest] = process.argv.slice(2);
const flags = rest.filter((arg) => arg.startsWith("--"));
const args = rest.filter((arg) => !arg.startsWith("--"));
if (command === "schema" && args[0]) {
  await showSchema(args[0]);
} else if (command === "generate" && args[0]) {
  await generate(args[0], args.slice(1), flags.includes("--allow-input-drift"));
} else if (command === "calibrate" && args[0]) {
  calibrate(args[0]);
} else if (command === "retempo" && args[0]) {
  retempo(args[0], args.slice(1));
} else {
  console.error(
    "usage:\n" +
      "  node replicate-audio.mjs schema <owner/model>\n" +
      "  node replicate-audio.mjs generate <config.json> [clipId ...] [--allow-input-drift]\n" +
      "  node replicate-audio.mjs calibrate <config.json>\n" +
      "  node replicate-audio.mjs retempo <config.json> [clipId ...]",
  );
  process.exit(1);
}
