import OpenAI from "openai";

import { REMAIN_CHAT_MODEL } from "@/lib/ai-config";
import { INTERVIEWER_SYSTEM_PROMPT_V8 } from "@/lib/ai-prompts";
import type { ChatCompletionPayload } from "@/types/session";

// 현재 프런트엔드 ChatCompletionPayload 와 호환되는 JSON 출력 강제.
// v8 프롬프트의 출력 형식 섹션은 풍부한 스키마지만, frontend 가 아직
// recommendations 배열 형태를 쓰므로 transition 단계에서는 둘을 동시에
// 만족시키는 호환 schema 를 시스템 메시지로 한 번 더 못박는다.
const OUTPUT_FORMAT_OVERRIDE = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
현재 클라이언트 호환 출력 형식 (이 형식만 사용)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

위 "출력 형식" 섹션은 무시하고 반드시 아래 JSON 객체 하나만 출력한다.
필드 이름·타입을 절대 바꾸지 마라. recommendations 는 3개 채운다.

{
  "speech": "어르신에게 말할 실제 문장 (반드시 꼬리 포함)",
  "tts_text": "TTS 최적화 문장",
  "depthLevel": 1,
  "emotionDetected": "nostalgic",
  "riskLevel": "low",
  "action": "deepen|continue|branch|soften|transition|listen|cooldown|end|stop_and_handoff",
  "responsePattern": "A",
  "questionType": "F|P|S|E|C|V",
  "tailType": "depth|transition|shift",
  "facilitatorNote": "진행자 참고 메모",
  "sessionSummaryUpdate": "짧은 누적 요약",
  "turnSummary": "이번 턴 요약",
  "recommendations": [
    {
      "question": "진행자가 다음 턴에 사용할 수 있는 대안 질문",
      "rationale": "왜 이 질문이 좋은지 (절대 규칙 위반 없게)",
      "targetEmotion": "안정감|그리움|호기심|...",
      "targetDepth": 2,
      "targetMemory": "관련 기억 키워드",
      "riskFlag": "low|medium|high"
    }
  ]
}
`;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messages =
      body.messages || [];
    const sessionState =
      body.sessionState || {};

    console.log(
      "받은 대화:",
      messages
    );

    const completion =
      await openai.chat.completions.create({
        model: REMAIN_CHAT_MODEL,

        response_format: {
          type: "json_object",
        },

        messages: [
          {
            // 회상치료_실행_프롬프트_v8.md 전문. 절대 규칙·핵심 규칙·예시 모두 포함.
            // 마지막 출력 형식 섹션은 OUTPUT_FORMAT_OVERRIDE 가 클라이언트 호환
            // 스키마로 덮어쓴다.
            role: "system",
            content:
              INTERVIEWER_SYSTEM_PROMPT_V8,
          },
          {
            role: "system",
            content: OUTPUT_FORMAT_OVERRIDE,
          },
          {
            role: "system",
            content: `현재 sessionState (외부 엔진이 계산. 읽기만 하고 갱신하지 마라):\n${JSON.stringify(sessionState)}`,
          },

          ...messages,
        ],

        temperature: 0.7,
        // JSON 응답이 (speech + tts_text + 메타데이터 + 추천 3개)를 모두 담아야 한다.
        // 300으로는 항상 잘려 SyntaxError 가 발생하던 문제 → 1200 으로 상향.
        max_tokens: 1200,
      });

    const choice = completion.choices[0];
    const raw = choice?.message?.content || "{}";
    const finishReason = choice?.finish_reason;

    console.log("RAW AI 응답:", raw);

    if (finishReason === "length") {
      // OpenAI 출력이 잘렸음 → JSON 파싱이 깨지므로 명시적으로 실패시킨다.
      throw new Error(
        `OpenAI response truncated (finish_reason=length, length=${raw.length})`
      );
    }

    const parsed =
      JSON.parse(raw) as Partial<ChatCompletionPayload>;

    const normalized: ChatCompletionPayload = {
      speech:
        parsed.speech ||
        "이야기를 조금 더 들려주세요.",
      tts_text:
        parsed.tts_text ||
        parsed.speech ||
        "이야기를 조금 더 들려주세요.",
      depthLevel:
        parsed.depthLevel || 1,
      emotionDetected:
        parsed.emotionDetected ||
        "neutral",
      riskLevel:
        parsed.riskLevel || "low",
      action:
        parsed.action || "continue",
      responsePattern:
        parsed.responsePattern || "A",
      questionType:
        parsed.questionType || "P",
      tailType:
        parsed.tailType || "depth",
      facilitatorNote:
        parsed.facilitatorNote || "",
      sessionSummaryUpdate:
        parsed.sessionSummaryUpdate ||
        "",
      turnSummary:
        parsed.turnSummary || "",
      recommendations: Array.isArray(
        parsed.recommendations
      )
        ? parsed.recommendations
            .slice(0, 3)
            .map(
              (
                recommendation,
                index
              ) => ({
                question:
                  recommendation.question ||
                  `추천 질문 ${index + 1}`,
                rationale:
                  recommendation.rationale ||
                  "직전 회상 흐름을 자연스럽게 잇기 위한 질문",
                targetEmotion:
                  recommendation.targetEmotion ||
                  "안정감",
                targetDepth:
                  recommendation.targetDepth ||
                  1,
                targetMemory:
                  recommendation.targetMemory ||
                  "최근 회상 기억",
                riskFlag:
                  recommendation.riskFlag ||
                  "low",
              })
            )
        : [],
    };

    return Response.json(normalized);
  } catch (error) {
    console.error(
      "AI 응답 생성 실패:",
      error
    );

    return Response.json(
      {
        speech:
          "잠시 연결이 불안정해요. 다시 이야기해볼까요?",

        tts_text:
          "잠시 연결이 불안정해요. 다시 이야기해볼까요?",

        depthLevel: 1,

        emotionDetected:
          "neutral",

        riskLevel: "low",

        action: "soften",

        responsePattern: "A",

        questionType: "C",

        tailType: "transition",

        facilitatorNote:
          "오류 fallback",

        sessionSummaryUpdate: "",

        turnSummary:
          "오류 발생",

        recommendations: [],
      },
      {
        status: 500,
      }
    );
  }
}
