function InsightStat({ label, value, detail }) {
  return (
    <div className="dashboardInsightStat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function DashboardInsightsPanel({ insights, contextLabels, mode = "insights" }) {
  const clientAttention = Array.isArray(insights.clientAttention)
    ? insights.clientAttention
    : [];

  if (mode === "attention") {
    return (
      <div className="dashboardAttentionPanel">
        {clientAttention.length === 0 ? (
          <p className="dashboardAttentionEmpty">
            {contextLabels?.insightClientAttentionEmpty ||
              "No client activity yet"}
          </p>
        ) : (
          <div className="dashboardAttentionChart">
            <div className="dashboardAttentionPlot">
              {clientAttention.map((item) => (
                <div key={item.name} className="dashboardAttentionColumn">
                  <div
                    className="dashboardAttentionBar"
                    style={{ height: `${item.barPercent}%` }}
                    title={`${item.name}: ${item.xp} XP, ${item.count} ${
                      item.count === 1 ? "item" : "items"
                    }`}
                  >
                    <span>{item.xp}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="dashboardAttentionLabels">
              {clientAttention.map((item) => (
                <div key={item.name} className="dashboardAttentionLabel">
                  <strong>{item.name}</strong>
                  <small>
                    {item.xp} XP · {item.count}{" "}
                    {item.count === 1 ? "item" : "items"}
                  </small>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="dashboardInsightsGrid">
        <InsightStat
          label={contextLabels?.insightWeeklyXp || "Weekly XP"}
          value={`${insights.weeklyXp} XP`}
        />
        <InsightStat
          label={contextLabels?.insightFinishedWork || "Finished Work"}
          value={insights.finishedCount}
        />
        <InsightStat
          label={contextLabels?.insightTopClient || "Top Client"}
          value={insights.topClient}
        />
        <InsightStat
          label={contextLabels?.insightTopTaskType || "Top Task Type"}
          value={insights.topTaskType}
        />
        <InsightStat
          label={contextLabels?.insightBestDay || "Best Day"}
          value={insights.bestDay}
          detail={insights.bestDayXp > 0 ? `${insights.bestDayXp} XP` : ""}
        />
        <InsightStat
          label={contextLabels?.insightOpenItems || "Open Items"}
          value={insights.openItems}
        />
        <InsightStat
          label={contextLabels?.insightTrackedTime || "Tracked Time"}
          value={insights.trackedTime}
        />
      </div>
      <span className="dashboardInsightsRange">
        {insights.weekStartKey} - {insights.weekEndKey}
      </span>
    </>
  );
}

export default DashboardInsightsPanel;
