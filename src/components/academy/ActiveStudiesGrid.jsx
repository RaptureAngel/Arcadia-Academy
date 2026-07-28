import ProjectCard from "./ProjectCard";

function AddProjectTile({ onAdd, disabled, disabledReason }) {
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
      <span>{disabled ? "Slot full" : "Add Project"}</span>
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

  return (
    <section className="activeStudiesSection">
      <div className="academyViewHeader">
        <div>
          <p className="panelLabel">Active Studies</p>
          <h2>
            {activeProjects.length} of {maxActiveSlots} slots in use
          </h2>
        </div>
        {slotsFull && (
          <p className="academyFormNotice">
            All slots are full. Shelve, complete, or retire a project to free one up.
          </p>
        )}
      </div>

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
          />
        ))}
      </div>
    </section>
  );
}

export default ActiveStudiesGrid;
