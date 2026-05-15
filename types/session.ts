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

export type SessionMessageType =
  | "utterance"
  | "note"
  | "command";

export type SessionMessageSource =
  | "ai"
  | "elder"
  | "facilitator"
  | "system"
  | "browser-stt"
  | "whisper-stt";

export type SessionCommandType =
  | "ask"
  | "deepen"
  | "soften"
  | "switch_topic"
  | "safety_pause"
  | "take_over"
  | "note"
  | "end_session";

export type SessionCommandStatus =
  | "queued"
  | "applied"
  | "dismissed";

export type SessionRecommendationStatus =
  | "suggested"
  | "selected"
  | "sent"
  | "dismissed";

export interface SessionRuntimeState {
  turnCount: number;
  currentPerson: string;
  currentScene: string;
  currentLifePeriod: string;
  currentTopic: string;
  depthLevel: number;
  consecutiveRefusals: number;
  riskLevel: string;
  emotionDetected: string;
  action: string;
  facilitatorNote: string;
  currentQuestion: string;
  sessionSummary: string;
  turnSummary: string;
  activeRecommendationId: string | null;
  activeCommandId: string | null;
  lastSpeaker: "assistant" | "user" | "admin" | "system";
}

export interface SessionRecord {
  id: string;
  elder_id: string;
  facility_id?: string | null;
  mode: SessionMode;
  status: SessionStatus;
  summary?: string | null;
  detected_emotion?: string | null;
  current_state?: SessionRuntimeState | null;
  current_turn?: number | null;
  current_action?: string | null;
  last_activity_at?: string | null;
  started_at: string;
  ended_at?: string | null;
}

export interface SessionMessageRecord {
  id: string;
  session_id: string;
  elder_id: string;
  role: ChatRole;
  content: string;
  emotion?: string | null;
  risk_level?: string | null;
  stt_confidence?: number | null;
  message_type?: SessionMessageType | null;
  source?: SessionMessageSource | null;
  turn_index?: number | null;
  sequence_in_turn?: number | null;
  metadata?: Record<string, unknown> | null;
  is_final?: boolean | null;
  created_at: string;
}

export interface SessionSummaryRecord {
  id: string;
  session_id: string;
  elder_id: string;
  summary?: string | null;
  family_friendly_summary?: string | null;
  keywords?: string[] | null;
  people?: string[] | null;
  places?: string[] | null;
  foods?: string[] | null;
  seasons?: string[] | null;
  emotions?: string[] | null;
  created_at?: string | null;
}

export interface SessionWithSummaryRecord
  extends SessionRecord {
  session_summaries?:
    | SessionSummaryRecord[]
    | null;
}

export interface SessionRecommendationRecord {
  id: string;
  session_id: string;
  based_on_message_id?: string | null;
  question_text: string;
  rationale?: string | null;
  target_emotion?: string | null;
  target_depth?: number | null;
  target_memory?: string | null;
  risk_flag?: string | null;
  rank?: number | null;
  status: SessionRecommendationStatus;
  created_by: "ai" | "admin";
  selected_by?: string | null;
  sent_message_id?: string | null;
  created_at?: string | null;
}

export interface SessionCommandRecord {
  id: string;
  session_id: string;
  command_type: SessionCommandType;
  payload?: Record<string, unknown> | null;
  status: SessionCommandStatus;
  issued_by: string;
  applied_at?: string | null;
  created_at?: string | null;
}

export interface SessionSnapshot {
  session: SessionRecord;
  messages: SessionMessageRecord[];
  recommendations: SessionRecommendationRecord[];
  commands: SessionCommandRecord[];
  summary: SessionSummaryRecord | null;
}

export interface SessionRecommendationInput {
  question: string;
  rationale: string;
  targetEmotion: string;
  targetDepth: number;
  targetMemory: string;
  riskFlag: string;
}

export interface ChatCompletionPayload {
  speech: string;
  tts_text: string;
  depthLevel: number;
  emotionDetected: string;
  riskLevel: string;
  action: string;
  responsePattern: string;
  questionType: string;
  tailType: string;
  facilitatorNote: string;
  sessionSummaryUpdate: string;
  turnSummary: string;
  recommendations: SessionRecommendationInput[];
}
