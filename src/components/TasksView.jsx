import TaskList from "./TaskList";
import { getTaskXpRuleDetailText, getTaskXpRuleText } from "../utils/xp";

function TasksView({
  contextLabels,
  taskTitle,
  onTaskTitleChange,
  client,
  onClientChange,
  clientNames,
  taskClientOptions,
  taskType,
  taskTypes,
  onTaskTypeChange,
  taskDeadline,
  onTaskDeadlineChange,
  taskPriority,
  onTaskPriorityChange,
  isWorking,
  onAddTask,
  visibleTaskCount,
  activeTasks,
  completedTodayTasks,
  regularTasks,
  projectTasks,
  completedTodayTaskList,
  editingTaskId,
  timerNow,
  onCompleteTask,
  onToggleTimer,
  onOpenDeepWork,
  onOpenMeeting,
  onStartEdit,
  onDelete,
  getEmployeeName,
  renderEditForm,
}) {
  return (
    <>
      <aside className="panel taskPanel tasksView">
        <p className="panelLabel">Add {contextLabels.tasks}</p>
        <form onSubmit={onAddTask} className="taskForm">
          <label>
            Task title
            <input
              value={taskTitle}
              onChange={(event) => onTaskTitleChange(event.target.value)}
              placeholder="e.g. Draft article intro"
              disabled={!isWorking}
            />
          </label>

          <label>
            Client
            <select
              value={client}
              onChange={(event) => onClientChange(event.target.value)}
              disabled={!isWorking || clientNames.length === 0}
            >
              {taskClientOptions.map((clientName) => (
                <option key={clientName}>{clientName}</option>
              ))}
            </select>
          </label>

          <label>
            Task type
            <select
              value={taskType}
              onChange={onTaskTypeChange}
              disabled={!isWorking}
            >
              {taskTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <div className="xpRuleHelper" aria-live="polite">
            <strong>{getTaskXpRuleText(taskType)}</strong>
            <span>{getTaskXpRuleDetailText(taskType)}</span>
          </div>

          <label>
            Deadline
            <input
              type="date"
              value={taskDeadline}
              onChange={(event) => onTaskDeadlineChange(event.target.value)}
              disabled={!isWorking}
            />
          </label>

          <label className="checkboxRow">
            <input
              type="checkbox"
              checked={taskPriority}
              onChange={(event) => onTaskPriorityChange(event.target.checked)}
              disabled={!isWorking}
            />
            Mark as priority
          </label>

          <button
            className="primaryButton"
            type="submit"
            disabled={!isWorking || clientNames.length === 0}
          >
            {isWorking
              ? `Add ${contextLabels.tasks}`
              : `${contextLabels.workdayStart} to Add ${contextLabels.tasks}`}
          </button>
        </form>
      </aside>

      <section className="panel taskListPanel">
        <div className="taskListHeader">
          <div>
            <p className="panelLabel">{contextLabels.activeWork}</p>
            <h2>{visibleTaskCount} active task(s)</h2>
          </div>
          <div className="taskSummary">
            <span>{activeTasks.length} active</span>
            <span>
              {completedTodayTasks.length}{" "}
              {contextLabels.completedToday.toLowerCase()}
            </span>
          </div>
        </div>

        {visibleTaskCount === 0 ? (
          <p className="emptyState">
            No active tasks. Add one or start{" "}
            {contextLabels.projectPacks.toLowerCase()}.
          </p>
        ) : (
          <div className="taskSections">
            <section className="taskSection">
              <div className="taskSectionHeader">
                <div>
                  <p className="panelLabel">Regular {contextLabels.tasks}</p>
                  <h3>{regularTasks.length} active task(s)</h3>
                </div>
              </div>

              <TaskList
                tasks={regularTasks}
                editingTaskId={editingTaskId}
                timerNow={timerNow}
                isWorking={isWorking}
                contextLabels={contextLabels}
                onComplete={onCompleteTask}
                onToggleTimer={onToggleTimer}
                onOpenDeepWork={onOpenDeepWork}
                onOpenMeeting={onOpenMeeting}
                onStartEdit={onStartEdit}
                onDelete={onDelete}
                getEmployeeName={getEmployeeName}
                renderEditForm={renderEditForm}
              />
            </section>

            <section className="taskSection">
              <div className="taskSectionHeader">
                <div>
                  <p className="panelLabel">Project {contextLabels.tasks}</p>
                  <h3>{projectTasks.length} active step(s)</h3>
                </div>
              </div>

              <TaskList
                tasks={projectTasks}
                editingTaskId={editingTaskId}
                timerNow={timerNow}
                isWorking={isWorking}
                contextLabels={contextLabels}
                onComplete={onCompleteTask}
                onToggleTimer={onToggleTimer}
                onOpenDeepWork={onOpenDeepWork}
                onOpenMeeting={onOpenMeeting}
                onStartEdit={onStartEdit}
                onDelete={onDelete}
                getEmployeeName={getEmployeeName}
                renderEditForm={renderEditForm}
              />
            </section>
          </div>
        )}
      </section>

      <section className="panel taskListPanel completedTodayPanel">
        <div className="taskListHeader">
          <div>
            <p className="panelLabel">{contextLabels.completedToday}</p>
            <h2>{completedTodayTasks.length} completed item(s)</h2>
          </div>
        </div>

        {completedTodayTasks.length === 0 ? (
          <p className="emptyState">
            Completed tasks and project steps will appear here.
          </p>
        ) : (
          <TaskList
            tasks={completedTodayTaskList}
            mode="completed"
            editingTaskId={editingTaskId}
            timerNow={timerNow}
            isWorking={isWorking}
            contextLabels={contextLabels}
            onComplete={onCompleteTask}
            onToggleTimer={onToggleTimer}
            onOpenDeepWork={onOpenDeepWork}
            onOpenMeeting={onOpenMeeting}
            onStartEdit={onStartEdit}
            onDelete={onDelete}
            getEmployeeName={getEmployeeName}
            renderEditForm={renderEditForm}
          />
        )}
      </section>
    </>
  );
}

export default TasksView;
