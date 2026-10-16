"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function createNote(formData: FormData) {
  await getCurrentUser();
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
