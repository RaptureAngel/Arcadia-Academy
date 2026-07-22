import { getStatusLabel, getWorkdayEmployeeIds } from "../utils/workday";

function getHistoryEmployeeNames(day, getEmployeeName) {
  const employeeIds = getWorkdayEmployeeIds(day.workday, day.activeEmployeeId);

  if (employeeIds.length === 0) {
    return getEmployeeName(day.activeEmployeeId);
  }

  return employeeIds.map((employeeId) => getEmployeeName(employeeId)).join(", ");
}

function RecentHistoryPanel({ history, getEmployeeName, onSelectHistoryEntry }) {
  return (
    <section className="panel taskListPanel">
      <div className="taskListHeader">
        <div>
          <p className="panelLabel">Recent History</p>
          <h2>{history.length} archived days</h2>
        </div>
      </div>

      {history.length === 0 ? (
        <p className="emptyState">
          No archived days yet. Use Archive Today to test the history system.
        </p>
      ) : (
        <div className="taskList">
          {history.slice(0, 5).map((day) => (
            <article key={day.id} className="taskItem archiveHistoryItem">
              <div className="taskContent">
                <h3>{day.date}</h3>
                <p>
                  {day.completedTasks}/{day.totalTasks} tasks complete {"\u00b7"}{" "}
                  {day.xpEarned} XP {"\u00b7"} {day.rank}
                </p>
                <small>
                  Employee(s): {getHistoryEmployeeNames(day, getEmployeeName)}{" "}
                  {"\u00b7"} Status: {getStatusLabel(day.workday?.status)}
                </small>
              </div>
              <button
                className="detailsButton"
                type="button"
                onClick={() => onSelectHistoryEntry(day)}
              >
                View Day
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default RecentHistoryPanel;
