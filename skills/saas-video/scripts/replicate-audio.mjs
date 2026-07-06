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
 *       files into the configured output directory.
 *
 * Auth: REPLICATE_API_TOKEN from the environment, or a .env file in the
 * current directory or one directory up.
 *
 * Config format:
 * {
 *   "outputDir": "public/audio",
 *   "clips": [
 *     { "id": "scene-01", "model": "google/gemini-3.1-flash-tts",
 *       "input": { "text": "Meet Acme — the fastest way to ship.", "voice": "Sulafat" } },
 *     { "id": "music", "model": "google/lyria-2",
 *       "input": { "prompt": "uplifting modern electronic, warm synths, instrumental",
 *                  "negative_prompt": "vocals, singing" } }
 *   ]
 * }
 *
 * The "input" object is passed to the Replicate API verbatim, so it must
 * match the schema reported by the `schema` command.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const API = "https://api.replicate.com/v1";

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

const generate = async (configPath, onlyIds) => {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const outputDir = config.outputDir ?? "public/audio";
  mkdirSync(outputDir, { recursive: true });

  const clips = onlyIds.length
    ? config.clips.filter((clip) => onlyIds.includes(clip.id))
    : config.clips;
  if (!clips.length) die(`no matching clips in ${configPath}`);

  const results = [];
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
    const seconds = probeSeconds(file);
    process.stderr.write(`ok -> ${file}${seconds ? ` (${seconds}s)` : ""}\n`);
    results.push({ id: clip.id, file, seconds });
  }
  console.log(JSON.stringify(results, null, 2));
};

const [command, ...rest] = process.argv.slice(2);
if (command === "schema" && rest[0]) {
  await showSchema(rest[0]);
} else if (command === "generate" && rest[0]) {
  await generate(rest[0], rest.slice(1));
} else {
  console.error(
    "usage:\n" +
      "  node replicate-audio.mjs schema <owner/model>\n" +
      "  node replicate-audio.mjs generate <config.json> [clipId ...]",
  );
  process.exit(1);
}
