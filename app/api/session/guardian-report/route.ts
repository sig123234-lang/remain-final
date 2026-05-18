import OpenAI from "openai";
import { NextResponse } from "next/server";

import { REMAIN_CHAT_MODEL } from "@/lib/ai-config";
import { GUARDIAN_REPORT_SYSTEM_PROMPT_V1 } from "@/lib/ai-prompts";
import {
  dbGetElder,
  dbGetSessionMessages,
  dbGetSessionSummary,
  dbGetSession,
} from "@/lib/db-read-ops";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 우리 시스템은 v3 세션기록(nextSessionPrep 포함) 산출물이 없어서,
 * 가이드가 가정한 입력 대신 raw conversation log + session summary
 * + elder 메타데이터를 그대로 LLM 에 넘긴다. 보호자 리포트 v1 의
 * 출력 schema·민감 필터링·톤 원칙은 system prompt 자체가 강제한다.
 */
function buildUserMessage(input: {
  elderlyName: string;
  guardianName: string;
  guardianRelation: string;
  sessionDate: string;
  sessionDurationMinutes: number;
  conversationLog: Array<{
    role: string;
    text: string;
    turnIndex?: number;
  }>;
  sessionSummary: string;
  emotionsDetected: string[];
}) {
  return `세션기록 v3 의 nextSessionPrep 가 우리 시스템에는 아직 없어서,
이 한 번의 호출에서 보호자 리포트를 직접 생성해 주세요. 시스템 프롬프트의
모든 절대 원칙·민감 정보 필터링·톤·금지 사항을 그대로 따르세요.

다음은 raw 입력입니다. 출력은 반드시 시스템 프롬프트가 정의한 JSON
(guardianReport) 한 객체로만 작성하세요.

\`\`\`json
${JSON.stringify(input, null, 2)}
\`\`\`

추가 지시:
- mainTopics 는 conversationLog 에서 직접 추출. 비특정 ("옛날 이야기") 금지.
- impressiveExcerpts.elderlyQuote 는 conversationLog 의 어르신 발화 원문 그대로.
- emotionalStateScore 는 시스템 프롬프트의 5개 차원 산출 기준 그대로 사용.
- 민감 정보 (자해/자살 언급, 가족 갈등, 욕설, 분노 폭발) 가 발견되면 그 턴의
  내용을 어디에도 포함하지 마세요. 어르신이 자연스럽게 표현하신 그리움/아쉬움
  은 포함 가능.
- 어르신 이름이 "어르신" 으로만 알려진 경우 자연스러운 호칭을 사용하세요.`;
}

export async function POST(req: Request) {
  let body: {
    sessionId?: unknown;
    sessionRecord?: unknown;
  };
  try {
    body = (await req.json()) as {
      sessionId?: unknown;
      sessionRecord?: unknown;
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

  // v3 session-record 산출물이 함께 전달되면 그걸 우선 사용 (가이드의 정식 입력).
  // 없으면 raw conversation log fallback 으로 동작.
  type V3Record = {
    nextSessionPrep?: Record<string, unknown>;
    dataPipeline?: {
      sensitiveContent?: Array<{
        turnIndex?: number;
        category?: string;
        guardianReportFilter?: boolean;
      }>;
    };
  };
  const providedRecord =
    body.sessionRecord &&
    typeof body.sessionRecord === "object"
      ? (body.sessionRecord as V3Record)
      : null;

  let supabase;
  try {
    supabase = getSupabaseServiceRoleClient();
  } catch (configError) {
    const message =
      configError instanceof Error
        ? configError.message
        : "service role unavailable";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }

  try {
    const [session, messages, summaryRow] =
      await Promise.all([
        dbGetSession(supabase, sessionId),
        dbGetSessionMessages(
          supabase,
          sessionId
        ),
        dbGetSessionSummary(
          supabase,
          sessionId
        ),
      ]);

    let elder = null;
    if (session.elder_id) {
      try {
        elder = await dbGetElder(
          supabase,
          session.elder_id
        );
      } catch {
        /* elder lookup 실패해도 계속 */
      }
    }

    const ordered = [...messages].sort((a, b) =>
      (a.created_at || "").localeCompare(
        b.created_at || ""
      )
    );

    const conversationLog = ordered.map(
      (m, idx) => ({
        role:
          m.role === "user"
            ? "elderly"
            : m.role === "assistant"
              ? "ai"
              : m.role,
        text: m.content,
        turnIndex: m.turn_index ?? idx,
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

    const elderlyName =
      elder?.display_name ||
      elder?.full_name ||
      "어르신";

    // v3 산출물이 제공되면 가이드의 정식 입력 형식으로 LLM 에 전달
    // (nextSessionPrep + sensitiveFilter). 없으면 raw conversation 폴백.
    let userMessage: string;
    if (providedRecord?.nextSessionPrep) {
      const sensitiveFilter =
        providedRecord.dataPipeline
          ?.sensitiveContent
          ?.filter(
            (entry) =>
              entry.guardianReportFilter === true
          )
          .map((entry) =>
            `turnIndex ${entry.turnIndex} — ${entry.category}`
          ) ?? [];
      userMessage = `시스템 프롬프트의 모든 절대 원칙·민감 정보 필터링·금지 사항을 그대로
따라 guardianReport JSON 객체 한 개를 생성해 주세요.

아래는 세션기록 v3 의 nextSessionPrep + sensitiveFilter, 그리고 기본 정보입니다.
nextSessionPrep 의 keyMemories / emotionalTreasures / nextSessionLeads 를 우선
활용하세요. sensitiveFilter 에 명시된 turnIndex 의 내용은 절대 포함하지 마세요.

\`\`\`json
${JSON.stringify(
  {
    elderlyName,
    sessionNumber: null,
    sessionDate: session.started_at
      ? new Date(session.started_at)
          .toISOString()
          .slice(0, 10)
      : "",
    guardianName: "보호자님",
    guardianRelation: "가족",
    nextSessionPrep:
      providedRecord.nextSessionPrep,
    sensitiveFilter,
    sessionDurationMinutes,
  },
  null,
  2
)}
\`\`\``;
    } else {
      userMessage = buildUserMessage({
        elderlyName,
        guardianName: "보호자님",
        guardianRelation: "가족",
        sessionDate: session.started_at
          ? new Date(session.started_at)
              .toISOString()
              .slice(0, 10)
          : "",
        sessionDurationMinutes,
        conversationLog,
        sessionSummary:
          summaryRow?.family_friendly_summary ||
          summaryRow?.summary ||
          session.summary ||
          "",
        emotionsDetected: summaryRow?.emotions
          ? summaryRow.emotions.filter(
              (e): e is string =>
                typeof e === "string" &&
                e.length > 0
            )
          : session.detected_emotion
            ? [session.detected_emotion]
            : [],
      });
    }

    const completion =
      await openai.chat.completions.create({
        model: REMAIN_CHAT_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              GUARDIAN_REPORT_SYSTEM_PROMPT_V1,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.5,
        max_tokens: 2000,
      });

    const choice = completion.choices[0];
    const raw =
      choice?.message?.content || "{}";

    if (choice?.finish_reason === "length") {
      return NextResponse.json(
        {
          error:
            "report truncated, retry with shorter input",
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
        "guardian-report JSON parse failed",
        parseError,
        raw.slice(0, 200)
      );
      return NextResponse.json(
        {
          error: "report format invalid",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: parsed,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "guardian report failed";
    console.error(
      "guardian-report error:",
      error
    );
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
