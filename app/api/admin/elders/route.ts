import { NextResponse } from "next/server";

import {
  dbCreateElder,
  dbDeactivateElder,
  dbUpdateElder,
} from "@/lib/elder-db-ops";
import {
  deriveAgeFromBirthDate,
  deriveBirthYear,
  normalizeBirthDate,
  normalizeEntryCode,
} from "@/lib/elder-utils";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type {
  CreateElderParams,
  ElderGender,
} from "@/types/elder";

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

function asOptionalString(
  value: unknown
) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function asOptionalGender(
  value: unknown
) {
  return value === "female" ||
    value === "male" ||
    value === "other"
    ? (value as ElderGender)
    : undefined;
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

function buildParams(
  body: Record<string, unknown>
): CreateElderParams | null {
  const fullName =
    asOptionalString(body.fullName);
  const entryCode =
    normalizeEntryCode(
      asOptionalString(body.entryCode) ?? ""
    );
  const birthDate =
    normalizeBirthDate(
      asOptionalString(body.birthDate) ?? ""
    );

  if (!fullName || !entryCode || !birthDate) {
    return null;
  }

  const age =
    deriveAgeFromBirthDate(birthDate);
  const birthYear =
    deriveBirthYear(birthDate);

  if (age === null || birthYear === null) {
    return null;
  }

  const params: CreateElderParams = {
    fullName,
    entryCode,
    birthDate,
    displayName: asOptionalString(
      body.displayName
    ),
    age,
    birthYear,
    gender: asOptionalGender(body.gender),
    facilityName: asOptionalString(
      body.facilityName
    ),
    diagnosis: asOptionalString(
      body.diagnosis
    ),
    note: asOptionalString(body.note),
  };

  return params;
}

function validateParams(
  body: Record<string, unknown>
) {
  const fullName =
    asOptionalString(body.fullName);
  const entryCode =
    normalizeEntryCode(
      asOptionalString(body.entryCode) ?? ""
    );
  const birthDate =
    normalizeBirthDate(
      asOptionalString(body.birthDate) ?? ""
    );

  if (!fullName) {
    return "이름은 꼭 입력해 주세요.";
  }

  if (!entryCode) {
    return "입장 코드를 올바르게 입력해 주세요.";
  }

  if (!birthDate) {
    return "생년월일을 올바르게 입력해 주세요.";
  }

  const age =
    deriveAgeFromBirthDate(birthDate);
  const birthYear =
    deriveBirthYear(birthDate);

  if (age === null || birthYear === null) {
    return "생년월일을 기준으로 나이를 계산하지 못했어요.";
  }

  return null;
}

function getSupabaseOrError() {
  try {
    return {
      supabase:
        getSupabaseServiceRoleClient(),
      errorResponse: null,
    };
  } catch (configError) {
    return {
      supabase: null,
      errorResponse: NextResponse.json(
        {
          error:
            serializeError(configError).message,
        },
        { status: 500 }
      ),
    };
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validationError =
    validateParams(body);

  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400 }
    );
  }

  const params = buildParams(body);

  if (!params) {
    return NextResponse.json(
      {
        error:
          "어르신 정보를 해석하지 못했어요.",
      },
      { status: 400 }
    );
  }

  const { supabase, errorResponse } =
    getSupabaseOrError();

  if (errorResponse || !supabase) {
    return (
      errorResponse ??
      NextResponse.json(
        { error: "Server Supabase is not configured." },
        { status: 500 }
      )
    );
  }

  try {
    const elder = await dbCreateElder(
      supabase,
      params
    );

    return NextResponse.json({
      data: elder,
    });
  } catch (error) {
    return NextResponse.json(
      { error: serializeError(error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const body = await readBody(request);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const elderId =
    asOptionalString(body.elderId);

  if (!elderId) {
    return NextResponse.json(
      {
        error:
          "수정할 어르신 ID가 필요합니다.",
      },
      { status: 400 }
    );
  }

  const validationError =
    validateParams(body);

  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400 }
    );
  }

  const params = buildParams(body);

  if (!params) {
    return NextResponse.json(
      {
        error:
          "어르신 정보를 해석하지 못했어요.",
      },
      { status: 400 }
    );
  }

  const { supabase, errorResponse } =
    getSupabaseOrError();

  if (errorResponse || !supabase) {
    return (
      errorResponse ??
      NextResponse.json(
        { error: "Server Supabase is not configured." },
        { status: 500 }
      )
    );
  }

  try {
    const elder = await dbUpdateElder(
      supabase,
      elderId,
      params
    );

    return NextResponse.json({
      data: elder,
    });
  } catch (error) {
    return NextResponse.json(
      { error: serializeError(error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const body = await readBody(request);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const elderId =
    asOptionalString(body.elderId);

  if (!elderId) {
    return NextResponse.json(
      {
        error:
          "삭제할 어르신 ID가 필요합니다.",
      },
      { status: 400 }
    );
  }

  const { supabase, errorResponse } =
    getSupabaseOrError();

  if (errorResponse || !supabase) {
    return (
      errorResponse ??
      NextResponse.json(
        { error: "Server Supabase is not configured." },
        { status: 500 }
      )
    );
  }

  try {
    await dbDeactivateElder(
      supabase,
      elderId
    );

    return NextResponse.json({
      data: { ok: true },
    });
  } catch (error) {
    return NextResponse.json(
      { error: serializeError(error).message },
      { status: 500 }
    );
  }
}
