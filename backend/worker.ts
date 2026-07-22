// @ts-expect-error Wrangler bundles MP3 imports as data modules.
import COMMUTE_AUDIO from "./audio/commute.mp3";
// @ts-expect-error Wrangler bundles MP3 imports as data modules.
import INTERVIEW_AUDIO from "./audio/interview.mp3";
// @ts-expect-error Wrangler bundles MP3 imports as data modules.
import INTRO_AUDIO from "./audio/intro.mp3";

// --- minimal binding types (avoids pulling in @cloudflare/workers-types) ---
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
interface WorkersAI {
  run(
    model: string,
    input: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<{ response?: string }>;
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  AI?: WorkersAI;
  DB?: D1Database;
  AI_GATEWAY_ID?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
}

interface Listener {
  id?: string;
  name?: string;
  location?: string;
  topics?: string[];
  taste?: string;
}

interface SongResult {
  artistName?: string;
  previewUrl?: string;
  trackName?: string;
}

// Canned scripts + titles used as a fallback (and to match the pre-recorded
// audio when no ElevenLabs key is configured).
const SEGMENTS = {
  intro: {
    title: "Morning kickoff | Roy Ayers",
    script:
      "Let's kick off the morning with a great song by Roy Ayers. This is Everybody Loves the Sunshine on 1111 FM.",
  },
  commute: {
    title: "Travel update | Elizabeth line",
    script:
      "Quick commute heads-up: the Elizabeth line is running with minor delays while engineers finish planned track work. Give yourself an extra ten minutes this morning, and we will keep the sunshine going while you travel.",
  },
  interview: {
    title: "Inbox update | Cloudflare",
    script:
      "And yes, you read that email right: Cloudflare says you have made it through to the next stage of the interview process. Huge congratulations from 1111 FM; now let us get back to the sunshine.",
  },
} as const;

type SegmentType = keyof typeof SEGMENTS;

// What each segment should be about — the LLM personalizes the wording.
const SEGMENT_BRIEF: Record<SegmentType, string> = {
  intro:
    "Welcome the listener to 1111.fm by name and introduce the first track, 'Everybody Loves the Sunshine' by Roy Ayers Ubiquity. Warm morning energy.",
  commute:
    "Give a short, specific commute/traffic heads-up for the listener's city. Practical, upbeat, reassuring.",
  interview:
    "Share a fun, personal piece of good news as if it just landed in the listener's inbox. Celebratory but brief.",
};

const DJ_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const FREE_PLAN_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

const CACHED_AUDIO: Record<SegmentType, ArrayBuffer> = {
  commute: COMMUTE_AUDIO,
  interview: INTERVIEW_AUDIO,
  intro: INTRO_AUDIO,
};

function jsonError(message: string, status: number): Response {
  return Response.json(
    { error: message },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function isSegmentType(value: unknown): value is SegmentType {
  return typeof value === "string" && value in SEGMENTS;
}

function titleFor(type: SegmentType, listener: Listener): string {
  const location = listener.location?.trim();
  const name = listener.name?.trim();
  if (type === "commute") return `Travel update · ${location || "your area"}`;
  if (type === "interview") return "Inbox update";
  return name ? `Morning kickoff · ${name}` : SEGMENTS.intro.title;
}

/** Workers AI writes the DJ line from the listener profile (via AI Gateway if set). */
async function generateScript(
  env: Env,
  type: SegmentType,
  listener: Listener,
): Promise<string | null> {
  if (!env.AI) return null;

  const name = listener.name?.trim() || "there";
  const location = listener.location?.trim() || "your area";
  const taste = listener.taste?.trim() || "feel-good";
  const topics = (listener.topics ?? []).join(", ") || "general news";

  const system =
    "You are the live AI DJ for 1111.fm, a personal radio station. Write exactly what the DJ says OUT LOUD: warm, energetic, conversational. Two to three sentences, under 55 words. No emojis, no markdown, no stage directions, no surrounding quotation marks.";
  const user =
    `Listener: ${name}, in ${location}. Music taste: ${taste}. Interested in: ${topics}.\n` +
    `Segment brief: ${SEGMENT_BRIEF[type]}`;

  try {
    const out = await env.AI.run(
      DJ_MODEL,
      {
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 180,
        temperature: 0.7,
      },
      env.AI_GATEWAY_ID ? { gateway: { id: env.AI_GATEWAY_ID } } : undefined,
    );
    const text = out?.response?.toString().trim();
    return text ? text.replace(/^["']|["']$/g, "") : null;
  } catch (error) {
    console.warn("Workers AI script generation failed", error);
    return null;
  }
}

/** Best-effort append to the D1 play log. */
async function logSegment(
  env: Env,
  listener: Listener,
  type: SegmentType,
  title: string,
  script: string,
): Promise<void> {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      "INSERT INTO segments_log (listener_id, type, title, script, created_at) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(listener.id || "guest", type, title, script, new Date().toISOString())
      .run();
  } catch (error) {
    console.warn("D1 segment log failed", error);
  }
}

function cachedSpeechResponse(
  type: SegmentType,
  script: string,
  title: string,
): Response {
  return new Response(CACHED_AUDIO[type].slice(0), {
    headers: {
      "cache-control": "no-store",
      "content-type": "audio/mpeg",
      "x-content-type-options": "nosniff",
      "x-dj-script": encodeURIComponent(script),
      "x-dj-title": encodeURIComponent(title),
      "x-elevenlabs-voice-id": FREE_PLAN_VOICE_ID,
      "x-voice-provider": "elevenlabs-cached",
    },
  });
}

async function requestElevenLabsVoice(
  voiceId: string,
  script: string,
  apiKey: string,
): Promise<Response> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: {
        accept: "audio/mpeg",
        "content-type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.8,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
    },
  );

  if (!response.ok || !response.body) {
    const details = await response.text();
    throw new Error(`ElevenLabs failed (${response.status}): ${details}`);
  }

  return response;
}

async function generateSegment(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Send a JSON body containing a segment type.", 400);
  }

  const type =
    typeof body === "object" && body !== null && "type" in body
      ? (body as { type?: unknown }).type
      : undefined;

  if (!isSegmentType(type)) {
    return jsonError("Unknown radio segment.", 400);
  }

  const listener: Listener =
    typeof body === "object" &&
    body !== null &&
    "listener" in body &&
    typeof (body as { listener?: unknown }).listener === "object" &&
    (body as { listener?: unknown }).listener !== null
      ? ((body as { listener: Listener }).listener)
      : {};

  const useTTS = Boolean(env.ELEVENLABS_API_KEY);

  // Only ask the LLM for a fresh script when we can actually voice it — that
  // keeps the pre-recorded fallback audio in sync with its caption.
  const script = useTTS
    ? (await generateScript(env, type, listener)) ?? SEGMENTS[type].script
    : SEGMENTS[type].script;
  const title = useTTS ? titleFor(type, listener) : SEGMENTS[type].title;

  await logSegment(env, listener, type, title, script);

  if (!useTTS) {
    console.warn("ELEVENLABS_API_KEY is not configured; using cached speech");
    return cachedSpeechResponse(type, script, title);
  }

  const voiceId = env.ELEVENLABS_VOICE_ID || FREE_PLAN_VOICE_ID;

  try {
    let activeVoiceId = voiceId;
    let ttsResponse: Response;

    try {
      ttsResponse = await requestElevenLabsVoice(
        voiceId,
        script,
        env.ELEVENLABS_API_KEY as string,
      );
    } catch (error) {
      if (voiceId === FREE_PLAN_VOICE_ID) throw error;
      console.warn(
        "Preferred ElevenLabs voice unavailable; using free-plan voice",
        error,
      );
      activeVoiceId = FREE_PLAN_VOICE_ID;
      ttsResponse = await requestElevenLabsVoice(
        FREE_PLAN_VOICE_ID,
        script,
        env.ELEVENLABS_API_KEY as string,
      );
    }

    return new Response(ttsResponse.body, {
      headers: {
        "cache-control": "no-store",
        "content-type": "audio/mpeg",
        "x-content-type-options": "nosniff",
        "x-dj-script": encodeURIComponent(script),
        "x-dj-title": encodeURIComponent(title),
        "x-elevenlabs-voice-id": activeVoiceId,
        "x-voice-provider": "elevenlabs",
      },
    });
  } catch (error) {
    console.error(
      "ElevenLabs speech generation failed; using cached speech",
      error,
    );
    // Fall back to the pre-recorded clip with its matching canned caption.
    return cachedSpeechResponse(type, SEGMENTS[type].script, SEGMENTS[type].title);
  }
}

async function putProfile(request: Request, env: Env): Promise<Response> {
  let body: Listener;
  try {
    body = (await request.json()) as Listener;
  } catch {
    return jsonError("Send a JSON profile body.", 400);
  }
  if (!env.DB) return Response.json({ ok: true, stored: false });

  try {
    await env.DB.prepare(
      `INSERT INTO listeners (id, name, location, topics, taste, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         location = excluded.location,
         topics = excluded.topics,
         taste = excluded.taste,
         updated_at = excluded.updated_at`,
    )
      .bind(
        body.id || "guest",
        body.name || "",
        body.location || "",
        JSON.stringify(body.topics ?? []),
        body.taste || "",
        new Date().toISOString(),
      )
      .run();
    return Response.json({ ok: true, stored: true });
  } catch (error) {
    console.warn("D1 profile upsert failed", error);
    return Response.json({ ok: false, stored: false });
  }
}

async function getProfile(url: URL, env: Env): Promise<Response> {
  if (!env.DB) return Response.json({ profile: null });
  const id = url.searchParams.get("id") || "guest";
  try {
    const row = await env.DB.prepare(
      "SELECT id, name, location, topics, taste, updated_at FROM listeners WHERE id = ?",
    )
      .bind(id)
      .first<Record<string, unknown>>();
    const profile = row
      ? { ...row, topics: JSON.parse((row.topics as string) || "[]") }
      : null;
    return Response.json({ profile });
  } catch (error) {
    console.warn("D1 profile read failed", error);
    return Response.json({ profile: null });
  }
}

async function getSongPreview(): Promise<Response> {
  const searchUrl = new URL("https://itunes.apple.com/search");
  searchUrl.searchParams.set(
    "term",
    "Everybody Loves the Sunshine Roy Ayers Ubiquity",
  );
  searchUrl.searchParams.set("entity", "song");
  searchUrl.searchParams.set("country", "GB");
  searchUrl.searchParams.set("limit", "10");

  try {
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      throw new Error(`Apple Music search failed (${searchResponse.status})`);
    }

    const payload = (await searchResponse.json()) as { results?: SongResult[] };
    const song = payload.results?.find(
      (result) =>
        result.trackName?.toLowerCase() === "everybody loves the sunshine" &&
        result.artistName?.toLowerCase() === "roy ayers ubiquity" &&
        result.previewUrl,
    );

    if (!song?.previewUrl) {
      throw new Error("The requested song preview was not found.");
    }

    const previewUrl = new URL(song.previewUrl);
    if (
      previewUrl.protocol !== "https:" ||
      !previewUrl.hostname.endsWith(".itunes.apple.com")
    ) {
      throw new Error("Apple returned an invalid preview URL.");
    }

    return new Response(null, {
      status: 302,
      headers: {
        "cache-control": "public, max-age=3600",
        location: previewUrl.toString(),
      },
    });
  } catch (error) {
    console.error("Song preview lookup failed", error);
    return jsonError("The song preview is temporarily unavailable.", 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/song" && request.method === "GET") {
      return getSongPreview();
    }

    if (url.pathname === "/api/profile") {
      if (request.method === "GET") return getProfile(url, env);
      if (request.method === "PUT" || request.method === "POST") {
        return putProfile(request, env);
      }
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: "GET, PUT" },
      });
    }

    if (url.pathname === "/api/generate-segment") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { allow: "POST" },
        });
      }
      return generateSegment(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
