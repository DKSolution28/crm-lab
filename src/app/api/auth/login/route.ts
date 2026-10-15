import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = (await readJson(request).catch(() => ({}))) as { alias?: unknown; password?: unknown };
  const alias = String(body.alias ?? "").trim();
  const password = String(body.password ?? "");
  const user = alias ? await prisma.user.findUnique({ where: { alias }, select: { id: true, alias: true, passwordHash: true } }) : null;
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid alias or password." }, { status: 401 });
  }
  const response = NextResponse.json({ alias: user.alias });
  response.cookies.set(SESSION_COOKIE, signSession(user.id), sessionCookieOptions());
  return response;
}
