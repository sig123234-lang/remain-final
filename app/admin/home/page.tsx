"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { listElders } from "@/services/elderService";
import {
  listActiveSessions,
  listSessions,
} from "@/services/sessionService";
import type { ElderRecord } from "@/types/elder";
import type { SessionRecord } from "@/types/session";

export default function AdminHomePage() {
  const [elders, setElders] = useState<
    ElderRecord[]
  >([]);
  const [sessions, setSessions] =
    useState<SessionRecord[]>([]);
  const [activeSessions, setActiveSessions] =
    useState<SessionRecord[]>([]);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [
          nextElders,
          nextSessions,
          nextActiveSessions,
        ] = await Promise.all([
          listElders(),
          listSessions(),
          listActiveSessions(),
        ]);

        setElders(nextElders);
        setSessions(nextSessions);
        setActiveSessions(
          nextActiveSessions
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "운영 데이터를 불러오지 못했어요."
        );
      }
    };

    void load();
  }, []);

  const endedSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.status === "ended"
      ),
    [sessions]
  );

  return (
    <div className="min-h-screen p-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[42px] font-black tracking-tight">
            rem
            <span className="text-[#6f9075]">
              AI
            </span>
            n
          </h1>

          <p className="mt-1 text-[#7d766d]">
            회상 대화 운영 시스템
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-[#8b8377]">
              등록 어르신
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {elders.length}명
            </p>
          </div>

          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-[#8b8377]">
              현재 진행 중
            </p>
            <p className="mt-1 text-2xl font-semibold text-[#6f9075]">
              {activeSessions.length}개
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-3xl bg-[#fff3ef] p-5 text-sm text-[#8a5f57] shadow-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          <div className="rounded-[32px] bg-white p-7 shadow-sm">
            <h2 className="text-[32px] font-semibold">
              빠른 시작
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Link
                href="/admin/live"
                className="rounded-[24px] bg-[#f7f4ee] p-6 text-left transition hover:bg-[#f1ece3]"
              >
                <p className="text-[18px] font-semibold">
                  진행 세션 보기
                </p>
                <p className="mt-2 text-[#7e776d]">
                  실시간 협업 세션으로 이동
                </p>
              </Link>

              <Link
                href="/admin/elderly/new"
                className="rounded-[24px] bg-[#f7f4ee] p-6 text-left transition hover:bg-[#f1ece3]"
              >
                <p className="text-[18px] font-semibold">
                  어르신 등록
                </p>
                <p className="mt-2 text-[#7e776d]">
                  새 어르신 정보를 등록
                </p>
              </Link>

              <Link
                href="/admin/reports"
                className="rounded-[24px] bg-[#f7f4ee] p-6 text-left transition hover:bg-[#f1ece3]"
              >
                <p className="text-[18px] font-semibold">
                  세션 리포트
                </p>
                <p className="mt-2 text-[#7e776d]">
                  최근 세션 요약 확인
                </p>
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[32px] font-semibold">
                등록 어르신
              </h2>
              <Link
                href="/admin/elderly"
                className="text-[#6f9075]"
              >
                전체 보기
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {elders
                .slice(0, 5)
                .map((elder) => (
                  <div
                    key={elder.id}
                    className="flex items-center justify-between rounded-[24px] border border-[#ece4d8] bg-[#faf8f4] p-5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ddd] text-sm font-bold text-[#6f5d50]">
                        {(
                          elder.display_name ||
                          elder.full_name
                        ).slice(0, 1)}
                      </div>

                      <div>
                        <p className="text-[22px] font-semibold">
                          {elder.display_name ||
                            elder.full_name}
                        </p>

                        <p className="mt-1 text-[#7e776d]">
                          {elder.age
                            ? `${elder.age}세`
                            : "나이 미기록"}{" "}
                          ·{" "}
                          {elder.facility_name ||
                            "시설 미기록"}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/talk/today?elderId=${elder.id}`}
                      className="rounded-full bg-[#edf4ec] px-4 py-2 text-sm text-[#67836b]"
                    >
                      대화 시작
                    </Link>
                  </div>
                ))}

              {elders.length === 0 && (
                <div className="rounded-[24px] bg-[#faf8f4] p-5 text-[#7e776d]">
                  아직 등록된 어르신이 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[32px] font-semibold">
                최근 종료 세션
              </h2>
              <Link
                href="/admin/reports"
                className="text-[#6f9075]"
              >
                전체 보기
              </Link>
            </div>

            <div className="mt-6 space-y-5">
              {endedSessions
                .slice(0, 4)
                .map((session) => (
                  <div
                    key={session.id}
                    className="rounded-[24px] bg-[#f8f5ef] p-5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[22px] font-semibold">
                        session{" "}
                        {session.id.slice(0, 8)}
                      </p>

                      <p className="text-[#8b8377]">
                        {new Date(
                          session.started_at
                        ).toLocaleString(
                          "ko-KR"
                        )}
                      </p>
                    </div>

                    <p className="mt-3 text-[18px] leading-[1.8] text-[#5e584f]">
                      {session.summary ||
                        "요약이 아직 저장되지 않았습니다."}
                    </p>
                  </div>
                ))}

              {endedSessions.length === 0 && (
                <div className="rounded-[24px] bg-[#f8f5ef] p-5 text-[#7e776d]">
                  아직 종료된 세션이 없습니다.
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <h3 className="text-[28px] font-semibold">
              실시간 운영 상태
            </h3>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-[#f8f5ef] p-4">
                <p className="font-semibold">
                  활성 세션
                </p>
                <p className="mt-2 text-[#7d766d]">
                  {activeSessions.length}개 세션이 진행 중입니다.
                </p>
              </div>

              <div className="rounded-2xl bg-[#f8f5ef] p-4">
                <p className="font-semibold">
                  등록 완료
                </p>
                <p className="mt-2 text-[#7d766d]">
                  {elders.length}명의 어르신 프로필이 운영 중입니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <h3 className="text-[28px] font-semibold">
              바로가기
            </h3>

            <div className="mt-5 grid gap-3">
              <Link
                href="/admin/elderly/new"
                className="rounded-2xl bg-[#6f9075] px-4 py-4 text-center text-lg font-semibold text-white"
              >
                어르신 새로 등록
              </Link>
              <Link
                href="/admin/elderly"
                className="rounded-2xl bg-[#f7f4ee] px-4 py-4 text-center text-lg font-semibold"
              >
                등록 목록 보기
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
