function getProjectCountsForSubject(subjectId, studyProjects) {
  const subjectProjects = studyProjects.filter(
    (project) => project.subjectId === subjectId
  );

  return {
    total: subjectProjects.length,
    active: subjectProjects.filter((project) => project.status === "active").length,
  };
}

function SubjectRow({ subject, studyProjects, onEdit, onArchive, onRestore }) {
  const counts = getProjectCountsForSubject(subject.id, studyProjects);
  const isArchived = Boolean(subject.archivedAt);

  return (
    <li className="subjectRow">
      <span
        className="subjectSwatch"
        style={{ "--subject-color": subject.color || "#5f7d64" }}
        aria-hidden="true"
      >
        {subject.icon || subject.name.slice(0, 1).toUpperCase()}
      </span>

      <div className="subjectRowBody">
        <div className="subjectRowHeading">
          <strong>{subject.name}</strong>
          <span className="subjectRowCounts">
            {counts.active} active · {counts.total} total
          </span>
        </div>
        {subject.description && <p className="subjectRowDescription">{subject.description}</p>}
      </div>

      <div className="subjectRowActions">
        <button className="detailsButton" type="button" onClick={() => onEdit(subject)}>
          Edit
        </button>
        {isArchived ? (
          <button
            className="detailsButton"
            type="button"
            onClick={() => onRestore(subject.id)}
          >
            Restore
          </button>
        ) : (
          <button
            className="detailsButton"
            type="button"
            onClick={() => onArchive(subject.id)}
          >
            Archive
          </button>
        )}
      </div>
    </li>
  );
}

function SubjectsView({
  activeSubjects,
  archivedSubjects,
  studyProjects,
  onAddSubject,
  onEditSubject,
  onArchiveSubject,
  onRestoreSubject,
}) {
  return (
    <section className="viewShell academyView subjectsView">
      <div className="academyViewHeader">
        <div>
          <p className="panelLabel">Subjects</p>
          <h2>Your subjects</h2>
        </div>
        <button className="primaryButton" type="button" onClick={onAddSubject}>
          + New Subject
        </button>
      </div>

      <section className="subjectSection">
        <h3>Active ({activeSubjects.length})</h3>
        {activeSubjects.length === 0 ? (
          <p className="academyEmptyState">
            No subjects yet. Create one to start organising your projects.
          </p>
        ) : (
          <ul className="subjectList">
            {activeSubjects.map((subject) => (
              <SubjectRow
                key={subject.id}
                subject={subject}
                studyProjects={studyProjects}
                onEdit={onEditSubject}
                onArchive={onArchiveSubject}
                onRestore={onRestoreSubject}
              />
            ))}
          </ul>
        )}
      </section>

      {archivedSubjects.length > 0 && (
        <section className="subjectSection">
          <h3>Archived ({archivedSubjects.length})</h3>
          <ul className="subjectList">
            {archivedSubjects.map((subject) => (
              <SubjectRow
                key={subject.id}
                subject={subject}
                studyProjects={studyProjects}
                onEdit={onEditSubject}
                onArchive={onArchiveSubject}
                onRestore={onRestoreSubject}
              />
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

export default SubjectsView;
