import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { assertTrustedOrigin } from "@/lib/auth/origin";
import { errorResponse } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
    const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
  } catch (error) {
    return errorResponse(error);
  }
}
