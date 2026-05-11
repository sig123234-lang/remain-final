import Link from "next/link";

import AdminLiveSessionClient from "./session-client";

export default async function AdminLiveSessionPage({
  params,
}: {
  params: Promise<{
    sessionId: string;
  }>;
}) {
  const { sessionId } = await params;

  return (
    <>
      <div className="px-5 pt-5">
        <Link
          href="/admin/live"
          className="inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#6f5d50] shadow-sm"
        >
          실시간 세션 목록
        </Link>
      </div>

      <AdminLiveSessionClient
        sessionId={sessionId}
      />
    </>
  );
}
