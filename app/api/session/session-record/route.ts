import OpenAI from "openai";
import { NextResponse } from "next/server";

import { REMAIN_CHAT_MODEL } from "@/lib/ai-config";
import { SESSION_RECORD_SYSTEM_PROMPT_V3 } from "@/lib/ai-prompts";
import {
  dbGetElder,
  dbGetSession,
  dbGetSessionMessages,
} from "@/lib/db-read-ops";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 회상치료_세션기록_실행_프롬프트_v3.md 를 그대로 시스템 메시지로 주입.
 * 사용자 메시지는 v3 가 가정하는 입력 형식 (elderlyProfile + conversationLog +
 * finalSessionState) 그대로 구성한다. v3 의 conversationLog 는 각 턴에
 * structured 메타 (action, depthLevel, etc) 와 audioFeatures 를 포함하길 기대하는데,
 * 우리 시스템은 그 메타를 turn 단위로 따로 저장하지 않으므로 sessionState 전체
 * snapshot 과 message metadata 를 함께 제공해 LLM 이 추론하게 한다.
 */
function buildUserMessage(input: unknown) {
  return `세션이 종료됐습니다. 시스템 프롬프트의 절대 원칙과 출력 형식을 그대로 따라
nextSessionPrep + dataPipeline JSON 한 객체로 작성해 주세요.

우리 시스템은 v3 가 가정하는 audioFeatures(웃음/울먹임/침묵 길이 등)와 STT
신뢰도(turn 단위)를 따로 저장하지 않습니다. dataPipeline.sttQuality 와
audioMetrics 는 "측정 불가" 케이스에 한해 합리적 추정치를 사용하되, 추정한
필드에 대해서는 flags 에 "estimated" 항목을 추가해 주세요. interactionPatterns
는 conversationLog 에서 직접 분석 가능합니다.

입력:

\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`
`;
}

export async function POST(req: Request) {
  let body: { sessionId?: unknown };
  try {
    body = (await req.json()) as {
      sessionId?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: "invalid json" },
      { status: 400 }
    );
  }

  const sessionId =
    typeof body.sessionId === "string"
      ? body.sessionId
      : "";
  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId required" },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getSupabaseServiceRoleClient();
  } catch (configError) {
    return NextResponse.json(
      {
        error:
          configError instanceof Error
            ? configError.message
            : "service role unavailable",
      },
      { status: 500 }
    );
  }

  try {
    const [session, messages] = await Promise.all(
      [
        dbGetSession(supabase, sessionId),
        dbGetSessionMessages(
          supabase,
          sessionId
        ),
      ]
    );

    let elder = null;
    if (session.elder_id) {
      try {
        elder = await dbGetElder(
          supabase,
          session.elder_id
        );
      } catch {
        /* elder 조회 실패해도 계속 진행 */
      }
    }

    const ordered = [...messages].sort((a, b) =>
      (a.created_at || "").localeCompare(
        b.created_at || ""
      )
    );

    const conversationLog = ordered.map(
      (m, idx) => ({
        turnIndex: m.turn_index ?? idx,
        role:
          m.role === "user"
            ? "elderly"
            : m.role === "assistant"
              ? "ai"
              : m.role,
        text: m.content,
        // chat route 가 metadata 에 넣은 메타 정보를 그대로 노출. structured 가
        // 없으면 LLM 이 conversationLog 만 보고 추론.
        meta: m.metadata || {},
      })
    );

    const startedAt = session.started_at
      ? new Date(session.started_at).getTime()
      : Date.now();
    const endedAt = session.ended_at
      ? new Date(session.ended_at).getTime()
      : Date.now();
    const sessionDurationMinutes = Math.max(
      1,
      Math.round((endedAt - startedAt) / 60000)
    );

    const elderlyProfile = {
      name:
        elder?.display_name ||
        elder?.full_name ||
        "어르신",
      age: elder?.age ?? null,
      sessionNumber: null,
      cognitiveLevel: "normal",
      tabooTopics: [],
      previousSessionSummary: null,
    };

    const finalSessionState =
      session.current_state ?? {
        turnCount: ordered.length,
        eTypeCount: 0,
        treasureDetected: false,
        deathMentionCounter: 0,
        discomfortCounter: 0,
        maxRiskLevel: "low",
      };

    const userPayload = {
      elderlyProfile,
      sessionDate: session.started_at
        ? new Date(session.started_at)
            .toISOString()
            .slice(0, 10)
        : "",
      sessionDurationMinutes,
      conversationLog,
      finalSessionState,
    };

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
              SESSION_RECORD_SYSTEM_PROMPT_V3,
          },
          {
            role: "user",
            content: buildUserMessage(
              userPayload
            ),
          },
        ],
        temperature: 0.4,
        max_tokens: 4000,
      });

    const choice = completion.choices[0];
    const raw =
      choice?.message?.content || "{}";

    if (choice?.finish_reason === "length") {
      return NextResponse.json(
        {
          error:
            "session record truncated (max_tokens). consider shorter conversation.",
        },
        { status: 500 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<
        string,
        unknown
      >;
    } catch (parseError) {
      console.error(
        "session-record JSON parse failed:",
        parseError,
        raw.slice(0, 300)
      );
      return NextResponse.json(
        { error: "session record JSON invalid" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: parsed });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "session record failed";
    console.error(
      "session-record error:",
      error
    );
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
