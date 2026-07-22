import { formatDeadline, formatSavedTime } from "./dates";
import {
  getStatusLabel,
  getWorkdayEmployeeIds,
  getWorkdayFinalPunchOut,
  getWorkdayFirstPunchIn,
  getWorkdaySessions,
} from "./workday";
import { getRank } from "./xp";

function safeText(value, fallback = "None") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function getTasks(entry) {
  return Array.isArray(entry?.tasks) ? entry.tasks : [];
}

function getFinishedTasks(entry) {
  return getTasks(entry).filter((task) => task.completed);
}

function getUnfinishedTasks(entry) {
  if (Array.isArray(entry?.carriedOverTasks)) {
    return entry.carriedOverTasks;
  }

  return getTasks(entry).filter((task) => !task.completed);
}

function getTimerSeconds(task) {
  const totalSeconds = Number(task?.timerTotalSeconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return 0;
  }

  return Math.floor(totalSeconds);
}

function formatTimerSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const paddedMinutes = String(minutes).padStart(hours > 0 ? 2 : 1, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${paddedMinutes}:${paddedSeconds}`;
}

function formatExportTime(value) {
  return value ? formatSavedTime(value) : "None";
}

function resolveEmployeeName(employeeId, { employeeNamesById, employeeName } = {}) {
  if (employeeId && employeeNamesById?.[employeeId]) {
    return employeeNamesById[employeeId];
  }

  return employeeName || "Unknown Employee";
}

function getXpEarned(entry, finishedTasks) {
  if (finishedTasks.length > 0) {
    return finishedTasks.reduce(
      (total, task) => total + (Number(task.xp) || 0),
      0
    );
  }

  return Number(entry?.xpEarned) || 0;
}

function getProjectMetadata(task) {
  const details = [];

  if (task.projectName) {
    details.push(`Project: ${safeText(task.projectName)}`);
  }

  if (task.projectTemplateName) {
    details.push(`Template: ${safeText(task.projectTemplateName)}`);
  }

  if (task.projectStepNumber && task.projectStepTotal) {
    details.push(`Step: ${task.projectStepNumber}/${task.projectStepTotal}`);
  }

  if (task.isProjectPackSummary) {
    details.push(
      `Project pack: ${task.completedStepCount || task.totalSteps || 0} steps`
    );
  }

  if (task.deadline) {
    details.push(`Deadline: ${formatDeadline(task.deadline) || task.deadline}`);
  }

  if (task.priority) {
    details.push("Priority");
  }

  return details;
}

function renderTask(task, { includeXp }) {
  const timerSeconds = getTimerSeconds(task);
  const lines = [
    `- ${safeText(task.title, "Untitled task")}`,
    `  Client: ${safeText(task.client)}`,
    `  Type: ${safeText(task.taskType)}`,
  ];

  if (includeXp) {
    lines.push(`  XP: ${Number(task.xp) || 0}`);
  }

  if (timerSeconds > 0) {
    lines.push(`  Tracked: ${formatTimerSeconds(timerSeconds)}`);
  }

  getProjectMetadata(task).forEach((detail) => {
    lines.push(`  ${detail}`);
  });

  return lines.join("\n");
}

function renderTaskSection(title, tasks, options) {
  if (tasks.length === 0) {
    return `${title}\nNone recorded.`;
  }

  return `${title}\n${tasks
    .map((task) => renderTask(task, options))
    .join("\n\n")}`;
}

function renderWorkSessions(entry, options) {
  const sessions = getWorkdaySessions(entry?.workday, entry?.activeEmployeeId);

  if (sessions.length === 0) {
    return "Work Sessions\nNone recorded.";
  }

  return `Work Sessions\n${sessions
    .map((session) => {
      const start = formatExportTime(session.punchInTime);
      const end = session.punchOutTime
        ? formatExportTime(session.punchOutTime)
        : "In progress";
      const name = resolveEmployeeName(session.employeeId, options);

      return `- ${start} - ${end} · ${safeText(name, "Unknown Employee")}`;
    })
    .join("\n")}`;
}

export function buildWorkLogText(
  entry,
  { employeeName, employeeNamesById } = {}
) {
  if (!entry) {
    return "";
  }

  const finishedTasks = getFinishedTasks(entry);
  const unfinishedTasks = getUnfinishedTasks(entry);
  const xpEarned = getXpEarned(entry, finishedTasks);
  const finishedCount =
    finishedTasks.length || Number(entry.completedTasks) || 0;
  const workday = entry.workday || {};
  const employeeIds = getWorkdayEmployeeIds(workday, entry.activeEmployeeId);
  const employeeNames =
    employeeIds.length > 0
      ? employeeIds.map((employeeId) =>
          resolveEmployeeName(employeeId, { employeeNamesById, employeeName })
        )
      : [employeeName];
  const lunchLine =
    workday.lunchStartTime || workday.lunchEndTime
      ? `${formatExportTime(workday.lunchStartTime)} - ${formatExportTime(
          workday.lunchEndTime
        )}`
      : "None";

  return [
    `Arcadia Work Log - ${safeText(entry.date, "Unknown date")}`,
    `Employee: ${safeText(employeeNames.filter(Boolean).join(", "), "Unknown Employee")}`,
    `Status: ${getStatusLabel(workday.status)}`,
    `Punch in: ${formatExportTime(getWorkdayFirstPunchIn(workday))}`,
    `Lunch: ${lunchLine}`,
    `Punch out: ${formatExportTime(getWorkdayFinalPunchOut(workday))}`,
    renderWorkSessions(entry, { employeeName, employeeNamesById }),
    "Summary",
    `Finished work: ${finishedCount}`,
    `Unfinished: ${unfinishedTasks.length}`,
    `XP earned: ${xpEarned} XP`,
    `Daily rank: ${safeText(entry.rank || getRank(xpEarned))}`,
    renderTaskSection("Finished Work", finishedTasks, { includeXp: true }),
    renderTaskSection("Unfinished", unfinishedTasks, { includeXp: false }),
  ].join("\n\n");
}

export function getWorkLogFileName(entry) {
  const rawDate = safeText(entry?.date, "unknown-date").toLowerCase();
  const safeDate = rawDate
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `arcadia-work-log-${safeDate || "unknown-date"}.txt`;
}
