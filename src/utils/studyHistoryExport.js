import {
  PROGRESS_METHOD_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
} from "./studyProjects";
import { SESSION_OUTCOME_LABELS } from "./studySessions";

// Pure, read-only formatting for human-readable study-history exports.
// Every function here only reads its arguments and returns a string — no
// storage access, no state changes, no side effects of any kind. Callers
// are responsible for turning the returned text into a downloaded file.

const SINGULAR_PROGRESS_UNIT_LABELS = {
  pages: "Page",
  chapters: "Chapter",
};

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function formatLocalDateTime(isoString) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleString("en-ZA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLocalDate(isoString) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Spells out units in full ("42 minutes", "1 hour 5 minutes") for a
// document meant to be read, rather than the compact dashboard style.
function formatFocusedTimeForLog(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0 && minutes === 0) {
    return seconds > 0 ? "less than a minute" : "0 minutes";
  }

  const parts = [];

  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);

  return parts.join(" ");
}

// Resolves a project's subject name safely: null when no subject is
// assigned (a normal state, not an error), a labelled fallback when a
// subjectId is set but the subject record can't be found.
function resolveProjectSubjectName(project, subjects) {
  if (!project?.subjectId) return null;

  const subject = Array.isArray(subjects)
    ? subjects.find((item) => item.id === project.subjectId)
    : null;

  return subject ? subject.name : `Unknown subject (${project.subjectId})`;
}

// Resolves a session's linked project/subject/character records safely.
// Deleted/unresolvable records fall back to clear, labelled text — the
// underlying id is only included in that fallback text, never elsewhere.
function resolveSessionContext({ session, studyProjects, subjects, characterLibrary }) {
  const project = Array.isArray(studyProjects)
    ? studyProjects.find((item) => item.id === session.projectId)
    : null;

  const projectTitle = project
    ? project.title
    : `Deleted project (${session.projectId || "unknown id"})`;

  // project itself missing: its subject can't be known, resolves to null.
  const subjectName = project ? resolveProjectSubjectName(project, subjects) : null;

  let characterName = null;

  if (session.characterId) {
    const character = Array.isArray(characterLibrary)
      ? characterLibrary.find((item) => item.id === session.characterId)
      : null;

    characterName = character
      ? character.name
      : `Unknown character (${session.characterId})`;
  }
  // session.characterId is null: no character was attributed, omit the line.

  return { project, projectTitle, subjectName, characterName };
}

// Human-readable progress line for one session, or null if the project's
// progress method has nothing meaningful to show (e.g. open-ended, or a
// deleted project whose method can't be known).
function describeSessionProgress(session, project) {
  if (!project) return null;

  const method = project.progressMethod;
  const unitLabel = SINGULAR_PROGRESS_UNIT_LABELS[method];

  if (unitLabel && isFiniteNumber(session.progressBefore) && isFiniteNumber(session.progressAfter)) {
    return `${unitLabel} ${session.progressBefore} → ${unitLabel} ${session.progressAfter} (+${session.progressDelta})`;
  }

  if (method === "sessions" && isFiniteNumber(session.progressAfter)) {
    return `Session ${session.progressAfter}`;
  }

  if (method === "outputs" && session.outputCount > 0) {
    const unit =
      session.outputCount === 1
        ? project.outputUnitSingular || "output"
        : project.outputUnitPlural || "outputs";

    return `+${session.outputCount} ${unit}`;
  }

  return null;
}

