import { formatFocusedDuration } from "../../utils/dates";

function StudyCompanionPanel({
  character,
  levelProgress,
  onSwitchCharacter,
  onOpenDossier,
  onOpenOutfitSelector,
  switchDisabled,
  activeSubjectCount,
  occupiedSlotCount,
  maxSlots,
  totalSessions,
  totalFocusedSeconds,
}) {
  const imageSrc =
    character?.portraitDisplayImage ?? character?.displayImage ?? character?.image;
  const hasOutfits =
    Array.isArray(character?.outfits) && character.outfits.length > 0;

  return (
    <aside className="panel studyCompanionPanel">
      <p className="panelLabel">Study Companion</p>

      <div className="studyCompanionHeader">
        <button
          className="employeeAvatar employeeAvatarButton studyCompanionAvatar"
          type="button"
          onClick={onOpenDossier}
          aria-label={`Open dossier for ${character?.name || "your companion"}`}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={character?.name || "Study companion"}
              className="employeeAvatarImage"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span>{character?.name?.slice(0, 1) || "A"}</span>
          )}
        </button>

        <div className="studyCompanionInfo">
          <h2>{character?.name || "No companion selected"}</h2>
          {levelProgress && <p className="role">Level {levelProgress.level}</p>}
        </div>
      </div>

      {levelProgress && (
        <div className="levelProgress">
          <div className="levelProgressTop">
            <strong>
              {character.xp} XP · {levelProgress.xpToNextLevel} to Level{" "}
              {levelProgress.level + 1}
            </strong>
          </div>
          <div className="levelProgressBar">
            <div style={{ width: `${Math.round(levelProgress.progress * 100)}%` }} />
          </div>
        </div>
      )}

      <p className="studyCompanionMessage">
        {occupiedSlotCount === 0
          ? "Ready when you are."
          : "Ready when you are. Your studies are waiting below."}
      </p>

      <div className="studyCompanionReadout" aria-label="Academy summary">
        <div>
          <strong>{activeSubjectCount}</strong>
          <small>Subjects</small>
        </div>
        <div>
          <strong>
            {occupiedSlotCount}/{maxSlots}
          </strong>
          <small>Active Slots</small>
        </div>
        <div>
          <strong>{totalSessions}</strong>
          <small>Sessions</small>
        </div>
        <div>
          <strong>{formatFocusedDuration(totalFocusedSeconds)}</strong>
          <small>Focused Time</small>
        </div>
      </div>

      <div className="studyCompanionActions">
        <button
          className="secondaryButton"
          type="button"
          onClick={onSwitchCharacter}
          disabled={switchDisabled}
          title={switchDisabled ? "End the current focus session first." : ""}
        >
          Switch Character
        </button>
        <button className="detailsButton" type="button" onClick={onOpenDossier}>
          Dossier
        </button>
        {hasOutfits && (
          <button
            className="detailsButton"
            type="button"
            onClick={onOpenOutfitSelector}
          >
            Change Outfit
          </button>
        )}
      </div>
    </aside>
  );
}

export default StudyCompanionPanel;
