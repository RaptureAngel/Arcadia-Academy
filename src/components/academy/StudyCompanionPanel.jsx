import { getSubjectAccentColor } from "../../utils/academyDisplay";
import { getFramingStyle } from "../../utils/imageFraming";
import { isSubjectArchived } from "../../utils/subjects";

function getActiveProjectCountForSubject(subjectId, activeProjects) {
  return activeProjects.filter((project) => project.subjectId === subjectId).length;
}

function StudyCompanionPanel({
  character,
  levelProgress,
  onSwitchCharacter,
  onOpenDossier,
  onOpenOutfitSelector,
  switchDisabled,
  subjects,
  activeProjects,
  occupiedSlotCount,
}) {
  const imageSrc =
    character?.portraitDisplayImage ?? character?.displayImage ?? character?.image;
  const hasOutfits =
    Array.isArray(character?.outfits) && character.outfits.length > 0;
  const currentSubjects = Array.isArray(subjects)
    ? subjects.filter((subject) => !isSubjectArchived(subject))
    : [];

  return (
    <aside className="panel studyCompanionPanel">
      <p className="panelLabel">Study Companion</p>

      <div className="studyCompanionHeader">
        <div className="studyCompanionPortraitWrap">
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
                style={getFramingStyle(character?.portraitFraming)}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span>{character?.name?.slice(0, 1) || "A"}</span>
            )}
          </button>

          <p className="studyCompanionMessage">
            {occupiedSlotCount === 0
              ? "Ready when you are."
              : "Ready when you are. Your studies are waiting below."}
          </p>
        </div>

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

      {currentSubjects.length > 0 && (
        <div className="studyCompanionSubjects">
          <p className="studyCompanionSubjectsLabel">Subjects</p>
          <ul className="studyCompanionSubjectList">
            {currentSubjects.map((subject) => (
              <li key={subject.id}>
                <span
                  className="studyCompanionSubjectDot"
                  aria-hidden="true"
                  style={{ "--subject-color": getSubjectAccentColor(subject) }}
                />
                <span className="studyCompanionSubjectName">{subject.name}</span>
                <span className="studyCompanionSubjectCount">
                  {getActiveProjectCountForSubject(subject.id, activeProjects)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

export default StudyCompanionPanel;
