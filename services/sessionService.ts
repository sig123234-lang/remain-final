import type {
  SessionCommandRecord,
  SessionCommandStatus,
  SessionMessageRecord,
  SessionMode,
  SessionRecommendationInput,
  SessionRecommendationRecord,
  SessionRecommendationStatus,
  SessionRuntimeState,
  SessionSnapshot,
  SessionSummaryRecord,
  SessionRecord,
  SessionWithSummaryRecord,
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
  UpdateSessionModeParams,
} from "@/types/session-mutations";

async function sessionWrite<T>(
  body: Record<string, unknown>
): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error(
      "Session mutations require a browser environment."
    );
  }

  const response = await fetch(
    "/api/session/write",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const payload = (await response
    .json()
    .catch(() => ({}))) as {
    data?: T;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error || "세션 저장에 실패했어요."
    );
  }

  return payload.data as T;
}

async function dbRead<T>(
  body: Record<string, unknown>
): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error(
      "Session reads require a browser environment."
    );
  }

  const response = await fetch("/api/db/read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response
    .json()
    .catch(() => ({}))) as {
    data?: T;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error || "세션 데이터를 불러오지 못했어요."
    );
  }

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
    highRiskCount: 0,
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
  return dbRead<SessionRecord>({
    op: "getSession",
    sessionId,
  });
}

export async function listActiveSessions() {
  return dbRead<SessionRecord[]>({
    op: "listActiveSessions",
  });
}

export async function listSessions() {
  return dbRead<SessionRecord[]>({
    op: "listSessions",
  });
}

export async function listSessionsWithSummaries() {
  return dbRead<SessionWithSummaryRecord[]>(
    {
      op: "listSessionsWithSummaries",
    }
  );
}

export async function addMessage(
  params: AddMessageParams
) {
  return sessionWrite<SessionMessageRecord>({
    op: "addMessage",
    payload: params,
  });
}

export async function getSessionMessages(
  sessionId: string
) {
  return dbRead<SessionMessageRecord[]>({
    op: "getSessionMessages",
    sessionId,
  });
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

export async function updateSessionMode(
  sessionId: string,
  mode: SessionMode
) {
  return sessionWrite<SessionRecord>({
    op: "updateSessionMode",
    sessionId,
    mode,
  });
}

export async function getSessionRecommendations(
  sessionId: string
) {
  return dbRead<SessionRecommendationRecord[]>({
    op: "getSessionRecommendations",
    sessionId,
  });
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
  return sessionWrite<SessionCommandRecord>({
    op: "createSessionCommand",
    payload: params,
  });
}

export async function getSessionCommands(
  sessionId: string
) {
  return dbRead<SessionCommandRecord[]>({
    op: "getSessionCommands",
    sessionId,
  });
}

export async function updateCommandStatus(
  commandId: string,
  status: SessionCommandStatus
) {
  return sessionWrite<SessionCommandRecord>({
    op: "updateCommandStatus",
    commandId,
    status,
  });
}

export async function getRecentSessions(
  elderId: string
) {
  return dbRead<unknown>({
    op: "getRecentSessions",
    elderId,
  });
}

/**
 * 이 어르신의 가장 최근 ended 세션 1개 + summary + 마지막 assistant 메시지.
 * 새 세션의 오프닝 질문을 만들 때 사용한다.
 */
export async function getLastEndedSession(
  elderId: string
) {
  return dbRead<{
    session: SessionRecord & {
      summary?: string | null;
      session_summaries?:
        | {
            summary?: string | null;
            family_friendly_summary?:
              | string
              | null;
          }[]
        | null;
    };
    lastAssistantMessage: {
      content: string;
      created_at: string;
    } | null;
  } | null>({
    op: "getLastEndedSession",
    elderId,
  });
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
  return sessionWrite<SessionSummaryRecord>({
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
  });
}

export async function getSessionSummary(
  sessionId: string
) {
  return dbRead<SessionSummaryRecord | null>({
    op: "getSessionSummary",
    sessionId,
  });
}

export async function getElderSessions(
  elderId: string
) {
  return dbRead<unknown>({
    op: "getElderSessions",
    elderId,
  });
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
