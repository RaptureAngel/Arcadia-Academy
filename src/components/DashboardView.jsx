import DailyProgressPanel from "./DailyProgressPanel";
import EmployeePanel from "./EmployeePanel";
import ScratchpadPanel from "./ScratchpadPanel";
import UpcomingEventsPanel from "./UpcomingEventsPanel";
import { normalizeClientAccentColor } from "../utils/clients";
import {
  formatDeadline,
  isDeadlineOverdue,
  isDeadlineSoon,
} from "../utils/dates";
import { isMeetingModeEligibleTask } from "../utils/meetingDrafts";
import {
  getTaskXpDisplay,
  getTimerSeconds,
  isRegularTask,
} from "../utils/tasks";

function getCurrentWorkPreviewTasks(activeTasks) {
  return activeTasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const aOverdue = isDeadlineOverdue(a.task.deadline);
      const bOverdue = isDeadlineOverdue(b.task.deadline);

      if (aOverdue !== bOverdue) {
        return aOverdue ? -1 : 1;
      }

      if (Boolean(a.task.priority) !== Boolean(b.task.priority)) {
        return a.task.priority ? -1 : 1;
      }

      const aDueSoon = isDeadlineSoon(a.task.deadline);
      const bDueSoon = isDeadlineSoon(b.task.deadline);

      if (aDueSoon !== bDueSoon) {
        return aDueSoon ? -1 : 1;
      }

      if (Boolean(a.task.deadline) !== Boolean(b.task.deadline)) {
        return a.task.deadline ? -1 : 1;
      }

      return a.index - b.index;
    })
    .map(({ task }) => task);
}

function getDeadlineMarkerLabel(deadline) {
  if (!deadline || Number.isNaN(Date.parse(`${deadline}T00:00:00`))) {
    return "Has deadline";
  }

  const formattedDeadline = formatDeadline(deadline);

  return formattedDeadline ? `Deadline: ${formattedDeadline}` : "Has deadline";
}

