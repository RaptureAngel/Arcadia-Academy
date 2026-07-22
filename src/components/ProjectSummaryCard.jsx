import { formatDeadline } from "../utils/dates";

function ProjectSummaryCard({
  project,
  isExpanded,
  onToggleDetails,
  onCancelProject,
  onOpenFocus,
  canOpenFocus = true,
  projectFocusLabel = "Project Focus",
  disabledFocusTitle = "Punch in to use Project Focus",
}) {
  const projectProgress =
    project.totalTasks === 0
      ? 0
      : Math.round((project.completedTasks / project.totalTasks) * 100);

  return (
    <article
      className={`projectSummaryCard ${project.priority ? "priorityProject" : ""}`}
    >
      <div className="projectSummaryTop">
        <div>
          <div className="projectTitleRow">
            <h3>{project.name}</h3>
            {project.priority && (
              <span className="projectPriorityBadge">Priority</span>
            )}
          </div>

          <p>
            {project.client}
            {project.deadline
              ? ` \u00b7 Deadline: ${formatDeadline(project.deadline)}`
              : ""}
          </p>
        </div>
        <span>{projectProgress}%</span>
      </div>

      <div className="miniProgressBar">
        <div style={{ width: `${projectProgress}%` }} />
      </div>

      <p>
        {project.completedTasks}/{project.totalTasks} steps complete {"\u00b7"}{" "}
        {project.completedXp}/{project.totalXp} XP earned
      </p>

      {isExpanded && (
        <div className="projectDetailsPanel">
          {project.currentStep && <p>Current step: {project.currentStep.title}</p>}

          {project.completedDate && (
            <p>Project complete: {formatDeadline(project.completedDate)}</p>
          )}

          <p>
            Progress: {project.completedTasks} of {project.totalTasks} steps
            complete
          </p>
        </div>
      )}

      <div className="projectSummaryActions">
        <button
          className="detailsButton projectDetailsButton"
          type="button"
          onClick={onToggleDetails}
        >
          {isExpanded ? "Hide Details" : "Details"}
        </button>

        {!project.completedDate && onOpenFocus && (
          <button
            className="detailsButton projectFocusButton"
            type="button"
            disabled={!canOpenFocus}
            onClick={onOpenFocus}
            title={canOpenFocus ? projectFocusLabel : disabledFocusTitle}
          >
            Focus
          </button>
        )}

        {!project.completedDate && (
          <button
            className="deleteButton projectCancelButton"
            type="button"
            onClick={onCancelProject}
          >
            Cancel
          </button>
        )}
      </div>
    </article>
  );
}

export default ProjectSummaryCard;
