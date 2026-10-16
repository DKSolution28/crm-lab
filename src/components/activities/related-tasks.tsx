import { TaskForm, TaskStatusForm } from "@/components/activities/task-form";
import { PRIORITY_LABELS, STATUS_LABELS, type ParentType } from "@/lib/activities/picklists";
import { listTasks, type TaskDto } from "@/lib/activities/service";
import { formatDate, formatDateTime } from "@/lib/accounts/format";
import { fullName, getCurrentUser, listUsers } from "@/lib/auth/current-user";
import { canEditRecord } from "@/lib/auth/policies";

const assigneeLabel = (task: TaskDto) => `${fullName(task.assignee)} (${task.assignee.alias})`;

function TaskTable({
  tasks,
  mode,
  editable,
}: {
  tasks: TaskDto[];
  mode: "open" | "history";
  editable: (task: TaskDto) => boolean;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-slate-500">{mode === "open" ? "No open activities." : "No completed activities."}</p>;
  }
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-slate-500">
        <tr>
          <th className="py-1 font-medium">Subject</th>
          <th className="py-1 font-medium">Status</th>
          <th className="py-1 font-medium">Priority</th>
          <th className="py-1 font-medium">{mode === "open" ? "Due Date" : "Completed"}</th>
          <th className="py-1 font-medium">Assigned To</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id} className="border-t border-slate-100">
            <td className="py-1 text-slate-900">{task.subject}</td>
            <td className="py-1 text-slate-700">
              {mode === "open" && editable(task) ? <TaskStatusForm id={task.id} subject={task.subject} status={task.status} /> : STATUS_LABELS[task.status]}
            </td>
            <td className="py-1 text-slate-700">{PRIORITY_LABELS[task.priority]}</td>
            <td className="py-1 text-slate-700">{mode === "open" ? formatDate(task.dueDate) || "—" : formatDateTime(task.completedAt) || "—"}</td>
            <td className="py-1 text-slate-700">{assigneeLabel(task)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export async function RelatedTasks({ parentType, parentId }: { parentType: ParentType; parentId: string }) {
  const user = await getCurrentUser();
  const [{ open, history }, users] = await Promise.all([listTasks(parentType, parentId), listUsers()]);
  const editable = (task: TaskDto) => canEditRecord(user, task);
  return (
    <section id="related-tasks" aria-labelledby="related-tasks-title" className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 id="related-tasks-title" className="mb-3 text-sm font-semibold text-slate-800">
        Activities
      </h2>
      <div data-testid="open-activities">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Open Activities ({open.length})</h3>
        <TaskTable tasks={open} mode="open" editable={editable} />
      </div>
      <div data-testid="activity-history" className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-800">Activity History ({history.length})</h3>
        <TaskTable tasks={history} mode="history" editable={editable} />
      </div>
      <TaskForm
        parentType={parentType}
        parentId={parentId}
        defaultAssigneeId={user.id}
        assignees={users.map((item) => ({ id: item.id, label: `${fullName(item)} (${item.alias})` }))}
      />
    </section>
  );
}
