function CustomProjectTemplateForm({
  draft,
  submitLabel = "Save Template",
  clients,
  taskTypes,
  onSubmit,
  onCancel,
  onDraftChange,
  onStepChange,
  onAddStep,
  onRemoveStep,
  getStepXp,
}) {
  return (
    <form className="customTemplateForm" onSubmit={onSubmit}>
      <label>
        Template name
        <input
          value={draft.name}
          onChange={(event) => onDraftChange("name", event.target.value)}
          placeholder="e.g. Monthly Blog Pack"
        />
      </label>

      <label>
        Client
        <select
          value={draft.client}
          onChange={(event) => onDraftChange("client", event.target.value)}
        >
          {clients.map((clientName) => (
            <option key={clientName} value={clientName}>
              {clientName}
            </option>
          ))}
        </select>
      </label>

      <label>
        Description
        <textarea
          value={draft.description}
          onChange={(event) => onDraftChange("description", event.target.value)}
          placeholder="Reusable workflow notes"
          rows="3"
        />
      </label>

      <div className="customTemplateSteps">
        <div className="taskListHeader">
          <div>
            <p className="panelLabel">Template Steps</p>
            <h3>{draft.steps.length} step(s)</h3>
          </div>
          <button className="detailsButton" type="button" onClick={onAddStep}>
            Add Step
          </button>
        </div>

        {draft.steps.map((step, index) => (
          <div key={step.id} className="customTemplateStepRow">
            <label>
              Step title
              <input
                value={step.title}
                onChange={(event) =>
                  onStepChange(step.id, "title", event.target.value)
                }
                placeholder={`Step ${index + 1}`}
              />
            </label>

            <label>
              Task type
              <select
                value={step.taskType}
                onChange={(event) =>
                  onStepChange(step.id, "taskType", event.target.value)
                }
              >
                {taskTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <div className="customTemplateStepXp">
              <span>Fixed XP</span>
              <strong>
                {step.taskType} {"\u00b7"} {getStepXp(step.taskType)} XP
              </strong>
            </div>

            <button
              className="deleteButton"
              type="button"
              onClick={() => onRemoveStep(step.id)}
              disabled={draft.steps.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="customTemplateActions">
        <button className="primaryButton" type="submit">
          {submitLabel}
        </button>
        <button className="detailsButton" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default CustomProjectTemplateForm;
