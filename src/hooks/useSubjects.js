import { useMemo } from "react";
import {
  createSubject,
  isSubjectArchived,
  sortSubjects,
} from "../utils/subjects";

export function useSubjects({ subjects, setSubjects }) {
  const sortedSubjects = useMemo(() => sortSubjects(subjects), [subjects]);
  const activeSubjects = useMemo(
    () => sortedSubjects.filter((subject) => !isSubjectArchived(subject)),
    [sortedSubjects]
  );
  const archivedSubjects = useMemo(
    () => sortedSubjects.filter((subject) => isSubjectArchived(subject)),
    [sortedSubjects]
  );

  function addSubject({ name, description, color, icon }) {
    const subject = createSubject({ name, description, color, icon });

    setSubjects((currentSubjects) => [...currentSubjects, subject]);

    return subject;
  }

  function editSubject(subjectId, { name, description, color, icon }) {
    const timestamp = new Date().toISOString();

    setSubjects((currentSubjects) =>
      currentSubjects.map((subject) =>
        subject.id === subjectId
          ? {
              ...subject,
              name: String(name ?? subject.name).trim() || subject.name,
              description:
                description !== undefined ? description : subject.description,
              color: color !== undefined ? color : subject.color,
              icon: icon !== undefined ? icon : subject.icon,
              updatedAt: timestamp,
            }
          : subject
      )
    );
  }

  function archiveSubject(subjectId) {
    const timestamp = new Date().toISOString();

    setSubjects((currentSubjects) =>
      currentSubjects.map((subject) =>
        subject.id === subjectId
          ? { ...subject, archivedAt: timestamp, updatedAt: timestamp }
          : subject
      )
    );
  }

  function restoreSubject(subjectId) {
    const timestamp = new Date().toISOString();

    setSubjects((currentSubjects) =>
      currentSubjects.map((subject) =>
        subject.id === subjectId
          ? { ...subject, archivedAt: null, updatedAt: timestamp }
          : subject
      )
    );
  }

  function getSubjectById(subjectId) {
    return subjects.find((subject) => subject.id === subjectId) || null;
  }

  return {
    activeSubjects,
    archivedSubjects,
    addSubject,
    editSubject,
    archiveSubject,
    restoreSubject,
    getSubjectById,
  };
}
