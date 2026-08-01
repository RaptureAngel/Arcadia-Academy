import { formatFocusedDuration, formatRelativeTime } from "./dates";
import {
  PROGRESS_METHOD_LABELS,
  calculateStudyProjectProgressPercentage,
  isFiniteProgressStudyProject,
} from "./studyProjects";

export const PROJECT_TYPE_ACTIVITY_VERBS = {
  reading: "Reading",
  study: "Studying",
  writing: "Writing",
  creative: "Creating",
  practical: "Practising",
  custom: "Working on",
};

export function getActivityVerb(projectType) {
  return PROJECT_TYPE_ACTIVITY_VERBS[projectType] || "Working on";
}

const PROJECT_BEGIN_ACTION_LABELS = {
  reading: "Begin Reading",
  study: "Begin Study",
  writing: "Begin Writing",
  creative: "Begin Creating",
  practical: "Begin Practice",
};

const PROJECT_CONTINUE_ACTION_LABELS = {
  reading: "Continue Reading",
  study: "Continue Study",
  writing: "Continue Writing",
  creative: "Continue Creating",
  practical: "Continue Practice",
};

export function getProjectActionLabel(project) {
  const hasStarted = project.sessionCount > 0;
  const labels = hasStarted
    ? PROJECT_CONTINUE_ACTION_LABELS
    : PROJECT_BEGIN_ACTION_LABELS;

  return (
    labels[project.projectType] ||
    (hasStarted ? "Continue Session" : "Start Session")
  );
}

export function getSubjectDisplay(subjectId, subjects) {
  const subject = Array.isArray(subjects)
    ? subjects.find((item) => item.id === subjectId)
    : null;

  if (!subject) {
    return { name: "No subject", color: "", icon: "" };
  }

  return { name: subject.name, color: subject.color, icon: subject.icon };
}

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Neutral sage accent used for empty slots, subject-less projects, and any
// stored colour value that isn't a valid hex colour (e.g. corrupted imports).
export const SUBJECT_ACCENT_FALLBACK = "var(--academy-sage)";

export function getSubjectAccentColor(subjectDisplay) {
  const color = subjectDisplay?.color;

  return typeof color === "string" && HEX_COLOR_PATTERN.test(color)
    ? color
    : SUBJECT_ACCENT_FALLBACK;
}

function hexToRgb(hex) {
  let value = hex.replace("#", "");

  if (value.length === 3) {
    value = value
      .split("")
      .map((channel) => channel + channel)
      .join("");
  }

  const num = parseInt(value, 16);

  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function relativeLuminance({ r, g, b }) {
  const [rl, gl, bl] = [r, g, b].map((channel) => {
    const s = channel / 255;

    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

// Contrast ratio of a colour against white text, per WCAG's relative
// luminance formula (1.0 = white background, 0.05 offset avoids /0).
function contrastRatioWithWhite(hex) {
  return 1.05 / (relativeLuminance(hexToRgb(hex)) + 0.05);
}

// Safe, always-readable fallback for the primary session button when a
// subject colour is missing, invalid, or too light for white button text.
export const SUBJECT_BUTTON_FALLBACK = "var(--academy-sage-strong)";

const MIN_BUTTON_CONTRAST = 3;

export function getSubjectButtonColor(subjectDisplay) {
  const color = subjectDisplay?.color;

  if (typeof color !== "string" || !HEX_COLOR_PATTERN.test(color)) {
    return SUBJECT_BUTTON_FALLBACK;
  }

  return contrastRatioWithWhite(color) >= MIN_BUTTON_CONTRAST
    ? color
    : SUBJECT_BUTTON_FALLBACK;
}

export function getProjectProgressLabel(project) {
  const { progressMethod, progressCurrent, progressTarget, sessionCount } = project;
  const hasTarget = isFiniteProgressStudyProject(project);

  if (progressMethod === "pages") {
    return `Page ${progressCurrent} of ${progressTarget}`;
  }

  if (progressMethod === "chapters") {
    return `Chapter ${progressCurrent} of ${progressTarget}`;
  }

  if (progressMethod === "sessions") {
    return hasTarget
      ? `${progressCurrent} of ${progressTarget} sessions`
      : `${sessionCount} session${sessionCount === 1 ? "" : "s"} logged`;
  }

  if (progressMethod === "outputs") {
    const unit =
      progressCurrent === 1
        ? project.outputUnitSingular || "output"
        : project.outputUnitPlural || "outputs";

    return hasTarget
      ? `${progressCurrent} of ${progressTarget} ${unit}`
      : `${progressCurrent} ${unit} so far`;
  }

  return `${sessionCount} session${sessionCount === 1 ? "" : "s"} logged`;
}

export function getProjectProgressPercent(project) {
  return calculateStudyProjectProgressPercentage(project);
}

export function getLastActivityLabel(project) {
  if (!project?.lastWorkedAt) return "No activity yet";

  const relative = formatRelativeTime(project.lastWorkedAt);

  return `Last worked ${relative.charAt(0).toLowerCase()}${relative.slice(1)}`;
}

function getSessionsAndFocusedLine(project) {
  return `${project.sessionCount} session${project.sessionCount === 1 ? "" : "s"} · ${formatFocusedDuration(project.focusedSeconds)}`;
}

// Consolidates the per-project-type rules for what the dashboard card's
// progress ring and supporting lines should show, so ProjectCard stays a
// thin presentational component. Uses only existing project fields — no
// fabricated stats.
export function getProjectCardMetrics(project) {
  const methodLabel = PROGRESS_METHOD_LABELS[project.progressMethod] || "";
  const lastActivityLine = getLastActivityLabel(project);

  if (isFiniteProgressStudyProject(project)) {
    return {
      ringMode: "percent",
      percent: calculateStudyProjectProgressPercentage(project),
      ringLabel: `${project.title} progress: ${calculateStudyProjectProgressPercentage(project)}%`,
      lines: [getProjectProgressLabel(project), getSessionsAndFocusedLine(project), lastActivityLine],
    };
  }

  if (project.progressMethod === "outputs") {
    const unit =
      project.progressCurrent === 1
        ? project.outputUnitSingular || "output"
        : project.outputUnitPlural || "outputs";

    return {
      ringMode: "count",
      count: project.progressCurrent,
      countLabel: unit,
      ringLabel: `${project.title} progress: ${project.progressCurrent} ${unit}`,
      lines: [
        getSessionsAndFocusedLine(project),
        methodLabel,
        project.lastOutcome ? `Last outcome: ${project.lastOutcome}` : lastActivityLine,
      ],
    };
  }

  return {
    ringMode: "count",
    count: project.sessionCount,
    countLabel: "sessions",
    ringLabel: `${project.title} progress: ${project.sessionCount} sessions logged`,
    lines: [formatFocusedDuration(project.focusedSeconds), methodLabel, lastActivityLine],
  };
}
