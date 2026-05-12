import type {
  ChatRole,
  SessionCommandType,
  SessionMessageSource,
  SessionMessageType,
  SessionMode,
  SessionRuntimeState,
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
