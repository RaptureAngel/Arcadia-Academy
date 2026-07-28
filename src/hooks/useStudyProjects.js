import { useMemo } from "react";
import {
  MAX_ACTIVE_STUDY_PROJECTS,
  canCreateActiveStudyProject,
  changeStudyProjectStatus,
  countActiveStudyProjects,
  createStudyProject,
  updateStudyProjectNotes,
  validateStudyProject,
} from "../utils/studyProjects";

export function useStudyProjects({ studyProjects, setStudyProjects }) {
  const activeProjects = useMemo(
    () => studyProjects.filter((project) => project.status === "active"),
    [studyProjects]
  );
  const shelvedProjects = useMemo(
    () => studyProjects.filter((project) => project.status === "shelved"),
    [studyProjects]
  );
  const completedProjects = useMemo(
    () => studyProjects.filter((project) => project.status === "completed"),
    [studyProjects]
  );
  const retiredProjects = useMemo(
    () => studyProjects.filter((project) => project.status === "retired"),
    [studyProjects]
  );
  const activeSlotCount = activeProjects.length;
  const canCreateActive = canCreateActiveStudyProject(studyProjects);

  function getProjectById(projectId) {
    return studyProjects.find((project) => project.id === projectId) || null;
  }

  function createProject(input) {
    if (!canCreateActiveStudyProject(studyProjects)) {
      return {
        ok: false,
        error: `All ${MAX_ACTIVE_STUDY_PROJECTS} active study slots are full. Shelve, complete, or retire a project first.`,
      };
    }

    let project = createStudyProject(input);

    const initialProgress = Number(input?.progressCurrent);

    if (Number.isFinite(initialProgress) && initialProgress > 0) {
      const clampedProgress =
        typeof project.progressTarget === "number"
          ? Math.min(initialProgress, project.progressTarget)
          : initialProgress;

      project = { ...project, progressCurrent: clampedProgress };
    }

    const { valid, errors } = validateStudyProject(project);

    if (!valid) {
      return { ok: false, error: errors.join(" ") };
    }

    setStudyProjects((currentProjects) => [...currentProjects, project]);

    return { ok: true, project };
  }

  function updateProject(projectId, patch) {
    const existing = getProjectById(projectId);

    if (!existing) {
      return { ok: false, error: "Project not found." };
    }

    const timestamp = new Date().toISOString();
    const candidate = { ...existing, ...patch, updatedAt: timestamp };
    const { valid, errors } = validateStudyProject(candidate);

    if (!valid) {
      return { ok: false, error: errors.join(" ") };
    }

    setStudyProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === projectId ? candidate : project
      )
    );

    return { ok: true, project: candidate };
  }

  function updateNotes(projectId, notes) {
    setStudyProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === projectId
          ? updateStudyProjectNotes(project, notes)
          : project
      )
    );
  }

  function changeStatus(projectId, nextStatus) {
    const existing = getProjectById(projectId);

    if (!existing) {
      return { ok: false, error: "Project not found." };
    }

    if (
      nextStatus === "active" &&
      existing.status !== "active" &&
      !canCreateActiveStudyProject(studyProjects)
    ) {
      return {
        ok: false,
        error: `All ${MAX_ACTIVE_STUDY_PROJECTS} active study slots are full. Shelve, complete, or retire a project first.`,
      };
    }

    setStudyProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === projectId
          ? changeStudyProjectStatus(project, nextStatus)
          : project
      )
    );

    return { ok: true };
  }

  function deleteProject(projectId) {
    setStudyProjects((currentProjects) =>
      currentProjects.filter((project) => project.id !== projectId)
    );
  }

  return {
    activeProjects,
    shelvedProjects,
    completedProjects,
    retiredProjects,
    activeSlotCount,
    canCreateActive,
    maxActiveSlots: MAX_ACTIVE_STUDY_PROJECTS,
    getProjectById,
    createProject,
    updateProject,
    updateNotes,
    changeStatus,
    deleteProject,
    countActiveStudyProjects,
  };
}
