import { clients } from "../data/clients";
import { projectTemplates } from "../data/projectTemplates";
import { taskTypes } from "../data/taskTypes";
import { getTaskXpRule } from "./xp";

const DEFAULT_TASK_TYPE = taskTypes[0];
const TEMPLATE_LIBRARY_VERSION = 1;

export function getTemplateStepXp(taskType, fallbackXp) {
  const fallbackValue = Number(fallbackXp);

  if (Number.isFinite(fallbackValue) && fallbackValue > 0) {
    return fallbackValue;
  }

  return getTaskXpRule(taskType || DEFAULT_TASK_TYPE).maxXp;
}

export function normalizeTemplateStep(step, index, { deriveXp = false } = {}) {
  const taskType = step.taskType || DEFAULT_TASK_TYPE;

  return {
    id: step.id || `step-${index + 1}`,
    title: step.title || "",
    taskType,
    xp: deriveXp
      ? getTaskXpRule(taskType).maxXp
      : getTemplateStepXp(taskType, step.xp),
  };
}

export function normalizeTemplate(
  template,
  { source = "user", deriveStepXp = false } = {}
) {
  const now = new Date().toISOString();

  return {
    id: template.id || `${source}-${crypto.randomUUID()}`,
    name: template.name || "Untitled Template",
    client: template.client || clients[0],
    description: template.description || "",
    source: template.source || source,
    createdAt: template.createdAt || now,
    updatedAt: template.updatedAt || template.createdAt || now,
    steps: Array.isArray(template.steps)
      ? template.steps.map((step, index) =>
          normalizeTemplateStep(step, index, { deriveXp: deriveStepXp })
        )
      : [],
  };
}

export function createSeededTemplateLibrary() {
  return projectTemplates.map((template) =>
    normalizeTemplate(
      {
        ...template,
        steps: template.steps.map((step, index) => ({
          ...step,
          id: step.id || `${template.id}-step-${index + 1}`,
        })),
      },
      { source: "starter", deriveStepXp: false }
    )
  );
}

export function createTemplateLibraryRecord(templates) {
  return {
    version: TEMPLATE_LIBRARY_VERSION,
    templates,
  };
}

export function mergeTemplateLibrary(starterTemplates, savedTemplates) {
  const templatesById = new Map();

  [...starterTemplates, ...savedTemplates].forEach((template) => {
    if (!templatesById.has(template.id)) {
      templatesById.set(template.id, template);
    }
  });

  return Array.from(templatesById.values());
}

export function createBlankCustomTemplateStep() {
  return {
    id: crypto.randomUUID(),
    title: "",
    taskType: DEFAULT_TASK_TYPE,
  };
}

export function createBlankCustomTemplateDraft(defaultClient = clients[0]) {
  return {
    name: "",
    client: defaultClient || "",
    description: "",
    steps: [createBlankCustomTemplateStep()],
  };
}

export function getCustomTemplateStepXp(taskType) {
  return getTaskXpRule(taskType || DEFAULT_TASK_TYPE).maxXp;
}
