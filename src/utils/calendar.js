// Internal date helpers — all dates are local-time YYYY-MM-DD strings.

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function stepDateKey(dateKey, days) {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

function daysBetweenKeys(fromKey, toKey) {
  return Math.round(
    (parseDateKey(toKey) - parseDateKey(fromKey)) / (24 * 60 * 60 * 1000)
  );
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const WEEKDAY_LABELS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const NTH_LABELS = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  [-1]: "last",
};

export const CALENDAR_CATEGORY_LABELS = {
  deadline: "Deadline",
  appointment: "Appointment",
  obligation: "Obligation",
  petsitting: "Petsitting",
  "working-away": "Working Away",
};

export function getCalendarCategoryLabel(category) {
  const key = String(category || "").trim().toLowerCase();
  return CALENDAR_CATEGORY_LABELS[key] || category;
}

export function getCalendarCategoryKey(category) {
  return String(category || "").trim().toLowerCase();
}

export function isWorkingAwayEvent(event) {
  return getCalendarCategoryKey(event?.category) === "working-away";
}

export function isPetsittingEvent(event) {
  return getCalendarCategoryKey(event?.category) === "petsitting";
}

export function isCalendarDayMarkerEvent(event) {
  const categoryKey = getCalendarCategoryKey(event?.category);
  return categoryKey === "working-away" || categoryKey === "petsitting";
}

// Returns "YYYY-MM-DD" for the nth occurrence of weekday in the given month,
// or null if the combination is out of range.
// month is 1-indexed. weekday: 0=Sun…6=Sat. nth: 1–4 or -1 (last).
export function getNthWeekdayOfMonth(year, month, nth, weekday) {
  if (nth === -1) {
    const lastDay = new Date(year, month, 0).getDate();
    for (let d = lastDay; d >= 1; d--) {
      if (new Date(year, month - 1, d).getDay() === weekday) {
        return toDateKey(new Date(year, month - 1, d));
      }
    }
    return null;
  }

  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const candidate = new Date(year, month - 1, d);
    if (candidate.getMonth() !== month - 1) break;
    if (candidate.getDay() === weekday) {
      count++;
      if (count === nth) return toDateKey(candidate);
    }
  }
  return null;
}

// Returns an array of YYYY-MM-DD occurrence dates within [fromDateKey, endDateKey] inclusive.
// Respects recurrence.until and recurrence.exceptions. Never loops unbounded.
export function generateOccurrences(event, fromDateKey, endDateKey) {
  if (!event?.date) return [];

  const { date: anchorKey, recurrence } = event;

  const effectiveTo =
    recurrence?.until && recurrence.until < endDateKey
      ? recurrence.until
      : endDateKey;

  if (!recurrence || recurrence.rule === "none") {
    return anchorKey >= fromDateKey && anchorKey <= effectiveTo
      ? [anchorKey]
      : [];
  }

  const { rule, exceptions = [] } = recurrence;
  const exceptionsSet = new Set(exceptions);
  const results = [];

  function collect(dateKey) {
    if (
      dateKey >= anchorKey &&
      dateKey >= fromDateKey &&
      dateKey <= effectiveTo &&
      !exceptionsSet.has(dateKey)
    ) {
      results.push(dateKey);
    }
  }

  if (rule === "daily" || rule === "weekly" || rule === "biweekly") {
    const step = rule === "daily" ? 1 : rule === "biweekly" ? 14 : 7;

    if (anchorKey > effectiveTo) return results;

    let current = anchorKey;

    if (anchorKey < fromDateKey) {
      const diff = daysBetweenKeys(anchorKey, fromDateKey);
      const stepsNeeded = Math.ceil(diff / step);
      current = stepDateKey(anchorKey, stepsNeeded * step);
    }

    let guard = 0;
    while (current <= effectiveTo && guard < 1500) {
      collect(current);
      current = stepDateKey(current, step);
      guard++;
    }

    return results;
  }

  if (rule === "monthly-date") {
    const dayOfMonth =
      recurrence.dayOfMonth != null
        ? recurrence.dayOfMonth
        : parseDateKey(anchorKey).getDate();

    const anchorD = parseDateKey(anchorKey);
    let year = anchorD.getFullYear();
    let month = anchorD.getMonth() + 1;

    for (let i = 0; i < 1200; i++) {
      const candidate = new Date(year, month - 1, dayOfMonth);

      if (candidate.getMonth() !== month - 1) {
        // dayOfMonth overflows this month (e.g. Feb 30) — skip
        month++;
        if (month > 12) { month = 1; year++; }
        continue;
      }

      const dateKey = toDateKey(candidate);
      if (dateKey > effectiveTo) break;
      collect(dateKey);
      month++;
      if (month > 12) { month = 1; year++; }
    }

    return results;
  }

  if (rule === "monthly-nth-weekday") {
    const { nth, weekday } = recurrence;
    if (nth == null || weekday == null) return results;

    const anchorD = parseDateKey(anchorKey);
    let year = anchorD.getFullYear();
    let month = anchorD.getMonth() + 1;

    for (let i = 0; i < 1200; i++) {
      const dateKey = getNthWeekdayOfMonth(year, month, nth, weekday);

      if (dateKey && dateKey > effectiveTo) break;
      if (dateKey) collect(dateKey);

      month++;
      if (month > 12) { month = 1; year++; }
    }

    return results;
  }

  if (rule === "annual") {
    const anchorD = parseDateKey(anchorKey);
    const anchorMonth = anchorD.getMonth() + 1;
    const anchorDay = anchorD.getDate();
    let year = anchorD.getFullYear();

    for (let i = 0; i < 200; i++) {
      const candidate = new Date(year, anchorMonth - 1, anchorDay);

      if (candidate.getMonth() !== anchorMonth - 1) {
        // Leap-year edge case (e.g. Feb 29 in a non-leap year) — skip
        year++;
        continue;
      }

      const dateKey = toDateKey(candidate);
      if (dateKey > effectiveTo) break;
      collect(dateKey);
      year++;
    }

    return results;
  }

  return results;
}

