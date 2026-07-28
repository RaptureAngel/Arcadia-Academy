export const MAX_ACTIVE_STUDY_PROJECTS = 5;

export const PROJECT_TYPES = [
  "reading",
  "study",
  "writing",
  "creative",
  "practical",
  "custom",
];

export const PROJECT_TYPE_LABELS = {
  reading: "Reading",
  study: "Study",
  writing: "Writing",
  creative: "Creative",
  practical: "Practical",
  custom: "Custom",
};

export const PROGRESS_METHODS = [
  "pages",
  "chapters",
  "sessions",
  "outputs",
  "open-ended",
];

export const PROGRESS_METHOD_LABELS = {
  pages: "Pages",
  chapters: "Chapters",
  sessions: "Sessions",
  outputs: "Outputs",
  "open-ended": "Open-ended",
};

export const PROJECT_STATUSES = ["active", "shelved", "completed", "retired"];

export const PROJECT_STATUS_LABELS = {
  active: "Active",
  shelved: "Shelved",
  completed: "Completed",
  retired: "Retired",
};

// Pages/chapters describe a fixed body of material and require a target.
// Sessions/outputs describe open-ended effort and may optionally have a target.
const TARGET_REQUIRED_METHODS = ["pages", "chapters"];
const TARGET_OPTIONAL_METHODS = ["sessions", "outputs"];

const STATUS_TIMESTAMP_FIELDS = {
  shelved: "shelvedAt",
  completed: "completedAt",
  retired: "retiredAt",
};

function normalizeText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toFiniteNonNegative(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function toPositiveTargetOrNull(value) {
  if (value === null || value === undefined) return null;

  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : null;
}

export function isFiniteProgressStudyProject(project) {
  return (
    typeof project?.progressTarget === "number" &&
    Number.isFinite(project.progressTarget) &&
    project.progressTarget > 0
  );
}

export function isOpenEndedStudyProject(project) {
  return !isFiniteProgressStudyProject(project);
}

export function calculateStudyProjectProgressPercentage(project) {
  if (!isFiniteProgressStudyProject(project)) return null;

  const current = toFiniteNonNegative(project.progressCurrent, 0);

  return Math.min(
    100,
    Math.round((current / project.progressTarget) * 100)
  );
}

export function isActiveStudyProjectSlot(project) {
  return project?.status === "active";
}

export function countActiveStudyProjects(studyProjects) {
  if (!Array.isArray(studyProjects)) return 0;

  return studyProjects.filter(isActiveStudyProjectSlot).length;
}

export function canCreateActiveStudyProject(studyProjects) {
  return countActiveStudyProjects(studyProjects) < MAX_ACTIVE_STUDY_PROJECTS;
}

export function createStudyProject({
  subjectId = null,
  title,
  description = "",
  projectType = "custom",
  progressMethod = "open-ended",
  progressTarget = null,
  outputUnitSingular = "",
  outputUnitPlural = "",
  notes = "",
} = {}) {
  const timestamp = new Date().toISOString();
  const normalizedProgressMethod = PROGRESS_METHODS.includes(progressMethod)
    ? progressMethod
    : "open-ended";
  const normalizedTarget =
    normalizedProgressMethod === "open-ended"
      ? null
      : toPositiveTargetOrNull(progressTarget);

  return {
    id: crypto.randomUUID(),
    subjectId: typeof subjectId === "string" && subjectId ? subjectId : null,
    title: String(title || "").trim(),
    description: normalizeText(description),
    projectType: PROJECT_TYPES.includes(projectType) ? projectType : "custom",
    progressMethod: normalizedProgressMethod,
    progressCurrent: 0,
    progressTarget: normalizedTarget,
    outputUnitSingular: normalizeText(outputUnitSingular),
    outputUnitPlural: normalizeText(outputUnitPlural),
    status: "active",
    notes: normalizeText(notes),
    sessionCount: 0,
    focusedSeconds: 0,
    lastWorkedAt: null,
    lastOutcome: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    shelvedAt: null,
    completedAt: null,
    retiredAt: null,
  };
}

export function normalizeStudyProject(raw) {
  if (!raw || typeof raw !== "object") return null;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";

  if (!title) return null;

  const timestamp = new Date().toISOString();
  const progressMethod = PROGRESS_METHODS.includes(raw.progressMethod)
    ? raw.progressMethod
    : "open-ended";
  const progressTarget =
    progressMethod === "open-ended"
      ? null
      : toPositiveTargetOrNull(raw.progressTarget);
  const rawProgressCurrent = toFiniteNonNegative(raw.progressCurrent, 0);
  const progressCurrent =
    progressTarget !== null
      ? Math.min(rawProgressCurrent, progressTarget)
      : rawProgressCurrent;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    subjectId:
      typeof raw.subjectId === "string" && raw.subjectId ? raw.subjectId : null,
    title,
    description: normalizeText(raw.description),
    projectType: PROJECT_TYPES.includes(raw.projectType)
      ? raw.projectType
      : "custom",
    progressMethod,
    progressCurrent,
    progressTarget,
    outputUnitSingular: normalizeText(raw.outputUnitSingular),
    outputUnitPlural: normalizeText(raw.outputUnitPlural),
    status: PROJECT_STATUSES.includes(raw.status) ? raw.status : "active",
    notes: normalizeText(raw.notes),
    sessionCount: Math.trunc(toFiniteNonNegative(raw.sessionCount, 0)),
    focusedSeconds: toFiniteNonNegative(raw.focusedSeconds, 0),
    lastWorkedAt: typeof raw.lastWorkedAt === "string" ? raw.lastWorkedAt : null,
    lastOutcome: typeof raw.lastOutcome === "string" ? raw.lastOutcome : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : timestamp,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : timestamp,
    shelvedAt: typeof raw.shelvedAt === "string" ? raw.shelvedAt : null,
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : null,
    retiredAt: typeof raw.retiredAt === "string" ? raw.retiredAt : null,
  };
}

