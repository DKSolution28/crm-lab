import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const notes = await prisma.labNote.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { title?: unknown; detail?: unknown };
  const title = String(body.title ?? "").trim();
  const detail = String(body.detail ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const note = await prisma.labNote.create({
    data: { title, detail },
  });

  return NextResponse.json(note, { status: 201 });
}
