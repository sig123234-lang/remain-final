"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getElder } from "@/services/elderService";
import {
  getSessionSnapshot,
} from "@/services/sessionService";
import type { ElderRecord } from "@/types/elder";
import type {
  SessionMessageRecord,
  SessionSnapshot,
} from "@/types/session";

function formatDateLong(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(
      "ko-KR",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return value;
  }
}

function formatTime(value?: string | null) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString(
      "ko-KR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return "";
  }
}

function durationMinutes(
  start?: string | null,
  end?: string | null
): string {
  if (!start) return "—";
  try {
    const startMs = new Date(start).getTime();
    const endMs = end
      ? new Date(end).getTime()
      : Date.now();
    const minutes = Math.max(
      0,
      Math.round((endMs - startMs) / 60000)
    );
    if (minutes < 1) return "1분 미만";
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem === 0
      ? `${hours}시간`
      : `${hours}시간 ${rem}분`;
  } catch {
    return "—";
  }
}

function buildTranscriptText(
  messages: SessionMessageRecord[]
): string {
  return messages
    .map((message) => {
      const speaker =
        message.role === "user"
          ? "어르신"
          : message.role === "assistant"
            ? "이야기 도우미"
            : message.role;
      const time = formatTime(
        message.created_at
      );
      return `[${time}] ${speaker}\n${message.content}\n`;
    })
    .join("\n");
}

function buildReportMarkdown({
  elderName,
  facility,
  diagnosis,
  startedAt,
  endedAt,
  durationLabel,
  turnCount,
  summary,
  emotions,
  keywords,
  people,
  places,
  facilitatorNote,
  messages,
}: {
  elderName: string;
  facility: string;
  diagnosis: string;
  startedAt: string;
  endedAt: string;
  durationLabel: string;
  turnCount: number;
  summary: string;
  emotions: string[];
  keywords: string[];
  people: string[];
  places: string[];
  facilitatorNote: string;
  messages: SessionMessageRecord[];
}): string {
  const tagLine = (items: string[]) =>
    items.length > 0
      ? items.join(", ")
      : "(기록 없음)";

  return `# 회상 대화 보고서

## 어르신
- 이름: ${elderName}
- 시설: ${facility}
- 메모/진단: ${diagnosis}

## 세션 정보
- 시작: ${startedAt}
- 종료: ${endedAt}
- 소요 시간: ${durationLabel}
- 총 대화 턴: ${turnCount}

## 오늘의 요약
${summary || "(요약이 저장되지 않았습니다.)"}

## 다뤄진 감정
${tagLine(emotions)}

## 주요 키워드
${tagLine(keywords)}

## 등장한 인물
${tagLine(people)}

## 등장한 장소
${tagLine(places)}

${
  facilitatorNote
    ? `## 진행자 메모\n${facilitatorNote}\n`
    : ""
}

---

## 전체 대화

