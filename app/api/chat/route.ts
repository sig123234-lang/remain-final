import OpenAI from "openai";

import { agentDebugLog } from "@/lib/agent-debug-log";
import type { ChatCompletionPayload } from "@/types/session";

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
        model: "gpt-4o-mini",

        response_format: {
          type: "json_object",
        },

        messages: [
          {
            role: "system",

            content: `
당신은 remAIn의 회상치료 AI 인터뷰어입니다.

반드시 JSON만 출력하세요.

절대 규칙:
- 반드시 직전 어르신 답변을 이어서 반응하세요.
- 질문은 한 번에 하나만.
- 짧고 따뜻하게.
- 같은 질문 반복 금지.
- 어르신 감정을 AI가 멋대로 해석 금지.
- 희망편향 금지.
- 반드시 꼬리 질문 포함.
- "천천히 이야기 이어가볼까요?" 같은 fallback 금지.

반드시 아래 JSON 형식만 출력하세요.

{
  "speech": "어르신에게 말할 실제 문장",
  "tts_text": "TTS용 문장",
  "depthLevel": 1,
  "emotionDetected": "nostalgic",
  "riskLevel": "low",
  "action": "continue",
  "responsePattern": "A",
  "questionType": "P",
  "tailType": "depth",
  "facilitatorNote": "진행자 참고 메모",
  "sessionSummaryUpdate": "짧은 요약",
  "turnSummary": "현재 턴 요약",
  "recommendations": [
    {
      "question": "진행자가 선택할 수 있는 추천 질문",
      "rationale": "왜 이 질문이 좋은지",
      "targetEmotion": "안정감",
      "targetDepth": 2,
      "targetMemory": "겨울 음식과 가족 식사",
      "riskFlag": "low"
    }
  ]
}
`,
          },
          {
            role: "system",
            content: `
현재 세션 상태:
${JSON.stringify(sessionState)}

세션 상태를 참고해:
- 같은 기억 축을 이어가되 무리하게 해석하지 말 것
- depthLevel, riskLevel, action을 실제로 업데이트할 것
- 추천 질문 3개를 함께 생성할 것
- 추천 질문은 진행자 협업 패널에서 사용할 수 있게 각기 다른 방향으로 만들 것
`,
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
    const errMsg =
      error instanceof Error
        ? error.message
        : String(error);

    // #region agent log
    agentDebugLog({
      location: "app/api/chat/route.ts:catch",
      message: "chat completion failed",
      hypothesisId: "H6",
      data: {
        errSnippet: errMsg.slice(0, 200),
      },
    });
    // #endregion

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
