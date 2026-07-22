import {
  getWorkdayEmployeeIds,
  getWorkdayFinalPunchOut,
  getWorkdayFirstPunchIn,
  getWorkdaySessions,
  normalizeWorkday,
} from "./workday";
import { getRank } from "./xp";

export function hasHistoryEntryForDate(history, date) {
  return Array.isArray(history) && history.some((entry) => entry?.date === date);
}

export function buildHistoryEntry({
  date,
  tasks,
  activeEmployeeId,
  workday,
  carriedOverTasks = [],
}) {
  const completedTasks = tasks.filter((task) => task.completed);
  const totalXp = completedTasks.reduce((total, task) => total + task.xp, 0);
  const normalizedWorkday = normalizeWorkday(workday, date);
  const employeeIds = getWorkdayEmployeeIds(normalizedWorkday, activeEmployeeId);

  return {
    id: crypto.randomUUID(),
    date,
    activeEmployeeId,
    employeeIds,
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    xpEarned: totalXp,
    rank: getRank(totalXp),
    tasks,
    carriedOverTasks,
    workday: normalizedWorkday,
    archivedAt: new Date().toISOString(),
  };
}

function mergeUniqueByKey(items, getKey) {
  const merged = [];
  const seen = new Set();

  items.forEach((item) => {
    const key = getKey(item);

    if (key && seen.has(key)) return;
    if (key) seen.add(key);
    merged.push(item);
  });

  return merged;
}

function getTaskKey(task) {
  return task?.id || `${task?.title || "task"}-${task?.completedAt || ""}`;
}

function getSessionKey(session) {
  return (
    session?.id ||
    `${session?.employeeId || "unknown"}-${session?.punchInTime || ""}`
  );
}

function mergeSessions(existingSessions, nextSessions) {
  const byKey = new Map();

  [...existingSessions, ...nextSessions].forEach((session) => {
    const key = getSessionKey(session);
    const current = byKey.get(key);

    byKey.set(key, {
      ...current,
      ...session,
      punchOutTime: session.punchOutTime || current?.punchOutTime || null,
    });
  });

  return [...byKey.values()].sort((a, b) =>
    String(a.punchInTime).localeCompare(String(b.punchInTime))
  );
}

function mergeWorkdays(existingWorkday, nextWorkday, date, activeEmployeeId) {
  const normalizedExisting = normalizeWorkday(existingWorkday, date);
  const normalizedNext = normalizeWorkday(nextWorkday, date);
  const sessions = mergeSessions(
    getWorkdaySessions(normalizedExisting, activeEmployeeId),
    getWorkdaySessions(normalizedNext, activeEmployeeId)
  );
  const mergedWorkday = {
    ...normalizedExisting,
    ...normalizedNext,
    date,
    sessions,
  };

  return {
    ...mergedWorkday,
    punchInTime:
      getWorkdayFirstPunchIn({ ...mergedWorkday, sessions }) ||
      normalizedExisting.punchInTime ||
      normalizedNext.punchInTime,
    punchOutTime:
      getWorkdayFinalPunchOut({ ...mergedWorkday, sessions }) ||
      normalizedNext.punchOutTime ||
      normalizedExisting.punchOutTime,
  };
}

function mergeScratchpadNote(existingNote, nextNote) {
  if (!nextNote) return existingNote || "";
  if (!existingNote) return nextNote;
  if (existingNote === nextNote) return existingNote;

  return nextNote;
}

export function mergeHistoryEntries(existingEntry, nextEntry) {
  if (!existingEntry) return nextEntry;
  if (!nextEntry) return existingEntry;

  const date = nextEntry.date || existingEntry.date;
  const activeEmployeeId =
    nextEntry.activeEmployeeId || existingEntry.activeEmployeeId || null;
  const tasks = mergeUniqueByKey(
    [...(existingEntry.tasks || []), ...(nextEntry.tasks || [])],
    getTaskKey
  );
  const carriedOverTasks = Array.isArray(nextEntry.carriedOverTasks)
    ? nextEntry.carriedOverTasks
    : existingEntry.carriedOverTasks || [];
  const completedTasks = tasks.filter((task) => task.completed);
  const xpEarned = completedTasks.reduce(
    (total, task) => total + (Number(task.xp) || 0),
    0
  );
  const workday = mergeWorkdays(
    existingEntry.workday,
    nextEntry.workday,
    date,
    activeEmployeeId
  );
  const employeeIds = [
    ...new Set([
      ...(existingEntry.employeeIds || []),
      ...(nextEntry.employeeIds || []),
      ...getWorkdayEmployeeIds(workday, activeEmployeeId),
    ].filter(Boolean)),
  ];

  return {
    ...existingEntry,
    ...nextEntry,
    id: existingEntry.id,
    date,
    activeEmployeeId,
    employeeIds,
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    xpEarned,
    rank: getRank(xpEarned),
    tasks,
    carriedOverTasks,
    workday,
    scratchpadNote: mergeScratchpadNote(
      existingEntry.scratchpadNote,
      nextEntry.scratchpadNote
    ),
    archivedAt: existingEntry.archivedAt || nextEntry.archivedAt,
    updatedAt: new Date().toISOString(),
  };
}

export function upsertHistoryEntry(history, nextEntry) {
  if (!Array.isArray(history) || !nextEntry?.date) return [nextEntry];

  const existingIndex = history.findIndex((entry) => entry?.date === nextEntry.date);

  if (existingIndex === -1) return [nextEntry, ...history];

  const nextHistory = [...history];
  nextHistory[existingIndex] = mergeHistoryEntries(
    nextHistory[existingIndex],
    nextEntry
  );

  return nextHistory;
}
