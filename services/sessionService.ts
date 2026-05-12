import { agentDebugLog } from "@/lib/agent-debug-log";
import { SESSION_SELECT } from "@/lib/session-db-ops";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  SessionCommandRecord,
  SessionCommandStatus,
  SessionMessageRecord,
  SessionRecommendationInput,
  SessionRecommendationRecord,
  SessionRecommendationStatus,
  SessionRuntimeState,
  SessionSnapshot,
  SessionSummaryRecord,
  SessionRecord,
} from "@/types/session";
import type {
  AddMessageParams,
  CreateSessionCommandParams,
  CreateSessionParams,
} from "@/types/session-mutations";

export type {
  AddMessageParams,
  CreateSessionCommandParams,
  CreateSessionParams,
} from "@/types/session-mutations";

async function sessionWrite<T>(
  body: Record<string, unknown>
): Promise<T> {
  if (
    typeof window === "undefined"
  ) {
    throw new Error(
      "Session mutations require a browser environment."
    );
  }

  const op =
    typeof body.op === "string"
      ? body.op
      : "unknown";

  // #region agent log
  agentDebugLog({
    location:
      "sessionService.ts:sessionWrite:beforeFetch",
    message: "calling /api/session/write",
    hypothesisId: "H1",
    data: { op },
  });
  // #endregion

  const response = await fetch(
    "/api/session/write",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const payload =
    (await response
      .json()
      .catch(() => ({}))) as {
      data?: T;
      error?: string;
    };

  if (!response.ok) {
    // #region agent log
    agentDebugLog({
      location:
        "sessionService.ts:sessionWrite:notOk",
      message: "session write HTTP error",
      hypothesisId: "H1",
      data: {
        op,
        status: response.status,
        errorSnippet: String(
          payload.error ?? ""
        ).slice(0, 240),
      },
    });
    // #endregion

    throw new Error(
      payload.error ||
        "세션 저장에 실패했어요."
    );
  }

  // #region agent log
  agentDebugLog({
    location:
      "sessionService.ts:sessionWrite:ok",
    message: "session write ok",
    hypothesisId: "H2",
    data: { op, status: response.status },
  });
  // #endregion

  return payload.data as T;
}

export function createInitialRuntimeState(
  currentQuestion: string
): SessionRuntimeState {
  return {
    turnCount: 0,
    currentPerson: "",
    currentScene: "",
    currentLifePeriod: "",
    currentTopic: "winter-food",
    depthLevel: 1,
    consecutiveRefusals: 0,
    riskLevel: "low",
    emotionDetected: "neutral",
    action: "continue",
    facilitatorNote: "",
    currentQuestion,
    sessionSummary: "",
    turnSummary: "",
    activeRecommendationId: null,
    activeCommandId: null,
    lastSpeaker: "assistant",
  };
}

export async function createSession(
  params: CreateSessionParams
) {
  return sessionWrite<SessionRecord>({
    op: "createSession",
    payload: params,
  });
}

export async function getSession(
  sessionId: string
) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .single();

  if (error) {
    throw error;
  }

  return data as SessionRecord;
}

export async function listActiveSessions() {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("status", "active")
    .order("last_activity_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as SessionRecord[];
}

export async function listSessions() {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .order("started_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as SessionRecord[];
}

export async function addMessage(
  params: AddMessageParams
) {
  return sessionWrite<SessionMessageRecord>(
    {
      op: "addMessage",
      payload: params,
    }
  );
}

export async function getSessionMessages(
  sessionId: string
) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as SessionMessageRecord[];
}

export async function updateSessionCurrentState(
  sessionId: string,
  currentState: SessionRuntimeState
) {
  return sessionWrite<SessionRecord>({
    op: "updateSessionCurrentState",
    sessionId,
    currentState,
  });
}

export async function getSessionRecommendations(
  sessionId: string
) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("session_recommendations")
    .select("*")
    .eq("session_id", sessionId)
    .order("status", {
      ascending: true,
    })
    .order("created_at", {
      ascending: false,
    })
    .order("rank", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as SessionRecommendationRecord[];
}

export async function createSessionRecommendations(
  sessionId: string,
  createdBy: "ai" | "admin",
  recommendations: SessionRecommendationInput[],
  basedOnMessageId?: string
) {
  if (recommendations.length === 0) {
    return [];
  }

  return sessionWrite<
    SessionRecommendationRecord[]
  >({
    op: "createSessionRecommendations",
    sessionId,
    createdBy,
    recommendations,
    basedOnMessageId,
  });
}

export async function updateRecommendationStatus(
  recommendationId: string,
  status: SessionRecommendationStatus,
  selectedBy?: string,
  sentMessageId?: string
) {
  return sessionWrite<SessionRecommendationRecord>(
    {
      op: "updateRecommendationStatus",
      recommendationId,
      status,
      selectedBy,
      sentMessageId,
    }
  );
}

export async function createSessionCommand(
  params: CreateSessionCommandParams
) {
  return sessionWrite<SessionCommandRecord>(
    {
      op: "createSessionCommand",
      payload: params,
    }
  );
}

export async function getSessionCommands(
  sessionId: string
) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("session_commands")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as SessionCommandRecord[];
}

export async function updateCommandStatus(
  commandId: string,
  status: SessionCommandStatus
) {
  return sessionWrite<SessionCommandRecord>(
    {
      op: "updateCommandStatus",
      commandId,
      status,
    }
  );
}

export async function getRecentSessions(
  elderId: string
) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(`
      ${SESSION_SELECT},
      session_summaries (*)
    `)
    .eq("elder_id", elderId)
    .order("started_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function endSession(
  sessionId: string,
  summary?: string,
  detectedEmotion?: string,
  currentState?: SessionRuntimeState
) {
  return sessionWrite<SessionRecord>({
    op: "endSession",
    sessionId,
    summary,
    detectedEmotion,
    currentState,
  });
}

export async function saveSessionSummary({
  sessionId,
  elderId,
  summary,
  familyFriendlySummary,
  keywords = [],
  people = [],
  places = [],
  foods = [],
  seasons = [],
  emotions = [],
}: {
  sessionId: string;
  elderId: string;
  summary?: string;
  familyFriendlySummary?: string;
  keywords?: string[];
  people?: string[];
  places?: string[];
  foods?: string[];
  seasons?: string[];
  emotions?: string[];
}) {
  return sessionWrite<SessionSummaryRecord>(
    {
      op: "saveSessionSummary",
      payload: {
        sessionId,
        elderId,
        summary,
        familyFriendlySummary,
        keywords,
        people,
        places,
        foods,
        seasons,
        emotions,
      },
    }
  );
}

export async function getSessionSummary(
  sessionId: string
) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("session_summaries")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as SessionSummaryRecord | null;
}

export async function getElderSessions(
  elderId: string
) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(`
      ${SESSION_SELECT},
      messages (*)
    `)
    .eq("elder_id", elderId)
    .order("started_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function getSessionSnapshot(
  sessionId: string
): Promise<SessionSnapshot> {
  const [
    session,
    messages,
    recommendations,
    commands,
    summary,
  ] = await Promise.all([
    getSession(sessionId),
    getSessionMessages(sessionId),
    getSessionRecommendations(sessionId),
    getSessionCommands(sessionId),
    getSessionSummary(sessionId),
  ]);

  return {
    session,
    messages,
    recommendations,
    commands,
    summary,
  };
}
