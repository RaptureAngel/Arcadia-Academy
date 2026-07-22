import {
  CALENDAR_CATEGORY_LABELS,
  formatRecurrenceLabel,
} from "../utils/calendar";

const CATEGORY_OPTIONS = [
  { value: "", label: "None" },
  { value: "deadline", label: CALENDAR_CATEGORY_LABELS.deadline },
  { value: "appointment", label: CALENDAR_CATEGORY_LABELS.appointment },
  { value: "obligation", label: CALENDAR_CATEGORY_LABELS.obligation },
  { value: "petsitting", label: CALENDAR_CATEGORY_LABELS.petsitting },
  { value: "working-away", label: CALENDAR_CATEGORY_LABELS["working-away"] },
];

const WEEKDAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const NTH_OPTIONS = [
  { value: "1", label: "1st" },
  { value: "2", label: "2nd" },
  { value: "3", label: "3rd" },
  { value: "4", label: "4th" },
  { value: "-1", label: "Last" },
];

function buildRecurrencePreview(draft) {
  if (!draft) return null;
  const r = { rule: draft.recurrenceRule };
  if (draft.recurrenceRule === "monthly-date") {
    const dom = parseInt(draft.dayOfMonth, 10);
    if (!isNaN(dom)) r.dayOfMonth = dom;
  }
  if (draft.recurrenceRule === "monthly-nth-weekday") {
    r.nth = parseInt(draft.nth, 10);
    r.weekday = parseInt(draft.weekday, 10);
  }
  return formatRecurrenceLabel(r);
}

export default function CalendarEventForm({
  draft,
  formMode,
  clientNames,
  taskTypes = [],
  onFieldChange,
  onSave,
  onCancel,
}) {
  if (!draft) return null;

  const recurrenceLabel = buildRecurrencePreview(draft);
  const showUntil = draft.recurrenceRule !== "none";
  const showDayOfMonth = draft.recurrenceRule === "monthly-date";
  const showNthWeekday = draft.recurrenceRule === "monthly-nth-weekday";
  const hasCustomCategory =
    draft.category &&
    !CATEGORY_OPTIONS.some((option) => option.value === draft.category);

  return (
    <form className="calendarEventForm taskForm" onSubmit={onSave}>
      <h3 className="formSectionTitle">
        {formMode === "edit" ? "Edit Event" : "Add Event"}
      </h3>

      <div className="formField">
        <label className="panelLabel" htmlFor="cal-title">Title</label>
        <input
          id="cal-title"
          type="text"
          className="taskInput"
          value={draft.title}
          onChange={(e) => onFieldChange("title", e.target.value)}
          placeholder="Event title"
          required
          autoFocus
        />
      </div>

      <div className="formField">
        <label className="panelLabel" htmlFor="cal-date">Date</label>
        <input
          id="cal-date"
          type="date"
          className="taskInput"
          value={draft.date}
          onChange={(e) => onFieldChange("date", e.target.value)}
          required
        />
      </div>

      <div className="formField">
        <label className="panelLabel" htmlFor="cal-category">Category</label>
        <select
          id="cal-category"
          className="taskInput"
          value={draft.category}
          onChange={(e) => onFieldChange("category", e.target.value)}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value || "none"} value={option.value}>
              {option.label}
            </option>
          ))}
          {hasCustomCategory && (
            <option value={draft.category}>{draft.category}</option>
          )}
        </select>
      </div>

      <div className="formField">
        <label className="panelLabel" htmlFor="cal-client">Client</label>
        <select
          id="cal-client"
          className="taskInput"
          value={draft.client}
          onChange={(e) => onFieldChange("client", e.target.value)}
        >
          <option value="">— None —</option>
          {clientNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className="formField">
        <label className="panelLabel" htmlFor="cal-task-type">
          Create Task As
        </label>
        <select
          id="cal-task-type"
          className="taskInput"
          value={draft.taskType}
          onChange={(e) => onFieldChange("taskType", e.target.value)}
        >
          <option value="">Auto / default</option>
          {taskTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="formField">
        <label className="panelLabel" htmlFor="cal-recurrence">Recurrence</label>
        <select
          id="cal-recurrence"
          className="taskInput"
          value={draft.recurrenceRule}
          onChange={(e) => onFieldChange("recurrenceRule", e.target.value)}
        >
          <option value="none">No recurrence</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Every two weeks</option>
          <option value="monthly-date">Monthly (same date)</option>
          <option value="monthly-nth-weekday">Monthly (nth weekday)</option>
          <option value="annual">Annually</option>
        </select>
      </div>

      {showDayOfMonth && (
        <div className="formField">
          <label className="panelLabel" htmlFor="cal-dom">Day of month</label>
          <input
            id="cal-dom"
            type="number"
            className="taskInput"
            min="1"
            max="31"
            value={draft.dayOfMonth}
            onChange={(e) => onFieldChange("dayOfMonth", e.target.value)}
            placeholder="e.g. 15"
          />
        </div>
      )}

      {showNthWeekday && (
        <div className="calNthRow">
          <div className="formField">
            <label className="panelLabel" htmlFor="cal-nth">Which</label>
            <select
              id="cal-nth"
              className="taskInput"
              value={draft.nth}
              onChange={(e) => onFieldChange("nth", e.target.value)}
            >
              {NTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="formField">
            <label className="panelLabel" htmlFor="cal-weekday">Weekday</label>
            <select
              id="cal-weekday"
              className="taskInput"
              value={draft.weekday}
              onChange={(e) => onFieldChange("weekday", e.target.value)}
            >
              {WEEKDAY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {showUntil && (
        <div className="formField">
          <label className="panelLabel" htmlFor="cal-until">End date (optional)</label>
          <input
            id="cal-until"
            type="date"
            className="taskInput"
            value={draft.until}
            onChange={(e) => onFieldChange("until", e.target.value)}
          />
        </div>
      )}

      {recurrenceLabel && recurrenceLabel !== "No recurrence" && (
        <div className="xpRuleHelper calRecurrencePreview">
          {recurrenceLabel}
          {draft.until ? ` · until ${draft.until}` : ""}
        </div>
      )}

      <div className="formField">
        <label className="panelLabel" htmlFor="cal-notes">Notes</label>
        <textarea
          id="cal-notes"
          className="taskInput calNotesInput"
          value={draft.notes}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          placeholder="Optional notes"
          rows={3}
        />
      </div>

      <div className="checkboxRow">
        <input
          id="cal-priority"
          type="checkbox"
          checked={draft.priority}
          onChange={(e) => onFieldChange("priority", e.target.checked)}
        />
        <label htmlFor="cal-priority">Priority</label>
      </div>

      <div className="calFormActions">
        <button type="submit" className="primaryButton">
          {formMode === "edit" ? "Save changes" : "Add event"}
        </button>
        <button type="button" className="secondaryButton" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
