"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import { listElders } from "@/services/elderService";
import type { ElderRecord } from "@/types/elder";

export default function AdminElderlyPage() {
  const [elders, setElders] = useState<
    ElderRecord[]
  >([]);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data =
          await listElders();
        setElders(data);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "어르신 목록을 불러오지 못했어요."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              어르신 관리
            </h1>
            <p className="mt-2 text-[#6f5d50]">
              등록된 어르신 정보를 보고 바로 회상 세션을 시작할 수 있어요.
            </p>
          </div>

          <Link
            href="/admin/elderly/new"
            className="rounded-2xl bg-[#6f9075] px-5 py-3 text-sm font-semibold text-white shadow-sm"
          >
            새 어르신 등록
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-3xl bg-[#fff3ef] p-5 text-sm text-[#8a5f57] shadow-sm">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {isLoading && (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              목록을 불러오고 있어요.
            </div>
          )}

          {!isLoading &&
            elders.length === 0 && (
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                아직 등록된 어르신이 없습니다.
              </div>
            )}

          {elders.map((elder) => (
            <div
              key={elder.id}
              className="rounded-[28px] bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#8a7463]">
                    elder {elder.id.slice(0, 8)}
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    {elder.display_name ||
                      elder.full_name}
                  </h2>
                  <p className="mt-2 text-[#6f5d50]">
                    {elder.age
                      ? `${elder.age}세`
                      : "나이 미기록"}{" "}
                    ·{" "}
                    {elder.facility_name ||
                      "시설 미기록"}{" "}
                    ·{" "}
                    {elder.diagnosis ||
                      "진단 정보 없음"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/talk/story?elderId=${elder.id}`}
                    className="rounded-xl bg-[#6f9075] px-4 py-3 text-sm font-semibold text-white"
                  >
                    대화 시작
                  </Link>
                  <Link
                    href="/admin/live"
                    className="rounded-xl bg-[#f7f4ee] px-4 py-3 text-sm font-semibold"
                  >
                    운영 패널
                  </Link>
                </div>
              </div>

              {elder.note && (
                <div className="mt-5 rounded-2xl bg-[#faf8f4] p-4 text-sm leading-6 text-[#5f5a53]">
                  {elder.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
