import { useMemo, useState } from "react";
import { formatFocusedDuration, formatRelativeTime } from "../../utils/dates";
import {
  getProjectProgressLabel,
  getSubjectAccentColor,
  getSubjectDisplay,
} from "../../utils/academyDisplay";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
} from "../../utils/studyProjects";

const ARCHIVE_STATUSES = PROJECT_STATUSES.filter((status) => status !== "active");

function ArchiveView({ archivedProjects, subjects, onOpenDetail, onRestore, canRestore }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return archivedProjects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) return false;
      if (subjectFilter !== "all" && (project.subjectId || "none") !== subjectFilter) {
        return false;
      }
      if (typeFilter !== "all" && project.projectType !== typeFilter) return false;
      if (term && !project.title.toLowerCase().includes(term)) return false;

      return true;
    });
  }, [archivedProjects, statusFilter, subjectFilter, typeFilter, searchTerm]);

  return (
    <section className="viewShell academyView archiveView">
      <div className="academyViewHeader">
        <div>
          <p className="panelLabel">Archive</p>
          <h2>Shelved, completed &amp; retired projects</h2>
        </div>
      </div>

      <div className="archiveFilters">
        <label className="academyFormField">
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All</option>
            {ARCHIVE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="academyFormField">
          <span>Subject</span>
          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="none">No subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label className="academyFormField">
          <span>Type</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All</option>
            {PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {PROJECT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="academyFormField archiveSearchField">
          <span>Search title</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search…"
          />
        </label>
      </div>

      {filteredProjects.length === 0 ? (
        <p className="academyEmptyState">No archived projects match these filters.</p>
      ) : (
        <ul className="archiveList">
          {filteredProjects.map((project) => {
            const subject = getSubjectDisplay(project.subjectId, subjects);

            return (
              <li key={project.id} className="archiveListItem">
                <span
                  className="archiveListSubjectDot"
                  style={{ "--subject-color": getSubjectAccentColor(subject) }}
                  aria-hidden="true"
                />
                <div className="archiveListBody">
                  <div className="archiveListHeading">
                    <strong>{project.title}</strong>
                    <span className={`archiveStatusBadge archiveStatusBadge--${project.status}`}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  <p className="archiveListMeta">
                    {subject.name} · {PROJECT_TYPE_LABELS[project.projectType]} ·{" "}
                    {getProjectProgressLabel(project)}
                  </p>
                  <p className="archiveListMeta">
                    {project.sessionCount} session{project.sessionCount === 1 ? "" : "s"} ·{" "}
                    {formatFocusedDuration(project.focusedSeconds)} ·{" "}
                    {formatRelativeTime(project.lastWorkedAt)}
                  </p>
                </div>
                <div className="archiveListActions">
                  <button
                    className="detailsButton"
                    type="button"
                    onClick={() => onOpenDetail(project.id)}
                  >
                    View Details
                  </button>
                  <button
                    className="primaryButton"
                    type="button"
                    disabled={!canRestore}
                    title={!canRestore ? "All five active slots are full." : ""}
                    onClick={() => onRestore(project.id)}
                  >
                    {project.status === "completed" ? "Reopen" : "Restore"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ArchiveView;
