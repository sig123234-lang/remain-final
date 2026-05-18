import ReportDetailClient from "./report-detail-client";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <ReportDetailClient
      sessionId={sessionId}
    />
  );
}
