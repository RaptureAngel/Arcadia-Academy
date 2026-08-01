import { formatFocusedDuration } from "../../utils/dates";
import ProjectCard from "./ProjectCard";

function AddProjectTile({ onAdd, disabled, disabledReason, caption }) {
  return (
    <button
      className="addProjectTile"
      type="button"
      onClick={onAdd}
      disabled={disabled}
      title={disabled ? disabledReason : ""}
    >
      <span className="addProjectTileIcon" aria-hidden="true">
        +
      </span>
      <span className="addProjectTileLabel">{disabled ? "Slot full" : "Add Project"}</span>
      {caption && <span className="addProjectTileCaption">{caption}</span>}
    </button>
  );
}

function ActiveStudiesGrid({
  activeProjects,
  maxActiveSlots,
  subjects,
  activeSessionProjectId,
  canFocus,
  focusDisabledReason,
  totalSessions,
  totalFocusedSeconds,
  onFocus,
  onOpenDetail,
  onShelve,
  onComplete,
  onRetire,
  onEdit,
  onDelete,
  onAddProject,
}) {
  const emptySlotCount = Math.max(0, maxActiveSlots - activeProjects.length);
  const slotsFull = emptySlotCount === 0;
  const emptySlotCaption =
    emptySlotCount === 1 ? "One slot open" : emptySlotCount > 1 ? `${emptySlotCount} slots open` : "";

  return (
    <section className="activeStudiesSection">
      <div className="academyViewHeader">
        <h2 className="activeStudiesHeading">
          Active Studies
          <span className="activeStudiesSlotCount">
            {activeProjects.length} of {maxActiveSlots} slots
          </span>
        </h2>

        <div className="activeStudiesHeaderStats">
          <span>
            {totalSessions} session{totalSessions === 1 ? "" : "s"}
          </span>
          <span>{formatFocusedDuration(totalFocusedSeconds)} focused</span>
        </div>
      </div>

      {slotsFull && (
        <p className="academyFormNotice">
          All slots are full. Shelve, complete, or retire a project to free one up.
        </p>
      )}

      <div className="activeStudiesGrid">
        {activeProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            subjects={subjects}
            canFocus={canFocus && activeSessionProjectId !== project.id}
            focusDisabledReason={
              activeSessionProjectId === project.id
                ? "This project's focus session is already running."
                : focusDisabledReason
            }
            onFocus={onFocus}
            onOpenDetail={onOpenDetail}
            onShelve={onShelve}
            onComplete={onComplete}
            onRetire={onRetire}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}

        {Array.from({ length: emptySlotCount }).map((_, index) => (
          <AddProjectTile
            key={`empty-slot-${index}`}
            onAdd={onAddProject}
            disabled={slotsFull}
            disabledReason="All five active slots are full."
            caption={emptySlotCaption}
          />
        ))}
      </div>
    </section>
  );
}

export default ActiveStudiesGrid;
