import { useEffect, useState } from "react";

const DEFAULT_CONFIRM_WORD = "RESET";
const DEFAULT_MESSAGE =
  "This will remove tasks, projects, history and work logs, workday state, and active character selection. Character, client, and template libraries plus daily quota are preserved.";

function ResetConfirmDialog({
  isOpen,
  title = "Confirm reset",
  label = "Reset Work",
  message = DEFAULT_MESSAGE,
  confirmWord = DEFAULT_CONFIRM_WORD,
  confirmButtonLabel = "Reset Work",
  onConfirm,
  onCancel,
}) {
  const [typedValue, setTypedValue] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setTypedValue("");
    }
  }, [isOpen]);

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
