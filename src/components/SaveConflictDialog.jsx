import { useEffect } from "react";

function formatAbsoluteTime(value) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString("en-ZA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeNewerSide(localUpdatedAt, desktopUpdatedAt) {
  if (!localUpdatedAt || !desktopUpdatedAt) {
    return "Which side is newer could not be determined from the available data.";
  }

  const localTime = new Date(localUpdatedAt).getTime();
  const desktopTime = new Date(desktopUpdatedAt).getTime();

  if (Number.isNaN(localTime) || Number.isNaN(desktopTime)) {
    return "Which side is newer could not be determined from the available data.";
  }

  if (localTime === desktopTime) {
    return "Both sides were last changed at the same time.";
  }

  return localTime > desktopTime
    ? "This device's local data appears newer, based on its last-changed time."
    : "The desktop save appears newer, based on its last-changed time.";
}

// Blocking save-conflict dialog. Reuses the existing Academy modal chrome
// (.modalBackdrop / .confirmDialog) — no backdrop-click-close. Escape maps
// to Cancel, which is the one non-destructive action here (it leaves local
// data untouched), so it's safe to bind.
function SaveConflictDialog({ conflict, onUseLocal, onUseDesktop, onExportLocal, onCancel }) {
  useEffect(() => {
    if (!conflict) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [conflict, onCancel]);

  if (!conflict) return null;

  const localUpdatedAt = conflict.localMetadata?.updatedAt;
  const desktopUpdatedAt = conflict.desktopPayload?.metadata?.updatedAt;

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="confirmDialog saveConflictDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-conflict-title"
      >
        <div className="confirmDialogHeader">
          <p className="panelLabel">Save Conflict</p>
          <h2 id="save-conflict-title">Local and desktop data have both changed</h2>
        </div>

        <p className="confirmDialogMessage">
          This device's local data and the desktop save file have each
          changed since they were last matched up. Arcadia Academy can&apos;t
          safely combine them — choose which one to keep. The side you
          don&apos;t choose is not deleted: it stays available as a backup or
          export.
        </p>

        <dl className="focusRecoveryDetails saveConflictDetails">
          <div className="focusRecoveryDetailRow">
            <dt>This device (local)</dt>
            <dd>{formatAbsoluteTime(localUpdatedAt)}</dd>
          </div>
          <div className="focusRecoveryDetailRow">
            <dt>Desktop save file</dt>
            <dd>{formatAbsoluteTime(desktopUpdatedAt)}</dd>
          </div>
        </dl>

        <p className="academyFormNotice">
          {describeNewerSide(localUpdatedAt, desktopUpdatedAt)}
        </p>

        <div className="confirmDialogActions saveConflictActions">
          <button className="detailsButton" type="button" onClick={onExportLocal}>
            Export Local Copy
          </button>
          <button className="detailsButton" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="secondaryButton" type="button" onClick={onUseDesktop}>
            Use Desktop Save
          </button>
          <button className="primaryButton" type="button" onClick={onUseLocal}>
            Use Local Data
          </button>
        </div>
      </section>
    </div>
  );
}

export default SaveConflictDialog;
