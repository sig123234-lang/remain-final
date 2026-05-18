import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 어르신 preferences (talk preferences) 의 voice 옵션 → OpenAI TTS voice 매핑.
// OpenAI voices: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer
// 한국어 자연도는 nova/shimmer (여성), onyx (남성) 가 가장 안정적.
const VOICE_MAP: Record<string, string> = {
  "warm-female": "nova",
  "calm-male": "onyx",
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
      // OpenAI SDK 의 voice 타입이 좁아 string 인 채로 넘긴다.
      voice: openaiVoice as
        | "alloy"
        | "echo"
        | "fable"
        | "onyx"
        | "nova"
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
