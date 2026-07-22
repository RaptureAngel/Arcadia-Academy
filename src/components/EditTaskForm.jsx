import { taskTypes } from "../data/taskTypes";
import { getTaskXpRuleText, getTaskXpRuleDetailText } from "../utils/xp";

function EditTaskForm({
  title,
  onTitleChange,
  client,
  clientOptions,
  onClientChange,
  taskType,
  taskTypeOptions,
  onTaskTypeChange,
  deadline,
  onDeadlineChange,
  priority,
  onPriorityChange,
  isWorking,
  onSave,
  onCancel,
}) {
  return (
    <form className="inlineEditForm" onSubmit={onSave}>
      <label>
        Task title
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          disabled={!isWorking}
        />
      </label>

      <label>
        Client
        <select
          value={client}
          onChange={(event) => onClientChange(event.target.value)}
          disabled={!isWorking}
        >
          {clientOptions.map((clientName) => (
            <option key={clientName}>{clientName}</option>
          ))}
        </select>
      </label>

      <label>
        Task type
        <select
          value={taskType}
          onChange={(event) => onTaskTypeChange(event.target.value)}
          disabled={!isWorking}
        >
          {taskTypeOptions.map((type) => (
            <option key={type} value={type}>
              {taskTypes.includes(type) ? type : `${type} (Legacy)`}
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
          value={deadline}
          onChange={(event) => onDeadlineChange(event.target.value)}
          disabled={!isWorking}
        />
      </label>

      <label className="checkboxRow">
        <input
          type="checkbox"
          checked={priority}
          onChange={(event) => onPriorityChange(event.target.checked)}
          disabled={!isWorking}
        />
        Mark as priority
      </label>

      <div className="inlineEditActions">
        <button className="completeButton" type="submit" disabled={!isWorking}>
          Save
        </button>
        <button
          className="detailsButton"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default EditTaskForm;
