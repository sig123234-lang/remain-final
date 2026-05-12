import type { SupabaseClient } from "@supabase/supabase-js";

import { SESSION_SELECT } from "@/lib/session-db-ops";
import type { ElderRecord } from "@/types/elder";
import type {
  SessionCommandRecord,
  SessionMessageRecord,
  SessionRecommendationRecord,
  SessionRecord,
  SessionSummaryRecord,
} from "@/types/session";

/**
 * 운영 DB 의 `elders` 스키마가 로컬 마이그레이션과 어긋난다.
 * 운영: id, facility_id, name, birth_year, age, gender, cognitive_level,
 *        preferred_voice, preferred_season, speech_speed, font_size,
 *        life_memo, taboo_topics, status, created_at
 * 코드: id, full_name, display_name, age, birth_year, gender, facility_name,
 *        diagnosis, note, is_active, created_at, updated_at
 *
 * 어느 쪽 스키마든 컬럼 누락 에러가 나지 않게, 행을 통째로 받아서
 * 코드가 기대하는 ElderRecord 모양으로 매핑한다.
 */
type RawElderRow = Record<string, unknown> & {
  id: string;
  created_at: string;
};

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

function mapElderRow(row: RawElderRow): ElderRecord {
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
      // production 스키마는 is_active 가 없고 status 로 활성 여부를 표현
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
    is_active: isActive,
    created_at: row.created_at,
    updated_at:
      asString(row.updated_at) ?? null,
  };
}

async function selectElders(client: SupabaseClient) {
  const { data, error } = await client
    .from("elders")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as RawElderRow[];
}

export async function dbListElders(
  client: SupabaseClient
) {
  const rows = await selectElders(client);
  return rows
    .map(mapElderRow)
    .filter((elder) => elder.is_active);
}

export async function dbGetElder(
  client: SupabaseClient,
  elderId: string
) {
  const { data, error } = await client
    .from("elders")
    .select("*")
    .eq("id", elderId)
    .single();

  if (error) {
    throw error;
  }

  return mapElderRow(data as RawElderRow);
}

export async function dbListEldersByIds(
  client: SupabaseClient,
  elderIds: string[]
) {
  if (elderIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("elders")
    .select("*")
    .in("id", elderIds);

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawElderRow[]).map(
    mapElderRow
  );
}

export async function dbGetSession(
  client: SupabaseClient,
  sessionId: string
) {
  const { data, error } = await client
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .single();

  if (error) {
    throw error;
  }

  return data as unknown as SessionRecord;
}

export async function dbListActiveSessions(
  client: SupabaseClient
) {
  const { data, error } = await client
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("status", "active")
    .order("last_activity_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as SessionRecord[];
}

export async function dbListSessions(
  client: SupabaseClient
) {
  const { data, error } = await client
    .from("sessions")
    .select(SESSION_SELECT)
    .order("started_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as SessionRecord[];
}

export async function dbGetSessionMessages(
  client: SupabaseClient,
  sessionId: string
) {
  const { data, error } = await client
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as SessionMessageRecord[];
}

export async function dbGetSessionRecommendations(
  client: SupabaseClient,
  sessionId: string
) {
  const { data, error } = await client
    .from("session_recommendations")
    .select("*")
    .eq("session_id", sessionId)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .order("rank", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as SessionRecommendationRecord[];
}

export async function dbGetSessionCommands(
  client: SupabaseClient,
  sessionId: string
) {
  const { data, error } = await client
    .from("session_commands")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as SessionCommandRecord[];
}

export async function dbGetSessionSummary(
  client: SupabaseClient,
  sessionId: string
) {
  const { data, error } = await client
    .from("session_summaries")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as
    | SessionSummaryRecord
    | null;
}

export async function dbGetElderSessions(
  client: SupabaseClient,
  elderId: string
) {
  const { data, error } = await client
    .from("sessions")
    .select(`${SESSION_SELECT}, messages (*)`)
    .eq("elder_id", elderId)
    .order("started_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function dbGetRecentSessions(
  client: SupabaseClient,
  elderId: string
) {
  const { data, error } = await client
    .from("sessions")
    .select(
      `${SESSION_SELECT}, session_summaries (*)`
    )
    .eq("elder_id", elderId)
    .order("started_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