export function normalizeStudyProjectList(rawList) {
  if (!Array.isArray(rawList)) return [];

  return rawList.map(normalizeStudyProject).filter(Boolean);
}

export function validateStudyProject(project) {
  const errors = [];

  if (!project || typeof project !== "object") {
    return { valid: false, errors: ["Study project must be an object."] };
  }

  if (typeof project.title !== "string" || !project.title.trim()) {
    errors.push("Title is required.");
  }

  if (!PROJECT_TYPES.includes(project.projectType)) {
    errors.push("Invalid project type.");
  }

  if (!PROGRESS_METHODS.includes(project.progressMethod)) {
    errors.push("Invalid progress method.");
  }

  if (!PROJECT_STATUSES.includes(project.status)) {
    errors.push("Invalid status.");
  }

  if (!Number.isFinite(project.progressCurrent) || project.progressCurrent < 0) {
    errors.push("progressCurrent must be a finite, non-negative number.");
  }

  if (!Number.isFinite(project.focusedSeconds) || project.focusedSeconds < 0) {
    errors.push("focusedSeconds must be a finite, non-negative number.");
  }

  if (!Number.isFinite(project.sessionCount) || project.sessionCount < 0) {
    errors.push("sessionCount must be a finite, non-negative number.");
  }

  if (project.progressMethod === "open-ended") {
    if (project.progressTarget !== null) {
      errors.push("Open-ended projects must not have a progressTarget.");
    }
  } else if (TARGET_REQUIRED_METHODS.includes(project.progressMethod)) {
    if (!(Number.isFinite(project.progressTarget) && project.progressTarget > 0)) {
      errors.push(
        `${project.progressMethod} projects require a positive progressTarget.`
      );
    }
  } else if (TARGET_OPTIONAL_METHODS.includes(project.progressMethod)) {
    if (
      project.progressTarget !== null &&
      !(Number.isFinite(project.progressTarget) && project.progressTarget > 0)
    ) {
      errors.push("progressTarget must be null or a positive finite number.");
    }
  }

  if (
    Number.isFinite(project.progressTarget) &&
    Number.isFinite(project.progressCurrent) &&
    project.progressCurrent > project.progressTarget
  ) {
    errors.push("progressCurrent may not exceed progressTarget.");
  }

  return { valid: errors.length === 0, errors };
}

export function changeStudyProjectStatus(
  project,
  nextStatus,
  timestamp = new Date().toISOString()
) {
  if (!PROJECT_STATUSES.includes(nextStatus)) return project;
  if (project.status === nextStatus) return project;

  const updated = { ...project, status: nextStatus, updatedAt: timestamp };
  const timestampField = STATUS_TIMESTAMP_FIELDS[nextStatus];

  if (timestampField) {
    updated[timestampField] = timestamp;
  }

  if (nextStatus === "active") {
    // Returning to active clears the shelved marker; completion/retirement
    // history is preserved so it isn't silently erased by reactivation.
    updated.shelvedAt = null;
  }

  return updated;
}

export function updateStudyProjectNotes(
  project,
  notes,
  timestamp = new Date().toISOString()
) {
  return {
    ...project,
    notes: normalizeText(notes),
    updatedAt: timestamp,
  };
}

export function updateStudyProjectProgress(
  project,
  progressCurrent,
  timestamp = new Date().toISOString()
) {
  const nextProgress = toFiniteNonNegative(progressCurrent, project.progressCurrent);
  const clampedProgress = isFiniteProgressStudyProject(project)
    ? Math.min(nextProgress, project.progressTarget)
    : nextProgress;

  return {
    ...project,
    progressCurrent: clampedProgress,
    updatedAt: timestamp,
    lastWorkedAt: timestamp,
  };
}

export function addFocusedTimeAndSession(
  project,
  focusedSeconds,
  { incrementSession = true, outcome = null, timestamp = new Date().toISOString() } = {}
) {
  const additionalSeconds = toFiniteNonNegative(focusedSeconds, 0);

  return {
    ...project,
    focusedSeconds: project.focusedSeconds + additionalSeconds,
    sessionCount: project.sessionCount + (incrementSession ? 1 : 0),
    lastWorkedAt: timestamp,
    lastOutcome: outcome ?? project.lastOutcome,
    updatedAt: timestamp,
  };
}
