import {
  isRegularTask,
  getTimerSeconds,
  formatTimerSeconds,
  getTaskXpDisplay,
} from "../utils/tasks";
import {
  isDeadlineOverdue,
  isDeadlineSoon,
  formatDeadline,
} from "../utils/dates";
import { getTaskXpRuleText } from "../utils/xp";

function TaskList({
  tasks,
  mode = "active",
  editingTaskId,
  timerNow,
  isWorking,
  contextLabels,
  onComplete,
  onToggleTimer,
  onOpenDeepWork,
  onOpenMeeting,
  onStartEdit,
  onDelete,
  getEmployeeName,
  renderEditForm,
}) {
  if (tasks.length === 0) {
    return <p className="emptyState">No tasks in this section yet.</p>;
  }

  return (
    <div className="taskList">
      {tasks.map((task) => {
        const isEditing = editingTaskId === task.id;
        const isRegularStandaloneTask = isRegularTask(task);
        const canOpenMeeting =
          isRegularStandaloneTask &&
          !task.completed &&
          task.taskType === "Meeting / Call";
        const timerSeconds = getTimerSeconds(task, timerNow);
        const timerActionLabel = task.timerStartedAt
          ? "Pause"
          : timerSeconds > 0
            ? "Resume"
            : "Start";
        const isOverdue = isDeadlineOverdue(task.deadline);
        const isDueSoon = isDeadlineSoon(task.deadline);

        return (
          <article
            key={task.id}
            className={`taskItem ${task.completed ? "completed" : ""} ${
              task.priority && !task.projectId ? "priorityTask" : ""
            } ${
              task.priority && task.isProjectStep ? "priorityProjectStepTask" : ""
            } ${task.isProjectPackSummary ? "projectPackSummaryTask" : ""} ${
              task.priority && task.isProjectPackSummary ? "priorityProjectPackSummary" : ""
            } ${task.isProjectStep ? "projectStepTask" : ""} ${
              isDueSoon && !task.priority ? "dueSoonTask" : ""
            } ${
              isEditing ? "editingTask" : ""
            }`}
          >
            <div className="taskContent">
              {isEditing ? (
                renderEditForm()
              ) : (
                <>
                  <div className="taskTitleRow">
                    <h3>{task.title}</h3>

                    {task.priority && !task.projectId && (
                      <span className="priorityBadge">Priority</span>
                    )}

                    {task.isProjectStep && (
                      <span className="projectStepBadge">
                        {task.priority ? "Priority Step" : "Project Step"}
                      </span>
                    )}

                    {task.isProjectPackSummary && (
                      <span className="projectPackBadge">
                        {task.priority ? "Priority Pack" : "Project Pack"}
                      </span>
                    )}
                  </div>

                  <p>
                    {task.client} · {task.taskType} ·{" "}
                    {getTaskXpDisplay(task, timerNow)}
                    {task.projectName ? ` · ${task.projectName}` : ""}
                  </p>

                  <div className="taskMetaStack">
                    {task.deadline && (
                      <small
                        className={
                          isOverdue
                            ? "overdueText"
                            : isDueSoon
                              ? "dueSoonText"
                              : ""
                        }
                      >
                        Due {formatDeadline(task.deadline)}
                      </small>
                    )}

                    {task.projectName && !task.isProjectPackSummary && (
                      <small>
                        Project step {task.projectStepNumber}/
                        {task.projectStepTotal}
                      </small>
                    )}

                    {task.isProjectPackSummary && (
                      <small>
                        {task.completedStepCount}/{task.totalSteps} steps complete -{" "}
                        {task.totalProjectXp} total project XP
                      </small>
                    )}

                    {task.completedBy && (
                      <small>Completed by {getEmployeeName(task.completedBy)}</small>
                    )}

                    {isRegularStandaloneTask && !task.completed && (
                      <small>{getTaskXpRuleText(task.taskType)}</small>
                    )}

                    {isRegularStandaloneTask && task.completed && (
                      <small className="taskTimerMeta">
                        Tracked {formatTimerSeconds(timerSeconds)}
                      </small>
                    )}
                  </div>
                </>
              )}
            </div>

            {mode === "active" && !isEditing && (
              <div
                className={`taskActions ${
                  isRegularStandaloneTask && !task.completed
                    ? "timerTaskActions"
                    : ""
                }`}
              >
                <button
                  className="completeButton"
                  disabled={task.completed || !isWorking}
                  onClick={() => onComplete(task.id)}
                >
                  {task.completed
                    ? "Complete"
                    : isWorking
                      ? "Complete"
                      : contextLabels.workdayStart}
                </button>

                {isRegularStandaloneTask && !task.completed && (
                  <button
                    className="detailsButton timerButton"
                    type="button"
                    disabled={!isWorking}
                    onClick={() => onToggleTimer(task)}
                  >
                    {timerActionLabel}
                  </button>
                )}

                {isRegularStandaloneTask && !task.completed && (
                  <button
                    className="detailsButton deepWorkButton"
                    type="button"
                    disabled={!isWorking}
                    onClick={() => onOpenDeepWork(task)}
                  >
                    {contextLabels.deepWork}
                  </button>
                )}

                {canOpenMeeting && (
                  <button
                    className="detailsButton meetingButton"
                    type="button"
                    disabled={!isWorking}
                    onClick={() => onOpenMeeting(task)}
                  >
                    Meeting
                  </button>
                )}

                {!task.isProjectStep && !task.projectId && !task.completed && (
                  <button
                    className="detailsButton"
                    disabled={!isWorking}
                    onClick={() => onStartEdit(task)}
                  >
                    Edit
                  </button>
                )}

                {!task.isProjectStep && (
                  <button
                    className="deleteButton"
                    onClick={() => onDelete(task.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default TaskList;
