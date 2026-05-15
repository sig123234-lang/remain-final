import type { SupabaseClient } from "@supabase/supabase-js";

import {
  deriveAgeFromBirthDate,
  deriveBirthYear,
  normalizeBirthDate,
  normalizeEntryCode,
} from "@/lib/elder-utils";
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
  hasBirthDate: boolean;
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
const META_ENTRY_CODE_PREFIX =
  "[[remain-entry-code:";
const META_BIRTH_DATE_PREFIX =
  "[[remain-birth-date:";
const META_SUFFIX = "]]";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function sanitizeFacilityName(
  value: unknown
) {
  const facilityName = asString(value);

  if (!facilityName) {
    return null;
  }

  return UUID_PATTERN.test(
    facilityName.trim()
  )
    ? null
    : facilityName;
}

function serializeMetaLine(
  prefix: string,
  value: string
) {
  return `${prefix}${value}${META_SUFFIX}`;
}

function extractEmbeddedElderMeta(
  rawMemo: string | null
) {
  if (!rawMemo) {
    return {
      birthDate: null,
      entryCode: null,
      note: null,
    };
  }

  const lines = rawMemo.split("\n");
  let entryCode: string | null = null;
  let birthDate: string | null = null;
  const contentLines: string[] = [];

  for (const line of lines) {
    if (
      line.startsWith(
        META_ENTRY_CODE_PREFIX
      ) &&
      line.endsWith(META_SUFFIX)
    ) {
      const nextEntryCode =
        normalizeEntryCode(
          line.slice(
            META_ENTRY_CODE_PREFIX.length,
            -META_SUFFIX.length
          )
        );

      entryCode =
        nextEntryCode || entryCode;
      continue;
    }

    if (
      line.startsWith(
        META_BIRTH_DATE_PREFIX
      ) &&
      line.endsWith(META_SUFFIX)
    ) {
      const nextBirthDate =
        normalizeBirthDate(
          line.slice(
            META_BIRTH_DATE_PREFIX.length,
            -META_SUFFIX.length
          )
        );

      birthDate =
        nextBirthDate || birthDate;
      continue;
    }

    contentLines.push(line);
  }

  const note = contentLines
    .join("\n")
    .trim();

  return {
    birthDate,
    entryCode,
    note: note || null,
  };
}

function buildStoredMemo(
  note: string | undefined,
  metadata: {
    birthDate?: string | null;
    entryCode?: string | null;
  }
) {
  const lines: string[] = [];

  if (metadata.entryCode) {
    lines.push(
      serializeMetaLine(
        META_ENTRY_CODE_PREFIX,
        metadata.entryCode
      )
    );
  }

  if (metadata.birthDate) {
    lines.push(
      serializeMetaLine(
        META_BIRTH_DATE_PREFIX,
        metadata.birthDate
      )
    );
  }

  if (note?.trim()) {
    lines.push(note.trim());
  }

  return lines.length > 0
    ? lines.join("\n")
    : undefined;
}

export function mapElderRow(
  row: RawElderRow,
  fallbackEntryCode?: string | null
): ElderRecord {
  const rawMemo =
    asString(row.note) ??
    asString(
      (row as { life_memo?: unknown }).life_memo
    );
  const embeddedMeta =
    extractEmbeddedElderMeta(rawMemo);
  const birthDate =
    normalizeBirthDate(
      asString(
        (row as { birth_date?: unknown })
          .birth_date
      ) ?? ""
    ) ?? embeddedMeta.birthDate;
  const derivedAge =
    birthDate
      ? deriveAgeFromBirthDate(birthDate)
      : null;
  const derivedBirthYear =
    birthDate
      ? deriveBirthYear(birthDate)
      : null;
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
    age: derivedAge ?? asNumber(row.age),
    birth_date: birthDate,
    birth_year:
      derivedBirthYear ??
      asNumber(row.birth_year),
    gender: elderGender,
    facility_name:
      sanitizeFacilityName(
        row.facility_name
      ),
    diagnosis: asString(row.diagnosis),
    note: embeddedMeta.note,
    entry_code:
      asString(row.entry_code) ??
      embeddedMeta.entryCode ??
      fallbackEntryCode ??
      null,
    is_active: isActive,
    created_at: row.created_at,
    updated_at:
      asString(row.updated_at) ?? null,
  };
}

