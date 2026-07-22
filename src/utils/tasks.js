import { getTaskXpRule } from "./xp";

export function isRegularTask(task) {
  return !task.projectId && !task.isProjectStep && !task.isProjectPackSummary;
}

export function getBaseTimerSeconds(task) {
  const totalSeconds = Number(task.timerTotalSeconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return 0;
  }

  return Math.floor(totalSeconds);
}

export function getTimerSeconds(task, now = Date.now()) {
  const totalSeconds = getBaseTimerSeconds(task);

  if (!task.timerStartedAt) {
    return totalSeconds;
  }

  const startedAt = new Date(task.timerStartedAt).getTime();

  if (!Number.isFinite(startedAt)) {
    return totalSeconds;
  }

  return totalSeconds + Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function formatTimerSeconds(totalSeconds) {
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

export function getTaskXpDisplay(task, timerNow = Date.now()) {
  if (!isRegularTask(task)) {
    return `${Number(task.xp) || 0} XP`;
  }

  if (task.completed) {
    return `${Number(task.xp) || 0} XP`;
  }

  const timerSeconds = getTimerSeconds(task, timerNow);
  const rule = getTaskXpRule(task.taskType);

  return `Tracked ${formatTimerSeconds(timerSeconds)} · Max ${rule.maxXp} XP`;
}

export function pauseRunningTaskTimer(task, pausedAt = new Date().toISOString()) {
  if (!isRegularTask(task) || !task.timerStartedAt) {
    return task;
  }

  return {
    ...task,
    timerTotalSeconds: getTimerSeconds(task, new Date(pausedAt).getTime()),
    timerStartedAt: null,
  };
}

export function pauseRunningRegularTaskTimers(tasks, pausedAt = new Date().toISOString()) {
  return tasks.map((task) => pauseRunningTaskTimer(task, pausedAt));
}
