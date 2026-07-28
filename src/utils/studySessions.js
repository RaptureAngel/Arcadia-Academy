export const SESSION_OUTCOMES = [
  "successful",
  "needs-adjustment",
  "unsuccessful",
];

export const SESSION_OUTCOME_LABELS = {
  successful: "Successful",
  "needs-adjustment": "Needs Adjustment",
  unsuccessful: "Unsuccessful",
};

function toFiniteNonNegative(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function isValidTimestamp(value) {
  return (
    typeof value === "string" &&
    value !== "" &&
    !Number.isNaN(new Date(value).getTime())
  );
}

export function createStudySession({
  projectId,
  characterId = null,
  startedAt,
  endedAt,
  focusedSeconds = null,
  progressBefore = null,
  progressAfter = null,
  outputCount = 0,
  outcome = null,
  note = "",
  xpAwarded = 0,
} = {}) {
  const start = isValidTimestamp(startedAt) ? startedAt : new Date().toISOString();
  const end = isValidTimestamp(endedAt) ? endedAt : start;
  const computedFocusedSeconds =
    focusedSeconds !== null
      ? toFiniteNonNegative(focusedSeconds, 0)
      : Math.max(
          0,
          Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)
        );
  const hasProgressRange =
    Number.isFinite(progressBefore) && Number.isFinite(progressAfter);

  return {
    id: crypto.randomUUID(),
    projectId: String(projectId || ""),
    characterId: typeof characterId === "string" && characterId ? characterId : null,
    startedAt: start,
    endedAt: end,
    focusedSeconds: computedFocusedSeconds,
    progressBefore: Number.isFinite(progressBefore) ? progressBefore : null,
    progressAfter: Number.isFinite(progressAfter) ? progressAfter : null,
    progressDelta: hasProgressRange
      ? Math.max(0, progressAfter - progressBefore)
      : 0,
    outputCount: toFiniteNonNegative(outputCount, 0),
    outcome: SESSION_OUTCOMES.includes(outcome) ? outcome : null,
    note: typeof note === "string" ? note : "",
    xpAwarded: toFiniteNonNegative(xpAwarded, 0),
    createdAt: new Date().toISOString(),
  };
}

export function normalizeStudySession(raw) {
  if (!raw || typeof raw !== "object") return null;

  const projectId = typeof raw.projectId === "string" ? raw.projectId.trim() : "";

  if (!projectId) return null;
  if (!isValidTimestamp(raw.startedAt)) return null;

  const startedAt = raw.startedAt;
  const endedAt = isValidTimestamp(raw.endedAt) ? raw.endedAt : startedAt;

  if (new Date(endedAt).getTime() < new Date(startedAt).getTime()) return null;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    projectId,
    characterId:
      typeof raw.characterId === "string" && raw.characterId
        ? raw.characterId
        : null,
    startedAt,
    endedAt,
    focusedSeconds: toFiniteNonNegative(raw.focusedSeconds, 0),
    progressBefore: Number.isFinite(raw.progressBefore) ? raw.progressBefore : null,
    progressAfter: Number.isFinite(raw.progressAfter) ? raw.progressAfter : null,
    progressDelta: toFiniteNonNegative(raw.progressDelta, 0),
    outputCount: toFiniteNonNegative(raw.outputCount, 0),
    outcome: SESSION_OUTCOMES.includes(raw.outcome) ? raw.outcome : null,
    note: typeof raw.note === "string" ? raw.note : "",
    xpAwarded: toFiniteNonNegative(raw.xpAwarded, 0),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
  };
}

export function normalizeStudySessionList(rawList) {
  if (!Array.isArray(rawList)) return [];

  return rawList.map(normalizeStudySession).filter(Boolean);
}

export function validateStudySession(session) {
  const errors = [];

  if (!session || typeof session !== "object") {
    return { valid: false, errors: ["Study session must be an object."] };
  }

  if (typeof session.projectId !== "string" || !session.projectId) {
    errors.push("projectId is required.");
  }

  if (!isValidTimestamp(session.startedAt)) {
    errors.push("startedAt must be a valid timestamp.");
  }

  if (!isValidTimestamp(session.endedAt)) {
    errors.push("endedAt must be a valid timestamp.");
  } else if (
    isValidTimestamp(session.startedAt) &&
    new Date(session.endedAt).getTime() < new Date(session.startedAt).getTime()
  ) {
    errors.push("endedAt may not precede startedAt.");
  }

  if (!Number.isFinite(session.focusedSeconds) || session.focusedSeconds < 0) {
    errors.push("focusedSeconds must be a finite, non-negative number.");
  }

  if (!Number.isFinite(session.progressDelta) || session.progressDelta < 0) {
    errors.push("progressDelta must be a finite, non-negative number.");
  }

  if (!Number.isFinite(session.outputCount) || session.outputCount < 0) {
    errors.push("outputCount must be a finite, non-negative number.");
  }

  if (!Number.isFinite(session.xpAwarded) || session.xpAwarded < 0) {
    errors.push("xpAwarded must be a finite, non-negative number.");
  }

  if (session.outcome !== null && !SESSION_OUTCOMES.includes(session.outcome)) {
    errors.push("Invalid outcome.");
  }

  return { valid: errors.length === 0, errors };
}

export function sortStudySessionsChronologically(sessions, { direction = "asc" } = {}) {
  if (!Array.isArray(sessions)) return [];

  const factor = direction === "desc" ? -1 : 1;

  return [...sessions].sort(
    (firstSession, secondSession) =>
      factor *
      (new Date(firstSession.startedAt).getTime() -
        new Date(secondSession.startedAt).getTime())
  );
}

export function selectStudySessionsForProject(sessions, projectId) {
  if (!Array.isArray(sessions)) return [];

  return sessions.filter((session) => session?.projectId === projectId);
}

export function calculateTotalFocusedSeconds(sessions) {
  if (!Array.isArray(sessions)) return 0;

  return sessions.reduce(
    (total, session) => total + toFiniteNonNegative(session?.focusedSeconds, 0),
    0
  );
}

export function calculateTotalSessionsForProject(sessions, projectId) {
  return selectStudySessionsForProject(sessions, projectId).length;
}