function DashboardView({
  activeEmployee,
  activeEmployeeLevelProgress,
  workday,
  onSwitchEmployee,
  onOpenDossier,
  onOpenOutfitSelector,
  statusLabel,
  contextLabels,
  dashboardPanelMode,
  onCycleDashboardPanelMode,
  dashboardInsights,
  ringProgress,
  todayXp,
  dailyQuota,
  quotaPercent,
  completedTaskCount,
  dailyRank,
  showDailyQuotaEditor,
  draftDailyQuota,
  minDailyQuota,
  maxDailyQuota,
  onEditQuota,
  onSaveDailyQuota,
  onCancelDailyQuotaEdit,
  onDraftDailyQuotaChange,
  calendarEvents,
  activeTasks,
  preLunchTask,
  onDismissPreLunchTask,
  dashboardTaskPreviewLimit,
  clientDisplayByName,
  timerNow,
  isWorking,
  onCompleteTask,
  onOpenDeepWork,
  onOpenMeetingMode,
  onOpenProjectFocus,
  canOpenProjectFocus = true,
  onToggleTaskTimer,
  onOpenTasksView,
  scratchpad,
  activeDate,
  onScratchpadChange,
}) {
  const currentWorkPreviewTasks = getCurrentWorkPreviewTasks(activeTasks);
  const priorityTaskCount = activeTasks.filter((task) => task.priority).length;
  const visibleCurrentWorkTasks = currentWorkPreviewTasks.slice(
    0,
    dashboardTaskPreviewLimit
  );
  const hiddenActiveTaskCount = Math.max(
    0,
    activeTasks.length - dashboardTaskPreviewLimit
  );

  return (
    <section className="viewShell dashboardView">
      <section className="dashboardGrid">
        <EmployeePanel
          employee={activeEmployee}
          levelProgress={activeEmployeeLevelProgress}
          workday={workday}
          onSwitchEmployee={onSwitchEmployee}
          onOpenDossier={onOpenDossier}
          onOpenOutfitSelector={onOpenOutfitSelector}
          statusLabel={statusLabel}
          contextLabels={contextLabels}
          activeTaskCount={activeTasks.length}
          completedTaskCount={completedTaskCount}
          priorityTaskCount={priorityTaskCount}
        />

        <div className="dashboardCenterStack">
          <DailyProgressPanel
            mode={dashboardPanelMode}
            onCycleMode={onCycleDashboardPanelMode}
            insights={dashboardInsights}
            contextLabels={contextLabels}
            ringProgress={ringProgress}
            todayXp={todayXp}
            dailyQuota={dailyQuota}
            quotaPercent={quotaPercent}
            completedTaskCount={completedTaskCount}
            dailyRank={dailyRank}
            showDailyQuotaEditor={showDailyQuotaEditor}
            draftDailyQuota={draftDailyQuota}
            minDailyQuota={minDailyQuota}
            maxDailyQuota={maxDailyQuota}
            onEditQuota={onEditQuota}
            onSaveDailyQuota={onSaveDailyQuota}
            onCancelDailyQuotaEdit={onCancelDailyQuotaEdit}
            onDraftDailyQuotaChange={onDraftDailyQuotaChange}
          />

          <UpcomingEventsPanel
            calendarEvents={calendarEvents}
            clientDisplayByName={clientDisplayByName}
          />
        </div>

        <aside className="panel dashboardWorkPreview">
          <div className="taskListHeader">
            <div>
              <p className="panelLabel">{contextLabels.currentWork}</p>
              <h2>{activeTasks.length} active item(s)</h2>
            </div>
            <button
              className="dashboardHeaderAction"
              type="button"
              onClick={onOpenTasksView}
            >
              + Add {contextLabels.tasks}
            </button>
          </div>

          {activeTasks.length === 0 ? (
            <div className="dashboardWorkEmpty">
              <h3>No active work queued.</h3>
              <p>
                Add a task from the Tasks tab or start a project pack when you
                are ready to build the day.
              </p>
            </div>
          ) : (
            <div className="dashboardWorkBody">
              <div className="workPreviewList">
                {preLunchTask && (
                  <div className="workPreviewLunchReminder">
                    <div>
                      <strong>
                        Before lunch: {preLunchTask.title}. Resume it when
                        you&apos;re ready.
                      </strong>
                      <span>
                        {preLunchTask.client} {"\u00b7"} {preLunchTask.taskType}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onDismissPreLunchTask}
                      aria-label="Dismiss lunch reminder"
                    >
                      {"\u00d7"}
                    </button>
                  </div>
                )}

                {visibleCurrentWorkTasks.map((task) => {
                  const isOverdue = isDeadlineOverdue(task.deadline);
                  const isDueSoon = isDeadlineSoon(task.deadline);
                  const hasDeadline = Boolean(task.deadline);
                  const showDeadlineMarker =
                    hasDeadline && !isOverdue && !task.priority;
                  const deadlineMarkerLabel = getDeadlineMarkerLabel(
                    task.deadline
                  );
                  const isRegularStandaloneTask = isRegularTask(task);
                  const canOpenMeeting = isMeetingModeEligibleTask(task);
                  const taskClientRecord = clientDisplayByName.get(
                    String(task.client || "").toLowerCase()
                  );
                  const clientAccentColor = normalizeClientAccentColor(
                    taskClientRecord?.accentColor
                  );
                  const timerSeconds = getTimerSeconds(task, timerNow);
                  const timerIcon = task.timerStartedAt ? "\u23f8" : "\u25f7";
                  const timerLabel = task.timerStartedAt
                    ? `Pause timer for ${task.title}`
                    : `${timerSeconds > 0 ? "Resume" : "Start"} timer for ${
                        task.title
                      }`;
                  const previewClasses = [
                    "workPreviewItem",
                    task.isProjectStep ? "workPreviewProjectStep" : "",
                    isRegularStandaloneTask ? "workPreviewRegularTask" : "",
                    canOpenMeeting ? "workPreviewMeetingTask" : "",
                    task.priority && !isOverdue ? "workPreviewPriority" : "",
                    !task.priority && isDueSoon ? "workPreviewDueSoon" : "",
                    !task.priority && isOverdue ? "workPreviewOverdue" : "",
                    task.priority && isOverdue ? "workPreviewCritical" : "",
                    task.timerStartedAt ? "workPreviewTimerRunning" : "",
                    clientAccentColor ? "workPreviewClientAccent" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const previewStyle = clientAccentColor
                    ? { "--client-accent-color": clientAccentColor }
                    : undefined;

                  return (
                  <div
                    key={task.id}
                    className={previewClasses}
                    style={previewStyle}
                  >
                    <button
                      className="workPreviewCompleteButton"
                      type="button"
                      disabled={!isWorking}
                      onClick={() => onCompleteTask(task.id)}
                      aria-label={`Complete ${task.title}`}
                      title={isWorking ? "Complete" : "Punch in to complete"}
                    >
                      {"\u2713"}
                    </button>

                    <div className="workPreviewText">
                      <strong>
                        <span>{task.title}</span>
                        {showDeadlineMarker && (
                          <span
                            className="workPreviewDeadlineMarker"
                            aria-label={deadlineMarkerLabel}
                            title={deadlineMarkerLabel}
                          />
                        )}
                      </strong>
                      <span>
                        <span
                          className={
                            clientAccentColor
                              ? "workPreviewClientName"
                              : undefined
                          }
                        >
                          {task.client}
                        </span>{" "}
                        {"\u00b7"} {task.taskType} {"\u00b7"}{" "}
                        {getTaskXpDisplay(task, timerNow)}
                        {task.projectName ? ` - ${task.projectName}` : ""}
                        {task.isProjectStep
                          ? ` - Step ${task.projectStepNumber}/${task.projectStepTotal}`
                          : ""}
                      </span>
                    </div>

                    {isRegularStandaloneTask && (
                      <button
                        className="workPreviewDeepWorkButton"
                        type="button"
                        disabled={!isWorking}
                        onClick={() => onOpenDeepWork(task)}
                        aria-label={`Open Deep Work for ${task.title}`}
                        title={
                          isWorking
                            ? contextLabels.deepWork
                            : `${contextLabels.workdayStart} for ${contextLabels.deepWork}`
                        }
                      >
                        Focus
                      </button>
                    )}

                    {canOpenMeeting && (
                      <button
                        className="workPreviewDeepWorkButton workPreviewMeetingButton"
                        type="button"
                        disabled={!isWorking}
                        onClick={() => onOpenMeetingMode(task)}
                        aria-label={`Open Meeting Mode for ${task.title}`}
                        title={
                          isWorking
                            ? "Meeting Mode"
                            : `${contextLabels.workdayStart} for Meeting Mode`
                        }
                      >
                        Meeting
                      </button>
                    )}

                    {task.isProjectStep && (
                      <button
                        className="workPreviewDeepWorkButton"
                        type="button"
                        disabled={!canOpenProjectFocus}
                        onClick={() => onOpenProjectFocus(task.projectId)}
                        aria-label={`Open ${contextLabels.projectFocus} for ${task.title}`}
                        title={
                          canOpenProjectFocus
                            ? contextLabels.projectFocus
                            : `${contextLabels.workdayStart} for ${contextLabels.projectFocus}`
                        }
                      >
                        Focus
                      </button>
                    )}

                    {isRegularStandaloneTask && (
                      <button
                        className="workPreviewTimerButton"
                        type="button"
                        disabled={!isWorking}
                        onClick={() => onToggleTaskTimer(task)}
                        aria-label={timerLabel}
                        title={isWorking ? timerLabel : "Punch in to use timer"}
                      >
                        <span aria-hidden="true">{timerIcon}</span>
                      </button>
                    )}
                  </div>
                );
              })}
              </div>

              {hiddenActiveTaskCount > 0 && (
                <div className="workPreviewMoreIndicator">
                  +{hiddenActiveTaskCount} more active task(s)
                </div>
              )}
            </div>
          )}
        </aside>
      </section>

      <ScratchpadPanel
        value={scratchpad?.[activeDate] ?? ""}
        onChange={(text) => onScratchpadChange(activeDate, text)}
      />
    </section>
  );
}

export default DashboardView;
