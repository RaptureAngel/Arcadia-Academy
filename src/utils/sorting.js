import { isDeadlineOverdue, isDeadlineSoon } from "./dates";

export function sortRegularTasks(taskList) {
  return [...taskList].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    const aOverdue = isDeadlineOverdue(a.deadline);
    const bOverdue = isDeadlineOverdue(b.deadline);

    if (aOverdue !== bOverdue) {
      return aOverdue ? -1 : 1;
    }

    if (Boolean(a.priority) !== Boolean(b.priority)) {
      return a.priority ? -1 : 1;
    }

    const aDueSoon = isDeadlineSoon(a.deadline);
    const bDueSoon = isDeadlineSoon(b.deadline);

    if (aDueSoon !== bDueSoon) {
      return aDueSoon ? -1 : 1;
    }

    if (a.deadline && b.deadline) {
      return a.deadline.localeCompare(b.deadline);
    }

    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;

    return 0;
  });
}

export function sortProjectTasks(taskList) {
  return [...taskList].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    const aOverdue = isDeadlineOverdue(a.deadline);
    const bOverdue = isDeadlineOverdue(b.deadline);

    if (aOverdue !== bOverdue) {
      return aOverdue ? -1 : 1;
    }

    const aDueSoon = isDeadlineSoon(a.deadline);
    const bDueSoon = isDeadlineSoon(b.deadline);

    if (aDueSoon !== bDueSoon) {
      return aDueSoon ? -1 : 1;
    }

    if (a.deadline && b.deadline && a.deadline !== b.deadline) {
      return a.deadline.localeCompare(b.deadline);
    }

    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;

    if (a.projectName && b.projectName && a.projectName !== b.projectName) {
      return a.projectName.localeCompare(b.projectName);
    }

    return (a.projectStepNumber || 0) - (b.projectStepNumber || 0);
  });
}
