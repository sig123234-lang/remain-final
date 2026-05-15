import type { ElderRecord } from "@/types/elder";
import type {
  SessionSummaryRecord,
  SessionWithSummaryRecord,
} from "@/types/session";

function getTrimmedText(
  value?: string | null
) {
  const text = value?.trim();
  return text ? text : null;
}

function uniqueStrings(
  values: Array<string | null | undefined>
) {
  return [...new Set(values.filter(Boolean))] as string[];
}

export function getElderLabel(
  elder?: ElderRecord | null
) {
  return (
    elder?.display_name ||
    elder?.full_name ||
    "어르신 미확인"
  );
}

export function getPrimarySummaryRecord(
  session?:
    | SessionWithSummaryRecord
    | null
) {
  if (!session) {
    return null;
  }

  return (
    session.session_summaries?.[0] ?? null
  ) as SessionSummaryRecord | null;
}

export function getSessionSummaryText(
  session?:
    | SessionWithSummaryRecord
    | null
) {
  if (!session) {
    return null;
  }

  const summaryRecord =
    getPrimarySummaryRecord(session);

  return (
    getTrimmedText(summaryRecord?.summary) ||
    getTrimmedText(session.summary)
  );
}

export function getFamilySummaryText(
  session?:
    | SessionWithSummaryRecord
    | null
) {
  if (!session) {
    return null;
  }

  const summaryRecord =
    getPrimarySummaryRecord(session);

  return (
    getTrimmedText(
      summaryRecord?.family_friendly_summary
    ) || getSessionSummaryText(session)
  );
}

export function getSessionTagSections(
  session?:
    | SessionWithSummaryRecord
    | null
) {
  if (!session) {
    return [];
  }

  const summaryRecord =
    getPrimarySummaryRecord(session);

  return [
    {
      label: "기억 단서",
      values: uniqueStrings(
        summaryRecord?.keywords ?? []
      ),
    },
    {
      label: "사람",
      values: uniqueStrings(
        summaryRecord?.people ?? []
      ),
    },
    {
      label: "장소",
      values: uniqueStrings(
        summaryRecord?.places ?? []
      ),
    },
    {
      label: "음식",
      values: uniqueStrings(
        summaryRecord?.foods ?? []
      ),
    },
    {
      label: "계절",
      values: uniqueStrings(
        summaryRecord?.seasons ?? []
      ),
    },
    {
      label: "감정",
      values: uniqueStrings(
        summaryRecord?.emotions ?? []
      ),
    },
  ].filter(
    (section) =>
      section.values.length > 0
  );
}

export function getSessionTagList(
  session?:
    | SessionWithSummaryRecord
    | null
) {
  return getSessionTagSections(session).flatMap(
    (section) => section.values
  );
}

export function formatAdminDate(
  iso?: string | null
) {
  if (!iso) {
    return "기록 없음";
  }

  return new Date(iso).toLocaleDateString(
    "ko-KR"
  );
}

export function formatAdminDateTime(
  iso?: string | null
) {
  if (!iso) {
    return "기록 없음";
  }

  return new Date(iso).toLocaleString(
    "ko-KR"
  );
}

export function buildSessionSearchIndex(
  session: SessionWithSummaryRecord,
  elder?: ElderRecord | null
) {
  const summaryRecord =
    getPrimarySummaryRecord(session);

  return [
    elder?.display_name,
    elder?.full_name,
    elder?.facility_name,
    elder?.diagnosis,
    getSessionSummaryText(session),
    getFamilySummaryText(session),
    ...(summaryRecord?.keywords ?? []),
    ...(summaryRecord?.people ?? []),
    ...(summaryRecord?.places ?? []),
    ...(summaryRecord?.foods ?? []),
    ...(summaryRecord?.seasons ?? []),
    ...(summaryRecord?.emotions ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
