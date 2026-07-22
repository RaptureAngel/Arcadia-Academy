import { formatSavedTime } from "../utils/dates";
import {
  getWorkdayFinalPunchOut,
  getWorkdayFirstPunchIn,
} from "../utils/workday";

function SummaryStat({ label, value }) {
  return (
    <div className="endDayStat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SessionRows({ sessions }) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;

  return (
    <section className="endDaySessions">
      <p className="panelLabel">Work Sessions</p>
      <div className="endDaySessionList">
        {sessions.map((session) => (
          <div key={session.id} className="endDaySessionRow">
            <span>
              {formatSavedTime(session.punchInTime)} -{" "}
              {session.punchOutTime
                ? formatSavedTime(session.punchOutTime)
                : "In progress"}
            </span>
            <strong>{session.employeeName || "Unknown Employee"}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function EndOfDaySummaryModal({
  summary,
  onConfirmArchive,
  onCancel,
  workLogLabel = "Work Log",
  saveButtonLabel,
}) {
  if (!summary) return null;

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="endDayModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-day-summary-title"
      >
        <div className="endDayHeader">
          <div>
            <p className="panelLabel">End of Day</p>
            <h2 id="end-day-summary-title">{workLogLabel}</h2>
          </div>
          <button
            className="modalCloseButton"
            type="button"
            onClick={onCancel}
            aria-label="Close end of day summary"
          >
            {"\u00d7"}
          </button>
        </div>

        <div className="endDayEmployee">
          <span>{summary.employeeNames?.length > 1 ? "Employees" : "Active employee"}</span>
          <strong>{summary.employeeName}</strong>
        </div>

        <div className="endDayTimes">
          <SummaryStat
            label="Punch in"
            value={formatSavedTime(getWorkdayFirstPunchIn(summary.workday))}
          />
          <SummaryStat
            label="Lunch start"
            value={formatSavedTime(summary.workday.lunchStartTime)}
          />
          <SummaryStat
            label="Lunch end"
            value={formatSavedTime(summary.workday.lunchEndTime)}
          />
          <SummaryStat
            label="Punch out"
            value={formatSavedTime(getWorkdayFinalPunchOut(summary.workday))}
          />
        </div>

        <SessionRows sessions={summary.sessions} />

        <div className="endDayStatsGrid">
          <SummaryStat label="Tasks completed" value={summary.completedTaskCount} />
          <SummaryStat label="Project packs completed" value={summary.completedProjectPackCount} />
          <SummaryStat label="XP earned" value={`${summary.xpEarned} XP`} />
          <SummaryStat label="Daily quota" value={`${summary.quotaPercent}%`} />
          <SummaryStat label="Daily rank" value={summary.dailyRank} />
          <SummaryStat label="Top client" value={summary.topClient} />
          <SummaryStat label="Top task type" value={summary.topTaskType} />
          <SummaryStat
            label="Unfinished"
            value={`${summary.carryOverTaskCount || 0} task(s)`}
          />
        </div>

        {summary.canArchive && (
          <p className="endDayNotice endDayCarryOverNotice">
            Completed work will be archived. Unfinished tasks will stay active.
          </p>
        )}

        {!summary.canArchive && (
          <p className="endDayNotice">No task data is ready to archive yet.</p>
        )}

        <div className="endDayActions">
          <button className="detailsButton" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="primaryButton"
            type="button"
            disabled={!summary.canArchive}
            onClick={onConfirmArchive}
          >
            {saveButtonLabel || `Save ${workLogLabel}`}
          </button>
        </div>
      </section>
    </div>
  );
}

export default EndOfDaySummaryModal;
