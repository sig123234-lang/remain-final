import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  verifyAdminToken,
} from "@/lib/admin-auth";

/**
 * 어드민 영역 접근 제어.
 * - /admin/login 과 /api/admin/* 의 login/logout 은 항상 허용
 * - 그 외 /admin/* 와 /api/admin/* 는 어드민 쿠키 검증
 *   쿠키 없거나 만료된 페이지 요청은 /admin/login 으로 리다이렉트
 *   API 요청은 401 JSON 반환
 *
 * /api/db/read 와 /api/session/write 는 talk/story (어르신 화면) 가 사용하므로
 * 인증 없이 열려 있다. (TODO: rate limit + 세션 ID 단위 권한 검증)
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage =
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/");
  const isLoginApi =
    pathname === "/api/admin/login";
  const isLogoutApi =
    pathname === "/api/admin/logout";

  if (isLoginPage || isLoginApi || isLogoutApi) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(
    ADMIN_COOKIE_NAME
  );
  if (verifyAdminToken(cookie?.value)) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/admin");
  if (isApi) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  const loginUrl = new URL(
    "/admin/login",
    request.url
  );
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
