import { useState } from "react";

function ProjectNotesEditor({ notes, onSave, compact = false }) {
  const [draft, setDraft] = useState(() => notes || "");
  const [saved, setSaved] = useState(true);

  function handleChange(value) {
    setDraft(value);
    setSaved(false);
  }

  function handleSave() {
    onSave(draft);
    setSaved(true);
  }

  return (
    <div className={`projectNotesEditor ${compact ? "compact" : ""}`}>
      <label className="academyFormField">
        <span>Notes</span>
        <textarea
          rows={compact ? 3 : 5}
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Jot down anything worth remembering about this project…"
        />
      </label>
      <div className="projectNotesEditorActions">
        <span className="projectNotesEditorStatus">
          {saved ? "Saved" : "Unsaved changes"}
        </span>
        <button
          className="detailsButton"
          type="button"
          onClick={handleSave}
          disabled={saved}
        >
          Save Notes
        </button>
      </div>
    </div>
  );
}

export default ProjectNotesEditor;
