import {
  getActiveProjectStepTask,
  getCompletedProjectStepTasksForDate,
} from "./projects";
import { getLevel, getXpRequiredForNextLevel } from "./xp";

export const DEFAULT_DAILY_QUOTA = 500;
export const MIN_DAILY_QUOTA = 50;
export const MAX_DAILY_QUOTA = 5000;

export function normalizeDailyQuota(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_DAILY_QUOTA;
  }

  return Math.min(
    Math.max(Math.round(numericValue), MIN_DAILY_QUOTA),
    MAX_DAILY_QUOTA
  );
}

export function getLevelProgress(totalXp) {
  const level = getLevel(totalXp);
  const xpBeforeCurrentLevel = Array.from({ length: level - 1 }).reduce(
    (total, _item, index) => total + getXpRequiredForNextLevel(index + 1),
    0
  );
  const xpIntoLevel = Math.max(0, totalXp - xpBeforeCurrentLevel);
  const xpRequiredForNextLevel = getXpRequiredForNextLevel(level);
  const xpToNextLevel = Math.max(0, xpRequiredForNextLevel - xpIntoLevel);
  const progress = Math.min(xpIntoLevel / xpRequiredForNextLevel, 1);

  return {
    level,
    progress,
    xpToNextLevel,
  };
}

export function getTopCompletedValue(tasks, key) {
  const totals = tasks.reduce((summary, task) => {
    const value = task[key] || "None";
    const current = summary[value] || { count: 0, xp: 0 };

    return {
      ...summary,
      [value]: {
        count: current.count + 1,
        xp: current.xp + task.xp,
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

export function getArchiveTaskGroups({ tasks, projects, date }) {
  const completedRegularTasks = tasks.filter((task) => task.completed);
  const carryOverTasks = tasks.filter((task) => !task.completed);
  const activeProjectStepTasks = projects
    .map((project) => getActiveProjectStepTask(project))
    .filter(Boolean);
  const completedProjectSteps = getCompletedProjectStepTasksForDate(
    projects,
    date
  );

  return {
    completedRegularTasks,
    carryOverTasks,
    activeProjectStepTasks,
    unfinishedTasks: [...carryOverTasks, ...activeProjectStepTasks],
    completedProjectSteps,
    historyTasks: [...completedRegularTasks, ...completedProjectSteps],
  };
}
