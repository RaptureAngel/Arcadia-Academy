import { useEffect, useState } from "react";

const PRESET_COLORS = [
  { name: "Sage", value: "#5f7d64" },
  { name: "Terracotta", value: "#c1694f" },
  { name: "Indigo", value: "#5b5ea6" },
  { name: "Teal", value: "#3f8f8a" },
  { name: "Gold", value: "#c9a662" },
];

function createDraftFromSubject(subject) {
  if (!subject) {
    return { name: "", description: "", color: PRESET_COLORS[0].value, icon: "" };
  }

  return {
    name: subject.name,
    description: subject.description || "",
    color: subject.color || PRESET_COLORS[0].value,
    icon: subject.icon || "",
  };
}

function SubjectForm({ subject = null, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(() => createDraftFromSubject(subject));
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

  function handleSubmit(event) {
    event.preventDefault();

    if (!draft.name.trim()) {
      setError("Subject name is required.");
      return;
    }

    onSubmit({ ...draft, name: draft.name.trim() });
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="academyModal subjectFormModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subject-form-title"
      >
        <div className="academyModalHeader">
          <p className="panelLabel">{subject ? "Edit Subject" : "New Subject"}</p>
          <h2 id="subject-form-title">{subject ? subject.name : "Create a subject"}</h2>
          <button
            className="academyModalCloseButton"
            type="button"
            onClick={onCancel}
            aria-label="Close subject form"
          >
            {"×"}
          </button>
        </div>

        <form className="academyForm" onSubmit={handleSubmit}>
          <label className="academyFormField">
            <span>Subject name</span>
            <input
              type="text"
              value={draft.name}
              maxLength={60}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
          </label>

          <label className="academyFormField">
            <span>Description (optional)</span>
            <textarea
              rows={2}
              value={draft.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>

          <div className="academyFormRow">
            <label className="academyFormField">
              <span>Icon (optional)</span>
              <input
                type="text"
                value={draft.icon}
                maxLength={4}
                placeholder="📚"
                onChange={(event) => updateField("icon", event.target.value)}
              />
            </label>

            <label className="academyFormField">
              <span>Colour</span>
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : "#5f7d64"}
                onChange={(event) => updateField("color", event.target.value)}
              />
            </label>
          </div>

          <div className="subjectColorSwatches" role="group" aria-label="Preset colours">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`subjectColorSwatch ${draft.color === preset.value ? "active" : ""}`}
                style={{ "--swatch-color": preset.value }}
                onClick={() => updateField("color", preset.value)}
                aria-label={`Use ${preset.name}`}
                title={preset.name}
              />
            ))}
          </div>

          {error && <p className="academyFormNotice academyFormNotice--error">{error}</p>}

          <div className="academyFormActions">
            <button className="detailsButton" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button className="primaryButton" type="submit">
              {subject ? "Save Changes" : "Create Subject"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default SubjectForm;
