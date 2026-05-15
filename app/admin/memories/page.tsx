"use client";

import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  buildSessionSearchIndex,
  formatAdminDate,
  getElderLabel,
  getFamilySummaryText,
  getSessionSummaryText,
  getSessionTagSections,
} from "@/lib/admin-session-utils";
import { listEldersByIds } from "@/services/elderService";
import {
  listSessionsWithSummaries,
} from "@/services/sessionService";
import type { ElderRecord } from "@/types/elder";
import type {
  SessionWithSummaryRecord,
} from "@/types/session";

export default function AdminMemoriesPage() {
  const [sessions, setSessions] =
    useState<SessionWithSummaryRecord[]>(
      []
    );
  const [eldersById, setEldersById] =
    useState<Record<string, ElderRecord>>(
      {}
    );
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch =
    useDeferredValue(search);

  useEffect(() => {
    const load = async () => {
      try {
        const data =
          await listSessionsWithSummaries();
        const archivedSessions =
          data.filter((session) =>
            Boolean(
              getSessionSummaryText(session)
            )
          );
        const elderIds = [
          ...new Set(
            archivedSessions.map(
              (session) =>
                session.elder_id
            )
          ),
        ];
        const elders =
          elderIds.length > 0
            ? await listEldersByIds(
                elderIds
              )
            : [];

        setSessions(archivedSessions);
        setEldersById(
          elders.reduce<
            Record<string, ElderRecord>
          >((accumulator, elder) => {
            accumulator[elder.id] = elder;
            return accumulator;
          }, {})
        );
        setError(null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "기억 아카이브를 불러오지 못했어요."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const filteredSessions = useMemo(() => {
    const normalizedQuery =
      deferredSearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return sessions;
    }

    return sessions.filter((session) =>
      buildSessionSearchIndex(
        session,
        eldersById[session.elder_id]
      ).includes(normalizedQuery)
    );
  }, [
    deferredSearch,
    eldersById,
    sessions,
  ]);

  const archiveStats = useMemo(() => {
    const elderIds = new Set(
      sessions.map((session) => session.elder_id)
    );
    const tagCount = new Set(
      sessions.flatMap((session) =>
        getSessionTagSections(session).flatMap(
          (section) => section.values
        )
      )
    ).size;

    return {
      archivedCount: sessions.length,
      elderCount: elderIds.size,
      tagCount,
    };
  }, [sessions]);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              기억 아카이브
            </h1>
            <p className="mt-2 text-[#6f5d50]">
              세션 요약, 기억 단서, 가족용 정리를 한눈에 확인합니다.
            </p>
          </div>

          <Link
            href="/admin/reports"
            className="rounded-2xl bg-[#edf4ec] px-5 py-3 text-sm font-semibold text-[#5f7b62] shadow-sm"
          >
            리포트 보기
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            [
              "저장된 기억",
              `${archiveStats.archivedCount}건`,
            ],
            [
              "기억이 쌓인 어르신",
              `${archiveStats.elderCount}명`,
            ],
            [
              "누적 기억 단서",
              `${archiveStats.tagCount}개`,
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[28px] bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-[#8a7463]">
                {label}
              </p>
              <p className="mt-2 text-2xl font-black text-[#2d2a26]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[28px] bg-white p-5 shadow-sm">
          <label
            htmlFor="archive-search"
            className="text-sm font-semibold text-[#7d766d]"
          >
            어르신 이름, 시설명, 기억 단서로 검색
          </label>
          <input
            id="archive-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="예: 김영자, 떡국, 고향집"
            className="mt-3 h-12 w-full rounded-2xl border border-[#e7dfd3] bg-[#faf8f4] px-4 text-sm outline-none focus:border-[#6f9075]"
          />
        </div>

        {error && (
          <div className="mt-6 rounded-3xl bg-[#fff3ef] p-5 text-sm text-[#8a5f57] shadow-sm">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {isLoading && (
            <div className="rounded-[28px] bg-white p-6 shadow-sm">
              기억 아카이브를 불러오고 있어요.
            </div>
          )}

          {!isLoading &&
            filteredSessions.map((session) => {
              const elder =
                eldersById[
                  session.elder_id
                ] ?? null;
              const summaryText =
                getSessionSummaryText(
                  session
                ) ??
                "저장된 요약이 없습니다.";
              const familySummaryText =
                getFamilySummaryText(
                  session
                );
              const tagSections =
                getSessionTagSections(
                  session
                );

              return (
                <article
                  key={session.id}
                  className="rounded-[28px] bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#8a7463]">
                        {formatAdminDate(
                          session.started_at
                        )}{" "}
                        · session{" "}
                        {session.id.slice(0, 8)}
                      </p>
                      <h2 className="mt-2 text-2xl font-black text-[#2d2a26]">
                        {getElderLabel(elder)}
                      </h2>
                      <p className="mt-2 text-sm text-[#7d766d]">
                        {elder?.facility_name ||
                          "시설 미기록"}
                        {" · "}
                        {elder?.diagnosis ||
                          "진단 정보 미기록"}
                      </p>
                    </div>

                    <span className="rounded-full bg-[#f2eadf] px-3 py-1.5 text-xs font-bold text-[#8a715c]">
                      기억 보관됨
                    </span>
                  </div>

                  <div className="mt-5 rounded-[24px] bg-[#faf8f4] p-5">
                    <p className="text-sm font-bold text-[#8a7463]">
                      운영 요약
                    </p>
                    <p className="mt-3 text-[17px] leading-[1.85] text-[#5f5a53]">
                      {summaryText}
                    </p>
                  </div>

                  {familySummaryText &&
                    familySummaryText !==
                      summaryText && (
                      <div className="mt-4 rounded-[24px] bg-[#edf4ec] p-5">
                        <p className="text-sm font-bold text-[#5f7b62]">
                          가족 공유용 정리
                        </p>
                        <p className="mt-3 text-[16px] leading-[1.8] text-[#49604d]">
                          {
                            familySummaryText
                          }
                        </p>
                      </div>
                    )}

                  {tagSections.length > 0 && (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {tagSections.map(
                        (section) => (
                          <div
                            key={section.label}
                            className="rounded-[22px] bg-[#f8f3ea] p-4"
                          >
                            <p className="text-sm font-bold text-[#8a7463]">
                              {section.label}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {section.values.map(
                                (value) => (
                                  <span
                                    key={`${section.label}:${value}`}
                                    className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#6f5d50]"
                                  >
                                    {value}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </article>
              );
            })}

          {!isLoading &&
            filteredSessions.length === 0 && (
              <div className="rounded-[28px] bg-white p-6 shadow-sm">
                {sessions.length === 0
                  ? "아직 저장된 기억 아카이브가 없습니다."
                  : "검색 조건에 맞는 기억 아카이브가 없습니다."}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
