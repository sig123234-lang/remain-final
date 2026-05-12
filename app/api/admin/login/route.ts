import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  isAdminAuthConfigured,
  issueAdminToken,
  verifyPassword,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.",
      },
      { status: 500 }
    );
  }

  let body: { password?: unknown };
  try {
    body = (await request.json()) as {
      password?: unknown;
    };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const password =
    typeof body.password === "string"
      ? body.password
      : "";
  if (!password || !verifyPassword(password)) {
    return NextResponse.json(
      { error: "비밀번호가 일치하지 않습니다." },
      { status: 401 }
    );
  }

  const token = issueAdminToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token.value,
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production",
    path: "/",
    maxAge: token.maxAgeSec,
  });
  return response;
}
