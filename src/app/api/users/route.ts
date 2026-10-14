import { NextResponse } from "next/server";
import { getRequestUser, listUsers } from "@/lib/auth/current-user";
import { errorResponse } from "@/lib/http";

// GET /api/users — utilisateurs de démonstration et utilisateur courant (conçu)
export async function GET(request: Request) {
  try {
    const [current, users] = await Promise.all([getRequestUser(request), listUsers()]);
    return NextResponse.json({ current, items: users });
  } catch (error) {
    return errorResponse(error);
  }
}
