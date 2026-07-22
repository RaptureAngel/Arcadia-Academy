import { isRegularTask } from "./tasks";

const MEETING_TASK_TYPE = "Meeting / Call";
const MEETING_FOLLOW_UP_TASK_TYPE = "Meeting Follow-up";

export function isMeetingModeEligibleTask(task) {
  return (
    isRegularTask(task) &&
    !task.completed &&
    task.taskType === MEETING_TASK_TYPE
  );
}

export function createMeetingTaskSnapshot(task) {
  if (!task) return null;

  return {
    id: task.id,
    title: task.title || "Untitled meeting",
    client: task.client || "",
    taskType: task.taskType || MEETING_TASK_TYPE,
    projectId: task.projectId ?? null,
    projectName: task.projectName ?? null,
    projectTemplateName: task.projectTemplateName ?? null,
    completed: Boolean(task.completed),
  };
}

export function createMeetingActionItemSnapshot(task) {
  if (!task) return null;

  return {
    id: task.id,
    title: task.title || "Untitled action item",
    client: task.client || "",
    taskType: task.taskType || MEETING_FOLLOW_UP_TASK_TYPE,
    priority: Boolean(task.priority),
  };
}

export function getMeetingDraftWarnings(draft, tasks) {
  if (!draft) return [];

  const warnings = [];
  const sourceTask = tasks.find((task) => task.id === draft.session.taskId);

  if (!sourceTask) {
    warnings.push(
      "The original meeting task is missing. Notes can still be recovered, but the task will not be completed automatically."
    );
  } else if (sourceTask.completed) {
    warnings.push(
      "The original meeting task is already completed. Export will not award completion again."
    );
  }

  const liveActionItemIds = new Set(tasks.map((task) => task.id));
  const missingActionItemCount = draft.session.actionItemIds.filter(
    (actionItemId) => !liveActionItemIds.has(actionItemId)
  ).length;

  if (missingActionItemCount > 0) {
    warnings.push(
      `${missingActionItemCount} saved action item reference${
        missingActionItemCount === 1 ? "" : "s"
      } no longer exists and will be omitted.`
    );
  }

  return warnings;
}
