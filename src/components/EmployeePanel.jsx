import { formatSavedTime } from "../utils/dates";
import { getStatusLabel } from "../utils/workday";

function getWorkdayDetail(workday, labels = {}) {
  if (!workday) {
    return "";
  }

  if (workday.status === "working" && workday.punchInTime) {
    return `${labels.workdayDetailStart || "Punched in"} ${formatSavedTime(
      workday.punchInTime
    )}`;
  }

  if (workday.status === "onLunch" && workday.lunchStartTime) {
    return `${labels.workdayDetailLunchStart || "Lunch started"} ${formatSavedTime(
      workday.lunchStartTime
    )}`;
  }

  if (workday.status === "punchedOut" && workday.punchOutTime) {
    const punchedOutTime = formatSavedTime(workday.punchOutTime);
    return labels.workdayDetailEnd
      ? `${labels.workdayDetailEnd} ${punchedOutTime}`
      : punchedOutTime;
  }

  return "";
}

function EmployeePanel({
  employee,
  levelProgress,
  workday,
  onSwitchEmployee,
  onOpenDossier,
  onOpenOutfitSelector,
  statusLabel,
  contextLabels,
  activeTaskCount = 0,
  completedTaskCount = 0,
  priorityTaskCount = 0,
}) {
  const workdayStatus =
    statusLabel || (workday ? getStatusLabel(workday.status) : "Not Punched In");
  const workdayDetail = getWorkdayDetail(workday, contextLabels);
  const roleLabel = employee.context === "class" ? "Student" : employee.role;
  const imageSrc =
    employee.portraitDisplayImage ?? employee.displayImage ?? employee.image;
  const outfits = Array.isArray(employee.outfits) ? employee.outfits : [];
  const hasOutfits = outfits.length > 0;
  const isAcademy = employee.context === "class";
  const readoutTitle = isAcademy ? "Class Readout" : "Session Readout";
  const activeLabel = isAcademy ? "Active Assignments" : "Active Work";

  return (
    <aside className="panel employeePanel">
      <p className="panelLabel">{contextLabels?.activeEmployee || "Active Employee"}</p>

      <div className="employeePanelBody">
        <div className="employeeProfileHeader">
          <button
            className="employeeAvatar employeeAvatarButton"
            type="button"
            onClick={onOpenDossier}
            aria-label={`Open dossier for ${employee.name}`}
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={employee.name}
                className="employeeAvatarImage"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span>{employee.name?.slice(0, 1) || "A"}</span>
            )}
          </button>

          <div className="employeeProfileInfo">
            <h2>{employee.name}</h2>
            <p className="role">
              {roleLabel} - Level {levelProgress.level}
            </p>

            <p
              className={`employeeWorkdayStatus ${
                workday?.status || "notPunchedIn"
              }`}
            >
              {workdayStatus}
              {workdayDetail && <span>{" \u00b7 "}{workdayDetail}</span>}
            </p>
          </div>
        </div>

        <div className="employeePanelReadout" aria-label={readoutTitle}>
          <span>{readoutTitle}</span>
          <div>
            <strong>{activeTaskCount}</strong>
            <small>{activeLabel}</small>
          </div>
          <div>
            <strong>{completedTaskCount}</strong>
            <small>Completed Today</small>
          </div>
          <div>
            <strong>{priorityTaskCount}</strong>
            <small>Priority</small>
          </div>
        </div>

        <div className="employeePanelBottom">
          <div className="levelProgress">
            <div className="levelProgressTop">
              <strong>
                {employee.xp} XP - {levelProgress.xpToNextLevel} to Level{" "}
                {levelProgress.level + 1}
              </strong>
            </div>
            <div className="levelProgressBar">
              <div
                style={{
                  width: `${Math.round(levelProgress.progress * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className={`employeePanelActions ${hasOutfits ? "hasOutfitAction" : ""}`}>
            {hasOutfits && (
              <button
                className="detailsButton"
                type="button"
                onClick={onOpenOutfitSelector}
              >
                Change Outfit
              </button>
            )}
            <button className="secondaryButton" type="button" onClick={onSwitchEmployee}>
              Switch Employee
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default EmployeePanel;
