"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createNote(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) {
    return { ok: false as const, error: "title and body are required" };
  }
  await prisma.labNote.create({ data: { title, body } });
  revalidatePath("/");
  return { ok: true as const };
}
