import type { SupabaseClient } from "@supabase/supabase-js";

import {
  listMappedElders,
} from "@/lib/elder-db-ops";
import { SESSION_SELECT } from "@/lib/session-db-ops";
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

export async function dbListElders(
  client: SupabaseClient
) {
  const elders = await listMappedElders(client);
  return elders
    .filter((elder) => elder.is_active);
}

export async function dbGetElder(
  client: SupabaseClient,
  elderId: string
) {
  const elders = await listMappedElders(client);
  const elder = elders.find(
    (item) => item.id === elderId
  );

  if (!elder) {
    throw new Error(
      "어르신 정보를 찾지 못했어요."
    );
  }

  return elder;
}

export async function dbListEldersByIds(
  client: SupabaseClient,
  elderIds: string[]
) {
  if (elderIds.length === 0) {
    return [];
  }

  const elders = await listMappedElders(client);
  const targetIds = new Set(elderIds);

  return elders.filter((elder) =>
    targetIds.has(elder.id)
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
