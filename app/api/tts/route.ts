import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 어르신 preferences (talk preferences) 의 voice 옵션 → OpenAI TTS voice 매핑.
// OpenAI voices: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer
// - shimmer: 가장 밝고 경쾌한 여성 톤 (요양 어르신 환영하는 분위기에 적합)
// - coral: 따뜻하면서 친근한 여성 톤 (백업 옵션)
// - sage: 차분하지만 또렷한 남성 톤
const VOICE_MAP: Record<string, string> = {
  "warm-female": "shimmer",
  "calm-male": "sage",
};

const ALLOWED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
]);

export async function POST(req: Request) {
  let body: { text?: unknown; voice?: unknown };
  try {
    body = (await req.json()) as {
      text?: unknown;
      voice?: unknown;
    };
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid json" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const text =
    typeof body.text === "string"
      ? body.text.trim()
      : "";
  if (!text) {
    return new Response(
      JSON.stringify({
        error: "text is required",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  if (text.length > 1000) {
    return new Response(
      JSON.stringify({
        error: "text too long (max 1000 chars)",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const voiceInput =
    typeof body.voice === "string"
      ? body.voice
      : "warm-female";
  const openaiVoice = ALLOWED_VOICES.has(voiceInput)
    ? voiceInput
    : VOICE_MAP[voiceInput] || "nova";

  try {
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      // OpenAI SDK 의 voice 타입이 좁게 정의돼 있어 명시 cast.
      voice: openaiVoice as
        | "alloy"
        | "ash"
        | "ballad"
        | "coral"
        | "echo"
        | "fable"
        | "onyx"
        | "nova"
        | "sage"
        | "shimmer",
      input: text,
      response_format: "mp3",
      speed: 1.0,
    });

    const audioBuffer = Buffer.from(
      await speech.arrayBuffer()
    );

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(
          audioBuffer.byteLength
        ),
        // 같은 text+voice 는 같은 mp3. CDN 캐시 활용해서 첫 질문 등은 즉시 응답.
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch (error) {
    console.error(
      "OpenAI TTS 호출 실패:",
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "TTS 생성에 실패했습니다.";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
