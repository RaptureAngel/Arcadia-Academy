import { useEffect, useState } from "react";
import {
  DEFAULT_IMAGE_FRAMING,
  IMAGE_FRAMING_ASPECT_RATIOS,
  getFramingStyle,
  normalizeImageFraming,
} from "../utils/imageFraming";

const SLOT_LABELS = {
  portrait: "Portrait",
  dossier: "Dossier",
  focus: "Focus",
};

// Mounted only while open (see CharacterLibraryPanel), so a fresh `draft`
// is derived from `framing` on every open via the lazy useState initializer
// — no reset effect required.
function ImageFramingModal({ imageSrc, characterName, slot, framing, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => normalizeImageFraming(framing));

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const slotLabel = SLOT_LABELS[slot] || "Image";
  const aspectRatio = IMAGE_FRAMING_ASPECT_RATIOS[slot] || "1 / 1";

  function updateDraft(field, value) {
    setDraft((current) => normalizeImageFraming({ ...current, [field]: value }));
  }

  function handleReset() {
    setDraft(normalizeImageFraming(DEFAULT_IMAGE_FRAMING));
  }

  function handleSave(event) {
    event.preventDefault();
    onSave(draft);
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="imageFramingModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-framing-title"
      >
        <header className="imageFramingHeader">
          <div>
            <p className="panelLabel">Adjust Framing</p>
            <h2 id="image-framing-title">
              {slotLabel} image{characterName ? ` — ${characterName}` : ""}
            </h2>
          </div>
          <button
            className="modalCloseButton"
            type="button"
            onClick={onCancel}
            aria-label="Close framing editor"
          >
            {"×"}
          </button>
        </header>

        <form className="imageFramingForm" onSubmit={handleSave}>
          <div className="imageFramingPreviewWrap">
            <div
              className="imageFramingPreview"
              style={{ aspectRatio }}
            >
              {imageSrc ? (
                <img src={imageSrc} alt="" style={getFramingStyle(draft)} />
              ) : (
                <span className="imageFramingPreviewEmpty">No image set</span>
              )}
            </div>
            <p className="imageFramingHint">
              Drag the sliders until the important part of the image — a face,
              for example — sits clearly inside the frame.
            </p>
          </div>

          <div className="imageFramingControls">
            <fieldset className="imageFramingFitChoice">
              <legend>Fit</legend>
              <label>
                <input
                  type="radio"
                  name="image-framing-fit"
                  value="cover"
                  checked={draft.fit === "cover"}
                  onChange={() => updateDraft("fit", "cover")}
                />
                Cover (fill the frame, may crop)
              </label>
              <label>
                <input
                  type="radio"
                  name="image-framing-fit"
                  value="contain"
                  checked={draft.fit === "contain"}
                  onChange={() => updateDraft("fit", "contain")}
                />
                Contain (show the whole image)
              </label>
            </fieldset>

            <label className="imageFramingSlider">
              <span>Horizontal position ({draft.positionX}%)</span>
              <input
                type="range"
                min="0"
                max="100"
                value={draft.positionX}
                onChange={(event) => updateDraft("positionX", Number(event.target.value))}
                aria-label="Horizontal position"
              />
            </label>

            <label className="imageFramingSlider">
              <span>Vertical position ({draft.positionY}%)</span>
              <input
                type="range"
                min="0"
                max="100"
                value={draft.positionY}
                onChange={(event) => updateDraft("positionY", Number(event.target.value))}
                aria-label="Vertical position"
              />
            </label>

            <label className="imageFramingSlider">
              <span>Zoom ({draft.zoom.toFixed(2)}x)</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={draft.zoom}
                onChange={(event) => updateDraft("zoom", Number(event.target.value))}
                aria-label="Zoom"
              />
            </label>
          </div>

          <div className="imageFramingActions">
            <button className="detailsButton" type="button" onClick={handleReset}>
              Reset
            </button>
            <div className="imageFramingActionsEnd">
              <button className="detailsButton" type="button" onClick={onCancel}>
                Cancel
              </button>
              <button className="primaryButton" type="submit">
                Save Framing
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ImageFramingModal;
