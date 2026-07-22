function BottomStatusBar({
  activeWorkCount,
  completedTodayCount,
  priorityCount,
  activeWorkLabel = "Active Work",
  completedTodayLabel = "Completed Today",
}) {
  return (
    <aside className="bottomStatusBar" aria-label="Bottom work rail">
      <span>{activeWorkLabel} {activeWorkCount}</span>
      <span aria-hidden="true">{"\u00b7"}</span>
      <span>{completedTodayLabel} {completedTodayCount}</span>
      <span aria-hidden="true">{"\u00b7"}</span>
      <span>Priority {priorityCount}</span>
    </aside>
  );
}

export default BottomStatusBar;
