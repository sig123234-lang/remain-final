import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import {
  ANTHROPIC_CHAT_MODEL,
  getChatProvider,
  REMAIN_CHAT_MODEL,
} from "@/lib/ai-config";
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

⚠️ 절대 규칙 (이 규칙들을 어기면 출력 무효):
- speech 와 tts_text 는 반드시 물음표(?) 로 끝나야 한다. 평서문으로 끝나면 안 된다.
- 인정(되비침)만 하고 질문을 빠뜨리면 안 된다. 인정 + 꼬리 질문 = 한 묶음.
- 느낌표(!) 사용 금지. 차분한 말투를 위해 강조는 마침표(.) 로 끝낸다.
- 어르신을 흥분시키는 과한 감탄("정말요?", "와!", "대단해요!") 금지.
- 한 응답에 질문은 정확히 한 개. 두 개 이상의 ? 는 금지.

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
  "currentPerson": "지금 주된 화제의 인물 (예: '아버지', '큰언니', '문방구 아저씨'). 비특정 집단('친구들') 은 빈 문자열.",
  "currentScene": "지금 다루고 있는 구체 장면 (예: '국제초등학교 등굣길', '대구 집 부엌'). 모르겠으면 빈 문자열.",
  "currentLifePeriod": "지금 머무는 인생 시기 (예: '초등학교', '중학교', '결혼 전', '직장 시절'). 시기 전환되면 갱신.",
  "currentTopic": "지금 주된 주제 키워드 (예: '겨울 음식', '아버지와의 추억', '문방구'). 짧게.",
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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Anthropic Messages API 는 OpenAI 의 response_format=json_object 같은
 * native JSON 모드가 없다. 표준 우회: assistant 메시지를 "{" 로 prefill 해서
 * 모델이 무조건 JSON 객체로 응답 본문을 계속 쓰게 한다. 응답 텍스트 앞에 "{"
 * 를 다시 붙여 완전한 JSON 으로 파싱.
 */
async function callAnthropic({
  systemPrompt,
  outputOverride,
  sessionStateBlock,
  conversation,
}: {
  systemPrompt: string;
  outputOverride: string;
  sessionStateBlock: string;
  conversation: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}): Promise<{
  raw: string;
  truncated: boolean;
  length: number;
}> {
  // Anthropic 은 system 을 별도 필드로, 그 외는 user/assistant 의 messages 로.
  // OUTPUT_FORMAT_OVERRIDE 와 sessionState 는 system 뒤에 user 메시지로 합쳐서 전달.
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${outputOverride}\n\n${sessionStateBlock}\n\n다음은 어르신과 이야기 도우미의 대화입니다.\n\n${conversation
        .map(
          (m) =>
            `[${
              m.role === "assistant"
                ? "이야기 도우미"
                : "어르신"
            }] ${m.content}`
        )
        .join(
          "\n"
        )}\n\n방금 어르신이 한 마지막 발화에 대한 다음 응답을 위의 JSON 형식으로만 출력하라.`,
    },
    {
      role: "assistant",
      content: "{",
    },
  ];

  const response =
    await anthropic.messages.create({
      model: ANTHROPIC_CHAT_MODEL,
      system: systemPrompt,
      messages,
      max_tokens: 1200,
      temperature: 0.7,
    });

  const block = response.content[0];
  const text =
    block && block.type === "text"
      ? block.text
      : "";
  const raw = "{" + text;
  return {
    raw,
    truncated:
      response.stop_reason === "max_tokens",
    length: raw.length,
  };
}

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

    const sessionStateBlock = `현재 sessionState (외부 엔진이 계산. 읽기만 하고 갱신하지 마라):\n${JSON.stringify(sessionState)}`;

    const provider = getChatProvider();
    console.log("chat provider:", provider);

    let raw: string;
    let truncated = false;
    let rawLength = 0;

    if (provider === "anthropic") {
      const anthropicResult = await callAnthropic(
        {
          systemPrompt:
            INTERVIEWER_SYSTEM_PROMPT_V8,
          outputOverride: OUTPUT_FORMAT_OVERRIDE,
          sessionStateBlock,
          conversation: messages,
        }
      );
      raw = anthropicResult.raw;
      truncated = anthropicResult.truncated;
      rawLength = anthropicResult.length;
    } else {
      const completion =
        await openai.chat.completions.create({
          model: REMAIN_CHAT_MODEL,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
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
              content: sessionStateBlock,
            },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 850,
        });

      const choice = completion.choices[0];
      raw = choice?.message?.content || "{}";
      rawLength = raw.length;
      truncated =
        choice?.finish_reason === "length";
    }

    console.log("RAW AI 응답:", raw);

    if (truncated) {
      throw new Error(
        `${provider} response truncated (length=${rawLength})`
      );
    }

    const parsed =
      JSON.parse(raw) as Partial<ChatCompletionPayload>;

    /**
     * speech 는 반드시 질문(?)으로 끝나야 한다는 절대 규칙을 코드 레벨에서 한 번 더 강제.
     * - 끝의 마침표/느낌표/말줄임은 ? 로 치환
     * - 그래도 ? 로 안 끝나면 "어떠셨어요?" 자연 꼬리 추가
     * - 본문의 ! 는 모두 . 로 치환 (차분한 톤)
     */
    const enforceQuestionEnding = (
      text: string | undefined
    ): string => {
      let cleaned = (text || "").trim();
      if (!cleaned) {
        return "조금 더 이야기 들려주시겠어요?";
      }
      // 본문의 강조 ! 는 모두 . 로
      cleaned = cleaned.replace(/[!‼❗❕]/g, ".");
      // 중복 마침표 정리
      cleaned = cleaned.replace(/\.{2,}/g, ".");
      // 끝의 마침표/말줄임을 정리
      cleaned = cleaned.replace(/[.\s]+$/u, "");
      if (!/[?？]$/.test(cleaned)) {
        cleaned += ". 어떠셨어요?";
      }
      return cleaned.trim();
    };

    const finalSpeech = enforceQuestionEnding(
      parsed.speech
    );
    const finalTtsText = enforceQuestionEnding(
      parsed.tts_text || parsed.speech
    );

    const normalized: ChatCompletionPayload = {
      speech: finalSpeech,
      tts_text: finalTtsText,
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
      currentPerson:
        typeof parsed.currentPerson === "string"
          ? parsed.currentPerson.trim()
          : "",
      currentScene:
        typeof parsed.currentScene === "string"
          ? parsed.currentScene.trim()
          : "",
      currentLifePeriod:
        typeof parsed.currentLifePeriod ===
        "string"
          ? parsed.currentLifePeriod.trim()
          : "",
      currentTopic:
        typeof parsed.currentTopic === "string"
          ? parsed.currentTopic.trim()
          : "",
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
