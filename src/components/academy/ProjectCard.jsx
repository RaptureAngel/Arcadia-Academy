import { useEffect, useRef, useState } from "react";
import { formatFocusedDuration, formatRelativeTime } from "../../utils/dates";
import {
  getProjectActionLabel,
  getProjectProgressLabel,
  getProjectProgressPercent,
  getSubjectDisplay,
} from "../../utils/academyDisplay";
import { PROJECT_TYPE_LABELS } from "../../utils/studyProjects";
import ProgressRing from "./ProgressRing";

function ProjectCard({
  project,
  subjects,
  canFocus,
  focusDisabledReason,
  onFocus,
  onOpenDetail,
  onShelve,
  onComplete,
  onRetire,
  onEdit,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const subject = getSubjectDisplay(project.subjectId, subjects);
  const percent = getProjectProgressPercent(project);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function runAction(action) {
    setMenuOpen(false);
    action(project.id);
  }

  return (
    <article
      className="projectCard"
      style={{ "--subject-color": subject.color || "#5f7d64" }}
    >
      <button
        className="projectCardBody"
        type="button"
        onClick={() => onOpenDetail(project.id)}
        aria-label={`View details for ${project.title}`}
      >
        <div className="projectCardTop">
          <span className="projectCardSubject">
            {subject.icon ? `${subject.icon} ` : ""}
            {subject.name}
          </span>
          <span className="projectCardType">{PROJECT_TYPE_LABELS[project.projectType]}</span>
        </div>

        <h3 className="projectCardTitle">{project.title}</h3>

        <div className="projectCardProgressRow">
          <ProgressRing
            percent={percent}
            size={54}
            strokeWidth={5}
            label={`${project.title} progress: ${
              percent === null ? "open-ended" : `${percent}%`
            }`}
          />
          <div className="projectCardStats">
            <span>{getProjectProgressLabel(project)}</span>
            <span>
              {project.sessionCount} session{project.sessionCount === 1 ? "" : "s"} ·{" "}
              {formatFocusedDuration(project.focusedSeconds)}
            </span>
            <span className="projectCardLastActivity">
              {formatRelativeTime(project.lastWorkedAt)}
            </span>
          </div>
        </div>
      </button>

      <div className="projectCardActions">
        <button
          className="primaryButton projectCardFocusButton"
          type="button"
          disabled={!canFocus}
          title={!canFocus ? focusDisabledReason : ""}
          onClick={() => onFocus(project.id)}
        >
          {getProjectActionLabel(project)}
        </button>

        <div className="projectCardMenu" ref={menuRef}>
          <button
            className="projectCardMenuButton"
            type="button"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label={`More actions for ${project.title}`}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {"⋮"}
          </button>

          {menuOpen && (
            <div className="projectCardMenuList" role="menu">
              <button type="button" role="menuitem" onClick={() => runAction(onEdit)}>
                Edit
              </button>
              <button type="button" role="menuitem" onClick={() => runAction(onShelve)}>
                Shelve
              </button>
              <button type="button" role="menuitem" onClick={() => runAction(onComplete)}>
                Mark Complete
              </button>
              <button type="button" role="menuitem" onClick={() => runAction(onRetire)}>
                Retire
              </button>
              <button
                type="button"
                role="menuitem"
                className="projectCardMenuDelete"
                onClick={() => runAction(onDelete)}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default ProjectCard;
