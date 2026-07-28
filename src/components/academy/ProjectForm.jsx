import { useEffect, useState } from "react";
import {
  PROGRESS_METHODS,
  PROGRESS_METHOD_LABELS,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
} from "../../utils/studyProjects";

function createDraftFromProject(project) {
  if (!project) {
    return {
      title: "",
      subjectId: "",
      projectType: "reading",
      progressMethod: "open-ended",
      progressTarget: "",
      progressCurrent: "",
      outputUnitSingular: "",
      outputUnitPlural: "",
      description: "",
      notes: "",
    };
  }

  return {
    title: project.title,
    subjectId: project.subjectId || "",
    projectType: project.projectType,
    progressMethod: project.progressMethod,
    progressTarget: project.progressTarget === null ? "" : String(project.progressTarget),
    progressCurrent: String(project.progressCurrent ?? 0),
    outputUnitSingular: project.outputUnitSingular || "",
    outputUnitPlural: project.outputUnitPlural || "",
    description: project.description || "",
    notes: project.notes || "",
  };
}

function ProjectForm({
  mode = "create",
  project = null,
  subjects,
  slotsAvailable = true,
  onSubmit,
  onCancel,
}) {
  const [draft, setDraft] = useState(() => createDraftFromProject(project));
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleProgressMethodChange(nextMethod) {
    setDraft((current) => ({
      ...current,
      progressMethod: nextMethod,
      progressTarget: "",
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!draft.title.trim()) {
      setError("Project title is required.");
      return;
    }

    if (
      (draft.progressMethod === "pages" || draft.progressMethod === "chapters") &&
      !(Number(draft.progressTarget) > 0)
    ) {
      setError(
        `Total ${draft.progressMethod} must be a positive number.`
      );
      return;
    }

    const targetProvided = draft.progressTarget !== "";
    const progressTarget =
      draft.progressMethod === "open-ended"
        ? null
        : targetProvided
        ? Number(draft.progressTarget)
        : null;

    const result = onSubmit({
      title: draft.title.trim(),
      subjectId: draft.subjectId || null,
      projectType: draft.projectType,
      progressMethod: draft.progressMethod,
      progressTarget,
      progressCurrent:
        draft.progressMethod === "open-ended" ? 0 : Number(draft.progressCurrent) || 0,
      outputUnitSingular: draft.outputUnitSingular.trim(),
      outputUnitPlural: draft.outputUnitPlural.trim(),
      description: draft.description,
      notes: draft.notes,
    });

    if (result && result.ok === false) {
      setError(result.error || "Could not save this project.");
    }
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="academyModal projectFormModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-form-title"
      >
        <div className="academyModalHeader">
          <p className="panelLabel">
            {mode === "create" ? "New Project" : "Edit Project"}
          </p>
          <h2 id="project-form-title">
            {mode === "create" ? "Start a study project" : draft.title || "Edit project"}
          </h2>
          <button
            className="academyModalCloseButton"
            type="button"
            onClick={onCancel}
            aria-label="Close project form"
          >
            {"×"}
          </button>
        </div>

        {mode === "create" && !slotsAvailable && (
          <p className="academyFormNotice academyFormNotice--error">
            All five active study slots are full. Shelve, complete, or retire a
            project before starting a new one.
          </p>
        )}

        <form className="academyForm" onSubmit={handleSubmit}>
          <label className="academyFormField">
            <span>Project title</span>
            <input
              type="text"
              value={draft.title}
              maxLength={120}
              onChange={(event) => updateField("title", event.target.value)}
              required
            />
          </label>

          <label className="academyFormField">
            <span>Subject</span>
            <select
              value={draft.subjectId}
              onChange={(event) => updateField("subjectId", event.target.value)}
            >
              <option value="">No subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>

          <div className="academyFormRow">
            <label className="academyFormField">
              <span>Project type</span>
              <select
                value={draft.projectType}
                onChange={(event) => updateField("projectType", event.target.value)}
              >
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PROJECT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>

            <label className="academyFormField">
              <span>Progress method</span>
              <select
                value={draft.progressMethod}
                onChange={(event) => handleProgressMethodChange(event.target.value)}
              >
                {PROGRESS_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PROGRESS_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {(draft.progressMethod === "pages" || draft.progressMethod === "chapters") && (
            <div className="academyFormRow">
              <label className="academyFormField">
                <span>
                  Current {draft.progressMethod === "pages" ? "page" : "chapter"}
                </span>
                <input
                  type="number"
                  min="0"
                  value={draft.progressCurrent}
                  onChange={(event) =>
                    updateField("progressCurrent", event.target.value)
                  }
                />
              </label>
              <label className="academyFormField">
                <span>
                  Total {draft.progressMethod === "pages" ? "pages" : "chapters"}
                </span>
                <input
                  type="number"
                  min="1"
                  value={draft.progressTarget}
                  onChange={(event) => updateField("progressTarget", event.target.value)}
                  required
                />
              </label>
            </div>
          )}

          {draft.progressMethod === "sessions" && (
            <div className="academyFormRow">
              <label className="academyFormField">
                <span>Current session count</span>
                <input
                  type="number"
                  min="0"
                  value={draft.progressCurrent}
                  onChange={(event) =>
                    updateField("progressCurrent", event.target.value)
                  }
                />
              </label>
              <label className="academyFormField">
                <span>Target sessions (optional)</span>
                <input
                  type="number"
                  min="1"
                  value={draft.progressTarget}
                  onChange={(event) => updateField("progressTarget", event.target.value)}
                  placeholder="No target"
                />
              </label>
            </div>
          )}

          {draft.progressMethod === "outputs" && (
            <>
              <div className="academyFormRow">
                <label className="academyFormField">
                  <span>Current output count</span>
                  <input
                    type="number"
                    min="0"
                    value={draft.progressCurrent}
                    onChange={(event) =>
                      updateField("progressCurrent", event.target.value)
                    }
                  />
                </label>
                <label className="academyFormField">
                  <span>Target (optional)</span>
                  <input
                    type="number"
                    min="1"
                    value={draft.progressTarget}
                    onChange={(event) =>
                      updateField("progressTarget", event.target.value)
                    }
                    placeholder="No target"
                  />
                </label>
              </div>
              <div className="academyFormRow">
                <label className="academyFormField">
                  <span>Singular unit</span>
                  <input
                    type="text"
                    value={draft.outputUnitSingular}
                    placeholder="Loaf"
                    onChange={(event) =>
                      updateField("outputUnitSingular", event.target.value)
                    }
                  />
                </label>
                <label className="academyFormField">
                  <span>Plural unit</span>
                  <input
                    type="text"
                    value={draft.outputUnitPlural}
                    placeholder="Loaves"
                    onChange={(event) =>
                      updateField("outputUnitPlural", event.target.value)
                    }
                  />
                </label>
              </div>
            </>
          )}

          {draft.progressMethod === "open-ended" && (
            <p className="academyFormHint">
              Open-ended projects track sessions and focused time only — no
              numeric target required.
            </p>
          )}

          <label className="academyFormField">
            <span>Description (optional)</span>
            <textarea
              rows={2}
              value={draft.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>

          <label className="academyFormField">
            <span>{mode === "create" ? "Initial note (optional)" : "Notes"}</span>
            <textarea
              rows={3}
              value={draft.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </label>

          {error && <p className="academyFormNotice academyFormNotice--error">{error}</p>}

          <div className="academyFormActions">
            <button className="detailsButton" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="primaryButton"
              type="submit"
              disabled={mode === "create" && !slotsAvailable}
            >
              {mode === "create" ? "Create Project" : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ProjectForm;
