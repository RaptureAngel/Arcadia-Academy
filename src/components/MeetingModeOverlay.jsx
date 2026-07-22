function formatMeetingTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown start time";
  }

  return date.toLocaleString("en-ZA", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MeetingModeOverlay({
  meetingTask,
  session,
  actionItems,
  actionTitle,
  actionPriority,
  exportStatus,
  exportMessage,
  isExporting = false,
  onNotesChange,
  onActionTitleChange,
  onActionPriorityChange,
  onAddActionItem,
  onEndMeeting,
  onDownloadMeetingNotes,
  onExitWithoutExport,
  onCloseMeeting,
}) {
  if (!meetingTask || !session) return null;

  const canAddActionItem = actionTitle.trim().length > 0;
  const isExported = exportStatus === "success";

  return (
    <div className="meetingModeOverlay" role="presentation">
      <section
        className="meetingModePanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-mode-title"
      >
        <div className="meetingModeHeader">
          <div>
            <p className="panelLabel">Meeting Mode</p>
            <h2 id="meeting-mode-title">{meetingTask.title}</h2>
            <p className="meetingModeMeta">
              {meetingTask.client || "No client"} {"\u00b7"}{" "}
              {formatMeetingTime(session.startedAt)}
            </p>
          </div>
          <button
            className="projectFocusCloseButton"
            type="button"
            onClick={isExported ? onCloseMeeting : onExitWithoutExport}
            aria-label="Exit Meeting Mode"
          >
            {"\u00d7"}
          </button>
        </div>

        <div className="meetingModeGrid">
          <label className="meetingNotesField">
            Meeting Notes
            <textarea
              value={session.notes}
              disabled={isExported}
              onChange={(event) => onNotesChange(event.target.value)}
              placeholder="Capture decisions, context, questions, and next steps..."
            />
          </label>

          <aside className="meetingActionPanel">
            <form className="meetingActionForm" onSubmit={onAddActionItem}>
              <label>
                Action item
                <input
                  value={actionTitle}
                  disabled={isExported}
                  onChange={(event) => onActionTitleChange(event.target.value)}
                  placeholder="e.g. Send revised quote"
                />
              </label>

              <label className="checkboxRow meetingPriorityRow">
                <input
                  type="checkbox"
                  checked={actionPriority}
                  disabled={isExported}
                  onChange={(event) =>
                    onActionPriorityChange(event.target.checked)
                  }
                />
                Mark as priority
              </label>

              <button
                className="primaryButton"
                type="submit"
                disabled={isExported || !canAddActionItem}
              >
                Add Action Item
              </button>
            </form>

            <div className="meetingActionList">
              <div className="meetingActionListHeader">
                <span>Created this meeting</span>
                <strong>{actionItems.length}</strong>
              </div>

              {actionItems.length === 0 ? (
                <p className="emptyState">No action items yet.</p>
              ) : (
                actionItems.map((item) => (
                  <article
                    key={item.id}
                    className={`meetingActionItem ${
                      item.priority ? "priorityMeetingAction" : ""
                    }`}
                  >
                    <strong>{item.title}</strong>
                    <span>
                      {item.taskType}
                      {item.priority ? " \u00b7 Priority" : ""}
                    </span>
                  </article>
                ))
              )}
            </div>
          </aside>
        </div>

        {exportMessage && (
          <p
            className={`meetingExportStatus ${
              exportStatus === "error" ? "error" : "success"
            }`}
            aria-live="polite"
          >
            {exportMessage}
          </p>
        )}

        <div
          className={`meetingModeActions ${
            isExported ? "meetingModeActions--complete" : ""
          }`}
        >
          {isExported ? (
            <button className="primaryButton" type="button" onClick={onCloseMeeting}>
              Close
            </button>
          ) : (
            <>
              <button
                className="primaryButton"
                type="button"
                disabled={isExporting}
                onClick={onEndMeeting}
              >
                {isExporting ? "Saving..." : "End Meeting"}
              </button>
              {exportStatus === "error" && (
                <button
                  className="detailsButton"
                  type="button"
                  onClick={onDownloadMeetingNotes}
                >
                  Download .txt
                </button>
              )}
              <button
                className="deleteButton"
                type="button"
                disabled={isExporting}
                onClick={onExitWithoutExport}
              >
                Exit Without Export
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default MeetingModeOverlay;
