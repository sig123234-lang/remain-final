"use client";

import { useEffect } from "react";

/**
 * Admin 세그먼트의 클라이언트 측 crash 를 catch.
 * Next.js convention: app/admin/error.tsx 는 admin/* 하위에서 발생한
 * 어떤 React 에러든 받아 화이트 스크린/Chrome generic error 를 막는다.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Vercel function logs 에 stack 이 찍히도록.
    console.error(
      "[admin error boundary]",
      error
    );
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f1ea] px-6 text-[#2d2a26]">
      <div className="max-w-md rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <h1 className="text-2xl font-black">
          어드민 화면을 열지 못했어요
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-[#6b7280]">
          잠시 화면을 그리는 중에 문제가 생겼어요.
          아래 버튼으로 다시 시도하거나, 좌측 상단 메뉴로
          다른 화면으로 이동해 주세요.
        </p>

        {error.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-2xl bg-[#f8f5ef] p-4 text-xs text-[#7c6857]">
            {error.message}
            {error.digest
              ? `\n(digest: ${error.digest})`
              : ""}
          </pre>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded-2xl bg-[#6f9075] px-4 py-3 text-sm font-bold text-white"
          >
            다시 시도
          </button>
          <a
            href="/admin/home"
            className="flex-1 rounded-2xl bg-[#f7f4ee] px-4 py-3 text-center text-sm font-bold text-[#2d2a26]"
          >
            운영 홈으로
          </a>
        </div>
      </div>
    </div>
  );
}