// Returns the next occurrence date (YYYY-MM-DD) strictly after afterDateKey,
// or null if none found within a 2-year lookahead window.
export function getNextOccurrence(event, afterDateKey) {
  const fromKey = stepDateKey(afterDateKey, 1);
  const toKey = stepDateKey(afterDateKey, 730);
  const occurrences = generateOccurrences(event, fromKey, toKey);
  return occurrences.length > 0 ? occurrences[0] : null;
}

// Returns occurrence objects { event, dateKey } for all events
// within [fromDateKey, fromDateKey + days], sorted by date then priority.
export function getUpcomingEvents(events, fromDateKey, days = 14) {
  if (!Array.isArray(events)) return [];

  const toKey = stepDateKey(fromDateKey, days);
  const occurrences = [];

  for (const event of events) {
    const dates = generateOccurrences(event, fromDateKey, toKey);
    for (const dateKey of dates) {
      occurrences.push({ event, dateKey });
    }
  }

  occurrences.sort((a, b) => {
    if (a.dateKey < b.dateKey) return -1;
    if (a.dateKey > b.dateKey) return 1;
    if (a.event.priority && !b.event.priority) return -1;
    if (!a.event.priority && b.event.priority) return 1;
    return 0;
  });

  return occurrences;
}

// Returns a plain-English description of a recurrence object.
export function formatRecurrenceLabel(recurrence) {
  if (!recurrence || recurrence.rule === "none") {
    return "No recurrence";
  }

  const { rule } = recurrence;

  if (rule === "weekly") return "Weekly";
  if (rule === "daily") return "Daily";
  if (rule === "biweekly") return "Every two weeks";

  if (rule === "monthly-date") {
    const day = recurrence.dayOfMonth;
    return day != null ? `Monthly on the ${ordinal(day)}` : "Monthly";
  }

  if (rule === "monthly-nth-weekday") {
    const { nth, weekday } = recurrence;
    if (nth == null || weekday == null) return "Monthly";
    const nthLabel = NTH_LABELS[nth] ?? String(nth);
    const weekdayLabel = WEEKDAY_LABELS[weekday] ?? "";
    return `Monthly on the ${nthLabel} ${weekdayLabel}`;
  }

  if (rule === "annual") return "Annually";

  return "No recurrence";
}
