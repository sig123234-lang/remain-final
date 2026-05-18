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
  formatAdminDateTime,
  getElderLabel,
  getSessionSummaryText,
  getSessionTagList,
} from "@/lib/admin-session-utils";
import { listEldersByIds } from "@/services/elderService";
import {
  listSessionsWithSummaries,
} from "@/services/sessionService";
import type { ElderRecord } from "@/types/elder";
import type {
  SessionWithSummaryRecord,
} from "@/types/session";

function getRiskLabel(
  session: SessionWithSummaryRecord
) {
  return (
    session.current_state?.riskLevel ||
    "low"
  );
}

function getDepthLabel(
  session: SessionWithSummaryRecord
) {
  return `L${
    session.current_state?.depthLevel || 1
  }`;
}

export default function AdminReportsPage() {
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
        const endedSessions =
          data.filter(
            (session) =>
              session.status === "ended"
          );
        const elderIds = [
          ...new Set(
            endedSessions.map(
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

        setSessions(endedSessions);
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
            : "세션 리포트를 불러오지 못했어요."
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

  const reportStats = useMemo(() => {
    const withSummaryCount =
      sessions.filter((session) =>
        Boolean(
          getSessionSummaryText(session)
        )
      ).length;
    const highRiskCount =
      sessions.filter((session) =>
        ["high", "medium"].includes(
          getRiskLabel(session)
        )
      ).length;
    const averageDepth =
      sessions.length === 0
        ? 0
        : sessions.reduce(
            (accumulator, session) =>
              accumulator +
              (session.current_state
                ?.depthLevel || 1),
            0
          ) / sessions.length;

    return {
      endedCount: sessions.length,
      withSummaryCount,
      highRiskCount,
      averageDepth:
        averageDepth > 0
          ? averageDepth.toFixed(1)
          : "0.0",
    };
  }, [sessions]);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-4xl font-black tracking-tight">
            세션 리포트
          </h1>
          <p className="mt-2 text-[#6f5d50]">
            종료된 세션의 요약, 위험도, 감정 흐름을 확인합니다.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            [
              "종료 세션",
              `${reportStats.endedCount}건`,
            ],
            [
              "요약 저장됨",
              `${reportStats.withSummaryCount}건`,
            ],
            [
              "주의 필요 세션",
              `${reportStats.highRiskCount}건`,
            ],
            [
              "평균 대화 깊이",
              `L${reportStats.averageDepth}`,
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
            htmlFor="report-search"
            className="text-sm font-semibold text-[#7d766d]"
          >
            어르신 이름, 요약, 감정 단서로 검색
          </label>
          <input
            id="report-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            placeholder="예: 이화상, nostalgic, 겨울 음식"
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
              세션 리포트를 불러오고 있어요.
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
                "요약이 아직 저장되지 않았습니다.";
              const tags =
                getSessionTagList(session).slice(
                  0,
                  8
                );
              const facilitatorNote =
                session.current_state
                  ?.facilitatorNote;

              return (
                <article
                  key={session.id}
                  className="rounded-[28px] bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <Link
                    href={`/admin/reports/${session.id}`}
                    className="mb-3 inline-flex items-center gap-1 rounded-full bg-[#edf4ec] px-3 py-1.5 text-xs font-bold text-[#5f7b62] hover:brightness-105"
                  >
                    상세 리포트 + 전체 대화 보기 →
                  </Link>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#8a7463]">
                        종료 시각{" "}
                        {formatAdminDateTime(
                          session.ended_at ||
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

                    <div className="flex flex-wrap gap-2">
                      {[
                        `모드 ${
                          session.mode ===
                          "collab"
                            ? "협업"
                            : "자율"
                        }`,
                        `깊이 ${getDepthLabel(
                          session
                        )}`,
                        `위험 ${getRiskLabel(
                          session
                        )}`,
                        `감정 ${
                          session.detected_emotion ||
                          session.current_state
                            ?.emotionDetected ||
                          "neutral"
                        }`,
                      ].map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-[#f2eadf] px-3 py-1.5 text-xs font-bold text-[#8a715c]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-[24px] bg-[#faf8f4] p-5">
                    <p className="text-sm font-bold text-[#8a7463]">
                      세션 요약
                    </p>
                    <p className="mt-3 text-[17px] leading-[1.85] text-[#5f5a53]">
                      {summaryText}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[22px] bg-[#f8f3ea] p-4">
                      <p className="text-sm font-bold text-[#8a7463]">
                        현재 액션
                      </p>
                      <p className="mt-2 text-base font-semibold text-[#2d2a26]">
                        {session.current_state
                          ?.action ||
                          "continue"}
                      </p>
                    </div>

                    <div className="rounded-[22px] bg-[#f8f3ea] p-4">
                      <p className="text-sm font-bold text-[#8a7463]">
                        마지막 화자
                      </p>
                      <p className="mt-2 text-base font-semibold text-[#2d2a26]">
                        {session.current_state
                          ?.lastSpeaker ||
                          "assistant"}
                      </p>
                    </div>

                    <div className="rounded-[22px] bg-[#f8f3ea] p-4">
                      <p className="text-sm font-bold text-[#8a7463]">
                        대화 턴
                      </p>
                      <p className="mt-2 text-base font-semibold text-[#2d2a26]">
                        {session.current_turn ??
                          session.current_state
                            ?.turnCount ??
                          0}
                      </p>
                    </div>
                  </div>

                  {facilitatorNote && (
                    <div className="mt-4 rounded-[22px] bg-[#edf4ec] p-4">
                      <p className="text-sm font-bold text-[#5f7b62]">
                        진행 메모
                      </p>
                      <p className="mt-2 text-[15px] leading-[1.8] text-[#49604d]">
                        {facilitatorNote}
                      </p>
                    </div>
                  )}

                  {tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={`${session.id}:${tag}`}
                          className="rounded-full bg-[#edf4ec] px-3 py-1.5 text-sm font-semibold text-[#5f7b62]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}

          {!isLoading &&
            filteredSessions.length === 0 && (
              <div className="rounded-[28px] bg-white p-6 shadow-sm">
                {sessions.length === 0
                  ? "아직 리포트 가능한 종료 세션이 없습니다."
                  : "검색 조건에 맞는 리포트가 없습니다."}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
