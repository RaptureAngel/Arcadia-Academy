function formatDraftDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MeetingDraftRecoveryDialog({
  draft,
  warnings = [],
  onResume,
  onDiscard,
}) {
  if (!draft) return null;

  const notes = draft.session?.notes || "";
  const actionItemCount = draft.session?.actionItemIds?.length || 0;
  const meetingTitle = draft.meetingTaskSnapshot?.title || "Untitled meeting";
  const client = draft.meetingTaskSnapshot?.client || "No client";

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="confirmDialog meetingDraftRecoveryDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-draft-recovery-title"
      >
        <div className="confirmDialogHeader">
          <p className="panelLabel">Meeting draft found</p>
          <h2 id="meeting-draft-recovery-title">Recover meeting notes?</h2>
        </div>

        <div className="meetingDraftSummary">
          <strong>{meetingTitle}</strong>
          <span>{client}</span>
          <dl>
            <div>
              <dt>Started</dt>
              <dd>{formatDraftDateTime(draft.session?.startedAt)}</dd>
            </div>
            <div>
              <dt>Last saved</dt>
              <dd>{formatDraftDateTime(draft.savedAt)}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{notes.trim().length > 0 ? `${notes.trim().length} chars` : "Empty"}</dd>
            </div>
            <div>
              <dt>Action items</dt>
              <dd>{actionItemCount}</dd>
            </div>
          </dl>
        </div>

        {warnings.length > 0 && (
          <div className="meetingDraftWarnings" role="status">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}

        <div className="confirmDialogActions">
          <button className="deleteButton" type="button" onClick={onDiscard}>
            Discard Draft
          </button>
          <button className="primaryButton" type="button" onClick={onResume}>
            Resume Meeting
          </button>
        </div>
      </section>
    </div>
  );
}

export default MeetingDraftRecoveryDialog;
