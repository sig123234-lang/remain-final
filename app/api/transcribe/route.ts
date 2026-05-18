import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Whisper 의 `prompt` 파라미터는 인식 도메인을 잡아줘서 인식률을 끌어올린다.
 * 회상치료 세션에서 자주 등장하는 한국어 어휘 + 노인이 자주 쓰는 표현/사투리
 * 단서를 주면 다음 같은 효과가 있다:
 * - 발음이 뭉개진 어휘를 도메인 단어로 정정
 * - 사투리/말줄임을 표준어 단어로 매핑
 * - 인명/지명 같은 고유명사 유지
 *
 * 너무 길면 효과가 흐려지므로 ~500자 안에서 자주 등장하는 단어만 나열.
 */
const WHISPER_KO_PROMPT = [
  "한국 노인의 회상 인터뷰 음성입니다.",
  "발음이 부정확하거나 사투리(경상도, 전라도, 충청도, 강원도)가 섞일 수 있고, 가끔 말을 더듬으십니다.",
  "자주 등장하는 단어: 어르신, 어머니, 아버지, 할머니, 할아버지, 형, 누나, 언니, 동생, 손주, 자식, 시집, 장가, 결혼, 환갑, 시댁, 친정.",
  "어린 시절, 초등학교, 중학교, 고등학교, 군대, 직장, 농사, 시장, 동네, 고향, 시골, 도시, 서울, 부산, 대구, 광주, 인천, 대전, 울산.",
  "음식: 김치, 된장찌개, 청국장, 호떡, 떡볶이, 국수, 만두, 김밥, 콩나물, 시래기, 누룽지, 미역국, 떡국, 잡채.",
  "감정 표현: 그리워, 보고싶다, 아쉽다, 안타깝다, 다행이다, 행복했다, 힘들었다, 기뻤다, 슬펐다, 외로웠다.",
].join(" ");

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "multipart/form-data required" },
      { status: 400 }
    );
  }

  const audio = formData.get("audio");
  if (
    !audio ||
    !(audio instanceof Blob) ||
    audio.size === 0
  ) {
    return NextResponse.json(
      { error: "audio blob required" },
      { status: 400 }
    );
  }

  // 파일 크기 가드 — Whisper 한도는 25MB. 우리 어르신 발화 1턴은 보통 <500KB.
  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      {
        error:
          "audio too large (max 25MB)",
      },
      { status: 413 }
    );
  }

  // MediaRecorder 가 만든 blob 의 type 이 'audio/webm;codecs=opus' 같은 형태인데
  // OpenAI SDK 의 File 은 확장자를 보고 컨테이너를 추정한다. 명시적으로 .webm
  // (또는 type 에서 추출한 mime) 으로 잡아준다.
  const mime = audio.type || "audio/webm";
  const ext = mime.includes("mp4")
    ? "mp4"
    : mime.includes("mpeg")
      ? "mp3"
      : mime.includes("wav")
        ? "wav"
        : mime.includes("ogg")
          ? "ogg"
          : "webm";
  const filename = `utterance.${ext}`;
  // FormData 의 audio 는 Blob 인데 OpenAI SDK 는 file-like (File 또는 toFile) 를 받는다.
  const file = new File([audio], filename, {
    type: mime,
  });

  try {
    const transcription =
      await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: "ko",
        prompt: WHISPER_KO_PROMPT,
        temperature: 0.2,
      });

    const text = (
      transcription.text || ""
    ).trim();
    return NextResponse.json({
      data: { text },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "transcription failed";
    console.error(
      "Whisper transcribe error:",
      error
    );
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
