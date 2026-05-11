import { supabase } from "@/lib/supabase/client";

export type ChatRole =
  | "assistant"
  | "user"
  | "admin"
  | "system";

export type SessionMode =
  | "collab"
  | "auto";

export type SessionStatus =
  | "active"
  | "ended";

export interface CreateSessionParams {
  elderId: string;
  facilityId?: string;
  mode?: SessionMode;
}

export interface AddMessageParams {
  sessionId: string;
  elderId: string;
  role: ChatRole;
  content: string;
  emotion?: string;
  riskLevel?: string;
  sttConfidence?: number;
}

export async function createSession({
  elderId,
  facilityId,
  mode = "collab",
}: CreateSessionParams) {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      elder_id: elderId,
      facility_id: facilityId,
      mode,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    console.error(
      "세션 생성 실패:",
      error
    );

    throw error;
  }

  return data;
}

export async function addMessage({
  sessionId,
  elderId,
  role,
  content,
  emotion,
  riskLevel = "none",
  sttConfidence,
}: AddMessageParams) {
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
    })
    .select()
    .single();

  if (error) {
    console.error(
      "메시지 저장 실패:",
      error
    );

    throw error;
  }

  return data;
}

export async function getSessionMessages(
  sessionId: string
) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error(
      "메시지 조회 실패:",
      error
    );

    throw error;
  }

  return data;
}

export async function getRecentSessions(
  elderId: string
) {
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      *,
      session_summaries (*)
    `)
    .eq("elder_id", elderId)
    .order("started_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "세션 조회 실패:",
      error
    );

    throw error;
  }

  return data;
}

export async function endSession(
  sessionId: string,
  summary?: string,
  detectedEmotion?: string
) {
  const { data, error } = await supabase
    .from("sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      summary,
      detected_emotion:
        detectedEmotion,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error(
      "세션 종료 실패:",
      error
    );

    throw error;
  }

  return data;
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
  const { data, error } = await supabase
    .from("session_summaries")
    .insert({
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
    })
    .select()
    .single();

  if (error) {
    console.error(
      "세션 요약 저장 실패:",
      error
    );

    throw error;
  }

  return data;
}