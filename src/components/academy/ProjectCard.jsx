import { useEffect, useRef, useState } from "react";
import {
  getProjectActionLabel,
  getProjectCardMetrics,
  getSubjectAccentColor,
  getSubjectButtonColor,
  getSubjectDisplay,
} from "../../utils/academyDisplay";
import { PROJECT_TYPE_LABELS } from "../../utils/studyProjects";
import ProgressRing from "./ProgressRing";

const ESTIMATED_MENU_HEIGHT = 210;

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
  const [menuPlacement, setMenuPlacement] = useState("down");
  const menuRef = useRef(null);
  const subject = getSubjectDisplay(project.subjectId, subjects);
  const metrics = getProjectCardMetrics(project);

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

  function toggleMenu(event) {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;

    setMenuPlacement(
      spaceBelow < ESTIMATED_MENU_HEIGHT && buttonRect.top > ESTIMATED_MENU_HEIGHT
        ? "up"
        : "down"
    );
    setMenuOpen(true);
  }

  function runAction(action) {
    setMenuOpen(false);
    action(project.id);
  }

  return (
    <article
      className="projectCard"
      style={{
        "--subject-color": getSubjectAccentColor(subject),
        "--subject-button-color": getSubjectButtonColor(subject),
      }}
    >
      <div className="projectCardTop">
        <span className="projectCardSubjectGroup">
          <span className="projectCardSubjectDot" aria-hidden="true" />
          <span className="projectCardSubject">
            {subject.icon ? `${subject.icon} ` : ""}
            {subject.name}
          </span>
          <span className="projectCardType">· {PROJECT_TYPE_LABELS[project.projectType]}</span>
        </span>

        <div className="projectCardMenu" ref={menuRef}>
          <button
            className="projectCardMenuButton"
            type="button"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-label={`More actions for ${project.title}`}
            onClick={toggleMenu}
          >
            {"⋮"}
          </button>

          {menuOpen && (
            <div
              className={`projectCardMenuList projectCardMenuList--${menuPlacement}`}
              role="menu"
            >
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

      <button
        className="projectCardBody"
        type="button"
        onClick={() => onOpenDetail(project.id)}
        aria-label={`View details for ${project.title}`}
      >
        <h3 className="projectCardTitle">{project.title}</h3>

        <div className="projectCardProgressRow">
          {metrics.ringMode === "percent" ? (
            <ProgressRing
              percent={metrics.percent}
              size={128}
              strokeWidth={6}
              label={metrics.ringLabel}
            />
          ) : (
            <ProgressRing
              percent={null}
              centerValue={metrics.count}
              centerLabel={metrics.countLabel}
              size={128}
              strokeWidth={6}
              label={metrics.ringLabel}
            />
          )}

          <div className="projectCardStats">
            {metrics.lines.map((line, index) => (
              <span
                key={index}
                className={
                  index === 0 ? "projectCardStatsPrimary" : "projectCardStatsSecondary"
                }
              >
                {line}
              </span>
            ))}
          </div>
        </div>
      </button>

      <div className="projectCardActions">
        <button
          className="projectCardFocusButton"
          type="button"
          disabled={!canFocus}
          title={!canFocus ? focusDisabledReason : ""}
          onClick={() => onFocus(project.id)}
        >
          {getProjectActionLabel(project)}
        </button>
      </div>
    </article>
  );
}

export default ProjectCard;
