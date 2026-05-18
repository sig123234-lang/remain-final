export const REMAIN_DEFAULT_ELDER_ID =
  "8dc55e51-7b82-4e4b-8331-1b6824ed153f";

/**
 * 첫 세션 (이전 종료 세션이 없는 어르신) 의 기본 오프닝 질문.
 * 이전 세션이 있으면 그걸 기반으로 동적으로 만든 opening 으로 대체된다.
 */
export const REMAIN_FIRST_QUESTION =
  "초등학교 다니실 때 겨울 되면 자주 먹던 음식 기억나세요?";

export const ACTIVE_SESSION_STORAGE_KEY =
  "remain-active-session-id";

/**
 * 이전 세션 요약을 받아 다음 세션의 첫 질문을 만든다. v8 프롬프트의 "재방문" 패턴:
 *
 *   "지난번에 [이전 주제] 이야기 해주셨는데, 그 뒤로 또 생각나신 거 있으세요?"
 *
 * `summary` 가 짧고 자연스러운 한 문장이면 그대로 끼워 넣어도 어색하지 않다.
 * 비어있거나 너무 길면 기본 질문으로 폴백.
 */
export function buildReturningOpening(
  summary: string | null | undefined,
  fallback: string = REMAIN_FIRST_QUESTION
): string {
  if (!summary) {
    return fallback;
  }
  const trimmed = summary.trim();
  if (!trimmed || trimmed.length > 220) {
    return fallback;
  }
  // 끝을 마침표 한 개로 정리.
  const cleaned = trimmed
    .replace(/[.。\s]+$/u, "")
    .trim();
  if (!cleaned) {
    return fallback;
  }
  return `지난번엔 ${cleaned} 이야기를 나누셨지요. 오늘은 그 뒤로 또 떠오르신 일이 있으세요?`;
}