function compareElderRows(
  left: RawElderRow,
  right: RawElderRow
) {
  const createdAtOrder =
    left.created_at.localeCompare(
      right.created_at
    );

  if (createdAtOrder !== 0) {
    return createdAtOrder;
  }

  return left.id.localeCompare(right.id);
}

function formatFallbackEntryCode(
  position: number
) {
  return `${ENTRY_CODE_PREFIX}${String(
    position
  ).padStart(ENTRY_CODE_DIGITS, "0")}`;
}

function buildFallbackEntryCodeMap(
  rows: RawElderRow[]
) {
  const orderedRows = [...rows].sort(
    compareElderRows
  );

  return new Map(
    orderedRows.map((row, index) => [
      row.id,
      formatFallbackEntryCode(index + 1),
    ])
  );
}

async function selectAllElderRows(
  client: SupabaseClient
) {
  const { data, error } = await client
    .from("elders")
    .select("*")
    .order("created_at", {
      ascending: true,
    })
    .order("id", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as RawElderRow[];
}

export async function listMappedElders(
  client: SupabaseClient
) {
  const rows = await selectAllElderRows(client);
  const fallbackEntryCodeMap =
    buildFallbackEntryCodeMap(rows);

  return rows.map((row) =>
    mapElderRow(
      row,
      fallbackEntryCodeMap.get(row.id)
    )
  );
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
    hasBirthDate,
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
    hasElderColumn(client, "birth_date"),
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
    hasBirthDate,
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

function buildCreatePayload(
  params: CreateElderParams,
  columns: ElderColumnShape
) {
  const payload: Record<string, unknown> = {};
  const displayName =
    params.displayName?.trim() ||
    `${params.fullName} 어르신`;
  const normalizedBirthDate =
    normalizeBirthDate(params.birthDate);
  const normalizedEntryCode =
    normalizeEntryCode(params.entryCode);
  const storedMemo = buildStoredMemo(
    params.note,
    {
      entryCode: columns.hasEntryCode
        ? null
        : normalizedEntryCode,
      birthDate: normalizedBirthDate,
    }
  );

  if (columns.hasFullName) {
    payload.full_name = params.fullName;
  }

  if (columns.hasName) {
    payload.name = params.fullName;
  }

  if (columns.hasDisplayName) {
    payload.display_name = displayName;
  }

  if (columns.hasAge) {
    payload.age = params.age ?? null;
  }

  if (
    columns.hasBirthDate &&
    normalizedBirthDate
  ) {
    payload.birth_date = normalizedBirthDate;
  }

  if (columns.hasBirthDate && !normalizedBirthDate) {
    payload.birth_date = null;
  }

  if (columns.hasBirthYear) {
    payload.birth_year = params.birthYear ?? null;
  }

  if (columns.hasGender) {
    payload.gender = params.gender ?? null;
  }

  if (columns.hasFacilityName) {
    payload.facility_name =
      params.facilityName ?? null;
  }

  if (columns.hasDiagnosis) {
    payload.diagnosis = params.diagnosis ?? null;
  }

  if (columns.hasNote) {
    payload.note = storedMemo ?? null;
  }

  if (columns.hasLifeMemo) {
    payload.life_memo = storedMemo ?? null;
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
    payload.entry_code = normalizedEntryCode;
  }

  return payload;
}

async function ensureEntryCodeIsAvailable(
  client: SupabaseClient,
  entryCode: string,
  excludedElderId?: string
) {
  const elders = await listMappedElders(client);
  const matchedElder = elders.find(
    (elder) =>
      elder.id !== excludedElderId &&
      elder.entry_code === entryCode
  );

  if (matchedElder) {
    throw new Error(
      "이미 사용 중인 입장 코드입니다."
    );
  }
}

export async function dbCreateElder(
  client: SupabaseClient,
  params: CreateElderParams
) {
  const columns = await getElderColumns(client);
  const entryCode =
    normalizeEntryCode(params.entryCode);
  const birthDate =
    normalizeBirthDate(params.birthDate);

  if (!entryCode) {
    throw new Error(
      "입장 코드를 올바르게 입력해 주세요."
    );
  }

  if (!birthDate) {
    throw new Error(
      "생년월일을 올바르게 입력해 주세요."
    );
  }

  if (
    !columns.hasEntryCode &&
    !columns.hasNote &&
    !columns.hasLifeMemo
  ) {
    throw new Error(
      "현재 DB 스키마에서는 입장 코드를 저장할 수 없습니다."
    );
  }

  await ensureEntryCodeIsAvailable(
    client,
    entryCode
  );

  const payload = buildCreatePayload(
    {
      ...params,
      birthDate,
      entryCode,
    },
    columns
  );
  const { data, error } = await client
    .from("elders")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const createdElder = columns.hasEntryCode
    ? mapElderRow(data as RawElderRow)
    : (await listMappedElders(client)).find(
        (elder) => elder.id === data.id
      );

  return (
    createdElder ??
    mapElderRow(data as RawElderRow)
  );
}

export async function dbUpdateElder(
  client: SupabaseClient,
  elderId: string,
  params: CreateElderParams
) {
  const columns = await getElderColumns(client);
  const entryCode =
    normalizeEntryCode(params.entryCode);
  const birthDate =
    normalizeBirthDate(params.birthDate);

  if (!entryCode) {
    throw new Error(
      "입장 코드를 올바르게 입력해 주세요."
    );
  }

  if (!birthDate) {
    throw new Error(
      "생년월일을 올바르게 입력해 주세요."
    );
  }

  if (
    !columns.hasEntryCode &&
    !columns.hasNote &&
    !columns.hasLifeMemo
  ) {
    throw new Error(
      "현재 DB 스키마에서는 입장 코드를 저장할 수 없습니다."
    );
  }

  await ensureEntryCodeIsAvailable(
    client,
    entryCode,
    elderId
  );

  const payload = buildCreatePayload(
    {
      ...params,
      birthDate,
      entryCode,
    },
    columns
  );
  const { data, error } = await client
    .from("elders")
    .update(payload)
    .eq("id", elderId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const updatedElder = columns.hasEntryCode
    ? mapElderRow(data as RawElderRow)
    : (await listMappedElders(client)).find(
        (elder) => elder.id === elderId
      );

  return (
    updatedElder ??
    mapElderRow(data as RawElderRow)
  );
}

export async function dbDeactivateElder(
  client: SupabaseClient,
  elderId: string
) {
  const columns = await getElderColumns(client);
  const payload: Record<string, unknown> = {};

  if (columns.hasIsActive) {
    payload.is_active = false;
  }

  if (columns.hasStatus) {
    payload.status = "inactive";
  }

  if (columns.hasUpdatedAt) {
    payload.updated_at =
      new Date().toISOString();
  }

  if (Object.keys(payload).length === 0) {
    throw new Error(
      "현재 DB 스키마에서는 어르신을 삭제할 수 없습니다."
    );
  }

  const { error } = await client
    .from("elders")
    .update(payload)
    .eq("id", elderId);

  if (error) {
    throw error;
  }
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
    const elders = await listMappedElders(client);
    return (
      elders.find(
        (elder) =>
          elder.is_active &&
          elder.entry_code === entryCode
      ) ?? null
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
    const elders = await listMappedElders(client);
    return (
      elders.find(
        (elder) =>
          elder.is_active &&
          elder.entry_code === entryCode
      ) ?? null
    );
  }

  const elder = mapElderRow(
    row as RawElderRow
  );

  return elder.is_active ? elder : null;
}
