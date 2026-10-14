"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { USER_COOKIE } from "@/lib/auth/current-user";

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

/** Sélectionne l'utilisateur de démonstration courant (conçu, pas d'authentification réelle). */
export async function switchUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return;
  const store = await cookies();
  store.set(USER_COOKIE, user.id, { path: "/", sameSite: "lax", httpOnly: true });
  revalidatePath("/", "layout");
}
