"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CreateAccountState = { error?: string; createdId?: string };

export async function createAccount(
  _previous: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const billingCity = String(formData.get("billingCity") ?? "").trim();

  if (name.length < 2) {
    return { error: "Le nom du compte doit contenir au moins 2 caractères." };
  }

  const account = await prisma.account.create({
    data: {
      name,
      industry: industry || null,
      billingCity: billingCity || null,
    },
  });

  revalidatePath("/accounts");
  revalidatePath("/");
  return { createdId: account.id };
}
