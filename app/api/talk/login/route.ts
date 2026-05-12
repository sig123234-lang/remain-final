import { NextResponse } from "next/server";

import { dbFindElderByEntryCode } from "@/lib/elder-db-ops";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

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
  let body: { entryCode?: unknown };

  try {
    body = (await request.json()) as {
      entryCode?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const entryCode =
    typeof body.entryCode === "string"
      ? body.entryCode
      : "";

  if (!entryCode.trim()) {
    return NextResponse.json(
      { error: "입장 코드를 입력해 주세요." },
      { status: 400 }
    );
  }

  let supabase;

  try {
    supabase = getSupabaseServiceRoleClient();
  } catch (configError) {
    return NextResponse.json(
      {
        error:
          serializeError(configError).message,
      },
      { status: 500 }
    );
  }

  try {
    const elder =
      await dbFindElderByEntryCode(
        supabase,
        entryCode
      );

    if (!elder) {
      return NextResponse.json(
        {
          error:
            "입장 코드를 다시 확인해 주세요.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: elder.id,
        displayName:
          elder.display_name ||
          elder.full_name,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: serializeError(error).message },
      { status: 500 }
    );
  }
}
