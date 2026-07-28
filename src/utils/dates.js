export function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatSavedTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDeadline(value) {
  if (!value) return null;

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isDeadlineOverdue(value) {
  if (!value) return false;

  return value < getTodayKey();
}

export function formatRelativeTime(value, now = new Date()) {
  if (!value) return "No activity yet";

  const then = new Date(value).getTime();
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  if (Number.isNaN(then)) return "No activity yet";

  const diffSeconds = Math.max(0, Math.round((nowMs - then) / 1000));

  if (diffSeconds < 60) return "Just now";

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatFocusedDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0 && minutes === 0) {
    return seconds > 0 ? "<1 min" : "0 min";
  }

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;

  return `${hours} hr ${minutes} min`;
}

export function isDeadlineSoon(value, days = 3) {
  if (!value || isDeadlineOverdue(value)) return false;

  const deadline = new Date(`${value}T00:00:00`);
  if (Number.isNaN(deadline.getTime())) return false;

  const today = new Date(`${getTodayKey()}T00:00:00`);
  const diffDays = Math.round((deadline - today) / (24 * 60 * 60 * 1000));

  return diffDays >= 0 && diffDays <= days;
}
