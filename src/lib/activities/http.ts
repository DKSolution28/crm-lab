// Réponses HTTP des tâches. Le parent inconnu reste un 404, avec le message de validation.
import { NextResponse } from "next/server";
import { errorResponse } from "../http";
import { UnknownParentError } from "./service";

export const taskErrorResponse = (error: unknown) => {
  if (error instanceof UnknownParentError) {
    return NextResponse.json({ error: error.message, fieldErrors: error.fieldErrors }, { status: 404 });
  }
  return errorResponse(error);
};
