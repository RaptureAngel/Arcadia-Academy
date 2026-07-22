import DashboardInsightsPanel from "./DashboardInsightsPanel";

function ProgressRing({ progress, todayXp, dailyQuota, onEditQuota }) {
  const radius = 92;
  const stroke = 14;
  const normalisedRadius = radius - stroke * 0.5;
  const circumference = normalisedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div
      className="ringWrap editableRing"
      role="button"
      tabIndex="0"
      onClick={onEditQuota}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEditQuota();
        }
      }}
      aria-label="Edit daily quota"
    >
      <svg height={radius * 2} width={radius * 2} className="progressRing">
        <circle
          stroke="rgba(255,255,255,0.08)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalisedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#progressGradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          r={normalisedRadius}
          cx={radius}
          cy={radius}
        />
        <defs>
          <linearGradient id="progressGradient">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#19e6a1" />
          </linearGradient>
        </defs>
      </svg>

      <div className="ringCenter">
        <div className="ringNumber">{todayXp}</div>
        <div className="ringLabel">/ {dailyQuota} XP</div>
      </div>
    </div>
  );
}

const DASHBOARD_PANEL_MODES = ["quota", "insights", "attention"];

function getPanelTitle(mode, contextLabels) {
  if (mode === "insights") return "Weekly Insights";
  if (mode === "attention") {
    return contextLabels?.insightClientAttention || "Client Attention";
  }

  return "Daily Quota";
}

function DailyProgressPanel({
  mode = "quota",
  onCycleMode,
  insights,
  contextLabels,
  ringProgress,
  todayXp,
  dailyQuota,
  quotaPercent,
  completedTaskCount,
  dailyRank,
  showDailyQuotaEditor,
  draftDailyQuota,
  minDailyQuota,
  maxDailyQuota,
  onEditQuota,
  onSaveDailyQuota,
  onCancelDailyQuotaEdit,
  onDraftDailyQuotaChange,
}) {
  const currentModeIndex = DASHBOARD_PANEL_MODES.indexOf(mode);
  const nextMode =
    DASHBOARD_PANEL_MODES[
      (Math.max(currentModeIndex, 0) + 1) % DASHBOARD_PANEL_MODES.length
    ];
  const panelTitle = getPanelTitle(mode, contextLabels);
  const nextPanelTitle = getPanelTitle(nextMode, contextLabels);

  return (
    <section className={`panel progressPanel dashboardCenterPanel ${mode}`}>
      <div className="dashboardCenterHeader">
        <div>
          <p className="panelLabel">Dashboard</p>
          <h2>{panelTitle}</h2>
        </div>
        <button
          className="dashboardPanelCycleButton"
          type="button"
          onClick={onCycleMode}
          aria-label={`Show ${nextPanelTitle}`}
          title={`Show ${nextPanelTitle}`}
        >
          {"\u203a"}
        </button>
      </div>

      {mode === "quota" ? (
        <>
          <ProgressRing
            progress={ringProgress}
            todayXp={todayXp}
            dailyQuota={dailyQuota}
            onEditQuota={onEditQuota}
          />
          {showDailyQuotaEditor && (
            <form className="quotaControl" onSubmit={onSaveDailyQuota}>
              <label>
                <span>Daily Quota</span>
                <input
                  type="number"
                  min={minDailyQuota}
                  max={maxDailyQuota}
                  step="25"
                  value={draftDailyQuota}
                  onChange={(event) =>
                    onDraftDailyQuotaChange(event.target.value)
                  }
                />
              </label>
              <div className="quotaActions">
                <button className="completeButton" type="submit">
                  Save
                </button>
                <button
                  className="detailsButton"
                  type="button"
                  onClick={onCancelDailyQuotaEdit}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          <div className="progressDetails">
            <h2>{quotaPercent}% of Quota</h2>
            <p>{completedTaskCount} tasks completed today</p>
            <span className="rankBadge dailyRankBadge">{dailyRank}</span>
          </div>
        </>
      ) : (
        <DashboardInsightsPanel
          insights={insights}
          contextLabels={contextLabels}
          mode={mode}
        />
      )}
    </section>
  );
}

export default DailyProgressPanel;
