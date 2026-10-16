import { NextResponse } from "next/server";
import { taskErrorResponse } from "@/lib/activities/http";
import { getTask, updateTask } from "@/lib/activities/service";
import { getRequestUser } from "@/lib/auth/current-user";
import { canEditRecord } from "@/lib/auth/policies";
import { readJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const task = await getTask(id);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ ...task, canEdit: canEditRecord(user, task) });
  } catch (error) {
    return taskErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await getRequestUser(request);
    const { id } = await params;
    const task = await updateTask(id, await readJson(request), user);
    return NextResponse.json(task);
  } catch (error) {
    return taskErrorResponse(error);
  }
}
