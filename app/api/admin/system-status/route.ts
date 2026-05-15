import { NextResponse } from "next/server";

import { REMAIN_CHAT_MODEL } from "@/lib/ai-config";
import {
  dbListActiveSessions,
  dbListElders,
  dbListSessionsWithSummaries,
} from "@/lib/db-read-ops";
import { REMAIN_FIRST_QUESTION } from "@/lib/remain-config";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

function hasValue(
  value: string | undefined
) {
  return Boolean(value && value.trim());
}

export async function GET() {
  const browserSupabaseReady =
    hasValue(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL
    ) &&
    hasValue(
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );
  const serverSupabaseReady =
    hasValue(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL
    ) &&
    hasValue(
      process.env
        .SUPABASE_SERVICE_ROLE_KEY
    );
  const openAiReady = hasValue(
    process.env.OPENAI_API_KEY
  );

  let supabase;

  try {
    supabase =
      getSupabaseServiceRoleClient();
  } catch (caughtError) {
    return NextResponse.json({
      services: {
        openAiReady,
        browserSupabaseReady,
        serverSupabaseReady: false,
        browserSttReady: true,
        serverSttReady: false,
      },
      stats: {
        elderCount: 0,
        activeSessionCount: 0,
        endedSessionCount: 0,
        archiveCount: 0,
        familyReadyCount: 0,
        latestSessionAt: null,
      },
      defaults: {
        chatModel: REMAIN_CHAT_MODEL,
        firstQuestion:
          REMAIN_FIRST_QUESTION,
      },
      scope: {
        adminSettingsStorage:
          "browser_local",
      },
      warning:
        caughtError instanceof Error
          ? caughtError.message
          : "Supabase 서버 연결이 아직 설정되지 않았어요.",
    });
  }

  try {
    const [
      elders,
      activeSessions,
      sessions,
    ] = await Promise.all([
      dbListElders(supabase),
      dbListActiveSessions(supabase),
      dbListSessionsWithSummaries(
        supabase
      ),
    ]);

    const endedSessions =
      sessions.filter(
        (session) =>
          session.status === "ended"
      );
    const archiveCount =
      sessions.filter((session) => {
        const summary =
          session.session_summaries?.[0]
            ?.summary ??
          session.summary;
        return Boolean(summary?.trim());
      }).length;
    const familyReadyCount =
      sessions.filter((session) => {
        const summary =
          session.session_summaries?.[0]
            ?.family_friendly_summary ??
          session.summary;
        return Boolean(summary?.trim());
      }).length;

    return NextResponse.json({
      services: {
        openAiReady,
        browserSupabaseReady,
        serverSupabaseReady,
        browserSttReady: true,
        serverSttReady: false,
      },
      stats: {
        elderCount: elders.length,
        activeSessionCount:
          activeSessions.length,
        endedSessionCount:
          endedSessions.length,
        archiveCount,
        familyReadyCount,
        latestSessionAt:
          sessions[0]?.started_at ?? null,
      },
      defaults: {
        chatModel: REMAIN_CHAT_MODEL,
        firstQuestion:
          REMAIN_FIRST_QUESTION,
      },
      scope: {
        adminSettingsStorage:
          "browser_local",
      },
    });
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "운영 상태를 불러오지 못했어요.",
      },
      { status: 500 }
    );
  }
}
