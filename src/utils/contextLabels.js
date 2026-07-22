import { getStatusLabel } from "./workday";

const OFFICE_LABELS = {
  appTitle: "Arcadia Desk",
  appSubtitle: "Internal Productivity System",
  activeEmployee: "Active Employee",
  workdayStart: "Punch In",
  lunch: "Lunch",
  lunchStart: "Lunch",
  lunchReturn: "Return",
  workdayEnd: "Punch Out",
  tasks: "Tasks",
  projects: "Projects",
  workLog: "Work Log",
  deepWork: "Deep Work",
  projectFocus: "Project Focus",
  currentWork: "Current Work",
  projectPacks: "Project Packs",
  activeWork: "Active Work",
  completedToday: "Completed Today",
  insightWeeklyXp: "Weekly XP",
  insightFinishedWork: "Finished Work",
  insightTopClient: "Top Client",
  insightTopTaskType: "Top Task Type",
  insightBestDay: "Best Day",
  insightOpenItems: "Open Items",
  insightTrackedTime: "Tracked Time",
  insightClientAttention: "Client Attention",
  insightClientAttentionEmpty: "No client activity yet",
  workdayDetailStart: "Punched in",
  workdayDetailLunchStart: "Lunch started",
  workdayDetailEnd: "",
};

const CLASS_LABELS = {
  appTitle: "Arcadia Academy",
  appSubtitle: "Academy Progress System",
  activeEmployee: "Active Student",
  workdayStart: "Start Class",
  lunch: "Recess",
  lunchStart: "Recess",
  lunchReturn: "Return to Class",
  workdayEnd: "Last Bell",
  tasks: "Assignments",
  projects: "Projects",
  workLog: "Report Card",
  deepWork: "Study Hall",
  projectFocus: "Project Study",
  currentWork: "Current Assignments",
  projectPacks: "Projects",
  activeWork: "Active Assignments",
  completedToday: "Completed Today",
  insightWeeklyXp: "Weekly XP",
  insightFinishedWork: "Finished Assignments",
  insightTopClient: "Top Subject",
  insightTopTaskType: "Top Assignment Type",
  insightBestDay: "Best Day",
  insightOpenItems: "Current Assignments",
  insightTrackedTime: "Tracked Time",
  insightClientAttention: "Subject Attention",
  insightClientAttentionEmpty: "No subject activity yet",
  workdayDetailStart: "First bell",
  workdayDetailLunchStart: "Recess started",
  workdayDetailEnd: "Dismissed",
};

const LABELS_BY_CONTEXT = {
  office: OFFICE_LABELS,
  class: CLASS_LABELS,
};

const CLASS_STATUS_LABELS = {
  notPunchedIn: "Absent",
  working: "Attending",
  onLunch: "Recess",
  punchedOut: "Dismissed",
};

export function getCharacterContext(characterOrContext) {
  const context =
    typeof characterOrContext === "string"
      ? characterOrContext
      : characterOrContext?.context;

  return context === "class" ? "class" : "office";
}

export function getContextLabels(characterOrContext) {
  return LABELS_BY_CONTEXT[getCharacterContext(characterOrContext)];
}

export function getContextStatusLabel(status, characterOrContext) {
  if (getCharacterContext(characterOrContext) === "class") {
    return CLASS_STATUS_LABELS[status] || getStatusLabel(status);
  }

  return getStatusLabel(status);
}
