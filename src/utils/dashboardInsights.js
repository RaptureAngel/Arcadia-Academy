const MS_PER_DAY = 24 * 60 * 60 * 1000;

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

function parseDateKey(dateKey) {
  if (typeof dateKey !== "string") return null;

  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getCompletedTasks(entry) {
  const tasks = Array.isArray(entry?.tasks) ? entry.tasks : [];
  return tasks.filter((task) => task?.completed);
}

function getTaskXp(task) {
  const xp = Number(task?.xp);
  return Number.isFinite(xp) && xp > 0 ? xp : 0;
}

function getTimerSeconds(task) {
  const seconds = Number(task?.timerTotalSeconds);
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
}

function summarizeTopValue(tasks, key) {
  const totals = tasks.reduce((summary, task) => {
    const value = task?.[key] || "None";
    const current = summary[value] || { count: 0, xp: 0 };

    return {
      ...summary,
      [value]: {
        count: current.count + 1,
        xp: current.xp + getTaskXp(task),
      },
    };
  }, {});

  const [topValue] = Object.entries(totals).sort((a, b) => {
    if (a[1].count !== b[1].count) return b[1].count - a[1].count;
    if (a[1].xp !== b[1].xp) return b[1].xp - a[1].xp;
    return a[0].localeCompare(b[0]);
  })[0] || ["None"];

  return topValue;
}

function getClientAttention(tasks) {
  const totals = tasks.reduce((summary, task) => {
    const name = task?.client || "None";
    const current = summary[name] || { name, xp: 0, count: 0 };

    return {
      ...summary,
      [name]: {
        name,
        xp: current.xp + getTaskXp(task),
        count: current.count + 1,
      },
    };
  }, {});
  const sortedItems = Object.values(totals).sort((a, b) => {
    if (a.xp !== b.xp) return b.xp - a.xp;
    if (a.count !== b.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
  const maxXp = sortedItems[0]?.xp || 0;

  return sortedItems.slice(0, 3).map((item) => ({
    ...item,
    barPercent: maxXp > 0 ? Math.round((item.xp / maxXp) * 100) : 0,
  }));
}

export function getWeekRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  start.setDate(start.getDate() - daysSinceMonday);

  const end = new Date(start.getTime() + 6 * MS_PER_DAY);

  return {
    start,
    end,
    startKey: toDateKey(start),
    endKey: toDateKey(end),
  };
}

export function isDateKeyInRange(dateKey, range) {
  const date = parseDateKey(dateKey);

  if (!date || !range?.start || !range?.end) return false;

  return date >= range.start && date <= range.end;
}

export function formatInsightDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function getDashboardInsights({
  history = [],
  completedTodayTasks = [],
  activeTasks = [],
  todayKey = toDateKey(new Date()),
  now = new Date(),
} = {}) {
  const weekRange = getWeekRange(now);
  const weekEntries = Array.isArray(history)
    ? history.filter((entry) => isDateKeyInRange(entry?.date, weekRange))
    : [];
  const safeCompletedTodayTasks = Array.isArray(completedTodayTasks)
    ? completedTodayTasks.filter((task) => task?.completed)
    : [];
  const completedHistoryTasks = weekEntries.flatMap((entry) =>
    getCompletedTasks(entry)
  );
  const completedTasks = [...completedHistoryTasks, ...safeCompletedTodayTasks];
  const weeklyXp = completedTasks.reduce(
    (total, task) => total + getTaskXp(task),
    0
  );
  const trackedSeconds = completedTasks.reduce(
    (total, task) => total + getTimerSeconds(task),
    0
  );
  const xpByDate = weekEntries.reduce((summary, entry) => {
    const dateKey = entry?.date || "Unknown";
    const entryXp = getCompletedTasks(entry).reduce(
      (total, task) => total + getTaskXp(task),
      0
    );

    return {
      ...summary,
      [dateKey]: (summary[dateKey] || 0) + entryXp,
    };
  }, {});
  const todayXp = safeCompletedTodayTasks.reduce(
    (total, task) => total + getTaskXp(task),
    0
  );

  if (todayXp > 0) {
    xpByDate[todayKey] = (xpByDate[todayKey] || 0) + todayXp;
  }

  const [bestDayKey, bestDayXp] = Object.entries(xpByDate).sort((a, b) => {
    if (a[1] !== b[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  })[0] || ["None yet", 0];

  return {
    weekStartKey: weekRange.startKey,
    weekEndKey: weekRange.endKey,
    weeklyXp,
    finishedCount: completedTasks.length,
    topClient: summarizeTopValue(completedTasks, "client"),
    topTaskType: summarizeTopValue(completedTasks, "taskType"),
    bestDay: bestDayXp > 0 ? bestDayKey : "None yet",
    bestDayXp,
    openItems: Array.isArray(activeTasks) ? activeTasks.length : 0,
    trackedSeconds,
    trackedTime: formatInsightDuration(trackedSeconds),
    clientAttention: getClientAttention(completedTasks),
  };
}
