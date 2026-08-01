import { formatFocusedDuration } from "../../utils/dates";

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

// Shown at startup when a focus-session recovery draft is found on this
// device. Reuses the app's existing modal chrome (.modalBackdrop /
// .confirmDialog) so it matches every other Academy dialog. There is no
// backdrop-click-to-close and no Escape handler — Resume/Discard must be
// chosen explicitly.
function FocusSessionRecoveryDialog({ pendingRecovery, onResume, onDiscard }) {
  if (!pendingRecovery) return null;

  const { record, validation } = pendingRecovery;
  const projectTitle = validation.project?.title || "Unknown project";
  const characterName = validation.character?.name || "No companion";

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="confirmDialog focusRecoveryDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-recovery-title"
      >
        <div className="confirmDialogHeader">
          <p className="panelLabel">Unfinished Study Session Found</p>
          <h2 id="focus-recovery-title">Resume your last session?</h2>
        </div>

        <p className="confirmDialogMessage">
          Arcadia Academy closed before this focus session was ended. Time
          while Academy was closed was not counted — only the time
          checkpointed below is recovered.
        </p>

        <dl className="focusRecoveryDetails">
          <div className="focusRecoveryDetailRow">
            <dt>Project</dt>
            <dd>{projectTitle}</dd>
          </div>
          <div className="focusRecoveryDetailRow">
            <dt>Character</dt>
            <dd>{characterName}</dd>
          </div>
          <div className="focusRecoveryDetailRow">
            <dt>Checkpointed focus time</dt>
            <dd>{formatFocusedDuration(record.checkpointedFocusedSeconds)}</dd>
          </div>
          <div className="focusRecoveryDetailRow">
            <dt>Originally started</dt>
            <dd>{formatAbsoluteTime(record.startedAt)}</dd>
          </div>
          <div className="focusRecoveryDetailRow">
            <dt>Last checkpoint</dt>
            <dd>{formatAbsoluteTime(record.lastCheckpointAt)}</dd>
          </div>
        </dl>

        {!validation.valid && (
          <p className="academyFormNotice academyFormNotice--error">
            This session can&apos;t be resumed: {validation.reason}
          </p>
        )}

        <div className="confirmDialogActions">
          <button className="deleteButton" type="button" onClick={onDiscard}>
            Discard Session
          </button>

          {validation.valid && (
            <button className="primaryButton" type="button" onClick={onResume}>
              Resume Session
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export default FocusSessionRecoveryDialog;