${buildTranscriptText(messages)}
---
이 보고서는 remAIn 시스템이 자동 생성한 회상 대화 기록입니다.
`;
}

type GuardianReport = {
  guardianReport?: {
    header?: {
      elderlyName?: string;
      sessionDate?: string;
      sessionNumber?: number | string;
      greeting?: string;
    };
    conversationOverview?: {
      summary?: string;
      mainTopics?: string[];
      duration?: string;
    };
    emotionalStateScore?: {
      score?: number;
      label?: string;
      basis?: string;
      note?: string;
    };
    impressiveExcerpts?: Array<{
      context?: string;
      elderlyQuote?: string;
      significance?: string;
    }>;
    memoryImagePrompt?: {
      description?: string;
      imageGenerationPrompt?: string;
      sourceMemory?: string;
      style?: string;
    } | null;
    nextSessionPreview?: {
      text?: string;
      scheduledDate?: string | null;
    };
    closingNote?: string;
  };
};

function downloadFile(
  filename: string,
  content: string,
  mime: string
) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], {
    type: `${mime};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ReportDetailClient({
  sessionId,
}: {
  sessionId: string;
}) {
  const [snapshot, setSnapshot] =
    useState<SessionSnapshot | null>(null);
  const [elder, setElder] =
    useState<ElderRecord | null>(null);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] = useState<
    string | null
  >(null);
  const [guardianReport, setGuardianReport] =
    useState<GuardianReport | null>(null);
  const [
    isGeneratingGuardian,
    setIsGeneratingGuardian,
  ] = useState(false);
  const [
    guardianError,
    setGuardianError,
  ] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getSessionSnapshot(
          sessionId
        );
        if (cancelled) return;
        setSnapshot(snap);

        if (snap.session.elder_id) {
          try {
            const e = await getElder(
              snap.session.elder_id
            );
            if (!cancelled) setElder(e);
          } catch {
            /* elder 없으면 그대로 진행 */
          }
        }
        setError(null);
      } catch (caughtError) {
        if (cancelled) return;
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "리포트를 불러오지 못했어요."
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const orderedMessages = useMemo(() => {
    const msgs =
      snapshot?.messages ?? [];
    return msgs.slice().sort((a, b) => {
      const t = (a.created_at || "").localeCompare(
        b.created_at || ""
      );
      if (t !== 0) return t;
      if (
        (a.turn_index ?? 0) !==
        (b.turn_index ?? 0)
      ) {
        return (
          (a.turn_index ?? 0) -
          (b.turn_index ?? 0)
        );
      }
      return (
        (a.sequence_in_turn ?? 0) -
        (b.sequence_in_turn ?? 0)
      );
    });
  }, [snapshot?.messages]);

  const summary = useMemo(() => {
    return (
      snapshot?.summary?.family_friendly_summary ||
      snapshot?.summary?.summary ||
      snapshot?.session.summary ||
      ""
    );
  }, [snapshot]);

  const emotions =
    snapshot?.summary?.emotions ?? [];
  const keywords =
    snapshot?.summary?.keywords ?? [];
  const people = snapshot?.summary?.people ?? [];
  const places = snapshot?.summary?.places ?? [];
  const facilitatorNote =
    snapshot?.session.current_state
      ?.facilitatorNote ?? "";

  const elderName =
    elder?.display_name ||
    elder?.full_name ||
    "어르신";
  const facility =
    elder?.facility_name || "시설 미기록";
  const diagnosis =
    elder?.note ||
    elder?.diagnosis ||
    "추가 메모 없음";

  const startedAt = formatDateLong(
    snapshot?.session.started_at
  );
  const endedAt = formatDateLong(
    snapshot?.session.ended_at
  );
  const durationLabel = durationMinutes(
    snapshot?.session.started_at,
    snapshot?.session.ended_at
  );
  const turnCount =
    snapshot?.session.current_turn ??
    snapshot?.session.current_state?.turnCount ??
    orderedMessages.filter(
      (m) => m.role === "user"
    ).length;
  const elderTurns = orderedMessages.filter(
    (m) => m.role === "user"
  ).length;
  const aiTurns = orderedMessages.filter(
    (m) => m.role === "assistant"
  ).length;

  const baseFileName = `remain_report_${elderName}_${snapshot?.session.started_at?.slice(0, 10) || "session"}_${sessionId.slice(0, 8)}`;

  const handleDownloadText = () => {
    const content = buildReportMarkdown({
      elderName,
      facility,
      diagnosis,
      startedAt,
      endedAt,
      durationLabel,
      turnCount,
      summary,
      emotions,
      keywords,
      people,
      places,
      facilitatorNote,
      messages: orderedMessages,
    });
    downloadFile(
      `${baseFileName}.md`,
      content,
      "text/markdown"
    );
  };

  const handleDownloadTranscript = () => {
    const transcript = buildTranscriptText(
      orderedMessages
    );
    downloadFile(
      `${baseFileName}_대화내용.txt`,
      `회상 대화 전체 기록\n어르신: ${elderName}\n시작: ${startedAt}\n종료: ${endedAt}\n\n${transcript}`,
      "text/plain"
    );
  };

  const handlePrint = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  const handleGenerateGuardianReport = async () => {
    if (
      isGeneratingGuardian ||
      !snapshot ||
      !sessionId
    )
      return;
    setIsGeneratingGuardian(true);
    setGuardianError(null);
    try {
      const response = await fetch(
        "/api/session/guardian-report",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        }
      );
      const payload = (await response
        .json()
        .catch(() => ({}))) as {
        data?: GuardianReport;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error ||
            "보호자 리포트를 생성하지 못했어요."
        );
      }
      setGuardianReport(payload.data);
    } catch (caughtError) {
      setGuardianError(
        caughtError instanceof Error
          ? caughtError.message
          : "보호자 리포트 생성 중 오류"
      );
    } finally {
      setIsGeneratingGuardian(false);
    }
  };

  const handleDownloadGuardianReport = () => {
    if (!guardianReport?.guardianReport) return;
    const gr = guardianReport.guardianReport;
    const sections: string[] = [];
    sections.push(
      `# 보호자 리포트 — ${gr.header?.elderlyName || elderName}`
    );
    if (gr.header?.greeting) {
      sections.push(`\n${gr.header.greeting}`);
    }
    if (gr.conversationOverview?.summary) {
      sections.push(
        `\n## 오늘의 이야기\n${gr.conversationOverview.summary}`
      );
    }
    if (
      gr.conversationOverview?.mainTopics
        ?.length
    ) {
      sections.push(
        `\n주요 주제: ${gr.conversationOverview.mainTopics.join(", ")}`
      );
    }
    if (gr.conversationOverview?.duration) {
      sections.push(
        `대화 시간: ${gr.conversationOverview.duration}`
      );
    }
    if (gr.emotionalStateScore) {
      const e = gr.emotionalStateScore;
      sections.push(
        `\n## 오늘의 컨디션 — ${e.score ?? "?"} / 100\n${e.label || ""}\n${e.basis || ""}\n${e.note || ""}`
      );
    }
    if (gr.impressiveExcerpts?.length) {
      sections.push(`\n## 인상 깊었던 순간`);
      gr.impressiveExcerpts.forEach((ex) => {
        sections.push(
          `\n- ${ex.context || ""}\n  "${ex.elderlyQuote || ""}"\n  — ${ex.significance || ""}`
        );
      });
    }
    if (gr.nextSessionPreview?.text) {
      sections.push(
        `\n## 다음 시간\n${gr.nextSessionPreview.text}`
      );
    }
    if (gr.closingNote) {
      sections.push(`\n${gr.closingNote}`);
    }
    downloadFile(
      `${baseFileName}_보호자리포트.md`,
      sections.join("\n"),
      "text/markdown"
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f1ea] py-8 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 16mm 14mm; size: A4; }
          body { background: white !important; }
          .report-card { box-shadow: none !important; border: none !important; }
          /* 배경색이 PDF/인쇄에 그대로 찍히게 한다. 이게 없으면 어르신 답변의
             초록색 배경이 빠지고 흰 박스 + 글자만 나옴. */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-6 print:max-w-full print:px-0">
        {/* 액션 버튼 */}
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/reports"
            className="text-sm font-semibold text-[#6f9075] hover:underline"
          >
            ← 리포트 목록
          </Link>

          {!isLoading && snapshot && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-xl bg-[#6f9075] px-4 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110"
              >
                인쇄 (PDF 저장)
              </button>
              <button
                type="button"
                onClick={handleDownloadText}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#2d2a26] shadow-sm ring-1 ring-[#e6dfd2] hover:bg-[#f7f4ee]"
              >
                전체 리포트 (.md)
              </button>
              <button
                type="button"
                onClick={handleDownloadTranscript}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#2d2a26] shadow-sm ring-1 ring-[#e6dfd2] hover:bg-[#f7f4ee]"
              >
                대화 전문 (.txt)
              </button>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="rounded-[28px] bg-white p-8 text-center text-[#7d766d] shadow-sm">
            리포트를 불러오고 있어요...
          </div>
        )}

        {error && (
          <div className="rounded-[28px] bg-[#fff3ef] p-6 text-sm text-[#8a5f57] shadow-sm">
            {error}
          </div>
        )}

        {!isLoading && snapshot && (
          <article className="report-card rounded-[28px] bg-white p-8 shadow-sm">
            {/* Letterhead */}
            <header className="border-b-2 border-[#e6dfd2] pb-6">
              <p className="text-sm font-semibold tracking-wide text-[#6f9075]">
                remAIn · 회상 대화 보고서
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#2d2a26]">
                {elderName} 어르신의 이야기
              </h1>
              <p className="mt-2 text-sm text-[#7d766d]">
                {startedAt}{" "}
                <span className="mx-2 text-[#cdc4b4]">
                  ·
                </span>{" "}
                {durationLabel} 동안
              </p>
            </header>

            {/* 어르신 정보 */}
            <section className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoCell
                label="시설"
                value={facility}
              />
              <InfoCell
                label="메모"
                value={diagnosis}
              />
              <InfoCell
                label="대화 시작"
                value={startedAt}
              />
              <InfoCell
                label="대화 종료"
                value={endedAt}
              />
              <InfoCell
                label="총 대화 턴"
                value={`${turnCount}회 (어르신 ${elderTurns} · 도우미 ${aiTurns})`}
              />
              <InfoCell
                label="감정 흐름"
                value={
                  snapshot.session
                    .detected_emotion ||
                  snapshot.session.current_state
                    ?.emotionDetected ||
                  "—"
                }
              />
            </section>

            {/* 요약 */}
            <section className="mt-8">
              <h2 className="text-xl font-black text-[#2d2a26]">
                오늘의 이야기 요약
              </h2>
              <p className="mt-3 whitespace-pre-line text-[16px] leading-[1.9] text-[#3f3a33]">
                {summary ||
                  "이번 세션의 요약이 아직 저장되지 않았어요."}
              </p>
            </section>

            {/* 태그 그리드 */}
            <section className="mt-8 grid gap-4 sm:grid-cols-2">
              <TagGroup
                title="다뤄진 감정"
                items={emotions}
                accent="bg-[#fbe7e2] text-[#9b5f57]"
              />
              <TagGroup
                title="주요 키워드"
                items={keywords}
                accent="bg-[#edf4ec] text-[#5f7b62]"
              />
              <TagGroup
                title="등장한 인물"
                items={people}
                accent="bg-[#f4eadb] text-[#7c6857]"
              />
              <TagGroup
                title="등장한 장소"
                items={places}
                accent="bg-[#e7eef8] text-[#5c6b85]"
              />
            </section>

            {/* 진행자 메모 */}
            {facilitatorNote && (
              <section className="mt-8 rounded-[20px] bg-[#fff8ec] p-5 ring-1 ring-[#f0e2c4]">
                <p className="text-sm font-bold text-[#a4814a]">
                  진행자 메모
                </p>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-[1.8] text-[#6a5232]">
                  {facilitatorNote}
                </p>
              </section>
            )}

            {/* 보호자 리포트 (AI 자동 생성) */}
            <section className="mt-10 rounded-[24px] bg-[#fffaf2] p-6 ring-1 ring-[#f0e2c4]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#5e3f25]">
                    보호자 전달용 리포트
                  </h2>
                  <p className="mt-1 text-sm text-[#a4814a]">
                    가족이 읽기 좋은 부드러운 톤으로 정리. 민감 정보는 자동 필터링.
                  </p>
                </div>
                <div className="no-print flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={
                      handleGenerateGuardianReport
                    }
                    disabled={
                      isGeneratingGuardian
                    }
                    className="rounded-xl bg-[#a4814a] px-4 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
                  >
                    {isGeneratingGuardian
                      ? "생성 중..."
                      : guardianReport
                        ? "다시 생성"
                        : "AI 로 리포트 생성"}
                  </button>
                  {guardianReport && (
                    <button
                      type="button"
                      onClick={
                        handleDownloadGuardianReport
                      }
                      className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#2d2a26] shadow-sm ring-1 ring-[#e6dfd2] hover:bg-[#f7f4ee]"
                    >
                      보호자 리포트 (.md)
                    </button>
                  )}
                </div>
              </div>

              {guardianError && (
                <div className="mt-4 rounded-2xl bg-[#fff2ef] px-4 py-3 text-sm text-[#8a5f57]">
                  {guardianError}
                </div>
              )}

              {!guardianReport &&
                !isGeneratingGuardian &&
                !guardianError && (
                  <p className="mt-4 text-sm text-[#7c6857]">
                    &lsquo;AI 로 리포트 생성&rsquo; 을 누르면 대화 전문을 분석해
                    보호자가 읽기 좋은 리포트를 만들어요. 임상 용어·민감 내용
                    자동 제외, 어르신 원문 인용 그대로 유지.
                  </p>
                )}

              {guardianReport?.guardianReport && (
                <div className="mt-5 space-y-5 text-[15px] leading-[1.85] text-[#3f3a33]">
                  {guardianReport.guardianReport
                    .header?.greeting && (
                    <p className="text-base font-semibold text-[#5e3f25]">
                      {
                        guardianReport
                          .guardianReport.header
                          .greeting
                      }
                    </p>
                  )}

                  {guardianReport.guardianReport
                    .conversationOverview && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-[#a4814a]">
                        오늘의 이야기
                      </h3>
                      <p className="mt-1 whitespace-pre-line">
                        {
                          guardianReport
                            .guardianReport
                            .conversationOverview
                            .summary
                        }
                      </p>
                      {(guardianReport
                        .guardianReport
                        .conversationOverview
                        .mainTopics?.length ??
                        0) > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {guardianReport.guardianReport.conversationOverview.mainTopics?.map(
                            (topic) => (
                              <span
                                key={topic}
                                className="rounded-full bg-[#f4eadb] px-3 py-1 text-xs font-semibold text-[#7c6857]"
                              >
                                #{topic}
                              </span>
                            )
                          )}
                        </div>
                      )}
                      {guardianReport
                        .guardianReport
                        .conversationOverview
                        .duration && (
                        <p className="mt-2 text-xs text-[#a39988]">
                          {
                            guardianReport
                              .guardianReport
                              .conversationOverview
                              .duration
                          }
                        </p>
                      )}
                    </div>
                  )}

                  {guardianReport.guardianReport
                    .emotionalStateScore && (
                    <div className="rounded-2xl bg-white p-4 ring-1 ring-[#ede2c8]">
                      <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-[#a4814a]">
                          {guardianReport
                            .guardianReport
                            .emotionalStateScore
                            .score ?? 0}
                        </span>
                        <span className="text-xs text-[#a39988]">
                          / 100
                        </span>
                        <span className="text-sm font-bold text-[#5e3f25]">
                          {
                            guardianReport
                              .guardianReport
                              .emotionalStateScore
                              .label
                          }
                        </span>
                      </div>
                      <p className="mt-2">
                        {
                          guardianReport
                            .guardianReport
                            .emotionalStateScore
                            .basis
                        }
                      </p>
                      <p className="mt-2 text-xs text-[#a39988]">
                        {
                          guardianReport
                            .guardianReport
                            .emotionalStateScore
                            .note
                        }
                      </p>
                    </div>
                  )}

                  {(guardianReport.guardianReport
                    .impressiveExcerpts?.length ??
                    0) > 0 && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-[#a4814a]">
                        인상 깊었던 순간
                      </h3>
                      <div className="mt-2 space-y-3">
                        {guardianReport.guardianReport.impressiveExcerpts?.map(
                          (excerpt, idx) => (
                            <div
                              key={idx}
                              className="rounded-2xl bg-white p-4 ring-1 ring-[#ede2c8]"
                            >
                              {excerpt.context && (
                                <p className="text-xs text-[#a39988]">
                                  {
                                    excerpt.context
                                  }
                                </p>
                              )}
                              {excerpt.elderlyQuote && (
                                <p className="mt-1 border-l-2 border-[#c6e2c2] pl-3 italic text-[#2f4a2a]">
                                  &quot;
                                  {
                                    excerpt.elderlyQuote
                                  }
                                  &quot;
                                </p>
                              )}
                              {excerpt.significance && (
                                <p className="mt-2 text-sm text-[#5e5148]">
                                  {
                                    excerpt.significance
                                  }
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {guardianReport.guardianReport
                    .nextSessionPreview?.text && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-[#a4814a]">
                        다음 시간
                      </h3>
                      <p className="mt-1">
                        {
                          guardianReport
                            .guardianReport
                            .nextSessionPreview
                            .text
                        }
                      </p>
                    </div>
                  )}

                  {guardianReport.guardianReport
                    .closingNote && (
                    <p className="border-t border-[#ede2c8] pt-4 text-[#7c6857]">
                      {
                        guardianReport
                          .guardianReport
                          .closingNote
                      }
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 전체 대화 */}
            <section className="mt-10 border-t-2 border-[#e6dfd2] pt-8">
              <h2 className="text-xl font-black text-[#2d2a26]">
                나눈 이야기 전문
              </h2>
              <p className="mt-1 text-sm text-[#8a7463]">
                어르신과 이야기 도우미가 나눈 모든 대화입니다.
              </p>

              {orderedMessages.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-[#faf8f4] p-5 text-sm text-[#8a7463]">
                  저장된 대화가 없어요.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {orderedMessages.map(
                    (message) => {
                      const isElder =
                        message.role ===
                        "user";
                      // 어르신 답변은 분명한 초록 배경 + 어두운 초록 글자.
                      // 진행자(이야기 도우미)는 색 없이 흰색 + 얇은 외곽선만.
                      return (
                        <div
                          key={message.id}
                          className={`break-inside-avoid rounded-2xl px-4 py-3 ${
                            isElder
                              ? "bg-[#c6e2c2] text-[#2f4a2a] ring-1 ring-[#a8cda3]"
                              : "bg-white text-[#3f3a33] ring-1 ring-[#e6dfd2]"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between text-xs font-bold uppercase tracking-wide ${
                              isElder
                                ? "text-[#3f6135]"
                                : "text-[#8a8273]"
                            }`}
                          >
                            <span>
                              {isElder
                                ? "어르신"
                                : "이야기 도우미"}
                            </span>
                            <span>
                              {formatTime(
                                message.created_at
                              )}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-line leading-[1.85]">
                            {message.content}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            <footer className="mt-10 border-t border-[#e6dfd2] pt-5 text-xs text-[#a39988]">
              세션 ID {sessionId} · 생성{" "}
              {new Date().toLocaleString("ko-KR")}{" "}
              · remAIn 회상치료 시스템
            </footer>
          </article>
        )}
      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#faf8f4] px-4 py-3 ring-1 ring-[#ece5d7]">
      <p className="text-xs font-bold uppercase tracking-wide text-[#8a7463]">
        {label}
      </p>
      <p className="mt-1 text-sm leading-[1.6] text-[#2d2a26]">
        {value}
      </p>
    </div>
  );
}

function TagGroup({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-[#faf8f4] p-4 ring-1 ring-[#ece5d7]">
      <p className="text-sm font-bold text-[#7d766d]">
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-xs text-[#a8a193]">
            기록 없음
          </span>
        ) : (
          items.map((item) => (
            <span
              key={`${title}:${item}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${accent}`}
            >
              {item}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
