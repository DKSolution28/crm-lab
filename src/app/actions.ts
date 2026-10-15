"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createNote(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();

  if (!title) {
    return;
  }

  await prisma.labNote.create({
    data: {
      title,
      detail,
    },
  });

  revalidatePath("/");
}
