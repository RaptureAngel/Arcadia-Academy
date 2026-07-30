import { useEffect } from "react";

function ConfirmDialog({ config, onConfirm, onCancel }) {
  useEffect(() => {
    if (!config) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config, onCancel]);

  if (!config) return null;

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="confirmDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="confirmDialogHeader">
          <p className="panelLabel">Confirm action</p>
          <h2 id="confirm-dialog-title">{config.title}</h2>
        </div>

        <p className="confirmDialogMessage">{config.message}</p>

        <div className="confirmDialogActions">
          <button className="detailsButton" type="button" onClick={onCancel}>
            {config.cancelLabel ?? "Cancel"}
          </button>

          <button
            className={config.isDangerous ? "deleteButton" : "primaryButton"}
            type="button"
            onClick={onConfirm}
          >
            {config.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmDialog;
