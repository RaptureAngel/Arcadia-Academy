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

export function isDeadlineSoon(value, days = 3) {
  if (!value || isDeadlineOverdue(value)) return false;

  const deadline = new Date(`${value}T00:00:00`);
  if (Number.isNaN(deadline.getTime())) return false;

  const today = new Date(`${getTodayKey()}T00:00:00`);
  const diffDays = Math.round((deadline - today) / (24 * 60 * 60 * 1000));

  return diffDays >= 0 && diffDays <= days;
}
