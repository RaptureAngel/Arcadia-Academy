function safeText(value, fallback = "None") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function getSessionDate(session) {
  const date = new Date(session?.startedAt || Date.now());

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function formatExportDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActionItem(task) {
  const details = [
    `- ${safeText(task?.title, "Untitled action item")}`,
    `  Priority: ${task?.priority ? "Yes" : "No"}`,
  ];

  if (task?.client) {
    details.push(`  Client: ${safeText(task.client)}`);
  }

  return details.join("\n");
}

function getSafeFileSegment(value, fallback = "meeting") {
  return (
    String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 56) || fallback
  );
}

function getMeetingTimestamp(session) {
  const date = getSessionDate(session);
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
  ].join("");
}

export function buildMeetingNotesText(session, meetingTask, actionItems = []) {
  if (!session || !meetingTask) {
    return "";
  }

  const notes = String(session.notes || "").trim() || "None recorded.";
  const projectDetails = [
    meetingTask.projectName ? `Project: ${safeText(meetingTask.projectName)}` : null,
    meetingTask.projectTemplateName
      ? `Template: ${safeText(meetingTask.projectTemplateName)}`
      : null,
  ].filter(Boolean);

  return [
    `Arcadia Meeting Notes - ${safeText(meetingTask.title, "Untitled meeting")}`,
    `Started: ${formatExportDateTime(session.startedAt)}`,
    `Client: ${safeText(meetingTask.client)}`,
    ...projectDetails,
    "Notes",
    notes,
    "Action Items",
    actionItems.length > 0
      ? actionItems.map(formatActionItem).join("\n\n")
      : "None recorded.",
  ].join("\n\n");
}

export function getMeetingNotesFileName(session, meetingTask) {
  const timestamp = getMeetingTimestamp(session);
  const titleSegment = getSafeFileSegment(meetingTask?.title, "meeting");

  return `arcadia-meeting-notes-${timestamp}-${titleSegment}.txt`;
}
