import { useEffect } from "react";
import { formatFocusedDuration, formatRelativeTime } from "../../utils/dates";
import {
  getProjectProgressLabel,
  getProjectProgressPercent,
  getSubjectDisplay,
} from "../../utils/academyDisplay";
import {
  PROGRESS_METHOD_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
} from "../../utils/studyProjects";
import { sortStudySessionsChronologically } from "../../utils/studySessions";
import ProgressRing from "./ProgressRing";
import ProjectNotesEditor from "./ProjectNotesEditor";

function getCharacterName(characterId, characterLibrary) {
  if (!characterId) return "Unknown character";

  return (
    characterLibrary.find((character) => character.id === characterId)?.name ||
    "Former character"
  );
}

function ProjectDetailPanel({
  project,
  subjects,
  sessions,
  characterLibrary,
  canFocus,
  slotAvailable,
  onClose,
  onSaveNotes,
  onEdit,
  onFocus,
  onShelve,
  onComplete,
  onRetire,
  onRestore,
  onDelete,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!project) return null;

  const subject = getSubjectDisplay(project.subjectId, subjects);
  const percent = getProjectProgressPercent(project);
  const recentSessions = sortStudySessionsChronologically(
    sessions.filter((session) => session.projectId === project.id),
    { direction: "desc" }
  ).slice(0, 8);
  const isActive = project.status === "active";

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="academyModal projectDetailModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-detail-title"
      >
        <div className="academyModalHeader">
          <p className="panelLabel">
            {subject.name} · {PROJECT_TYPE_LABELS[project.projectType]} ·{" "}
            {PROJECT_STATUS_LABELS[project.status]}
          </p>
          <h2 id="project-detail-title">{project.title}</h2>
          <button
            className="academyModalCloseButton"
            type="button"
            onClick={onClose}
            aria-label="Close project details"
          >
            {"×"}
          </button>
        </div>

        <div className="projectDetailBody">
          <div className="projectDetailSummary">
            <ProgressRing
              percent={percent}
              size={88}
              strokeWidth={7}
              label={`Progress: ${percent === null ? "open-ended" : `${percent}%`}`}
            />
            <div className="projectDetailStats">
              <div>
                <strong>{getProjectProgressLabel(project)}</strong>
                <small>{PROGRESS_METHOD_LABELS[project.progressMethod]}</small>
              </div>
              <div>
                <strong>{project.sessionCount}</strong>
                <small>Sessions</small>
              </div>
              <div>
                <strong>{formatFocusedDuration(project.focusedSeconds)}</strong>
                <small>Focused Time</small>
              </div>
              <div>
                <strong>{formatRelativeTime(project.lastWorkedAt)}</strong>
                <small>Last Activity</small>
              </div>
            </div>
          </div>

          {project.description && (
            <p className="projectDetailDescription">{project.description}</p>
          )}

          <ProjectNotesEditor
            notes={project.notes}
            onSave={(notes) => onSaveNotes(project.id, notes)}
          />

          <div className="projectDetailSessions">
            <h3>Recent sessions</h3>
            {recentSessions.length === 0 ? (
              <p className="academyEmptyState">No sessions logged yet.</p>
            ) : (
              <ul>
                {recentSessions.map((session) => (
                  <li key={session.id}>
                    <span className="projectDetailSessionDate">
                      {formatRelativeTime(session.endedAt)}
                    </span>
                    <span>{formatFocusedDuration(session.focusedSeconds)}</span>
                    <span>+{session.xpAwarded} XP</span>
                    <span className="projectDetailSessionCharacter">
                      {getCharacterName(session.characterId, characterLibrary)}
                    </span>
                    {session.note && (
                      <p className="projectDetailSessionNote">{session.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="projectDetailActions">
          <button className="detailsButton" type="button" onClick={() => onEdit(project.id)}>
            Edit
          </button>

          {isActive ? (
            <>
              <button
                className="primaryButton"
                type="button"
                disabled={!canFocus}
                onClick={() => onFocus(project.id)}
              >
                Focus
              </button>
              <button className="detailsButton" type="button" onClick={() => onShelve(project.id)}>
                Shelve
              </button>
              <button
                className="detailsButton"
                type="button"
                onClick={() => onComplete(project.id)}
              >
                Mark Complete
              </button>
              <button className="detailsButton" type="button" onClick={() => onRetire(project.id)}>
                Retire
              </button>
            </>
          ) : (
            <button
              className="primaryButton"
              type="button"
              disabled={!slotAvailable}
              title={!slotAvailable ? "All five active slots are full." : ""}
              onClick={() => onRestore(project.id)}
            >
              {project.status === "completed" ? "Reopen" : "Restore to Active"}
            </button>
          )}

          <button className="deleteButton" type="button" onClick={() => onDelete(project.id)}>
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}

export default ProjectDetailPanel;
