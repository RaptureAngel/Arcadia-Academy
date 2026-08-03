// Persistent, app-wide banner shown whenever desktop saving is expected but
// not currently healthy. Rendered once at the top level of App.jsx (outside
// the per-tab view blocks) so it stays visible while navigating between
// Dashboard, Subjects, Archive, Characters, and Settings.
function DesktopSaveWarningBanner({
  warning,
  onReview,
  onRetry,
  onRepairCorrupt,
  onExportCurrentData,
}) {
  if (!warning) return null;

  const canRetry = ["writeError", "backupError", "folderUnavailable"].includes(
    warning.status
  );
  const canRepair = warning.status === "corrupt";

  return (
    <div className="desktopSaveWarningBanner" role="alert">
      <p className="desktopSaveWarningText">{warning.message}</p>
      <div className="desktopSaveWarningActions">
        {onReview && (
          <button className="detailsButton" type="button" onClick={onReview}>
            Review
          </button>
        )}
        {canRepair && onRepairCorrupt && (
          <button className="detailsButton" type="button" onClick={onRepairCorrupt}>
            Repair Save
          </button>
        )}
        {canRetry && onRetry && (
          <button className="detailsButton" type="button" onClick={onRetry}>
            Retry Save
          </button>
        )}
        {onExportCurrentData && (
          <button className="detailsButton" type="button" onClick={onExportCurrentData}>
            Export Current Data
          </button>
        )}
      </div>
    </div>
  );
}

export default DesktopSaveWarningBanner;
