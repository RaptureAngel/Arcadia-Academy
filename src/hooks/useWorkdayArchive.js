import { useState } from "react";
import {
  buildHistoryEntry,
  mergeHistoryEntries,
  upsertHistoryEntry,
} from "../utils/history";
import {
  archiveCompletedProjectStepsForDate,
  getCompletedProjectPackSummariesForDate,
} from "../utils/projects";
import { getArchiveTaskGroups, getTopCompletedValue } from "../utils/appStats";
import { getTodayKey } from "../utils/dates";
import { getRank } from "../utils/xp";
import { isRegularTask, pauseRunningRegularTaskTimers } from "../utils/tasks";
import {
  closeOpenWorkSession,
  createBlankWorkday,
  getWorkdayEmployeeIds,
  getWorkdayFinalPunchOut,
  getWorkdayFirstPunchIn,
  getWorkdaySessions,
  normalizeWorkday,
  startWorkSession,
} from "../utils/workday";

export function useWorkdayArchive({
  workday,
  setWorkday,
  tasks,
  setTasks,
  projects,
  setProjects,
  history,
  setHistory,
  activeDate,
  setActiveDate,
  activeEmployeeId,
  dailyQuota,
  getEmployeeName,
  autoSaveWorkLog,
  setDataNotice,
  setEditingTaskId,
  setPreLunchTaskId,
  setDeepWorkTaskId,
  scratchpad,
} = {}) {
  const [endOfDaySummary, setEndOfDaySummary] = useState(null);
  const [showWorkdayDetails, setShowWorkdayDetails] = useState(false);

  function punchIn() {
    const now = new Date().toISOString();
    const today = getTodayKey();

    setPreLunchTaskId(null);
    setWorkday((currentWorkday) => {
      const normalized =
        currentWorkday?.date === today
          ? normalizeWorkday(currentWorkday, today)
          : createBlankWorkday(today);
      const sessionWorkday = startWorkSession(normalized, activeEmployeeId, now);

      return {
        ...sessionWorkday,
        date: today,
        status: "working",
        punchInTime: normalized.punchInTime || now,
        lunchStartTime: null,
        lunchEndTime: null,
        punchOutTime: null,
      };
    });
  }

  function startLunch() {
    const now = new Date().toISOString();
    const runningRegularTask = tasks.find(
      (task) => isRegularTask(task) && task.timerStartedAt
    );
    const pausedTasks = pauseRunningRegularTaskTimers(tasks, now);

    setPreLunchTaskId(runningRegularTask?.id || null);
    setTasks(pausedTasks);
    setDeepWorkTaskId(null);
    setWorkday((currentWorkday) => ({
      ...currentWorkday,
      status: "onLunch",
      lunchStartTime: now,
      lunchEndTime: null,
    }));
    setEditingTaskId(null);
  }

  function returnFromLunch() {
    const now = new Date().toISOString();

    setWorkday((currentWorkday) => ({
      ...currentWorkday,
      status: "working",
      lunchEndTime: now,
    }));
  }

  function punchOut() {
    const now = new Date().toISOString();
    const pausedTasks = pauseRunningRegularTaskTimers(tasks, now);
    const sessionWorkday = closeOpenWorkSession(workday, now);
    const punchedOutWorkday = {
      ...sessionWorkday,
      status: "punchedOut",
      punchInTime: getWorkdayFirstPunchIn(sessionWorkday) || workday.punchInTime,
      punchOutTime: now,
    };

    setTasks(pausedTasks);
    setWorkday(punchedOutWorkday);
    setEditingTaskId(null);
    setDeepWorkTaskId(null);
    setPreLunchTaskId(null);
    openEndOfDaySummary(punchedOutWorkday, pausedTasks);
  }

  function buildEndOfDaySummary(workdayOverride = workday, taskList = tasks) {
    const { historyTasks, unfinishedTasks } = getArchiveTaskGroups({
      tasks: taskList,
      projects,
      date: activeDate,
    });
    const completedProjectPacks = getCompletedProjectPackSummariesForDate(
      projects,
      activeDate
    );
    const xpEarned = historyTasks.reduce((total, task) => total + task.xp, 0);
    const summaryQuotaPercent =
      xpEarned === 0
        ? 0
        : Math.max(1, Math.round((xpEarned / dailyQuota) * 100));
    const hasExistingArchiveEntry = Array.isArray(history)
      ? history.some((entry) => entry?.date === activeDate)
      : false;

    const normalizedWorkday = normalizeWorkday(workdayOverride, activeDate);
    const employeeIds = getWorkdayEmployeeIds(normalizedWorkday, activeEmployeeId);
    const employeeNames = employeeIds.map((employeeId) => getEmployeeName(employeeId));
    const sessions = getWorkdaySessions(normalizedWorkday, activeEmployeeId).map(
      (session) => ({
        ...session,
        employeeName: getEmployeeName(session.employeeId),
      })
    );

    return {
      date: activeDate,
      employeeName:
        employeeNames.length > 0
          ? employeeNames.join(", ")
          : getEmployeeName(activeEmployeeId),
      employeeNames,
      sessions,
      workday: {
        ...normalizedWorkday,
        punchInTime: getWorkdayFirstPunchIn(normalizedWorkday),
        punchOutTime: getWorkdayFinalPunchOut(normalizedWorkday),
      },
      completedTaskCount: historyTasks.length,
      completedProjectPackCount: completedProjectPacks.length,
      carryOverTaskCount: unfinishedTasks.length,
      xpEarned,
      quotaPercent: summaryQuotaPercent,
      dailyRank: getRank(xpEarned),
      topClient: getTopCompletedValue(historyTasks, "client"),
      topTaskType: getTopCompletedValue(historyTasks, "taskType"),
      canArchive:
        historyTasks.length > 0 || unfinishedTasks.length > 0 || hasExistingArchiveEntry,
    };
  }

  function openEndOfDaySummary(workdayOverride = workday, taskList = tasks) {
    setEndOfDaySummary(buildEndOfDaySummary(workdayOverride, taskList));
  }

  function closeEndOfDaySummary() {
    setEndOfDaySummary(null);
  }

  function performArchiveToday(workdayOverride = workday) {
    const pausedTasks = pauseRunningRegularTaskTimers(tasks);
    const { carryOverTasks, historyTasks, unfinishedTasks } =
      getArchiveTaskGroups({
        tasks: pausedTasks,
        projects,
        date: activeDate,
      });

    const existingEntry = Array.isArray(history)
      ? history.find((entry) => entry?.date === activeDate)
      : null;

    if (
      !existingEntry &&
      historyTasks.length === 0 &&
      unfinishedTasks.length === 0
    ) {
      return;
    }

    if (historyTasks.length > 0 || unfinishedTasks.length > 0 || existingEntry) {
      const historyEntry = {
        ...buildHistoryEntry({
          date: activeDate,
          tasks: historyTasks,
          carriedOverTasks: unfinishedTasks,
          activeEmployeeId,
          workday: normalizeWorkday(workdayOverride, activeDate),
        }),
        scratchpadNote: scratchpad?.[activeDate] ?? "",
      };
      const mergedHistoryEntry = existingEntry
        ? mergeHistoryEntries(existingEntry, historyEntry)
        : historyEntry;

      setHistory((currentHistory) => upsertHistoryEntry(currentHistory, historyEntry));
      autoSaveWorkLog(mergedHistoryEntry, { showNotice: true });
    }

    setProjects((currentProjects) =>
      archiveCompletedProjectStepsForDate(currentProjects, activeDate)
    );

    setTasks(carryOverTasks);
    setActiveDate(getTodayKey());
    setWorkday(createBlankWorkday(getTodayKey()));
    setShowWorkdayDetails(false);
    setEditingTaskId(null);
    setPreLunchTaskId(null);
    setEndOfDaySummary(null);
  }

  function archiveToday() {
    setDataNotice(null);

    const pausedTasks = pauseRunningRegularTaskTimers(tasks);

    setTasks(pausedTasks);
    openEndOfDaySummary(workday, pausedTasks);
  }

  return {
    endOfDaySummary,
    showWorkdayDetails,
    setShowWorkdayDetails,
    punchIn,
    startLunch,
    returnFromLunch,
    punchOut,
    buildEndOfDaySummary,
    openEndOfDaySummary,
    closeEndOfDaySummary,
    performArchiveToday,
    archiveToday,
  };
}
