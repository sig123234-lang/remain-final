import { randomInt } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateElderParams,
  ElderRecord,
} from "@/types/elder";

export type RawElderRow = Record<
  string,
  unknown
> & {
  id: string;
  created_at: string;
};

type ElderColumnShape = {
  hasAge: boolean;
  hasBirthYear: boolean;
  hasCognitiveLevel: boolean;
  hasDiagnosis: boolean;
  hasDisplayName: boolean;
  hasEntryCode: boolean;
  hasFacilityId: boolean;
  hasFacilityName: boolean;
  hasFontSize: boolean;
  hasFullName: boolean;
  hasGender: boolean;
  hasIsActive: boolean;
  hasLifeMemo: boolean;
  hasName: boolean;
  hasNote: boolean;
  hasPreferredSeason: boolean;
  hasPreferredVoice: boolean;
  hasSpeechSpeed: boolean;
  hasStatus: boolean;
  hasUpdatedAt: boolean;
};

const ENTRY_CODE_PREFIX = "RM";
const ENTRY_CODE_DIGITS = 6;
const ENTRY_CODE_RETRIES = 12;

let elderColumnsPromise:
  | Promise<ElderColumnShape>
  | null = null;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0
    ? value
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function asBoolean(
  value: unknown,
  fallback: boolean
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

export function normalizeEntryCode(
  value: string
) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function mapElderRow(
  row: RawElderRow
): ElderRecord {
  const name =
    asString(row.full_name) ??
    asString((row as { name?: unknown }).name) ??
    "이름 없음";
  const displayName =
    asString(row.display_name) ?? name;
  const status = asString(
    (row as { status?: unknown }).status
  );
  const isActive =
    asBoolean(
      (row as { is_active?: unknown }).is_active,
      status === null ? true : status === "active"
    );
  const gender = asString(row.gender);
  const elderGender =
    gender === "male" ||
    gender === "female" ||
    gender === "other"
      ? gender
      : null;

  return {
    id: row.id,
    full_name: name,
    display_name: displayName,
    age: asNumber(row.age),
    birth_year: asNumber(row.birth_year),
    gender: elderGender,
    facility_name:
      asString(row.facility_name) ??
      asString(
        (row as { facility_id?: unknown }).facility_id
      ),
    diagnosis: asString(row.diagnosis),
    note:
      asString(row.note) ??
      asString(
        (row as { life_memo?: unknown }).life_memo
      ),
    entry_code: asString(row.entry_code),
    is_active: isActive,
    created_at: row.created_at,
    updated_at:
      asString(row.updated_at) ?? null,
  };
}

async function hasElderColumn(
  client: SupabaseClient,
  columnName: string
) {
  const { error } = await client
    .from("elders")
    .select(`id, ${columnName}`)
    .limit(1);

  if (!error) {
    return true;
  }

  if (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column/i.test(error.message)
  ) {
    return false;
  }

  throw error;
}

async function loadElderColumns(
  client: SupabaseClient
) {
  const [
    hasAge,
    hasBirthYear,
    hasCognitiveLevel,
    hasDiagnosis,
    hasDisplayName,
    hasEntryCode,
    hasFacilityId,
    hasFacilityName,
    hasFontSize,
    hasFullName,
    hasGender,
    hasIsActive,
    hasLifeMemo,
    hasName,
    hasNote,
    hasPreferredSeason,
    hasPreferredVoice,
    hasSpeechSpeed,
    hasStatus,
    hasUpdatedAt,
  ] = await Promise.all([
    hasElderColumn(client, "age"),
    hasElderColumn(client, "birth_year"),
    hasElderColumn(client, "cognitive_level"),
    hasElderColumn(client, "diagnosis"),
    hasElderColumn(client, "display_name"),
    hasElderColumn(client, "entry_code"),
    hasElderColumn(client, "facility_id"),
    hasElderColumn(client, "facility_name"),
    hasElderColumn(client, "font_size"),
    hasElderColumn(client, "full_name"),
    hasElderColumn(client, "gender"),
    hasElderColumn(client, "is_active"),
    hasElderColumn(client, "life_memo"),
    hasElderColumn(client, "name"),
    hasElderColumn(client, "note"),
    hasElderColumn(client, "preferred_season"),
    hasElderColumn(client, "preferred_voice"),
    hasElderColumn(client, "speech_speed"),
    hasElderColumn(client, "status"),
    hasElderColumn(client, "updated_at"),
  ]);

  return {
    hasAge,
    hasBirthYear,
    hasCognitiveLevel,
    hasDiagnosis,
    hasDisplayName,
    hasEntryCode,
    hasFacilityId,
    hasFacilityName,
    hasFontSize,
    hasFullName,
    hasGender,
    hasIsActive,
    hasLifeMemo,
    hasName,
    hasNote,
    hasPreferredSeason,
    hasPreferredVoice,
    hasSpeechSpeed,
    hasStatus,
    hasUpdatedAt,
  };
}

async function getElderColumns(
  client: SupabaseClient
) {
  if (!elderColumnsPromise) {
    elderColumnsPromise = loadElderColumns(
      client
    ).catch((error) => {
      elderColumnsPromise = null;
      throw error;
    });
  }

  return elderColumnsPromise;
}

function createEntryCode() {
  return `${ENTRY_CODE_PREFIX}${String(
    randomInt(0, 10 ** ENTRY_CODE_DIGITS)
  ).padStart(ENTRY_CODE_DIGITS, "0")}`;
}

async function generateUniqueEntryCode(
  client: SupabaseClient
) {
  for (
    let attempt = 0;
    attempt < ENTRY_CODE_RETRIES;
    attempt += 1
  ) {
    const entryCode = createEntryCode();
    const { data, error } = await client
      .from("elders")
      .select("id")
      .eq("entry_code", entryCode)
      .limit(1);

    if (error) {
      throw error;
    }

    if ((data ?? []).length === 0) {
      return entryCode;
    }
  }

  throw new Error(
    "입장 코드를 생성하지 못했어요. 다시 시도해 주세요."
  );
}

function buildCreatePayload(
  params: CreateElderParams,
  entryCode: string,
  columns: ElderColumnShape
) {
  const payload: Record<string, unknown> = {};
  const displayName =
    params.displayName?.trim() ||
    `${params.fullName} 어르신`;

  if (columns.hasFullName) {
    payload.full_name = params.fullName;
  }

  if (columns.hasName) {
    payload.name = params.fullName;
  }

  if (columns.hasDisplayName) {
    payload.display_name = displayName;
  }

  if (
    columns.hasAge &&
    typeof params.age === "number"
  ) {
    payload.age = params.age;
  }

  if (
    columns.hasBirthYear &&
    typeof params.birthYear === "number"
  ) {
    payload.birth_year = params.birthYear;
  }

  if (columns.hasGender && params.gender) {
    payload.gender = params.gender;
  }

  if (
    columns.hasFacilityName &&
    params.facilityName
  ) {
    payload.facility_name =
      params.facilityName;
  }

  if (columns.hasDiagnosis && params.diagnosis) {
    payload.diagnosis = params.diagnosis;
  }

  if (columns.hasNote && params.note) {
    payload.note = params.note;
  }

  if (columns.hasLifeMemo && params.note) {
    payload.life_memo = params.note;
  }

  if (columns.hasCognitiveLevel) {
    payload.cognitive_level = "general";
  }

  if (columns.hasPreferredVoice) {
    payload.preferred_voice = "warm-female";
  }

  if (columns.hasPreferredSeason) {
    payload.preferred_season = "spring";
  }

  if (columns.hasSpeechSpeed) {
    payload.speech_speed = "slow";
  }

  if (columns.hasFontSize) {
    payload.font_size = "large";
  }

  if (columns.hasIsActive) {
    payload.is_active = true;
  }

  if (columns.hasStatus) {
    payload.status = "active";
  }

  if (columns.hasUpdatedAt) {
    payload.updated_at =
      new Date().toISOString();
  }

  if (columns.hasEntryCode) {
    payload.entry_code = entryCode;
  }

  return payload;
}

function isEntryCodeConflict(error: {
  code?: string;
  message?: string;
  details?: string;
}) {
  const combinedMessage = [
    error.message,
    error.details,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    error.code === "23505" &&
    combinedMessage.includes("entry_code")
  );
}

export async function dbCreateElder(
  client: SupabaseClient,
  params: CreateElderParams
) {
  const columns = await getElderColumns(client);

  if (!columns.hasEntryCode) {
    throw new Error(
      "elders.entry_code 컬럼이 없습니다. 마이그레이션을 먼저 적용해 주세요."
    );
  }

  for (
    let attempt = 0;
    attempt < ENTRY_CODE_RETRIES;
    attempt += 1
  ) {
    const entryCode =
      await generateUniqueEntryCode(client);
    const payload = buildCreatePayload(
      params,
      entryCode,
      columns
    );

    const { data, error } = await client
      .from("elders")
      .insert(payload)
      .select("*")
      .single();

    if (!error) {
      return mapElderRow(data as RawElderRow);
    }

    if (
      isEntryCodeConflict(error)
    ) {
      continue;
    }

    throw error;
  }

  throw new Error(
    "입장 코드가 겹쳐서 등록하지 못했어요. 다시 시도해 주세요."
  );
}

export async function dbFindElderByEntryCode(
  client: SupabaseClient,
  rawEntryCode: string
) {
  const entryCode =
    normalizeEntryCode(rawEntryCode);

  if (!entryCode) {
    return null;
  }

  const columns = await getElderColumns(client);

  if (!columns.hasEntryCode) {
    throw new Error(
      "입장 코드 기능이 아직 배포되지 않았어요. 마이그레이션을 먼저 적용해 주세요."
    );
  }

  const { data, error } = await client
    .from("elders")
    .select("*")
    .eq("entry_code", entryCode)
    .limit(1);

  if (error) {
    throw error;
  }

  const row = (data ?? [])[0];

  if (!row) {
    return null;
  }

  const elder = mapElderRow(
    row as RawElderRow
  );

  return elder.is_active ? elder : null;
}
