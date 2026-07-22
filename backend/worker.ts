// @ts-expect-error Wrangler bundles HTML imports as text modules.
import HOME_PAGE from "../frontend/index.html";
// @ts-expect-error Wrangler bundles MP3 imports as data modules.
import COMMUTE_AUDIO from "./audio/commute.mp3";
// @ts-expect-error Wrangler bundles MP3 imports as data modules.
import INTERVIEW_AUDIO from "./audio/interview.mp3";
// @ts-expect-error Wrangler bundles MP3 imports as data modules.
import INTRO_AUDIO from "./audio/intro.mp3";

interface Env {
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
}

interface SongResult {
  artistName?: string;
  previewUrl?: string;
  trackName?: string;
}

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

const FREE_PLAN_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const CACHED_AUDIO: Record<SegmentType, ArrayBuffer> = {
  commute: COMMUTE_AUDIO,
  interview: INTERVIEW_AUDIO,
  intro: INTRO_AUDIO,
};

const pageHeaders = {
  "cache-control": "no-store",
  "content-security-policy":
    "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src 'self' blob: https://*.itunes.apple.com; connect-src 'self'; img-src data:",
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
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

function cachedSpeechResponse(
  type: SegmentType,
  script: string,
): Response {
  return new Response(CACHED_AUDIO[type].slice(0), {
    headers: {
      "cache-control": "no-store",
      "content-type": "audio/mpeg",
      "x-content-type-options": "nosniff",
      "x-dj-script": encodeURIComponent(script),
      "x-dj-title": encodeURIComponent(SEGMENTS[type].title),
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
      ? body.type
      : undefined;

  if (!isSegmentType(type)) {
    return jsonError("Unknown radio segment.", 400);
  }

  const script = SEGMENTS[type].script;

  if (!env.ELEVENLABS_API_KEY) {
    console.warn("ELEVENLABS_API_KEY is not configured; using cached speech");
    return cachedSpeechResponse(type, script);
  }

  const voiceId = env.ELEVENLABS_VOICE_ID || "fq1SdXsX6OokE10pJ4Xw";

  try {
    let activeVoiceId = voiceId;
    let ttsResponse: Response;

    try {
      ttsResponse = await requestElevenLabsVoice(
        voiceId,
        script,
        env.ELEVENLABS_API_KEY,
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
        env.ELEVENLABS_API_KEY,
      );
    }

    return new Response(ttsResponse.body, {
      headers: {
        "cache-control": "no-store",
        "content-type": "audio/mpeg",
        "x-content-type-options": "nosniff",
        "x-dj-script": encodeURIComponent(script),
        "x-dj-title": encodeURIComponent(SEGMENTS[type].title),
        "x-elevenlabs-voice-id": activeVoiceId,
        "x-voice-provider": "elevenlabs",
      },
    });
  } catch (error) {
    console.error("ElevenLabs speech generation failed; using cached speech", error);
    return cachedSpeechResponse(type, script);
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

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(HOME_PAGE, { headers: pageHeaders });
    }

    if (url.pathname === "/api/song" && request.method === "GET") {
      return getSongPreview();
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

    return new Response("Not Found", { status: 404 });
  },
};
