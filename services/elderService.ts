import type {
  CreateElderParams,
  ElderRecord,
} from "@/types/elder";

export interface ElderLoginResult {
  id: string;
  displayName: string;
}

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

async function postJson<T>(
  url: string,
  body: object,
  fallbackMessage: string
): Promise<T> {
  const response = await fetch(url, {
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
      payload.error || fallbackMessage
    );
  }

  return payload.data as T;
}

export async function listElders() {
  return dbRead<ElderRecord[]>({
    op: "listElders",
  });
}

export async function createElder(
  params: CreateElderParams
): Promise<ElderRecord> {
  return postJson<ElderRecord>(
    "/api/admin/elders",
    params,
    "어르신 등록에 실패했어요."
  );
}

export async function getElder(elderId: string) {
  return dbRead<ElderRecord>({
    op: "getElder",
    elderId,
  });
}

export async function findElderByEntryCode(
  entryCode: string
) {
  return postJson<ElderLoginResult>(
    "/api/talk/login",
    { entryCode },
    "입장 코드를 확인하지 못했어요."
  );
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
