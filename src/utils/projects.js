import { getTodayKey } from "./dates";

export function createProjectFromTemplate({ template, name, deadline, priority }) {
  return {
    id: crypto.randomUUID(),
    name,
    templateId: template.id,
    templateName: template.name,
    client: template.client,
    deadline: deadline || null,
    priority: Boolean(priority),
    currentStepIndex: 0,
    steps: template.steps.map((step, index) => ({
      id: crypto.randomUUID(),
      title: step.title,
      taskType: step.taskType,
      xp: step.xp,
      stepNumber: index + 1,
      completed: false,
      completedBy: null,
      completedDate: null,
      archivedDate: null,
    })),
    createdDate: getTodayKey(),
    completedDate: null,
    cancelled: false,
    cancelledDate: null,
  };
}

export function getActiveProjectStepTask(project) {
  if (project.cancelled || project.completedDate) return null;

  const currentStep = project.steps[project.currentStepIndex];

  if (!currentStep) return null;

  return {
    id: `project-${project.id}-step-${project.currentStepIndex}`,
    title: currentStep.title,
    client: project.client,
    taskType: currentStep.taskType,
    xp: currentStep.xp,
    completed: false,
    completedBy: null,
    createdDate: project.createdDate,
    completedDate: null,
    projectId: project.id,
    projectName: project.name,
    projectTemplateName: project.templateName,
    deadline: project.deadline,
    projectStepNumber: project.currentStepIndex + 1,
    projectStepTotal: project.steps.length,
    priority: project.priority,
    isProjectStep: true,
  };
}

export function getCompletedProjectStepTasksForDate(projects, date) {
  return projects.flatMap((project) =>
    project.steps
      .filter(
        (step) =>
          step.completed &&
          step.completedDate === date &&
          !step.archivedDate
      )
      .map((step) => ({
        id: `history-${project.id}-${step.id}`,
        title: step.title,
        client: project.client,
        taskType: step.taskType,
        xp: step.xp,
        completed: true,
        completedBy: step.completedBy,
        createdDate: project.createdDate,
        completedDate: step.completedDate,
        projectId: project.id,
        projectName: project.name,
        projectTemplateName: project.templateName,
        deadline: project.deadline,
        projectStepNumber: step.stepNumber,
        projectStepTotal: project.steps.length,
        priority: project.priority,
        isProjectStep: true,
        isProjectStepHistory: true,
      }))
  );
}

export function getCompletedProjectPackSummariesForDate(projects, date) {
  return projects
    .filter(
      (project) =>
        !project.cancelled &&
        project.completedDate === date &&
        project.steps.every((step) => step.completed)
    )
    .map((project) => {
      const completedStepsToday = project.steps.filter(
        (step) =>
          step.completed &&
          step.completedDate === date &&
          !step.archivedDate
      );

      if (completedStepsToday.length === 0) return null;

      const todayXp = completedStepsToday.reduce(
        (total, step) => total + step.xp,
        0
      );
      const totalXp = project.steps.reduce((total, step) => total + step.xp, 0);
      const lastCompletedStep = [...project.steps]
        .reverse()
        .find((step) => step.completedBy);

      return {
        id: `completed-project-${project.id}`,
        title: `${project.name} complete`,
        client: project.client,
        taskType: "Project Pack",
        xp: todayXp,
        completed: true,
        completedBy: lastCompletedStep?.completedBy || null,
        createdDate: project.createdDate,
        completedDate: project.completedDate,
        projectId: project.id,
        projectName: project.name,
        projectTemplateName: project.templateName,
        deadline: project.deadline,
        priority: project.priority,
        isProjectPackSummary: true,
        completedStepCount: project.steps.length,
        totalSteps: project.steps.length,
        totalProjectXp: totalXp,
        todayProjectXp: todayXp,
      };
    })
    .filter(Boolean);
}

export function archiveCompletedProjectStepsForDate(projects, date) {
  return projects.map((project) => ({
    ...project,
    steps: project.steps.map((step) =>
      step.completed && step.completedDate === date && !step.archivedDate
        ? { ...step, archivedDate: date }
        : step
    ),
  }));
}
