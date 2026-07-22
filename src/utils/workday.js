import { formatSavedTime, getTodayKey } from "./dates";

function createSessionId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeSession(session) {
  if (!session?.punchInTime) return null;

  return {
    id: session.id || createSessionId(),
    employeeId: session.employeeId || null,
    punchInTime: session.punchInTime,
    punchOutTime: session.punchOutTime || null,
  };
}

export function createBlankWorkday(date = getTodayKey()) {
  return {
    date,
    status: "notPunchedIn",
    punchInTime: null,
    lunchStartTime: null,
    lunchEndTime: null,
    punchOutTime: null,
    sessions: [],
  };
}

export function normalizeWorkday(workday, date = getTodayKey()) {
  const fallback = createBlankWorkday(date);

  if (!workday || typeof workday !== "object") {
    return fallback;
  }

  return {
    ...fallback,
    ...workday,
    date: workday.date || date,
    sessions: Array.isArray(workday.sessions)
      ? workday.sessions.map(normalizeSession).filter(Boolean)
      : [],
  };
}

export function getWorkdaySessions(workday, fallbackEmployeeId = null) {
  const sessions = Array.isArray(workday?.sessions)
    ? workday.sessions.map(normalizeSession).filter(Boolean)
    : [];

  if (sessions.length > 0) return sessions;

  if (!workday?.punchInTime && !workday?.punchOutTime) return [];

  return [
    {
      id: "legacy-session",
      employeeId: fallbackEmployeeId,
      punchInTime: workday.punchInTime || workday.punchOutTime,
      punchOutTime: workday.punchOutTime || null,
    },
  ].filter((session) => session.punchInTime);
}

export function getWorkdayFirstPunchIn(workday) {
  const sessions = getWorkdaySessions(workday);
  const firstSession = sessions.find((session) => session.punchInTime);

  return firstSession?.punchInTime || workday?.punchInTime || null;
}

export function getWorkdayFinalPunchOut(workday) {
  const sessions = getWorkdaySessions(workday);
  const closedSessions = sessions.filter((session) => session.punchOutTime);
  const finalSession = closedSessions[closedSessions.length - 1];

  return finalSession?.punchOutTime || workday?.punchOutTime || null;
}

export function getWorkdayEmployeeIds(workday, fallbackEmployeeId = null) {
  const ids = getWorkdaySessions(workday, fallbackEmployeeId)
    .map((session) => session.employeeId)
    .filter(Boolean);

  if (ids.length === 0 && fallbackEmployeeId) ids.push(fallbackEmployeeId);

  return [...new Set(ids)];
}

export function closeOpenWorkSession(workday, timestamp = new Date().toISOString()) {
  const normalized = normalizeWorkday(workday, workday?.date || getTodayKey());
  const sessions = [...normalized.sessions];
  let openIndex = -1;

  for (let index = sessions.length - 1; index >= 0; index -= 1) {
    if (!sessions[index].punchOutTime) {
      openIndex = index;
      break;
    }
  }

  if (openIndex === -1) return normalized;

  sessions[openIndex] = {
    ...sessions[openIndex],
    punchOutTime: timestamp,
  };

  return {
    ...normalized,
    sessions,
  };
}

export function startWorkSession(
  workday,
  employeeId,
  timestamp = new Date().toISOString()
) {
  const normalized = normalizeWorkday(workday, workday?.date || getTodayKey());
  const closedWorkday = closeOpenWorkSession(normalized, timestamp);

  return {
    ...closedWorkday,
    sessions: [
      ...closedWorkday.sessions,
      {
        id: createSessionId(),
        employeeId: employeeId || null,
        punchInTime: timestamp,
        punchOutTime: null,
      },
    ],
  };
}

export function switchOpenWorkSessionEmployee(
  workday,
  employeeId,
  timestamp = new Date().toISOString()
) {
  if (!employeeId) return normalizeWorkday(workday, workday?.date || getTodayKey());

  const normalized = normalizeWorkday(workday, workday?.date || getTodayKey());
  const openSession = normalized.sessions.find((session) => !session.punchOutTime);

  if (openSession?.employeeId === employeeId) return normalized;

  return startWorkSession(normalized, employeeId, timestamp);
}

export function getStatusLabel(status) {
  const labels = {
    notPunchedIn: "Not Punched In",
    working: "Working",
    onLunch: "On Lunch",
    punchedOut: "Punched Out",
  };

  return labels[status] || "Unknown";
}

export function getWorkdaySummary(workday) {
  if (workday.status === "notPunchedIn") {
    return "Ready to begin.";
  }

  if (workday.status === "working" && workday.punchInTime) {
    return `Punched in at ${formatSavedTime(workday.punchInTime)}`;
  }

  if (workday.status === "onLunch" && workday.lunchStartTime) {
    return `On lunch since ${formatSavedTime(workday.lunchStartTime)}`;
  }

  if (workday.status === "punchedOut" && workday.punchOutTime) {
    return `Punched out at ${formatSavedTime(workday.punchOutTime)}`;
  }

  return "Status active.";
}
