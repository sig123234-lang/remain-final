import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ChatRole,
  SessionCommandRecord,
  SessionCommandStatus,
  SessionCommandType,
  SessionMessageRecord,
  SessionMessageSource,
  SessionMessageType,
  SessionMode,
  SessionRecommendationInput,
  SessionRecommendationRecord,
  SessionRecommendationStatus,
  SessionRuntimeState,
  SessionSnapshot,
  SessionSummaryRecord,
  SessionRecord,
} from "@/types/session";

export interface CreateSessionParams {
  elderId: string;
  facilityId?: string;
  mode?: SessionMode;
  initialState?: SessionRuntimeState;
}

export interface AddMessageParams {
  sessionId: string;
  elderId: string;
  role: ChatRole;
  content: string;
  emotion?: string;
  riskLevel?: string;
  sttConfidence?: number;
  messageType?: SessionMessageType;
  source?: SessionMessageSource;
  turnIndex?: number;
  sequenceInTurn?: number;
  metadata?: Record<string, unknown>;
  isFinal?: boolean;
}

export interface CreateSessionCommandParams {
  sessionId: string;
  commandType: SessionCommandType;
  payload?: Record<string, unknown>;
  issuedBy: string;
}

const SESSION_SELECT = `
  id,
  elder_id,
  facility_id,
  mode,
  status,
  summary,
  detected_emotion,
  current_state,
  current_turn,
  current_action,
  last_activity_at,
  started_at,
  ended_at
`;

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

export async function createSession({
  elderId,
  facilityId,
  mode = "collab",
  initialState,
}: CreateSessionParams) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      elder_id: elderId,
      facility_id: facilityId,
      mode,
      status: "active",
      current_state: initialState,
      current_turn:
        initialState?.turnCount ?? 0,
      current_action:
        initialState?.action ?? "continue",
      last_activity_at:
        new Date().toISOString(),
    })
    .select(SESSION_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as SessionRecord;
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

export async function addMessage({
  sessionId,
  elderId,
  role,
  content,
  emotion,
  riskLevel = "none",
  sttConfidence,
  messageType = "utterance",
  source = "system",
  turnIndex = 0,
  sequenceInTurn = 0,
  metadata = {},
  isFinal = true,
}: AddMessageParams) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      session_id: sessionId,
      elder_id: elderId,
      role,
      content,
      emotion,
      risk_level: riskLevel,
      stt_confidence: sttConfidence,
      message_type: messageType,
      source,
      turn_index: turnIndex,
      sequence_in_turn: sequenceInTurn,
      metadata,
      is_final: isFinal,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SessionMessageRecord;
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
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("sessions")
    .update({
      current_state: currentState,
      current_turn: currentState.turnCount,
      current_action: currentState.action,
      detected_emotion:
        currentState.emotionDetected,
      last_activity_at:
        new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select(SESSION_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as SessionRecord;
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
  const supabase =
    getSupabaseBrowserClient();

  const rows = recommendations.map(
    (recommendation, index) => ({
      session_id: sessionId,
      based_on_message_id:
        basedOnMessageId,
      question_text:
        recommendation.question,
      rationale:
        recommendation.rationale,
      target_emotion:
        recommendation.targetEmotion,
      target_depth:
        recommendation.targetDepth,
      target_memory:
        recommendation.targetMemory,
      risk_flag:
        recommendation.riskFlag,
      rank: index + 1,
      status: "suggested",
      created_by: createdBy,
    })
  );

  if (rows.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("session_recommendations")
    .insert(rows)
    .select("*");

  if (error) {
    throw error;
  }

  return (data ?? []) as SessionRecommendationRecord[];
}

export async function updateRecommendationStatus(
  recommendationId: string,
  status: SessionRecommendationStatus,
  selectedBy?: string,
  sentMessageId?: string
) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("session_recommendations")
    .update({
      status,
      selected_by: selectedBy,
      sent_message_id: sentMessageId,
    })
    .eq("id", recommendationId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SessionRecommendationRecord;
}

export async function createSessionCommand({
  sessionId,
  commandType,
  payload,
  issuedBy,
}: CreateSessionCommandParams) {
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("session_commands")
    .insert({
      session_id: sessionId,
      command_type: commandType,
      payload,
      status: "queued",
      issued_by: issuedBy,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SessionCommandRecord;
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
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("session_commands")
    .update({
      status,
      applied_at:
        status === "applied"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", commandId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SessionCommandRecord;
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
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      summary,
      detected_emotion:
        detectedEmotion,
      current_state: currentState,
      current_turn:
        currentState?.turnCount,
      current_action:
        currentState?.action,
      last_activity_at:
        new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select(SESSION_SELECT)
    .single();

  if (error) {
    throw error;
  }

  return data as SessionRecord;
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
  const supabase =
    getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("session_summaries")
    .upsert(
      {
        session_id: sessionId,
        elder_id: elderId,
        summary,
        family_friendly_summary:
          familyFriendlySummary,
        keywords,
        people,
        places,
        foods,
        seasons,
        emotions,
      },
      {
        onConflict: "session_id",
      }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as SessionSummaryRecord;
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
