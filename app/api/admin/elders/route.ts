import { NextResponse } from "next/server";

import { dbCreateElder } from "@/lib/elder-db-ops";
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

function asOptionalNumber(
  value: unknown
) {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return undefined;
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

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<
      string,
      unknown
    >;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const fullName =
    asOptionalString(body.fullName);
  const age = asOptionalNumber(body.age);
  const birthYear = asOptionalNumber(
    body.birthYear
  );

  if (!fullName) {
    return NextResponse.json(
      { error: "이름은 꼭 입력해 주세요." },
      { status: 400 }
    );
  }

  if (age === null || birthYear === null) {
    return NextResponse.json(
      {
        error:
          "나이와 출생년도는 숫자로 입력해 주세요.",
      },
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

  const params: CreateElderParams = {
    fullName,
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
