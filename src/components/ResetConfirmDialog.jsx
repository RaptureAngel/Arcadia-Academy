import { useEffect, useState } from "react";

const DEFAULT_CONFIRM_WORD = "RESET";
const DEFAULT_MESSAGE =
  "This clears leftover internal session-tracking state and returns to the character select screen. Your subjects, study projects, notes, character library, and character XP are not affected.";

function ResetConfirmDialog({
  isOpen,
  title = "Confirm reset",
  label = "Reset Session Data",
  message = DEFAULT_MESSAGE,
  confirmWord = DEFAULT_CONFIRM_WORD,
  confirmButtonLabel = "Reset Session Data",
  onConfirm,
  onCancel,
}) {
  const [typedValue, setTypedValue] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setTypedValue("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isConfirmEnabled = typedValue === confirmWord;

  function handleSubmit(event) {
    event.preventDefault();

    if (!isConfirmEnabled) return;

    onConfirm();
  }

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="confirmDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-confirm-title"
      >
        <div className="confirmDialogHeader">
          <p className="panelLabel">{label}</p>
          <h2 id="reset-confirm-title">{title}</h2>
        </div>

        <p className="confirmDialogMessage">{message}</p>

        <form className="confirmDialogForm" onSubmit={handleSubmit}>
          <label className="confirmDialogLabel">
            Type <strong>{confirmWord}</strong> to confirm
            <input
              className="confirmDialogInput"
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </label>

          <div className="confirmDialogActions">
            <button className="detailsButton" type="button" onClick={onCancel}>
              Cancel
            </button>

            <button
              className="deleteButton"
              type="submit"
              disabled={!isConfirmEnabled}
            >
              {confirmButtonLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ResetConfirmDialog;
