import { ACTIVE_FOCUS_SESSION_STORAGE_KEY } from "./storage";

// Local recovery draft for an in-progress focus session, so a crash, a
// force-close, or a normal window close doesn't silently erase unsaved
// study time. This is intentionally separate from the main save payload —
// see the note on ACTIVE_FOCUS_SESSION_STORAGE_KEY in storage.js.
export const ACTIVE_FOCUS_SESSION_RECOVERY_VERSION = 1;

function isValidTimestamp(value) {
  return (
    typeof value === "string" &&
    value !== "" &&
    !Number.isNaN(new Date(value).getTime())
  );
}

function toFiniteNonNegative(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export function createActiveFocusSessionRecoveryRecord({
  projectId,
  characterId,
  startedAt,
  checkpointedFocusedSeconds,
  lastCheckpointAt,
  createdAt,
  updatedAt = new Date().toISOString(),
}) {
  return {
    version: ACTIVE_FOCUS_SESSION_RECOVERY_VERSION,
    projectId: String(projectId || ""),
    characterId:
      typeof characterId === "string" && characterId ? characterId : null,
    startedAt,
    checkpointedFocusedSeconds: toFiniteNonNegative(checkpointedFocusedSeconds, 0),
    lastCheckpointAt: lastCheckpointAt || updatedAt,
    createdAt: createdAt || startedAt,
    updatedAt,
  };
}

// Malformed, mis-versioned, or otherwise untrustworthy records are treated
// as "nothing to recover" rather than causing a crash — a corrupt recovery
// draft must never block normal use of the app.
export function normalizeActiveFocusSessionRecoveryRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.version !== ACTIVE_FOCUS_SESSION_RECOVERY_VERSION) return null;

  const projectId = typeof raw.projectId === "string" ? raw.projectId.trim() : "";

  if (!projectId) return null;
  if (!isValidTimestamp(raw.startedAt)) return null;

  return {
    version: ACTIVE_FOCUS_SESSION_RECOVERY_VERSION,
    projectId,
    characterId:
      typeof raw.characterId === "string" && raw.characterId
        ? raw.characterId
        : null,
    startedAt: raw.startedAt,
    checkpointedFocusedSeconds: toFiniteNonNegative(
      raw.checkpointedFocusedSeconds,
      0
    ),
    lastCheckpointAt: isValidTimestamp(raw.lastCheckpointAt)
      ? raw.lastCheckpointAt
      : raw.startedAt,
    createdAt: isValidTimestamp(raw.createdAt) ? raw.createdAt : raw.startedAt,
    updatedAt: isValidTimestamp(raw.updatedAt) ? raw.updatedAt : raw.startedAt,
  };
}

export function loadActiveFocusSessionRecoveryRecord() {
  try {
    const savedValue = localStorage.getItem(ACTIVE_FOCUS_SESSION_STORAGE_KEY);

    if (!savedValue) return null;

    return normalizeActiveFocusSessionRecoveryRecord(JSON.parse(savedValue));
  } catch (error) {
    console.warn("Could not read Arcadia Academy focus-session recovery draft.", error);
    return null;
  }
}

export function saveActiveFocusSessionRecoveryRecord(record) {
  try {
    localStorage.setItem(
      ACTIVE_FOCUS_SESSION_STORAGE_KEY,
      JSON.stringify(record)
    );
    return true;
  } catch (error) {
    console.warn("Could not save Arcadia Academy focus-session recovery draft.", error);
    return false;
  }
}

export function clearActiveFocusSessionRecoveryRecord() {
  try {
    localStorage.removeItem(ACTIVE_FOCUS_SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn("Could not clear Arcadia Academy focus-session recovery draft.", error);
  }
}
