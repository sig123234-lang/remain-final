import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export const ADMIN_COOKIE_NAME = "remain_admin";
const ADMIN_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/**
 * 어드민 비번은 단일 환경변수 `ADMIN_PASSWORD` 로 두고,
 * 로그인 성공 시 만료시각.HMAC(만료시각) 형태의 쿠키를 발급한다.
 * stateless, no DB. 키가 바뀌면 기존 세션은 자동 무효화.
 */
function getSecret(): string | null {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    return null;
  }
  return secret;
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function verifyPassword(
  candidate: string
): boolean {
  const secret = getSecret();
  if (!secret) {
    return false;
  }
  // candidate 와 secret 을 각각 SHA-256 으로 다이제스트해서 같은 길이로 만든 뒤
  // timing-safe 비교. 길이 차이가 입력에서 새지 않게 하는 표준 패턴.
  const expectedHash = createHash("sha256")
    .update(secret)
    .digest();
  const providedHash = createHash("sha256")
    .update(candidate)
    .digest();
  return timingSafeEqual(expectedHash, providedHash);
}

function signPayload(payload: string): string {
  const secret = getSecret();
  if (!secret) {
    throw new Error("ADMIN_PASSWORD is not set");
  }
  return createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

export function issueAdminToken(
  nowMs: number = Date.now()
): {
  value: string;
  maxAgeSec: number;
} {
  const expiryMs =
    nowMs + ADMIN_COOKIE_MAX_AGE_SEC * 1000;
  const payload = String(expiryMs);
  const signature = signPayload(payload);
  return {
    value: `${payload}.${signature}`,
    maxAgeSec: ADMIN_COOKIE_MAX_AGE_SEC,
  };
}

export function verifyAdminToken(
  token: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!token) {
    return false;
  }
  const dot = token.indexOf(".");
  if (dot <= 0) {
    return false;
  }
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expiryMs = Number.parseInt(payload, 10);
  if (
    !Number.isFinite(expiryMs) ||
    expiryMs < nowMs
  ) {
    return false;
  }

  let expected: string;
  try {
    expected = signPayload(payload);
  } catch {
    return false;
  }

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length) {
    return false;
  }
  return timingSafeEqual(sigBuf, expBuf);
}
