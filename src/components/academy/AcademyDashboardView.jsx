import ActiveStudiesGrid from "./ActiveStudiesGrid";
import StudyCompanionPanel from "./StudyCompanionPanel";

function AcademyDashboardView({
  character,
  levelProgress,
  onSwitchCharacter,
  onOpenDossier,
  onOpenOutfitSelector,
  switchCharacterDisabled,
  activeProjects,
  maxActiveSlots,
  subjects,
  totalSessions,
  totalFocusedSeconds,
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
  return (
    <section className="viewShell academyView academyDashboardView">
      <div className="academyDashboardGrid">
        <StudyCompanionPanel
          character={character}
          levelProgress={levelProgress}
          onSwitchCharacter={onSwitchCharacter}
          onOpenDossier={onOpenDossier}
          onOpenOutfitSelector={onOpenOutfitSelector}
          switchDisabled={switchCharacterDisabled}
          subjects={subjects}
          activeProjects={activeProjects}
          occupiedSlotCount={activeProjects.length}
        />

        <ActiveStudiesGrid
          activeProjects={activeProjects}
          maxActiveSlots={maxActiveSlots}
          subjects={subjects}
          activeSessionProjectId={activeSessionProjectId}
          canFocus={canFocus}
          focusDisabledReason={focusDisabledReason}
          totalSessions={totalSessions}
          totalFocusedSeconds={totalFocusedSeconds}
          onFocus={onFocus}
          onOpenDetail={onOpenDetail}
          onShelve={onShelve}
          onComplete={onComplete}
          onRetire={onRetire}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddProject={onAddProject}
        />
      </div>
    </section>
  );
}

export default AcademyDashboardView;
