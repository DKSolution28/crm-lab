import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const notes = await prisma.labNote.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { title?: unknown; body?: unknown };
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";

  if (!title || !body) {
    return NextResponse.json(
      { error: "title and body are required" },
      { status: 400 },
    );
  }

  const note = await prisma.labNote.create({
    data: { title, body },
  });
  return NextResponse.json({ note }, { status: 201 });
}
