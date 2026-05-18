/**
 * 채팅 (어르신 인터뷰어) 모델 설정.
 *
 * Anthropic 으로 전환하고 싶으면 `CHAT_PROVIDER=anthropic` 환경변수 +
 * `ANTHROPIC_API_KEY` 를 세팅한다. 둘 다 없거나 anthropic 키만 비면
 * 기본 OpenAI 로 폴백한다 (배포 안전성).
 *
 * 한국어 회상 톤은 Claude Sonnet 4.6 이 OpenAI gpt-4o-mini 대비 또렷하게
 * 자연스럽다. 다만 단가 ~20배라 추후 비용 모니터링 필요.
 */
export type ChatProvider =
  | "openai"
  | "anthropic";

export const REMAIN_CHAT_MODEL =
  "gpt-4o-mini";

export const ANTHROPIC_CHAT_MODEL =
  "claude-sonnet-4-6";

export function getChatProvider(): ChatProvider {
  const raw = (
    process.env.CHAT_PROVIDER || ""
  )
    .trim()
    .toLowerCase();
  if (
    raw === "anthropic" &&
    process.env.ANTHROPIC_API_KEY
  ) {
    return "anthropic";
  }
  return "openai";
}
