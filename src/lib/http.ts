// Conversion des erreurs de domaine en réponses HTTP pour les route handlers.
import { NextResponse } from "next/server";
import { AuthorizationError } from "./auth/policies";
import { UnauthenticatedError } from "./auth/session";
import { FilterError } from "./accounts/filters";
import { ListViewError } from "./accounts/list-views";
import { NotFoundError } from "./accounts/service";
import { ValidationError } from "./accounts/validation";
import { ConflictError } from "./errors";

export const errorResponse = (error: unknown) => {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: "Validation failed", fieldErrors: error.fieldErrors }, { status: 400 });
  }
  if (error instanceof FilterError || error instanceof ListViewError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ConflictError) {
    return NextResponse.json(
      error.conversion === undefined ? { error: error.message } : { error: error.message, conversion: error.conversion },
      { status: 409 },
    );
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
};

export const readJson = async (request: Request): Promise<unknown> => {
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text);
};
