import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  SessionCommandRecord,
  SessionCommandStatus,
  SessionMessageRecord,
  SessionRecommendationInput,
  SessionRecommendationRecord,
  SessionRecommendationStatus,
  SessionRuntimeState,
  SessionSummaryRecord,
  SessionRecord,
} from "@/types/session";
import type {
  AddMessageParams,
  CreateSessionCommandParams,
  CreateSessionParams,
  UpdateSessionModeParams,
} from "@/types/session-mutations";

export const SESSION_SELECT = `
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

export async function dbCreateSession(
  client: SupabaseClient,
  {
    elderId,
    facilityId,
    mode = "collab",
    initialState,
  }: CreateSessionParams
) {
  const { data, error } = await client
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

export async function dbAddMessage(
  client: SupabaseClient,
  {
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
  }: AddMessageParams
) {
  const { data, error } = await client
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

export async function dbUpdateSessionCurrentState(
  client: SupabaseClient,
  sessionId: string,
  currentState: SessionRuntimeState
) {
  const { data, error } = await client
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

export async function dbUpdateSessionMode(
  client: SupabaseClient,
  { sessionId, mode }: UpdateSessionModeParams
) {
  const { data, error } = await client
    .from("sessions")
    .update({
      mode,
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

export async function dbCreateSessionRecommendations(
  client: SupabaseClient,
  sessionId: string,
  createdBy: "ai" | "admin",
  recommendations: SessionRecommendationInput[],
  basedOnMessageId?: string
) {
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

  const { data, error } = await client
    .from("session_recommendations")
    .insert(rows)
    .select("*");

  if (error) {
    throw error;
  }

  return (data ?? []) as SessionRecommendationRecord[];
}

export async function dbUpdateRecommendationStatus(
  client: SupabaseClient,
  recommendationId: string,
  status: SessionRecommendationStatus,
  selectedBy?: string,
  sentMessageId?: string
) {
  const { data, error } = await client
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

export async function dbCreateSessionCommand(
  client: SupabaseClient,
  {
    sessionId,
    commandType,
    payload,
    issuedBy,
  }: CreateSessionCommandParams
) {
  const { data, error } = await client
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

export async function dbUpdateCommandStatus(
  client: SupabaseClient,
  commandId: string,
  status: SessionCommandStatus
) {
  const { data, error } = await client
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

export async function dbEndSession(
  client: SupabaseClient,
  sessionId: string,
  summary?: string,
  detectedEmotion?: string,
  currentState?: SessionRuntimeState
) {
  const { data, error } = await client
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

export async function dbSaveSessionSummary(
  client: SupabaseClient,
  {
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
  }
) {
  const { data, error } = await client
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
