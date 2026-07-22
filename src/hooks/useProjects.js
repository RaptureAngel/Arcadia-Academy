import { useEffect, useMemo, useState } from "react";
import {
  createProjectFromTemplate,
  getActiveProjectStepTask,
  getCompletedProjectPackSummariesForDate,
  getCompletedProjectStepTasksForDate,
} from "../utils/projects";
import {
  createBlankCustomTemplateDraft,
  createBlankCustomTemplateStep,
  getCustomTemplateStepXp,
  normalizeTemplate,
} from "../utils/templates";
import { getTodayKey } from "../utils/dates";
import { taskTypes } from "../data/taskTypes";

const DEFAULT_TASK_TYPE = taskTypes[0];

export function useProjects({
  projects,
  setProjects,
  templateLibrary,
  setTemplateLibrary,
  activeEmployee,
  setCharacterLibrary,
  isWorking,
  clientNames,
  openConfirmDialog,
} = {}) {
  const [focusedProjectId, setFocusedProjectId] = useState(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState([]);
  const [showProjectPackForm, setShowProjectPackForm] = useState(false);
  const [showCustomTemplateForm, setShowCustomTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [customTemplateDraft, setCustomTemplateDraft] = useState(() =>
    createBlankCustomTemplateDraft()
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templateLibrary?.[0]?.id || ""
  );
  const [projectName, setProjectName] = useState("");
  const [projectDeadline, setProjectDeadline] = useState("");
  const [projectPriority, setProjectPriority] = useState(false);

  const activeProjectStepTasks = projects
    .map((project) => getActiveProjectStepTask(project))
    .filter(Boolean);

  const completedProjectStepsToday = getCompletedProjectStepTasksForDate(
    projects,
    getTodayKey()
  );
  const completedProjectPacksToday = getCompletedProjectPackSummariesForDate(
    projects,
    getTodayKey()
  );
  const completedProjectPackIdsToday = new Set(
    completedProjectPacksToday.map((projectPack) => projectPack.projectId)
  );

  const focusedProject = focusedProjectId
    ? projects.find((project) => project.id === focusedProjectId)
    : null;

  const selectedTemplate = templateLibrary?.find(
    (template) => template.id === selectedTemplateId
  );

  const projectSummaries = useMemo(() => {
    return projects
      .filter((project) => !project.cancelled && !project.completedDate)
      .map((project) => {
        const completedSteps = project.steps.filter((step) => step.completed);
        const totalXp = project.steps.reduce((total, step) => total + step.xp, 0);
        const completedXp = completedSteps.reduce(
          (total, step) => total + step.xp,
          0
        );
        const currentStep = project.completedDate
          ? null
          : project.steps[project.currentStepIndex];

        return {
          id: project.id,
          name: project.name,
          client: project.client,
          deadline: project.deadline,
          priority: project.priority,
          totalTasks: project.steps.length,
          completedTasks: completedSteps.length,
          totalXp,
          completedXp,
          completedDate: project.completedDate,
          currentStep,
        };
      })
      .sort((a, b) => {
        if (a.completedDate && !b.completedDate) return 1;
        if (!a.completedDate && b.completedDate) return -1;

        if (Boolean(a.priority) !== Boolean(b.priority)) {
          return a.priority ? -1 : 1;
        }

        if (a.deadline && b.deadline) {
          return a.deadline.localeCompare(b.deadline);
        }

        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;

        return a.name.localeCompare(b.name);
      });
  }, [projects]);

  useEffect(() => {
    if (!focusedProjectId) return;

    const steps = Array.isArray(focusedProject?.steps) ? focusedProject.steps : [];
    const currentStep = steps[focusedProject?.currentStepIndex];

    if (
      !focusedProject ||
      focusedProject.cancelled ||
      focusedProject.completedDate ||
      !currentStep ||
      currentStep.completed
    ) {
      setFocusedProjectId(null);
    }
  }, [focusedProject, focusedProjectId]);

  useEffect(() => {
    if (selectedTemplateId && selectedTemplate) return;

    setSelectedTemplateId(templateLibrary?.[0]?.id || "");
  }, [selectedTemplate, selectedTemplateId, templateLibrary]);

  function completeProjectStep(projectId) {
    if (!activeEmployee || !isWorking) return;

    const project = projects.find((item) => item.id === projectId);

    if (!project || project.cancelled || project.completedDate) return;

    const currentStep = project.steps[project.currentStepIndex];

    if (!currentStep || currentStep.completed) return;

    setProjects((currentProjects) =>
      currentProjects.map((projectItem) => {
        if (projectItem.id !== projectId) return projectItem;

        const updatedSteps = projectItem.steps.map((step, index) =>
          index === projectItem.currentStepIndex
            ? {
                ...step,
                completed: true,
                completedBy: activeEmployee.id,
                completedDate: getTodayKey(),
                archivedDate: null,
              }
            : step
        );

        const nextStepIndex = projectItem.currentStepIndex + 1;
        const isProjectComplete = nextStepIndex >= updatedSteps.length;

        return {
          ...projectItem,
          steps: updatedSteps,
          currentStepIndex: isProjectComplete
            ? projectItem.currentStepIndex
            : nextStepIndex,
          completedDate: isProjectComplete ? getTodayKey() : null,
        };
      })
    );

    setCharacterLibrary((currentEmployees) =>
      currentEmployees.map((employee) =>
        employee.id === activeEmployee.id
          ? { ...employee, xp: employee.xp + currentStep.xp }
          : employee
      )
    );
  }

  function completeFocusedProjectStep() {
    if (!focusedProjectId || !focusedProject) return;

    const steps = Array.isArray(focusedProject.steps) ? focusedProject.steps : [];
    const isFinalStep = focusedProject.currentStepIndex >= steps.length - 1;

    completeProjectStep(focusedProjectId);

    if (isFinalStep) {
      setFocusedProjectId(null);
    }
  }

  function cancelProject(projectId) {
    const project = projects.find((item) => item.id === projectId);

    if (!project) return;

    openConfirmDialog({
      title: "Cancel Project",
      message: `Cancel "${project.name}"? Completed step XP from this project will be removed.`,
      confirmLabel: "Cancel Project",
      isDangerous: true,
      onConfirm: () => {
        const completedSteps = project.steps.filter(
          (step) => step.completed && step.completedBy
        );

        setCharacterLibrary((currentEmployees) =>
          currentEmployees.map((employee) => {
            const xpToRemove = completedSteps
              .filter((step) => step.completedBy === employee.id)
              .reduce((total, step) => total + step.xp, 0);

            if (xpToRemove === 0) return employee;

            return {
              ...employee,
              xp: Math.max(0, employee.xp - xpToRemove),
            };
          })
        );

        setProjects((currentProjects) =>
          currentProjects.filter((projectItem) => projectItem.id !== projectId)
        );

        if (focusedProjectId === projectId) {
          setFocusedProjectId(null);
        }
      },
    });
  }

  function createProjectPack(event) {
    event.preventDefault();

    if (!isWorking) return;
    if (!selectedTemplate || !projectName.trim()) return;

    const newProject = createProjectFromTemplate({
      template: selectedTemplate,
      name: projectName.trim(),
      deadline: projectDeadline,
      priority: projectPriority,
    });

    setProjects((currentProjects) => [newProject, ...currentProjects]);
    setProjectName("");
    setProjectDeadline("");
    setProjectPriority(false);
    setShowProjectPackForm(false);
  }

  function toggleProjectDetails(projectId) {
    setExpandedProjectIds((currentProjectIds) =>
      currentProjectIds.includes(projectId)
        ? currentProjectIds.filter((id) => id !== projectId)
        : [...currentProjectIds, projectId]
    );
  }

  function openProjectFocus(projectId) {
    setFocusedProjectId(projectId);
  }

  function closeProjectFocus() {
    setFocusedProjectId(null);
  }

  function updateCustomTemplateDraft(field, value) {
    setCustomTemplateDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  function updateCustomTemplateStep(stepId, field, value) {
    setCustomTemplateDraft((currentDraft) => ({
      ...currentDraft,
      steps: currentDraft.steps.map((step) =>
        step.id === stepId ? { ...step, [field]: value } : step
      ),
    }));
  }

  function addCustomTemplateStep() {
    setCustomTemplateDraft((currentDraft) => ({
      ...currentDraft,
      steps: [...currentDraft.steps, createBlankCustomTemplateStep()],
    }));
  }

  function removeCustomTemplateStep(stepId) {
    setCustomTemplateDraft((currentDraft) => {
      if (currentDraft.steps.length === 1) return currentDraft;

      return {
        ...currentDraft,
        steps: currentDraft.steps.filter((step) => step.id !== stepId),
      };
    });
  }

  function resetCustomTemplateDraft() {
    setCustomTemplateDraft(createBlankCustomTemplateDraft(clientNames?.[0] || ""));
  }

  function createTemplateDraftFromTemplate(template) {
    return {
      name: template.name || "",
      client: template.client || clientNames?.[0] || "",
      description: template.description || "",
      steps:
        Array.isArray(template.steps) && template.steps.length > 0
          ? template.steps.map((step) => ({
              id: step.id || crypto.randomUUID(),
              title: step.title || "",
              taskType: step.taskType || DEFAULT_TASK_TYPE,
            }))
          : [createBlankCustomTemplateStep()],
    };
  }

  function openProjectPackForm() {
    const willShow = !showProjectPackForm;

    setShowProjectPackForm(willShow);

    if (willShow) {
      resetCustomTemplateDraft();
      setEditingTemplateId(null);
      setShowCustomTemplateForm(false);
    }
  }

  function openNewTemplateForm() {
    resetCustomTemplateDraft();
    setEditingTemplateId(null);
    setShowProjectPackForm(false);
    setShowCustomTemplateForm(true);
  }

  function openEditTemplateForm(templateId) {
    const template = templateLibrary?.find((item) => item.id === templateId);

    if (!template) return;

    setCustomTemplateDraft(createTemplateDraftFromTemplate(template));
    setEditingTemplateId(template.id);
    setShowProjectPackForm(false);
    setShowCustomTemplateForm(true);
  }

  function cancelCustomTemplateForm() {
    resetCustomTemplateDraft();
    setEditingTemplateId(null);
    setShowCustomTemplateForm(false);
  }

  function saveCustomProjectTemplate(event) {
    event.preventDefault();

    const name = customTemplateDraft.name.trim();
    const client = customTemplateDraft.client.trim();
    const description = customTemplateDraft.description.trim();
    const steps = customTemplateDraft.steps.map((step) => {
      const title = step.title.trim();
      const stepTaskType = step.taskType || DEFAULT_TASK_TYPE;

      return {
        id: step.id || crypto.randomUUID(),
        title,
        taskType: stepTaskType,
        xp: getCustomTemplateStepXp(stepTaskType),
      };
    });

    if (!name) {
      window.alert("Template name is required.");
      return;
    }

    if (!client) {
      window.alert("Client is required.");
      return;
    }

    if (steps.length === 0) {
      window.alert("Add at least one template step.");
      return;
    }

    if (steps.some((step) => !step.title)) {
      window.alert("Every template step needs a title.");
      return;
    }

    const existingTemplate = editingTemplateId
      ? templateLibrary?.find((template) => template.id === editingTemplateId)
      : null;
    const savedAt = new Date().toISOString();
    const templateToSave = {
      id: existingTemplate?.id || `template-${crypto.randomUUID()}`,
      name,
      client,
      description,
      source: existingTemplate?.source || "user",
      createdAt: existingTemplate?.createdAt || savedAt,
      updatedAt: savedAt,
      steps,
    };

    setTemplateLibrary((currentTemplates) =>
      existingTemplate
        ? currentTemplates.map((template) =>
            template.id === existingTemplate.id ? templateToSave : template
          )
        : [templateToSave, ...currentTemplates]
    );
    setSelectedTemplateId(templateToSave.id);
    setEditingTemplateId(null);
    resetCustomTemplateDraft();
    setShowCustomTemplateForm(false);
  }

  function deleteCustomProjectTemplate(templateId) {
    const template = templateLibrary?.find((item) => item.id === templateId);

    if (!template) return;

    openConfirmDialog({
      title: "Delete Template",
      message: `Delete template "${template.name}"? Existing projects will not be affected.`,
      confirmLabel: "Delete",
      isDangerous: true,
      onConfirm: () => {
        const nextTemplates = (templateLibrary || []).filter(
          (item) => item.id !== templateId
        );

        setTemplateLibrary(nextTemplates);

        if (selectedTemplateId === templateId) {
          setSelectedTemplateId(nextTemplates[0]?.id || "");
        }

        if (editingTemplateId === templateId) {
          cancelCustomTemplateForm();
        }
      },
    });
  }

  return {
    focusedProjectId,
    setFocusedProjectId,
    expandedProjectIds,
    setExpandedProjectIds,
    showProjectPackForm,
    setShowProjectPackForm,
    showCustomTemplateForm,
    setShowCustomTemplateForm,
    editingTemplateId,
    setEditingTemplateId,
    customTemplateDraft,
    setCustomTemplateDraft,
    selectedTemplateId,
    setSelectedTemplateId,
    projectName,
    setProjectName,
    projectDeadline,
    setProjectDeadline,
    projectPriority,
    setProjectPriority,
    activeProjectStepTasks,
    completedProjectStepsToday,
    completedProjectPacksToday,
    completedProjectPackIdsToday,
    focusedProject,
    selectedTemplate,
    projectSummaries,
    completeProjectStep,
    completeFocusedProjectStep,
    cancelProject,
    createProjectPack,
    toggleProjectDetails,
    openProjectFocus,
    closeProjectFocus,
    updateCustomTemplateDraft,
    updateCustomTemplateStep,
    addCustomTemplateStep,
    removeCustomTemplateStep,
    resetCustomTemplateDraft,
    createTemplateDraftFromTemplate,
    openProjectPackForm,
    openNewTemplateForm,
    openEditTemplateForm,
    cancelCustomTemplateForm,
    saveCustomProjectTemplate,
    deleteCustomProjectTemplate,
  };
}
