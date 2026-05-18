import { NextResponse } from "next/server";

import {
  dbGetElder,
  dbGetElderSessions,
  dbGetLastEndedSession,
  dbGetRecentSessions,
  dbGetSession,
  dbGetSessionCommands,
  dbGetSessionMessages,
  dbGetSessionRecommendations,
  dbGetSessionSummary,
  dbListActiveSessions,
  dbListElders,
  dbListEldersByIds,
  dbListSessions,
  dbListSessionsWithSummaries,
} from "@/lib/db-read-ops";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

type DbReadBody =
  | { op: "listElders" }
  | { op: "getElder"; elderId: string }
  | { op: "listEldersByIds"; elderIds: string[] }
  | { op: "listActiveSessions" }
  | { op: "listSessions" }
  | { op: "listSessionsWithSummaries" }
  | { op: "getSession"; sessionId: string }
  | { op: "getSessionMessages"; sessionId: string }
  | {
      op: "getSessionRecommendations";
      sessionId: string;
    }
  | { op: "getSessionCommands"; sessionId: string }
  | { op: "getSessionSummary"; sessionId: string }
  | { op: "getElderSessions"; elderId: string }
  | { op: "getRecentSessions"; elderId: string }
  | { op: "getLastEndedSession"; elderId: string };

function serializeError(error: unknown) {
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

export async function POST(request: Request) {
  let body: DbReadBody;

  try {
    body = (await request.json()) as DbReadBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("op" in body)
  ) {
    return NextResponse.json(
      { error: "Missing op" },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getSupabaseServiceRoleClient();
  } catch (configError) {
    return NextResponse.json(
      { error: serializeError(configError).message },
      { status: 500 }
    );
  }

  try {
    switch (body.op) {
      case "listElders":
        return NextResponse.json({
          data: await dbListElders(supabase),
        });
      case "getElder":
        return NextResponse.json({
          data: await dbGetElder(
            supabase,
            body.elderId
          ),
        });
      case "listEldersByIds":
        return NextResponse.json({
          data: await dbListEldersByIds(
            supabase,
            body.elderIds
          ),
        });
      case "listActiveSessions":
        return NextResponse.json({
          data: await dbListActiveSessions(
            supabase
          ),
        });
      case "listSessions":
        return NextResponse.json({
          data: await dbListSessions(supabase),
        });
      case "listSessionsWithSummaries":
        return NextResponse.json({
          data:
            await dbListSessionsWithSummaries(
              supabase
            ),
        });
      case "getSession":
        return NextResponse.json({
          data: await dbGetSession(
            supabase,
            body.sessionId
          ),
        });
      case "getSessionMessages":
        return NextResponse.json({
          data: await dbGetSessionMessages(
            supabase,
            body.sessionId
          ),
        });
      case "getSessionRecommendations":
        return NextResponse.json({
          data: await dbGetSessionRecommendations(
            supabase,
            body.sessionId
          ),
        });
      case "getSessionCommands":
        return NextResponse.json({
          data: await dbGetSessionCommands(
            supabase,
            body.sessionId
          ),
        });
      case "getSessionSummary":
        return NextResponse.json({
          data: await dbGetSessionSummary(
            supabase,
            body.sessionId
          ),
        });
      case "getElderSessions":
        return NextResponse.json({
          data: await dbGetElderSessions(
            supabase,
            body.elderId
          ),
        });
      case "getRecentSessions":
        return NextResponse.json({
          data: await dbGetRecentSessions(
            supabase,
            body.elderId
          ),
        });
      case "getLastEndedSession":
        return NextResponse.json({
          data: await dbGetLastEndedSession(
            supabase,
            body.elderId
          ),
        });
      default:
        return NextResponse.json(
          { error: "Unknown op" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: serializeError(error).message },
      { status: 500 }
    );
  }
}
