import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/auth/current-user";
import { assertTrustedOrigin } from "@/lib/auth/origin";
import { errorResponse } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await getRequestUser(request);
    const notes = await prisma.labNote.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(notes);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await getRequestUser(request);
    assertTrustedOrigin(request);
    const body = (await request.json()) as { title?: unknown; detail?: unknown };
    const title = String(body.title ?? "").trim();
    const detail = String(body.detail ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const note = await prisma.labNote.create({ data: { title, detail } });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
