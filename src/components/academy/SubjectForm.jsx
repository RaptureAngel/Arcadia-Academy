import { useEffect, useRef, useState } from "react";

const PRESET_COLORS = [
  { name: "Sage", value: "#5f7d64" },
  { name: "Terracotta", value: "#c1694f" },
  { name: "Indigo", value: "#5b5ea6" },
  { name: "Teal", value: "#3f8f8a" },
  { name: "Gold", value: "#c9a662" },
];

const ICON_PRESETS = [
  "📚",
  "📖",
  "✍️",
  "🎬",
  "🎨",
  "🎵",
  "🧠",
  "🏛️",
  "⚗️",
  "🔭",
  "🌍",
  "💻",
  "🍞",
  "🧵",
  "🌱",
  "✝️",
  "⭐",
];

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function getValidHexColor(color) {
  return HEX_COLOR_PATTERN.test(color) ? color : "#5f7d64";
}

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

const ESTIMATED_ICON_PICKER_HEIGHT = 230;

function SubjectForm({ subject = null, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(() => createDraftFromSubject(subject));
  const [error, setError] = useState("");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerPlacement, setIconPickerPlacement] = useState("down");
  const iconPickerRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== "Escape") return;

      if (iconPickerOpen) {
        setIconPickerOpen(false);
        return;
      }

      onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, iconPickerOpen]);

  useEffect(() => {
    if (!iconPickerOpen) return undefined;

    function handleClickOutside(event) {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target)) {
        setIconPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [iconPickerOpen]);

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleIconPicker(event) {
    if (iconPickerOpen) {
      setIconPickerOpen(false);
      return;
    }

    // The picker is clipped by the modal's own overflow:auto rather than the
    // viewport, so measure space within that scroll container (not window)
    // and flip upward when it won't fit below.
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const scrollContainer = event.currentTarget.closest(".academyModal");
    const containerBottom = scrollContainer
      ? scrollContainer.getBoundingClientRect().bottom
      : window.innerHeight;
    const spaceBelow = containerBottom - buttonRect.bottom;

    setIconPickerPlacement(
      spaceBelow < ESTIMATED_ICON_PICKER_HEIGHT && buttonRect.top > ESTIMATED_ICON_PICKER_HEIGHT
        ? "up"
        : "down"
    );
    setIconPickerOpen(true);
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
              <span>Icon — optional emoji or symbol</span>
              <div className="subjectIconField" ref={iconPickerRef}>
                <input
                  type="text"
                  value={draft.icon}
                  maxLength={4}
                  placeholder="📚"
                  onChange={(event) => updateField("icon", event.target.value)}
                />
                <button
                  className="detailsButton subjectIconPickerToggle"
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={iconPickerOpen}
                  onClick={toggleIconPicker}
                >
                  Choose icon
                </button>

                {iconPickerOpen && (
                  <div
                    className={`subjectIconPicker subjectIconPicker--${iconPickerPlacement}`}
                    role="dialog"
                    aria-label="Choose an icon"
                  >
                    <div className="subjectIconPickerGrid">
                      {ICON_PRESETS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className="subjectIconOption"
                          onClick={() => {
                            updateField("icon", icon);
                            setIconPickerOpen(false);
                          }}
                          aria-label={`Use icon ${icon}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <p className="subjectIconPickerHint">
                      Windows users can also press <kbd>Win</kbd> + <kbd>.</kbd> to open the
                      full system emoji picker.
                    </p>
                  </div>
                )}
              </div>
              <p className="academyFormHint">
                Example: 📚, 🎬, ✍️ or ⚗️. Leave blank to use a plain colour dot.
              </p>
            </label>

            <div className="academyFormField">
              <span id="subject-colour-label">Colour</span>
              <div
                className="subjectColorControl"
                role="group"
                aria-labelledby="subject-colour-label"
              >
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`subjectColorSwatch ${draft.color === preset.value ? "active" : ""}`}
                    style={{ "--swatch-color": preset.value }}
                    onClick={() => updateField("color", preset.value)}
                    aria-label={`Use ${preset.name}`}
                    aria-pressed={draft.color === preset.value}
                    title={preset.name}
                  >
                    {draft.color === preset.value && (
                      <span className="subjectColorSwatchCheck" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                ))}

                <span className="subjectColorCustomSwatch" title="Custom colour">
                  <input
                    type="color"
                    id="subject-color-custom"
                    value={getValidHexColor(draft.color)}
                    onChange={(event) => updateField("color", event.target.value)}
                    aria-label={`Custom colour, current value ${getValidHexColor(draft.color).toUpperCase()}`}
                  />
                </span>

                <span className="subjectColorHexValue">
                  {getValidHexColor(draft.color).toUpperCase()}
                </span>
              </div>
            </div>
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
