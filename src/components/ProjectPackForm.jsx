function ProjectPackForm({
  projectTemplates,
  selectedTemplateId,
  selectedTemplate,
  projectName,
  projectDeadline,
  projectPriority,
  isWorking,
  onSubmit,
  onSelectedTemplateIdChange,
  onProjectNameChange,
  onProjectDeadlineChange,
  onProjectPriorityChange,
}) {
  return (
    <form onSubmit={onSubmit} className="projectPackForm">
      <label>
        Template
        <select
          value={selectedTemplateId}
          onChange={(event) => onSelectedTemplateIdChange(event.target.value)}
          disabled={!isWorking || projectTemplates.length === 0}
        >
          {projectTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>

      {selectedTemplate ? (
        <p className="templateDescription">{selectedTemplate.description}</p>
      ) : (
        <p className="templateDescription">
          Add a template to generate a project checklist.
        </p>
      )}

      <label>
        Project name
        <input
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          placeholder="e.g. Compliance article batch"
          disabled={!isWorking}
        />
      </label>

      <label>
        Deadline
        <input
          type="date"
          value={projectDeadline}
          onChange={(event) => onProjectDeadlineChange(event.target.value)}
          disabled={!isWorking}
        />
      </label>

      <label className="checkboxRow">
        <input
          type="checkbox"
          checked={projectPriority}
          onChange={(event) => onProjectPriorityChange(event.target.checked)}
          disabled={!isWorking}
        />
        Mark project as priority
      </label>

      <button
        className="primaryButton"
        type="submit"
        disabled={!isWorking || !selectedTemplate}
      >
        {isWorking ? "Generate Checklist" : "Punch In to Generate"}
      </button>
    </form>
  );
}

export default ProjectPackForm;
