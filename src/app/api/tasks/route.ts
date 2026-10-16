import { NextResponse } from "next/server";
import { taskErrorResponse } from "@/lib/activities/http";
import { createTask, listTasks } from "@/lib/activities/service";
import { getRequestUser } from "@/lib/auth/current-user";
import { readJson } from "@/lib/http";

// GET /api/tasks?parentType=Account&parentId=
export async function GET(request: Request) {
  try {
    await getRequestUser(request);
    const params = new URL(request.url).searchParams;
    const result = await listTasks(params.get("parentType"), params.get("parentId"));
    return NextResponse.json(result);
  } catch (error) {
    return taskErrorResponse(error);
  }
}

// POST /api/tasks
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const task = await createTask(await readJson(request), user);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return taskErrorResponse(error);
  }
}
