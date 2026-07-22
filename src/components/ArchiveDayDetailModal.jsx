import { useEffect, useState } from "react";
import { formatDeadline, formatSavedTime } from "../utils/dates";
import {
  buildWorkLogText,
  getWorkLogFileName,
} from "../utils/workLogExport";
import {
  getStatusLabel,
  getWorkdayEmployeeIds,
  getWorkdayFinalPunchOut,
  getWorkdayFirstPunchIn,
  getWorkdaySessions,
} from "../utils/workday";
import { getRank } from "../utils/xp";

function SummaryStat({ label, value }) {
  return (
    <div className="endDayStat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getEmployeeNamesById(employeeIds, getEmployeeName) {
  return employeeIds.reduce((names, employeeId) => {
    if (!employeeId) return names;

    return {
      ...names,
      [employeeId]: getEmployeeName?.(employeeId) || "Unknown Employee",
    };
  }, {});
}

function WorkSessions({ sessions, employeeNamesById, fallbackEmployeeName }) {
  if (!sessions.length) return null;

  return (
    <section className="endDaySessions">
      <p className="panelLabel">Work Sessions</p>
      <div className="endDaySessionList">
        {sessions.map((session) => (
          <div key={session.id} className="endDaySessionRow">
            <span>
              {formatSavedTime(session.punchInTime)} -{" "}
              {session.punchOutTime
                ? formatSavedTime(session.punchOutTime)
                : "In progress"}
            </span>
            <strong>
              {employeeNamesById[session.employeeId] ||
                fallbackEmployeeName ||
                "Unknown Employee"}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function getTopCompletedValue(tasks, key) {
  const totals = tasks.reduce((summary, task) => {
    const value = task[key] || "None";
    const current = summary[value] || { count: 0, xp: 0 };

    return {
      ...summary,
      [value]: {
        count: current.count + 1,
        xp: current.xp + (Number(task.xp) || 0),
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

function getProjectMetadata(task) {
  const details = [];

  if (task.projectName) {
    details.push(`Project: ${task.projectName}`);
  }

  if (task.projectTemplateName) {
    details.push(`Template: ${task.projectTemplateName}`);
  }

  if (task.projectStepNumber && task.projectStepTotal) {
    details.push(`Step ${task.projectStepNumber}/${task.projectStepTotal}`);
  }

  if (task.isProjectPackSummary) {
    details.push(
      `Project pack: ${task.completedStepCount || task.totalSteps || 0} steps`
    );
  }

  if (task.deadline) {
    details.push(`Deadline: ${formatDeadline(task.deadline)}`);
  }

  if (task.priority) {
    details.push("Priority");
  }

  return details;
}

function getTimerSeconds(task) {
  const totalSeconds = Number(task.timerTotalSeconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return 0;
  }

  return Math.floor(totalSeconds);
}

function formatTimerSeconds(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const paddedMinutes = String(minutes).padStart(hours > 0 ? 2 : 1, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${paddedMinutes}:${paddedSeconds}`;
}

function ArchiveTaskList({ title, tasks, emptyMessage }) {
  return (
    <section className="archiveTaskList">
      <div className="taskListHeader">
        <div>
          <p className="panelLabel">{title}</p>
          <h3>{tasks.length} item(s)</h3>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="emptyState">{emptyMessage}</p>
      ) : (
        tasks.map((task) => {
          const projectMetadata = getProjectMetadata(task);
          const timerSeconds = getTimerSeconds(task);

          return (
            <article key={task.id || task.title} className="archiveTaskItem">
              <div>
                <h3>{task.title || "Untitled task"}</h3>
                <p className="archiveTaskMeta">
                  {task.client || "None"} {"\u00b7"} {task.taskType || "None"}{" "}
                  {"\u00b7"} {Number(task.xp) || 0} XP
                </p>
                {projectMetadata.length > 0 && (
                  <small className="archiveTaskProjectMeta">
                    {projectMetadata.join(" - ")}
                  </small>
                )}
                {timerSeconds > 0 && (
                  <small className="archiveTaskProjectMeta">
                    Tracked {formatTimerSeconds(timerSeconds)}
                  </small>
                )}
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}

function ArchiveDayDetailModal({
  entry,
  getEmployeeName,
  onClose,
  workLogLabel = "Work Log",
}) {
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    setCopyStatus("");
  }, [entry?.id]);

  if (!entry) return null;

  const tasks = Array.isArray(entry.tasks) ? entry.tasks : [];
  const completedTasks = tasks.filter((task) => task.completed);
  const carriedOverTasks = Array.isArray(entry.carriedOverTasks)
    ? entry.carriedOverTasks
    : tasks.filter((task) => !task.completed);
  const completedTaskCount =
    completedTasks.length || Number(entry.completedTasks) || 0;
  const xpEarned =
    completedTasks.length > 0
      ? completedTasks.reduce((total, task) => total + (Number(task.xp) || 0), 0)
      : Number(entry.xpEarned) || 0;
  const employeeName =
    getEmployeeName?.(entry.activeEmployeeId) || "Unknown Employee";
  const dailyRank = entry.rank || getRank(xpEarned);
  const topClient = getTopCompletedValue(completedTasks, "client");
  const topTaskType = getTopCompletedValue(completedTasks, "taskType");
  const workday = entry.workday || {};
  const employeeIds = getWorkdayEmployeeIds(workday, entry.activeEmployeeId);
  const employeeNamesById = getEmployeeNamesById(employeeIds, getEmployeeName);
  const employeeNames =
    employeeIds.length > 0
      ? employeeIds.map(
          (employeeId) => employeeNamesById[employeeId] || "Unknown Employee"
        )
      : [employeeName];
  const sessions = getWorkdaySessions(workday, entry.activeEmployeeId);
  const workLogText = buildWorkLogText(entry, {
    employeeName,
    employeeNamesById,
  });

  async function copyWorkLog() {
    if (!navigator.clipboard?.writeText) {
      setCopyStatus("Copy unavailable");
      return;
    }

    try {
      await navigator.clipboard.writeText(workLogText);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  function downloadWorkLog() {
    const blob = new Blob([workLogText], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getWorkLogFileName(entry);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setCopyStatus("");
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="endDayModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-day-detail-title"
      >
        <div className="endDayHeader">
          <div>
            <p className="panelLabel">Archived Day</p>
            <h2 id="archive-day-detail-title">{entry.date || "Unknown date"}</h2>
          </div>
          <button
            className="modalCloseButton"
            type="button"
            onClick={onClose}
            aria-label="Close archived day details"
          >
            {"\u00d7"}
          </button>
        </div>

        <div className="endDayEmployee">
          <span>{employeeNames.length > 1 ? "Employees" : "Active employee"}</span>
          <strong>{employeeNames.join(", ")}</strong>
        </div>

        <div className="endDayTimes">
          <SummaryStat label="Status" value={getStatusLabel(workday.status)} />
          <SummaryStat
            label="Punch in"
            value={formatSavedTime(getWorkdayFirstPunchIn(workday))}
          />
          <SummaryStat
            label="Lunch"
            value={`${formatSavedTime(workday.lunchStartTime)} - ${formatSavedTime(
              workday.lunchEndTime
            )}`}
          />
          <SummaryStat
            label="Punch out"
            value={formatSavedTime(getWorkdayFinalPunchOut(workday))}
          />
        </div>

        <WorkSessions
          sessions={sessions}
          employeeNamesById={employeeNamesById}
          fallbackEmployeeName={employeeName}
        />

        <div className="endDayStatsGrid">
          <SummaryStat label="Tasks completed" value={completedTaskCount} />
          <SummaryStat label="XP earned" value={`${xpEarned} XP`} />
          <SummaryStat label="Daily rank" value={dailyRank} />
          <SummaryStat label="Top client" value={topClient} />
          <SummaryStat label="Top task type" value={topTaskType} />
          <SummaryStat label="Unfinished" value={carriedOverTasks.length} />
        </div>

        <ArchiveTaskList
          title="Finished Work"
          tasks={completedTasks}
          emptyMessage="No finished work recorded."
        />

        <ArchiveTaskList
          title="Unfinished"
          tasks={carriedOverTasks}
          emptyMessage="No unfinished tasks recorded."
        />

        <div className="endDayActions">
          {copyStatus && <span className="endDayExportStatus">{copyStatus}</span>}
          <button className="detailsButton" type="button" onClick={copyWorkLog}>
            Copy {workLogLabel}
          </button>
          <button className="primaryButton" type="button" onClick={downloadWorkLog}>
            Download
          </button>
          <button className="detailsButton" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

export default ArchiveDayDetailModal;
