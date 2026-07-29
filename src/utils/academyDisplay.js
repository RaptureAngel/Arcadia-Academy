import {
  calculateStudyProjectProgressPercentage,
  isFiniteProgressStudyProject,
} from "./studyProjects";

export const PROJECT_TYPE_ACTIVITY_VERBS = {
  reading: "Reading",
  study: "Studying",
  writing: "Writing",
  creative: "Creating",
  practical: "Practising",
  custom: "Working on",
};

export function getActivityVerb(projectType) {
  return PROJECT_TYPE_ACTIVITY_VERBS[projectType] || "Working on";
}

const PROJECT_BEGIN_ACTION_LABELS = {
  reading: "Begin Reading",
  study: "Begin Study",
  writing: "Begin Writing",
  creative: "Begin Creating",
  practical: "Begin Practice",
};

const PROJECT_CONTINUE_ACTION_LABELS = {
  reading: "Continue Reading",
  study: "Continue Study",
  writing: "Continue Writing",
  creative: "Continue Creating",
  practical: "Continue Practice",
};

export function getProjectActionLabel(project) {
  const hasStarted = project.sessionCount > 0;
  const labels = hasStarted
    ? PROJECT_CONTINUE_ACTION_LABELS
    : PROJECT_BEGIN_ACTION_LABELS;

  return (
    labels[project.projectType] ||
    (hasStarted ? "Continue Session" : "Start Session")
  );
}

export function getSubjectDisplay(subjectId, subjects) {
  const subject = Array.isArray(subjects)
    ? subjects.find((item) => item.id === subjectId)
    : null;

  if (!subject) {
    return { name: "No subject", color: "", icon: "" };
  }

  return { name: subject.name, color: subject.color, icon: subject.icon };
}

export function getProjectProgressLabel(project) {
  const { progressMethod, progressCurrent, progressTarget, sessionCount } = project;
  const hasTarget = isFiniteProgressStudyProject(project);

  if (progressMethod === "pages") {
    return `Page ${progressCurrent} of ${progressTarget}`;
  }

  if (progressMethod === "chapters") {
    return `Chapter ${progressCurrent} of ${progressTarget}`;
  }

  if (progressMethod === "sessions") {
    return hasTarget
      ? `${progressCurrent} of ${progressTarget} sessions`
      : `${sessionCount} session${sessionCount === 1 ? "" : "s"} logged`;
  }

  if (progressMethod === "outputs") {
    const unit =
      progressCurrent === 1
        ? project.outputUnitSingular || "output"
        : project.outputUnitPlural || "outputs";

    return hasTarget
      ? `${progressCurrent} of ${progressTarget} ${unit}`
      : `${progressCurrent} ${unit} so far`;
  }

  return `${sessionCount} session${sessionCount === 1 ? "" : "s"} logged`;
}

export function getProjectProgressPercent(project) {
  return calculateStudyProjectProgressPercentage(project);
}
