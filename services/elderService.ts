import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  CreateElderParams,
  ElderRecord,
} from "@/types/elder";

async function dbRead<T>(
  body: Record<string, unknown>
): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error(
      "Elder reads require a browser environment."
    );
  }

  const response = await fetch("/api/db/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response
    .json()
    .catch(() => ({}))) as {
    data?: T;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error || "어르신 정보를 불러오지 못했어요."
    );
  }

  return payload.data as T;
}

export async function listElders() {
  return dbRead<ElderRecord[]>({
    op: "listElders",
  });
}

/**
 * `createElder` 만 운영 DB 스키마 (`name`/`status`) 와 코드 (`full_name`/`is_active`)
 * 사이의 차이가 INSERT 단에서 직접 부딪힌다. 운영 elders 테이블은
 * `cognitive_level` / `preferred_voice` 같은 NOT NULL 컬럼이 추가로 있을 수 있어
 * 브라우저 클라이언트로 그대로 INSERT 하면 깨진다. 어르신 등록 화면을 다시 살릴
 * 때 별도 admin write API 로 옮길 예정. 지금은 호출이 없으면 그대로 두고,
 * 호출 시 명시적으로 막아 어디서 깨지는지 즉시 알 수 있게 한다.
 */
export async function createElder(
  params: CreateElderParams
): Promise<ElderRecord> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("elders")
    .insert({
      full_name: params.fullName,
      display_name: params.displayName,
      age: params.age,
      birth_year: params.birthYear,
      gender: params.gender,
      facility_name: params.facilityName,
      diagnosis: params.diagnosis,
      note: params.note,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ElderRecord;
}

export async function getElder(elderId: string) {
  return dbRead<ElderRecord>({
    op: "getElder",
    elderId,
  });
}

export async function listEldersByIds(
  elderIds: string[]
) {
  if (elderIds.length === 0) {
    return [];
  }

  return dbRead<ElderRecord[]>({
    op: "listEldersByIds",
    elderIds,
  });
}

export async function resolveActiveElderId(
  preferredElderId?: string | null
) {
  const elders = await listElders();

  if (elders.length === 0) {
    return null;
  }

  if (!preferredElderId) {
    return elders[0].id;
  }

  const matchedElder = elders.find(
    (elder) => elder.id === preferredElderId
  );

  return matchedElder?.id ?? elders[0].id;
}
