import { NextResponse } from "next/server";

import {
  dbAddMessage,
  dbCreateSession,
  dbCreateSessionCommand,
  dbCreateSessionRecommendations,
  dbEndSession,
  dbSaveSessionSummary,
  dbUpdateCommandStatus,
  dbUpdateRecommendationStatus,
  dbUpdateSessionCurrentState,
  dbUpdateSessionMode,
} from "@/lib/session-db-ops";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type {
  SessionCommandStatus,
  SessionRecommendationInput,
  SessionRecommendationStatus,
  SessionRuntimeState,
} from "@/types/session";
import type {
  AddMessageParams,
  CreateSessionCommandParams,
  CreateSessionParams,
} from "@/types/session-mutations";

type SessionWriteBody =
  | {
      op: "createSession";
      payload: CreateSessionParams;
    }
  | {
      op: "addMessage";
      payload: AddMessageParams;
    }
  | {
      op: "updateSessionCurrentState";
      sessionId: string;
      currentState: SessionRuntimeState;
    }
  | {
      op: "updateSessionMode";
      sessionId: string;
      mode: "collab" | "auto";
    }
  | {
      op: "createSessionRecommendations";
      sessionId: string;
      createdBy: "ai" | "admin";
      recommendations: SessionRecommendationInput[];
      basedOnMessageId?: string;
    }
  | {
      op: "updateRecommendationStatus";
      recommendationId: string;
      status: SessionRecommendationStatus;
      selectedBy?: string;
      sentMessageId?: string;
    }
  | {
      op: "createSessionCommand";
      payload: CreateSessionCommandParams;
    }
  | {
      op: "updateCommandStatus";
      commandId: string;
      status: SessionCommandStatus;
    }
  | {
      op: "endSession";
      sessionId: string;
      summary?: string;
      detectedEmotion?: string;
      currentState?: SessionRuntimeState;
    }
  | {
      op: "saveSessionSummary";
      payload: {
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
      };
    };

function serializeError(
  error: unknown
) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const err = error as {
      message: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    return {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
    };
  }

  return { message: String(error) };
}

export async function POST(
  request: Request
) {

  let body: SessionWriteBody;

  try {
    body =
      (await request.json()) as SessionWriteBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || !("op" in body)) {
    return NextResponse.json(
      { error: "Missing op" },
      { status: 400 }
    );
  }

  let supabase;

  try {
    supabase =
      getSupabaseServiceRoleClient();
  } catch (configError) {

    return NextResponse.json(
      {
        error:
          serializeError(configError)
            .message,
      },
      { status: 500 }
    );
  }

  try {
    switch (body.op) {
      case "createSession": {
        const data =
          await dbCreateSession(
            supabase,
            body.payload
          );

        return NextResponse.json({
          data,
        });
      }

      case "addMessage": {
        const data =
          await dbAddMessage(
            supabase,
            body.payload
          );

        return NextResponse.json({
          data,
        });
      }

      case "updateSessionCurrentState": {
        const data =
          await dbUpdateSessionCurrentState(
            supabase,
            body.sessionId,
            body.currentState
          );

        return NextResponse.json({
          data,
        });
      }

      case "updateSessionMode": {
        const data =
          await dbUpdateSessionMode(
            supabase,
            {
              sessionId:
                body.sessionId,
              mode: body.mode,
            }
          );

        return NextResponse.json({
          data,
        });
      }

      case "createSessionRecommendations": {
        const data =
          await dbCreateSessionRecommendations(
            supabase,
            body.sessionId,
            body.createdBy,
            body.recommendations,
            body.basedOnMessageId
          );

        return NextResponse.json({
          data,
        });
      }

      case "updateRecommendationStatus": {
        const data =
          await dbUpdateRecommendationStatus(
            supabase,
            body.recommendationId,
            body.status,
            body.selectedBy,
            body.sentMessageId
          );

        return NextResponse.json({
          data,
        });
      }

      case "createSessionCommand": {
        const data =
          await dbCreateSessionCommand(
            supabase,
            body.payload
          );

        return NextResponse.json({
          data,
        });
      }

      case "updateCommandStatus": {
        const data =
          await dbUpdateCommandStatus(
            supabase,
            body.commandId,
            body.status
          );

        return NextResponse.json({
          data,
        });
      }

      case "endSession": {
        const data =
          await dbEndSession(
            supabase,
            body.sessionId,
            body.summary,
            body.detectedEmotion,
            body.currentState
          );

        return NextResponse.json({
          data,
        });
      }

      case "saveSessionSummary": {
        const data =
          await dbSaveSessionSummary(
            supabase,
            body.payload
          );

        return NextResponse.json({
          data,
        });
      }

      default: {
        return NextResponse.json(
          {
            error: "Unknown op",
          },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    const serialized =
      serializeError(error);

    return NextResponse.json(
      { error: serialized.message },
      { status: 500 }
    );
  }
}
