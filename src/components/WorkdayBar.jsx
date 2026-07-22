import { formatSavedTime } from "../utils/dates";
import { getStatusLabel, getWorkdaySummary } from "../utils/workday";

function WorkdayBar({
  workday,
  showWorkdayDetails,
  onToggleDetails,
  onPunchIn,
  onStartLunch,
  onPunchOut,
  onReturnFromLunch,
}) {
  return (
    <section className={`panel workdayCompact ${workday.status}`}>
      <div className="workdayMain">
        <div>
          <p className="panelLabel">Workday</p>
          <h2>{getStatusLabel(workday.status)}</h2>
        </div>
        <p>{getWorkdaySummary(workday)}</p>
      </div>

      <div className="workdayActions compactActions">
        {workday.status === "notPunchedIn" && (
          <button className="primaryButton" onClick={onPunchIn}>
            Punch In
          </button>
        )}

        {workday.status === "working" && (
          <>
            <button className="secondaryButton compactButton" onClick={onStartLunch}>
              Start Lunch
            </button>
            <button className="secondaryButton compactButton" onClick={onPunchOut}>
              Punch Out
            </button>
          </>
        )}

        {workday.status === "onLunch" && (
          <button className="primaryButton" onClick={onReturnFromLunch}>
            Back From Lunch
          </button>
        )}

        {workday.status === "punchedOut" && (
          <button className="primaryButton" onClick={onPunchIn}>
            Punch In Again
          </button>
        )}

        <button className="detailsButton" onClick={onToggleDetails}>
          {showWorkdayDetails ? "Hide Details" : "Details"}
        </button>
      </div>

      {showWorkdayDetails && (
        <div className="workdayDetails">
          <span>Punch In: {formatSavedTime(workday.punchInTime)}</span>
          <span>Lunch Out: {formatSavedTime(workday.lunchStartTime)}</span>
          <span>Lunch In: {formatSavedTime(workday.lunchEndTime)}</span>
          <span>Punch Out: {formatSavedTime(workday.punchOutTime)}</span>
        </div>
      )}
    </section>
  );
}

export default WorkdayBar;