// Builds the "Project Notes" block: one entry per project with a non-blank
// persistent note (project.notes — distinct from a session's own note),
// listed exactly once regardless of how many sessions reference it. Empty
// array when no project has a saved note, so the caller can omit the whole
// section rather than print an empty header.
function buildProjectNotesLines(studyProjects, subjects) {
  const projectsWithNotes = (Array.isArray(studyProjects) ? studyProjects : []).filter(
    (project) => typeof project?.notes === "string" && project.notes.trim()
  );

  if (projectsWithNotes.length === 0) return [];

  const lines = ["Project Notes", ""];

  projectsWithNotes.forEach((project) => {
    const subjectName = resolveProjectSubjectName(project, subjects);
    const statusLabel = PROJECT_STATUS_LABELS[project.status] || project.status;

    lines.push(project.title);
    if (subjectName) lines.push(`Subject: ${subjectName}`);
    if (statusLabel) lines.push(`Status: ${statusLabel}`);
    lines.push("");
    lines.push(project.notes.replace(/\r\n/g, "\n"));
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  // Drop the trailing blank line + divider after the final project.
  while (lines.length > 0 && (lines[lines.length - 1] === "" || lines[lines.length - 1] === "---")) {
    lines.pop();
  }

  return lines;
}

// --- TXT export -------------------------------------------------------

export function buildStudyLogText({
  studySessions,
  studyProjects,
  subjects,
  characterLibrary,
  now = new Date(),
} = {}) {
  const sessions = Array.isArray(studySessions) ? studySessions : [];
  const orderedSessions = [...sessions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  const totalFocusedSeconds = sessions.reduce(
    (total, session) => total + (Number(session.focusedSeconds) || 0),
    0
  );
  const projectCount = new Set(sessions.map((session) => session.projectId)).size;

  const lines = [];

  lines.push("Arcadia Academy Study Log");
  lines.push(`Exported: ${formatLocalDateTime(now.toISOString())}`);
  lines.push("");
  lines.push("Summary");
  lines.push(`- Total sessions: ${sessions.length}`);
  lines.push(`- Total focused time: ${formatFocusedTimeForLog(totalFocusedSeconds)}`);
  lines.push(`- Projects studied: ${projectCount}`);

  if (orderedSessions.length > 0) {
    const firstDate = formatLocalDate(orderedSessions[0].startedAt);
    const lastDate = formatLocalDate(
      orderedSessions[orderedSessions.length - 1].startedAt
    );

    lines.push(
      `- Date range: ${firstDate}${firstDate === lastDate ? "" : ` – ${lastDate}`}`
    );
  }

  lines.push("");

  const projectNotesLines = buildProjectNotesLines(studyProjects, subjects);

  if (projectNotesLines.length > 0) {
    lines.push(...projectNotesLines);
    lines.push("");
  }

  if (orderedSessions.length === 0) {
    lines.push("Sessions");
    lines.push("");
    lines.push("No study sessions have been logged yet.");

    return lines.join("\n");
  }

  lines.push("Sessions (oldest first)");
  lines.push("");

  orderedSessions.forEach((session) => {
    const { project, projectTitle, subjectName, characterName } =
      resolveSessionContext({ session, studyProjects, subjects, characterLibrary });
    const progressLine = describeSessionProgress(session, project);

    lines.push(formatLocalDateTime(session.startedAt));
    lines.push(`Project: ${projectTitle}`);

    if (subjectName) lines.push(`Subject: ${subjectName}`);
    if (characterName) lines.push(`Character: ${characterName}`);

    lines.push(`Focused time: ${formatFocusedTimeForLog(session.focusedSeconds)}`);

    if (progressLine) lines.push(`Progress: ${progressLine}`);
    if (session.outcome) {
      lines.push(`Outcome: ${SESSION_OUTCOME_LABELS[session.outcome] || session.outcome}`);
    }
    if (session.xpAwarded > 0) lines.push(`XP awarded: ${session.xpAwarded}`);

    if (session.note && session.note.trim()) {
      lines.push(`Session note: ${session.note.replace(/\r\n/g, "\n")}`);
    }

    lines.push("");
    lines.push("---");
    lines.push("");
  });

  // Drop the trailing blank line + divider after the final session.
  while (lines.length > 0 && (lines[lines.length - 1] === "" || lines[lines.length - 1] === "---")) {
    lines.pop();
  }

  return lines.join("\n");
}

// --- CSV export ---------------------------------------------------------

const CSV_COLUMNS = [
  "Session ID",
  "Started At",
  "Ended At",
  "Date",
  "Project",
  "Subject",
  "Project Type",
  "Progress Method",
  "Character",
  "Focused Seconds",
  "Focused Minutes",
  "Progress Before",
  "Progress After",
  "Progress Delta",
  "Output Count",
  "Outcome",
  "XP Awarded",
  "Session Note",
  "Project Notes",
];

// RFC 4180-style escaping: any field containing a comma, quote, or line
// break is wrapped in quotes, with internal quotes doubled.
function escapeCsvField(value) {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildCsvRow(values) {
  return values.map(escapeCsvField).join(",");
}

export function buildSessionsCsv({
  studySessions,
  studyProjects,
  subjects,
  characterLibrary,
} = {}) {
  const sessions = Array.isArray(studySessions) ? studySessions : [];
  const rows = [buildCsvRow(CSV_COLUMNS)];

  sessions.forEach((session) => {
    const { project, projectTitle, subjectName, characterName } =
      resolveSessionContext({ session, studyProjects, subjects, characterLibrary });

    rows.push(
      buildCsvRow([
        session.id || "",
        session.startedAt || "",
        session.endedAt || "",
        session.startedAt ? formatLocalDate(session.startedAt) : "",
        projectTitle,
        subjectName || "",
        project ? PROJECT_TYPE_LABELS[project.projectType] || project.projectType : "",
        project ? PROGRESS_METHOD_LABELS[project.progressMethod] || project.progressMethod : "",
        characterName || "",
        isFiniteNumber(session.focusedSeconds) ? session.focusedSeconds : 0,
        isFiniteNumber(session.focusedSeconds)
          ? Math.round((session.focusedSeconds / 60) * 100) / 100
          : 0,
        isFiniteNumber(session.progressBefore) ? session.progressBefore : "",
        isFiniteNumber(session.progressAfter) ? session.progressAfter : "",
        isFiniteNumber(session.progressDelta) ? session.progressDelta : "",
        isFiniteNumber(session.outputCount) && session.outputCount > 0
          ? session.outputCount
          : "",
        session.outcome ? SESSION_OUTCOME_LABELS[session.outcome] || session.outcome : "",
        isFiniteNumber(session.xpAwarded) ? session.xpAwarded : 0,
        session.note || "",
        // Blank when the project is deleted (no record to read notes from)
        // or simply has no saved note. Intentionally duplicated across every
        // row for the same project — each CSV row stays independently
        // understandable without needing to cross-reference other rows.
        project?.notes || "",
      ])
    );
  });

  // UTF-8 BOM up front for Excel compatibility when opening the file directly.
  const byteOrderMark = "﻿";

  return `${byteOrderMark}${rows.join("\r\n")}`;
}
