import { useEffect, useMemo, useRef, useState } from "react";
import "./styles/index.css";

import AppTabs from "./components/AppTabs";
import CharacterDossier from "./components/CharacterDossier";
import ConfirmDialog from "./components/ConfirmDialog";
import ResetConfirmDialog from "./components/ResetConfirmDialog";
import CharacterLibraryPanel from "./components/CharacterLibraryPanel";
import CharacterSelectScreen from "./components/CharacterSelectScreen";
import DashboardView from "./components/DashboardView";
import EditTaskForm from "./components/EditTaskForm";
import DeepWorkOverlay from "./components/DeepWorkOverlay";
import ArchiveDayDetailModal from "./components/ArchiveDayDetailModal";
import BottomStatusBar from "./components/BottomStatusBar";
import EndOfDaySummaryModal from "./components/EndOfDaySummaryModal";
import ProjectFocusOverlay from "./components/ProjectFocusOverlay";
import MeetingDraftRecoveryDialog from "./components/MeetingDraftRecoveryDialog";
import MeetingModeOverlay from "./components/MeetingModeOverlay";
import CalendarView from "./components/CalendarView";
import ProjectsView from "./components/ProjectsView";
import RecentHistoryPanel from "./components/RecentHistoryPanel";
import SettingsView from "./components/SettingsView";
import TasksView from "./components/TasksView";
import OutfitSelectorModal from "./components/OutfitSelectorModal";
import AcademyDashboardView from "./components/academy/AcademyDashboardView";
import SubjectsView from "./components/academy/SubjectsView";
import SubjectForm from "./components/academy/SubjectForm";
import ProjectForm from "./components/academy/ProjectForm";
import ProjectDetailPanel from "./components/academy/ProjectDetailPanel";
import FocusSessionOverlay from "./components/academy/FocusSessionOverlay";
import ArchiveView from "./components/academy/ArchiveView";
import { clients } from "./data/clients";
import { employees } from "./data/employees";
import { taskTypes } from "./data/taskTypes";

import {
  createCharacterLibraryFromSavedEmployees,
  createCharacterLibraryFromStarterCharacters,
  createCharacterLibraryRecord,
  normalizeCharacterLibrary,
} from "./utils/characters";
import {
  getCharacterContext,
  getContextLabels,
  getContextStatusLabel,
} from "./utils/contextLabels";
import {
  createClientLibraryRecord,
  createSeededClientLibrary,
  normalizeClientRecord,
} from "./utils/clients";
import { getTodayKey } from "./utils/dates";
import { getDashboardInsights } from "./utils/dashboardInsights";
import {
  buildHistoryEntry,
  mergeHistoryEntries,
  upsertHistoryEntry,
} from "./utils/history";
import { useCalendar } from "./hooks/useCalendar";
import { useCharacterLibrary } from "./hooks/useCharacterLibrary";
import { useClientLibrary } from "./hooks/useClientLibrary";
import { useDataManagement } from "./hooks/useDataManagement";
import { useMeetingMode } from "./hooks/useMeetingMode";
import { useProjects } from "./hooks/useProjects";
import { useTasks } from "./hooks/useTasks";
import { useWorkdayArchive } from "./hooks/useWorkdayArchive";
import { useSubjects } from "./hooks/useSubjects";
import { useStudyProjects } from "./hooks/useStudyProjects";
import { useFocusSession } from "./hooks/useFocusSession";
import { archiveCompletedProjectStepsForDate } from "./utils/projects";
import { sortProjectTasks, sortRegularTasks } from "./utils/sorting";
import {
  createSeededTemplateLibrary,
  createTemplateLibraryRecord,
  getCustomTemplateStepXp,
  mergeTemplateLibrary,
  normalizeTemplate,
} from "./utils/templates";
import {
  STORAGE_KEYS,
  loadSavedData,
  saveData,
} from "./utils/storage";
import { normalizeSubjectList } from "./utils/subjects";
import { normalizeStudyProjectList } from "./utils/studyProjects";
import {
  normalizeStudySessionList,
  calculateTotalFocusedSeconds,
} from "./utils/studySessions";
import {
  closeOpenWorkSession,
  createBlankWorkday,
  getWorkdayFinalPunchOut,
  normalizeWorkday,
  switchOpenWorkSessionEmployee,
} from "./utils/workday";
import {
  DEFAULT_DAILY_QUOTA,
  MAX_DAILY_QUOTA,
  MIN_DAILY_QUOTA,
  getArchiveTaskGroups,
  normalizeDailyQuota,
} from "./utils/appStats";
import { getContextRank } from "./utils/xp";
import {
  isRegularTask,
  getTimerSeconds,
  formatTimerSeconds,
  getTaskXpDisplay,
  pauseRunningRegularTaskTimers,
} from "./utils/tasks";

const DASHBOARD_TASK_PREVIEW_LIMIT = 6;

// Desk-derived views (Tasks/Projects/Calendar/legacy Dashboard & Archive) are
// kept mounted-but-inert rather than deleted, per the cleanup-sprint plan.
const SHOW_LEGACY_DESK_VIEWS = false;

const APP_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "subjects", label: "Subjects" },
  { id: "archive", label: "Archive" },
  { id: "characters", label: "Characters" },
  { id: "settings", label: "Settings" },
];

const DASHBOARD_PANEL_MODES = ["quota", "insights", "attention"];

function loadCharacterLibrary() {
  const savedCharacterLibrary = loadSavedData(
    STORAGE_KEYS.characterLibrary,
    null
  );
  const normalizedCharacterLibrary =
    normalizeCharacterLibrary(savedCharacterLibrary);

  if (normalizedCharacterLibrary) {
    return normalizedCharacterLibrary;
  }

  const savedEmployees = loadSavedData(STORAGE_KEYS.employees, null);

  if (savedEmployees) {
    return createCharacterLibraryFromSavedEmployees(employees, savedEmployees);
  }

  return createCharacterLibraryFromStarterCharacters(employees);
}

function loadTasks() {
  const savedTasks = loadSavedData(STORAGE_KEYS.tasks, []);
  return savedTasks.filter((task) => !task.projectId);
}

function loadClientLibrary() {
  const savedClientData = loadSavedData(STORAGE_KEYS.clientLibrary, null);

  if (!savedClientData) {
    return createSeededClientLibrary();
  }

  if (
    savedClientData &&
    typeof savedClientData === "object" &&
    Array.isArray(savedClientData.clients)
  ) {
    return savedClientData.clients.map(normalizeClientRecord);
  }

  return createSeededClientLibrary();
}

function loadTemplateLibrary() {
  const savedTemplateData = loadSavedData(
    STORAGE_KEYS.customProjectTemplates,
    null
  );
  const starterTemplates = createSeededTemplateLibrary();

  if (!savedTemplateData) {
    return starterTemplates;
  }

  if (Array.isArray(savedTemplateData)) {
    const savedTemplates = savedTemplateData.map((template) =>
      normalizeTemplate(template, { source: "user", deriveStepXp: true })
    );

    return mergeTemplateLibrary(starterTemplates, savedTemplates);
  }

  if (
    savedTemplateData &&
    typeof savedTemplateData === "object" &&
    Array.isArray(savedTemplateData.templates)
  ) {
    return savedTemplateData.templates.map((template) =>
      normalizeTemplate(template, { deriveStepXp: false })
    );
  }

  return starterTemplates;
}

function getTaskTypeOptions(selectedTaskType) {
  if (!selectedTaskType || taskTypes.includes(selectedTaskType)) {
    return taskTypes;
  }

  return [selectedTaskType, ...taskTypes];
}

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeView, setActiveView] = useState("dashboard");
  const [dashboardPanelMode, setDashboardPanelMode] = useState("quota");
  const [dossierCharacterId, setDossierCharacterId] = useState(null);
  const [isOutfitSelectorOpen, setIsOutfitSelectorOpen] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [dataNotice, setDataNotice] = useState(null);
  const [dailyQuota, setDailyQuota] = useState(() =>
    normalizeDailyQuota(loadSavedData(STORAGE_KEYS.dailyQuota, DEFAULT_DAILY_QUOTA))
  );
  const [showDailyQuotaEditor, setShowDailyQuotaEditor] = useState(false);
  const [draftDailyQuota, setDraftDailyQuota] = useState(() =>
    String(
      normalizeDailyQuota(loadSavedData(STORAGE_KEYS.dailyQuota, DEFAULT_DAILY_QUOTA))
    )
  );

  const [activeDate, setActiveDate] = useState(() =>
    loadSavedData(STORAGE_KEYS.activeDate, getTodayKey())
  );

  const [activeEmployeeId, setActiveEmployeeId] = useState(() =>
    loadSavedData(STORAGE_KEYS.activeEmployeeId, null)
  );

  const [characterLibrary, setCharacterLibrary] = useState(() =>
    loadCharacterLibrary()
  );

  const [tasks, setTasks] = useState(() => loadTasks());

  const [projects, setProjects] = useState(() =>
    loadSavedData(STORAGE_KEYS.projects, [])
  );

  const [clientLibrary, setClientLibrary] = useState(() => loadClientLibrary());

  const [templateLibrary, setTemplateLibrary] = useState(() =>
    loadTemplateLibrary()
  );

  const [history, setHistory] = useState(() =>
    loadSavedData(STORAGE_KEYS.history, [])
  );

  const [workday, setWorkday] = useState(() => {
    const savedWorkday = loadSavedData(
      STORAGE_KEYS.workday,
      createBlankWorkday()
    );

    if (savedWorkday.date !== getTodayKey()) {
      return createBlankWorkday();
    }

    return normalizeWorkday(savedWorkday, getTodayKey());
  });

  const [scratchpad, setScratchpad] = useState(() =>
    loadSavedData(STORAGE_KEYS.scratchpad, {})
  );

  const [calendarEvents, setCalendarEvents] = useState(() =>
    loadSavedData(STORAGE_KEYS.calendarEvents, [])
  );

  // Arcadia Academy data foundation: subjects, study projects, and study
  // sessions are a separate shared collection from the Desk-derived project
  // packs above, and are not yet rendered anywhere in the UI.
  const [subjects, setSubjects] = useState(() =>
    normalizeSubjectList(loadSavedData(STORAGE_KEYS.subjects, []))
  );
  const [studyProjects, setStudyProjects] = useState(() =>
    normalizeStudyProjectList(loadSavedData(STORAGE_KEYS.studyProjects, []))
  );
  const [studySessions, setStudySessions] = useState(() =>
    normalizeStudySessionList(loadSavedData(STORAGE_KEYS.studySessions, []))
  );

  const [deepWorkTaskId, setDeepWorkTaskId] = useState(null);
  const [preLunchTaskId, setPreLunchTaskId] = useState(null);
  const previousActiveEmployeeIdRef = useRef(activeEmployeeId);
  const hasTrackedEmployeeSessionRef = useRef(false);

  const isWorking = workday.status === "working";
  const canOpenProjectFocus = workday.status === "working";

  const {
    desktopSaveState,
    desktopSaveHydrationReady,
    desktopSaveStatus,
    resetConfirmConfig,
    resetConfirmType,
    setResetConfirmType,
    autoSaveWorkLog,
    exportSaveData,
    importSaveData,
    persistDesktopSavePayload,
    createDesktopSaveFile,
    chooseDesktopSaveLocation,
    useFolderSave,
    replaceFolderSave,
    cancelFolderConflict,
    characterImageMigrationReport,
    characterImageMigrationStatus,
    previewCharacterImageMigration,
    runCharacterImageMigration,
    unusedCharacterImageScanReport,
    unusedCharacterImageScanStatus,
    scanUnusedCharacterImages,
    unusedCharacterImageArchiveReport,
    unusedCharacterImageArchiveStatus,
    moveUnusedCharacterImagesToArchive,
    performReset,
    performNewSeasonReset,
    resetDemoData,
    openNewSeasonReset,
  } = useDataManagement({
    activeEmployeeId,
    characterLibrary,
    setCharacterLibrary,
    tasks,
    projects,
    activeDate,
    history,
    workday,
    dailyQuota,
    clientLibrary,
    templateLibrary,
    scratchpad,
    calendarEvents,
    subjects,
    studyProjects,
    studySessions,
    setDataNotice,
    hydrateFromStorage,
    hydrateAfterReset,
    openConfirmDialog,
  });

  const {
    characterLibraryForDisplay,
    activeEmployee,
    selectedDossierCharacter,
    selectedDossierCharacterId,
    activeEmployeeLevelProgress,
    canImportCharacterImage,
    getDisplayImageUrl,
    characterImageOptions,
    showCharacterForm,
    editingCharacterId,
    characterDraft,
    openNewCharacterForm,
    openEditCharacterForm,
    cancelCharacterForm,
    updateCharacterDraft,
    updateCharacterDraftImageSlot,
    updateCharacterDraftDossier,
    addCharacterDraftOutfit,
    updateCharacterDraftOutfit,
    updateCharacterDraftOutfitImageSlot,
    setCharacterDraftActiveOutfit,
    deleteCharacterDraftOutfit,
    importCharacterImage,
    selectActiveCharacter,
    saveCharacter,
    deleteCharacter,
    updateActiveEmployeeOutfit,
  } = useCharacterLibrary({
    characterLibrary,
    setCharacterLibrary,
    desktopSaveState,
    activeEmployeeId,
    setActiveEmployeeId,
    dossierCharacterId,
    setDossierCharacterId,
    setDeepWorkTaskId,
    openConfirmDialog,
  });

  const presentationTheme =
    activeEmployee?.context === "class" ? "academy" : "arkham";

  useEffect(() => {
    document.documentElement.dataset.theme = presentationTheme;
    document.body.dataset.theme = presentationTheme;

    return () => {
      delete document.documentElement.dataset.theme;
      delete document.body.dataset.theme;
    };
  }, [presentationTheme]);

  const {
    clientNames,
    clientDisplayByName,
    getClientOptionsFor,
    showClientForm,
    editingClientId,
    clientDraft,
    openNewClientForm,
    openEditClientForm,
    cancelClientForm,
    closeClientManagerUi,
    updateClientDraft,
    saveClient,
    deleteClient,
  } = useClientLibrary({
    clientLibrary,
    setClientLibrary,
    openConfirmDialog,
    onClientSaved: (clientName) => {
      setClient(clientName);
    },
    onClientDeleted: ({ clientName, nextDefaultClient }) => {
      if (client === clientName) {
        setClient(nextDefaultClient);
      }

      if (!editingTaskId && editClient === clientName) {
        setEditClient(nextDefaultClient);
      }

      if (!editingTemplateId && customTemplateDraft.client === clientName) {
        setCustomTemplateDraft((currentDraft) => ({
          ...currentDraft,
          client: nextDefaultClient,
        }));
      }
    },
  });

  const {
    focusedProjectId,
    setFocusedProjectId,
    expandedProjectIds,
    setExpandedProjectIds,
    showProjectPackForm,
    showCustomTemplateForm,
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
    openProjectPackForm,
    openNewTemplateForm,
    openEditTemplateForm,
    cancelCustomTemplateForm,
    saveCustomProjectTemplate,
    deleteCustomProjectTemplate,
  } = useProjects({
    projects,
    setProjects,
    templateLibrary,
    setTemplateLibrary,
    activeEmployee,
    setCharacterLibrary,
    isWorking,
    clientNames,
    openConfirmDialog,
  });

  const {
    timerNow,
    editingTaskId,
    setEditingTaskId,
    editTaskTitle,
    setEditTaskTitle,
    editClient,
    setEditClient,
    editTaskType,
    setEditTaskType,
    editTaskDeadline,
    setEditTaskDeadline,
    editTaskPriority,
    setEditTaskPriority,
    taskTitle,
    setTaskTitle,
    client,
    setClient,
    taskType,
    setTaskType,
    taskDeadline,
    setTaskDeadline,
    taskPriority,
    setTaskPriority,
    deepWorkTask,
    addTask,
    createTaskFromCalendarEvent,
    handleTaskTypeChange,
    cancelEditTask,
    startEditTask,
    saveEditedTask,
    toggleTaskTimer,
    openDeepWork,
    handleDeepWorkTimerAction,
    completeDeepWork,
    completeTask,
    deleteTask,
  } = useTasks({
    tasks,
    setTasks,
    isWorking,
    activeEmployee,
    setCharacterLibrary,
    activeProjectStepTasks,
    completeProjectStep,
    clientNames,
    openConfirmDialog,
    deepWorkTaskId,
    setDeepWorkTaskId,
    preLunchTaskId,
    setPreLunchTaskId,
  });

  const {
    endOfDaySummary,
    showWorkdayDetails,
    setShowWorkdayDetails,
    punchIn,
    startLunch,
    returnFromLunch,
    punchOut,
    openEndOfDaySummary,
    closeEndOfDaySummary,
    performArchiveToday,
    archiveToday,
  } = useWorkdayArchive({
    workday,
    setWorkday,
    tasks,
    setTasks,
    projects,
    setProjects,
    history,
    setHistory,
    activeDate,
    setActiveDate,
    activeEmployeeId,
    dailyQuota,
    getEmployeeName,
    autoSaveWorkLog,
    setDataNotice,
    setEditingTaskId,
    setPreLunchTaskId,
    setDeepWorkTaskId,
    scratchpad,
  });

  function openProjectFocusWhenAvailable(projectId) {
    if (!canOpenProjectFocus) return;

    openProjectFocus(projectId);
  }

  const {
    activeSubjects,
    archivedSubjects,
    addSubject,
    editSubject,
    archiveSubject,
    restoreSubject,
  } = useSubjects({ subjects, setSubjects });

  const {
    activeProjects: activeStudyProjects,
    shelvedProjects: shelvedStudyProjects,
    completedProjects: completedStudyProjects,
    retiredProjects: retiredStudyProjects,
    canCreateActive: canCreateActiveStudyProject,
    maxActiveSlots: maxActiveStudySlots,
    getProjectById: getStudyProjectById,
    createProject: createStudyProjectRecord,
    updateProject: updateStudyProjectRecord,
    updateNotes: updateStudyProjectNotesRecord,
    changeStatus: changeStudyProjectStatusRecord,
    deleteProject: deleteStudyProjectRecord,
  } = useStudyProjects({ studyProjects, setStudyProjects });

  const {
    activeSession: activeFocusSession,
    canStartSession: canStartFocusSession,
    startSession: startFocusSession,
    discardSession: discardFocusSession,
    endSession: endFocusSession,
  } = useFocusSession({
    setStudyProjects,
    setStudySessions,
    characterLibrary,
    setCharacterLibrary,
    getProjectById: getStudyProjectById,
  });

  const [subjectFormState, setSubjectFormState] = useState(null);
  const [projectFormState, setProjectFormState] = useState(null);
  const [projectDetailId, setProjectDetailId] = useState(null);

  const archivedStudyProjectList = [
    ...shelvedStudyProjects,
    ...completedStudyProjects,
    ...retiredStudyProjects,
  ];
  const totalAcademySessionCount = studySessions.length;
  const totalAcademyFocusedSeconds = calculateTotalFocusedSeconds(studySessions);

  function openCreateSubjectForm() {
    setSubjectFormState({ mode: "create" });
  }

  function openEditSubjectForm(subject) {
    setSubjectFormState({ mode: "edit", subject });
  }

  function closeSubjectForm() {
    setSubjectFormState(null);
  }

  function submitSubjectForm(values) {
    if (subjectFormState?.mode === "edit") {
      editSubject(subjectFormState.subject.id, values);
    } else {
      addSubject(values);
    }

    closeSubjectForm();
  }

  function openCreateProjectForm() {
    setProjectFormState({ mode: "create" });
  }

  function openEditProjectForm(projectId) {
    const project = getStudyProjectById(projectId);

    if (!project) return;

    setProjectFormState({ mode: "edit", project });
  }

  function closeProjectForm() {
    setProjectFormState(null);
  }

  function submitProjectForm(values) {
    const result =
      projectFormState?.mode === "edit"
        ? updateStudyProjectRecord(projectFormState.project.id, values)
        : createStudyProjectRecord(values);

    if (result.ok) {
      closeProjectForm();
    }

    return result;
  }

  function openProjectDetail(projectId) {
    setProjectDetailId(projectId);
  }

  function closeProjectDetail() {
    setProjectDetailId(null);
  }

  function guardProjectStatusChange(projectId, action) {
    if (activeFocusSession?.projectId === projectId) {
      setDataNotice({
        type: "error",
        message: "End the focus session before changing this project's status.",
      });
      return;
    }

    action();
  }

  function handleShelveProject(projectId) {
    guardProjectStatusChange(projectId, () =>
      changeStudyProjectStatusRecord(projectId, "shelved")
    );
  }

  function handleCompleteProject(projectId) {
    guardProjectStatusChange(projectId, () =>
      changeStudyProjectStatusRecord(projectId, "completed")
    );
  }

  function handleRetireProject(projectId) {
    guardProjectStatusChange(projectId, () =>
      changeStudyProjectStatusRecord(projectId, "retired")
    );
  }

  function handleRestoreProject(projectId) {
    guardProjectStatusChange(projectId, () => {
      const result = changeStudyProjectStatusRecord(projectId, "active");

      if (!result.ok) {
        setDataNotice({ type: "error", message: result.error });
      }
    });
  }

  function handleDeleteProject(projectId) {
    const project = getStudyProjectById(projectId);

    openConfirmDialog({
      title: "Delete Project",
      message: `Delete "${project?.title || "this project"}"? This permanently removes its progress, notes, and sessions.`,
      confirmLabel: "Delete Project",
      isDangerous: true,
      onConfirm: () => {
        if (activeFocusSession?.projectId === projectId) {
          discardFocusSession();
        }

        deleteStudyProjectRecord(projectId);

        if (projectDetailId === projectId) {
          setProjectDetailId(null);
        }
      },
    });
  }

  function handleSaveProjectNotes(projectId, notes) {
    updateStudyProjectNotesRecord(projectId, notes);
  }

  function handleStartFocusSession(projectId) {
    if (!activeEmployee) return;

    const result = startFocusSession(projectId, activeEmployee.id);

    if (!result.ok) {
      setDataNotice({ type: "error", message: result.error });
    }
  }

  function handleFocusFromDetail(projectId) {
    handleStartFocusSession(projectId);
    closeProjectDetail();
  }

  function handleSelectActiveCharacterGuarded(characterId) {
    if (activeFocusSession) {
      setDataNotice({
        type: "error",
        message: "End the current focus session before switching characters.",
      });
      return;
    }

    selectActiveCharacter(characterId);
  }

  const {
    meetingSession,
    meetingTask,
    meetingActionItems,
    meetingActionTitle,
    meetingActionPriority,
    meetingExportState,
    meetingDraftRecovery,
    meetingDraftWarnings,
    setMeetingActionTitle,
    setMeetingActionPriority,
    openMeetingMode,
    closeMeetingMode,
    updateMeetingNotes,
    addMeetingActionItem,
    resumeMeetingDraft,
    discardMeetingDraft,
    endMeetingMode,
    downloadCurrentMeetingNotes,
    closeMeetingModeWithoutExport,
    resetMeetingModeState,
  } = useMeetingMode({
    tasks,
    setTasks,
    isWorking,
    desktopSaveState,
    desktopSaveHydrationReady,
    completeTask,
    openConfirmDialog,
    onPrepareMeetingMode: () => {
      setDeepWorkTaskId(null);
      setFocusedProjectId(null);
      setEditingTaskId(null);
    },
  });

  const {
    formMode: calFormMode,
    editingEventId: calEditingEventId,
    eventDraft: calEventDraft,
    openAddForm: openCalAddForm,
    openEditForm: openCalEditForm,
    cancelForm: cancelCalForm,
    updateEventDraft: updateCalEventDraft,
    saveEvent: saveCalEvent,
    deleteEvent: deleteCalEvent,
    skipOccurrence: skipCalOccurrence,
  } = useCalendar({
    calendarEvents,
    setCalendarEvents,
    openConfirmDialog,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (desktopSaveState.isTauri && !desktopSaveHydrationReady) {
      return;
    }

    const today = getTodayKey();

    if (activeDate !== today) {
      const pausedTasks = pauseRunningRegularTaskTimers(tasks);
      const { carryOverTasks, historyTasks, unfinishedTasks } =
        getArchiveTaskGroups({
          tasks: pausedTasks,
          projects,
          date: activeDate,
        });
      const existingHistoryEntry = Array.isArray(history)
        ? history.find((entry) => entry?.date === activeDate)
        : null;

      if (
        existingHistoryEntry ||
        historyTasks.length > 0 ||
        unfinishedTasks.length > 0
      ) {
        const closedWorkday = closeOpenWorkSession(
          normalizeWorkday(workday, activeDate),
          currentTime.toISOString()
        );
        const archiveWorkday = {
          ...closedWorkday,
          punchOutTime:
            getWorkdayFinalPunchOut(closedWorkday) || closedWorkday.punchOutTime,
        };
        const historyEntry = buildHistoryEntry({
          date: activeDate,
          tasks: historyTasks,
          carriedOverTasks: unfinishedTasks,
          activeEmployeeId,
          workday: archiveWorkday,
        });
        const mergedHistoryEntry = existingHistoryEntry
          ? mergeHistoryEntries(existingHistoryEntry, historyEntry)
          : historyEntry;

        setHistory((currentHistory) => upsertHistoryEntry(currentHistory, historyEntry));
        autoSaveWorkLog(mergedHistoryEntry);
      }

      setProjects((currentProjects) =>
        archiveCompletedProjectStepsForDate(currentProjects, activeDate)
      );

      setTasks(carryOverTasks);
      setActiveDate(today);
      setWorkday(createBlankWorkday(today));
      setEditingTaskId(null);
      setDeepWorkTaskId(null);
      resetMeetingModeState();
      setPreLunchTaskId(null);
    }
  }, [
    currentTime,
    activeDate,
    tasks,
    projects,
    history,
    activeEmployeeId,
    workday,
    desktopSaveState.isTauri,
    desktopSaveHydrationReady,
    resetMeetingModeState,
  ]);

  useEffect(() => {
    saveData(STORAGE_KEYS.activeEmployeeId, activeEmployeeId);
  }, [activeEmployeeId]);

  useEffect(() => {
    if (!hasTrackedEmployeeSessionRef.current) {
      hasTrackedEmployeeSessionRef.current = true;
      previousActiveEmployeeIdRef.current = activeEmployeeId;
      return;
    }

    const previousEmployeeId = previousActiveEmployeeIdRef.current;

    if (previousEmployeeId === activeEmployeeId) return;

    previousActiveEmployeeIdRef.current = activeEmployeeId;

    if (!activeEmployeeId || workday.status !== "working") return;

    const now = new Date().toISOString();

    setWorkday((currentWorkday) => {
      if (currentWorkday.status !== "working") return currentWorkday;

      return switchOpenWorkSessionEmployee(currentWorkday, activeEmployeeId, now);
    });
  }, [activeEmployeeId, workday.status]);

  useEffect(() => {
    saveData(
      STORAGE_KEYS.characterLibrary,
      createCharacterLibraryRecord(characterLibrary)
    );
    saveData(STORAGE_KEYS.employees, characterLibrary);
  }, [characterLibrary]);

  useEffect(() => {
    saveData(STORAGE_KEYS.tasks, tasks);
  }, [tasks]);

  useEffect(() => {
    saveData(STORAGE_KEYS.projects, projects);
  }, [projects]);

  useEffect(() => {
    saveData(STORAGE_KEYS.clientLibrary, createClientLibraryRecord(clientLibrary));
  }, [clientLibrary]);

  useEffect(() => {
    saveData(
      STORAGE_KEYS.customProjectTemplates,
      createTemplateLibraryRecord(templateLibrary)
    );
  }, [templateLibrary]);

  useEffect(() => {
    saveData(STORAGE_KEYS.activeDate, activeDate);
  }, [activeDate]);

  useEffect(() => {
    saveData(STORAGE_KEYS.history, history);
  }, [history]);

  useEffect(() => {
    saveData(STORAGE_KEYS.workday, workday);
  }, [workday]);

  useEffect(() => {
    saveData(STORAGE_KEYS.dailyQuota, dailyQuota);
  }, [dailyQuota]);

  useEffect(() => {
    saveData(STORAGE_KEYS.scratchpad, scratchpad);
  }, [scratchpad]);

  useEffect(() => {
    saveData(STORAGE_KEYS.calendarEvents, calendarEvents);
  }, [calendarEvents]);

  useEffect(() => {
    saveData(STORAGE_KEYS.subjects, subjects);
  }, [subjects]);

  useEffect(() => {
    saveData(STORAGE_KEYS.studyProjects, studyProjects);
  }, [studyProjects]);

  useEffect(() => {
    saveData(STORAGE_KEYS.studySessions, studySessions);
  }, [studySessions]);

  useEffect(() => {
    if (activeEmployeeId && !activeEmployee) {
      setActiveEmployeeId(null);
    }
  }, [activeEmployee, activeEmployeeId]);

  const contextLabels = getContextLabels(activeEmployee);
  const headerLogoSrc = "/branding/arcadia-academy-logo-black.png";
  const contextualStatusLabel = getContextStatusLabel(
    workday.status,
    activeEmployee
  );
  const appTabs = APP_TABS.map((tab) => {
    if (tab.id === "tasks") {
      return { ...tab, label: contextLabels.tasks };
    }

    if (tab.id === "projects") {
      return { ...tab, label: contextLabels.projects };
    }

    return tab;
  });

  const taskClientOptions = getClientOptionsFor(client);
  const editClientOptions = getClientOptionsFor(editClient);
  const templateClientOptions = getClientOptionsFor(customTemplateDraft.client);

  const manualTasks = tasks.filter((task) => !task.projectId);
  const activeManualTasks = manualTasks.filter((task) => !task.completed);
  const completedManualTasks = manualTasks.filter((task) => task.completed);
  const regularTasks = sortRegularTasks(activeManualTasks);
  const projectTasks = sortProjectTasks(activeProjectStepTasks);
  const completedRegularTasks = sortRegularTasks(completedManualTasks);
  const completedProjectTasks = sortProjectTasks(
    completedProjectStepsToday.filter(
      (task) => !completedProjectPackIdsToday.has(task.projectId)
    )
  );

  const completedTodayTasks = [
    ...completedRegularTasks,
    ...completedProjectTasks,
    ...completedProjectPacksToday,
  ];

  const activeTasks = [...regularTasks, ...projectTasks];
  const dashboardInsights = getDashboardInsights({
    history,
    completedTodayTasks,
    activeTasks,
    todayKey: getTodayKey(),
    now: currentTime,
  });

  const preLunchTask =
    preLunchTaskId && workday.status === "working" && workday.lunchEndTime
      ? tasks.find(
          (task) =>
            task.id === preLunchTaskId && !task.completed && isRegularTask(task)
        )
      : null;

  const allCompletedTasksForToday = [
    ...tasks.filter((task) => task.completed),
    ...completedProjectStepsToday,
  ];

  const visibleTaskCount = regularTasks.length + projectTasks.length;

  const todayXp = allCompletedTasksForToday.reduce(
    (total, task) => total + task.xp,
    0
  );
  const quotaPercent =
    todayXp === 0 ? 0 : Math.max(1, Math.round((todayXp / dailyQuota) * 100));
  const ringProgress = Math.min(todayXp / dailyQuota, 1);
  const dailyRank = getContextRank(todayXp, getCharacterContext(activeEmployee));
  const dossierCompletedWorkCount = selectedDossierCharacterId
    ? completedTodayTasks.filter(
        (task) => task.completed && task.completedBy === selectedDossierCharacterId
      ).length +
      history.reduce((total, entry) => {
        const entryTasks = Array.isArray(entry.tasks) ? entry.tasks : [];
        const completedEntryTasks = entryTasks.filter(
          (task) =>
            task.completed && task.completedBy === selectedDossierCharacterId
        );

        return total + completedEntryTasks.length;
      }, 0)
    : 0;
  const dossierRecentWorkLogCount = selectedDossierCharacterId
    ? history.filter((entry) => entry.activeEmployeeId === selectedDossierCharacterId)
        .length
    : 0;

  const todayDate = useMemo(() => {
    return currentTime.toLocaleDateString("en-ZA", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [currentTime]);

  const currentClock = useMemo(() => {
    return currentTime.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [currentTime]);

  function openConfirmDialog(config) {
    setConfirmDialog(config);
  }

  function closeConfirmDialog() {
    setConfirmDialog(null);
  }

  function handleConfirmDialogAction() {
    if (confirmDialog?.onConfirm) {
      confirmDialog.onConfirm();
    }

    closeConfirmDialog();
  }

  function closeStaleUiState() {
    setActiveView("dashboard");
    setShowWorkdayDetails(false);
    closeEndOfDaySummary();
    setDeepWorkTaskId(null);
    setFocusedProjectId(null);
    resetMeetingModeState();
    setDossierCharacterId(null);
    setSelectedHistoryEntry(null);
    setConfirmDialog(null);
    setResetConfirmType(null);
    setExpandedProjectIds([]);
    setShowDailyQuotaEditor(false);
    setEditingTaskId(null);
    setEditingTemplateId(null);
    closeClientManagerUi();
    cancelCharacterForm();
    setPreLunchTaskId(null);
    cancelCalForm();
  }

  function hydrateAfterReset({
    nextCharacterLibrary = null,
    message = "Work data has been reset.",
  } = {}) {
    const today = getTodayKey();

    setTasks([]);
    setProjects([]);
    setHistory([]);
    setWorkday(createBlankWorkday(today));
    setActiveDate(today);
    setActiveEmployeeId(null);
    setScratchpad({});
    if (nextCharacterLibrary) {
      setCharacterLibrary(nextCharacterLibrary);
    }
    closeStaleUiState();
    setDataNotice({ type: "success", message });
  }

  function hydrateFromStorage(successMessage = "Save imported successfully.") {
    const loadedDailyQuota = normalizeDailyQuota(
      loadSavedData(STORAGE_KEYS.dailyQuota, DEFAULT_DAILY_QUOTA)
    );
    const savedWorkday = loadSavedData(STORAGE_KEYS.workday, createBlankWorkday());
    const normalizedWorkday =
      savedWorkday.date !== getTodayKey()
        ? createBlankWorkday()
        : normalizeWorkday(savedWorkday, getTodayKey());
    const newTemplateLibrary = loadTemplateLibrary();

    setCharacterLibrary(loadCharacterLibrary());
    setClientLibrary(loadClientLibrary());
    setTemplateLibrary(newTemplateLibrary);
    setSelectedTemplateId(newTemplateLibrary[0]?.id || "");
    setTasks(loadTasks());
    setProjects(loadSavedData(STORAGE_KEYS.projects, []));
    setHistory(loadSavedData(STORAGE_KEYS.history, []));
    setWorkday(normalizedWorkday);
    setActiveDate(loadSavedData(STORAGE_KEYS.activeDate, getTodayKey()));
    setActiveEmployeeId(loadSavedData(STORAGE_KEYS.activeEmployeeId, null));
    setDailyQuota(loadedDailyQuota);
    setDraftDailyQuota(String(loadedDailyQuota));
    setScratchpad(loadSavedData(STORAGE_KEYS.scratchpad, {}));
    setCalendarEvents(loadSavedData(STORAGE_KEYS.calendarEvents, []));
    setSubjects(normalizeSubjectList(loadSavedData(STORAGE_KEYS.subjects, [])));
    setStudyProjects(
      normalizeStudyProjectList(loadSavedData(STORAGE_KEYS.studyProjects, []))
    );
    setStudySessions(
      normalizeStudySessionList(loadSavedData(STORAGE_KEYS.studySessions, []))
    );
    closeStaleUiState();
    if (successMessage) {
      setDataNotice({ type: "success", message: successMessage });
    }
  }

  function openDailyQuotaEditor() {
    setDraftDailyQuota(String(dailyQuota));
    setShowDailyQuotaEditor(true);
  }

  function saveDailyQuota(event) {
    event.preventDefault();

    setDailyQuota(normalizeDailyQuota(draftDailyQuota));
    setShowDailyQuotaEditor(false);
  }

  function cancelDailyQuotaEdit() {
    setDraftDailyQuota(String(dailyQuota));
    setShowDailyQuotaEditor(false);
  }

  function cycleDashboardPanelMode() {
    setDashboardPanelMode((currentMode) => {
      const currentIndex = DASHBOARD_PANEL_MODES.indexOf(currentMode);
      const nextIndex =
        (Math.max(currentIndex, 0) + 1) % DASHBOARD_PANEL_MODES.length;

      return DASHBOARD_PANEL_MODES[nextIndex];
    });
  }

  function getEmployeeName(employeeId) {
    return (
      characterLibrary.find((employee) => employee.id === employeeId)?.name ||
      "Unknown Employee"
    );
  }

  const renderEditForm = () => (
    <EditTaskForm
      title={editTaskTitle}
      onTitleChange={setEditTaskTitle}
      client={editClient}
      clientOptions={editClientOptions}
      onClientChange={setEditClient}
      taskType={editTaskType}
      taskTypeOptions={getTaskTypeOptions(editTaskType)}
      onTaskTypeChange={setEditTaskType}
      deadline={editTaskDeadline}
      onDeadlineChange={setEditTaskDeadline}
      priority={editTaskPriority}
      onPriorityChange={setEditTaskPriority}
      isWorking={isWorking}
      onSave={saveEditedTask}
      onCancel={cancelEditTask}
    />
  );

  if (!activeEmployee) {
    return (
      <div className="app" data-theme={presentationTheme}>
        <CharacterSelectScreen
          appTitle="Arcadia Academy"
          appSubtitle="Academy Progress System"
          characterLibrary={characterLibrary}
          characterLibraryForDisplay={characterLibraryForDisplay}
          activeEmployeeId={activeEmployeeId}
          selectedDossierCharacterId={selectedDossierCharacterId}
          dossierCharacterId={dossierCharacterId}
          characterDraft={characterDraft}
          showCharacterForm={showCharacterForm}
          editingCharacterId={editingCharacterId}
          characterImageOptions={characterImageOptions}
          canImportCharacterImage={canImportCharacterImage}
          onImportImage={importCharacterImage}
          onAddCharacter={openNewCharacterForm}
          onEditCharacter={openEditCharacterForm}
          onDeleteCharacter={deleteCharacter}
          onSelectCharacter={selectActiveCharacter}
          onSelectDossier={setDossierCharacterId}
          onDraftChange={updateCharacterDraft}
          onDraftImageSlotChange={updateCharacterDraftImageSlot}
          onDraftDossierChange={updateCharacterDraftDossier}
          onAddOutfit={addCharacterDraftOutfit}
          onDraftOutfitChange={updateCharacterDraftOutfit}
          onDraftOutfitImageSlotChange={updateCharacterDraftOutfitImageSlot}
          onSetActiveOutfit={setCharacterDraftActiveOutfit}
          onDeleteOutfit={deleteCharacterDraftOutfit}
          onImportOutfitImage={(outfitId, slot) =>
            importCharacterImage(slot, { outfitId })
          }
          onCancel={cancelCharacterForm}
          onSubmit={saveCharacter}
        />
      </div>
    );
  }

  return (
    <main className="app appShell" data-theme={presentationTheme}>
      <header className="topBar">
        <div className="appIdentity">
          <img className="appLogo" src={headerLogoSrc} alt="Arcadia Academy" />
        </div>

        <AppTabs
          tabs={appTabs}
          activeView={activeView}
          onChangeView={setActiveView}
          ariaLabel="Arcadia Academy views"
        />

        <div className="topStats">
          <span>{todayDate}</span>
          <span>{currentClock}</span>
        </div>
      </header>

      {dataNotice && (
        <div className={`dataNotice dataNotice--${dataNotice.type}`} role="status">
          <p>{dataNotice.message}</p>
          <button
            className="dataNoticeDismiss"
            type="button"
            onClick={() => setDataNotice(null)}
            aria-label="Dismiss notice"
          >
            {"×"}
          </button>
        </div>
      )}

      {SHOW_LEGACY_DESK_VIEWS && (
        <div className={`topWorkdayControls ${workday.status}`}>
          <span className="topWorkdayStatus">{contextualStatusLabel}</span>

          {(workday.status === "notPunchedIn" ||
            workday.status === "punchedOut") && (
            <button className="topWorkdayButton primary" type="button" onClick={punchIn}>
              {contextLabels.workdayStart}
            </button>
          )}

          {workday.status === "working" && (
            <>
              <button className="topWorkdayButton" type="button" onClick={startLunch}>
                {contextLabels.lunchStart}
              </button>
              <button className="topWorkdayButton" type="button" onClick={punchOut}>
                {contextLabels.workdayEnd}
              </button>
            </>
          )}

          {workday.status === "onLunch" && (
            <button
              className="topWorkdayButton primary"
              type="button"
              onClick={returnFromLunch}
            >
              {contextLabels.lunchReturn}
            </button>
          )}
        </div>
      )}

      {activeView === "dashboard" && (
        <AcademyDashboardView
          character={activeEmployee}
          levelProgress={activeEmployeeLevelProgress}
          onSwitchCharacter={() => {
            setIsOutfitSelectorOpen(false);
            setActiveEmployeeId(null);
          }}
          onOpenDossier={() => setDossierCharacterId(activeEmployee.id)}
          switchCharacterDisabled={Boolean(activeFocusSession)}
          activeSubjectCount={activeSubjects.length}
          activeProjects={activeStudyProjects}
          maxActiveSlots={maxActiveStudySlots}
          subjects={subjects}
          totalSessions={totalAcademySessionCount}
          totalFocusedSeconds={totalAcademyFocusedSeconds}
          activeSessionProjectId={activeFocusSession?.projectId || null}
          canFocus={canStartFocusSession()}
          focusDisabledReason="End the current focus session before starting another."
          onFocus={handleStartFocusSession}
          onOpenDetail={openProjectDetail}
          onShelve={handleShelveProject}
          onComplete={handleCompleteProject}
          onRetire={handleRetireProject}
          onEdit={openEditProjectForm}
          onDelete={handleDeleteProject}
          onAddProject={openCreateProjectForm}
        />
      )}

      {SHOW_LEGACY_DESK_VIEWS && (
        <DashboardView
          activeEmployee={activeEmployee}
          activeEmployeeLevelProgress={activeEmployeeLevelProgress}
          workday={workday}
          onSwitchEmployee={() => {
            setIsOutfitSelectorOpen(false);
            setActiveEmployeeId(null);
          }}
          onOpenDossier={() => setDossierCharacterId(activeEmployee.id)}
          onOpenOutfitSelector={() => setIsOutfitSelectorOpen(true)}
          statusLabel={contextualStatusLabel}
          contextLabels={contextLabels}
          dashboardPanelMode={dashboardPanelMode}
          onCycleDashboardPanelMode={cycleDashboardPanelMode}
          dashboardInsights={dashboardInsights}
          ringProgress={ringProgress}
          todayXp={todayXp}
          dailyQuota={dailyQuota}
          quotaPercent={quotaPercent}
          completedTaskCount={allCompletedTasksForToday.length}
          dailyRank={dailyRank}
          showDailyQuotaEditor={showDailyQuotaEditor}
          draftDailyQuota={draftDailyQuota}
          minDailyQuota={MIN_DAILY_QUOTA}
          maxDailyQuota={MAX_DAILY_QUOTA}
          onEditQuota={openDailyQuotaEditor}
          onSaveDailyQuota={saveDailyQuota}
          onCancelDailyQuotaEdit={cancelDailyQuotaEdit}
          onDraftDailyQuotaChange={setDraftDailyQuota}
          calendarEvents={calendarEvents}
          activeTasks={activeTasks}
          preLunchTask={preLunchTask}
          onDismissPreLunchTask={() => setPreLunchTaskId(null)}
          dashboardTaskPreviewLimit={DASHBOARD_TASK_PREVIEW_LIMIT}
          clientDisplayByName={clientDisplayByName}
          timerNow={timerNow}
          isWorking={isWorking}
          onCompleteTask={completeTask}
          onOpenDeepWork={openDeepWork}
          onOpenMeetingMode={openMeetingMode}
          onOpenProjectFocus={openProjectFocusWhenAvailable}
          canOpenProjectFocus={canOpenProjectFocus}
          onToggleTaskTimer={toggleTaskTimer}
          onOpenTasksView={() => setActiveView("tasks")}
          scratchpad={scratchpad}
          activeDate={activeDate}
          onScratchpadChange={(date, text) =>
            setScratchpad((current) => ({ ...current, [date]: text }))
          }
        />
      )}

      {SHOW_LEGACY_DESK_VIEWS && (
        <TasksView
          contextLabels={contextLabels}
          taskTitle={taskTitle}
          onTaskTitleChange={setTaskTitle}
          client={client}
          onClientChange={setClient}
          clientNames={clientNames}
          taskClientOptions={taskClientOptions}
          taskType={taskType}
          taskTypes={taskTypes}
          onTaskTypeChange={handleTaskTypeChange}
          taskDeadline={taskDeadline}
          onTaskDeadlineChange={setTaskDeadline}
          taskPriority={taskPriority}
          onTaskPriorityChange={setTaskPriority}
          isWorking={isWorking}
          onAddTask={addTask}
          visibleTaskCount={visibleTaskCount}
          activeTasks={activeTasks}
          completedTodayTasks={completedTodayTasks}
          regularTasks={regularTasks}
          projectTasks={projectTasks}
          completedTodayTaskList={completedTodayTasks}
          editingTaskId={editingTaskId}
          timerNow={timerNow}
          onCompleteTask={completeTask}
          onToggleTimer={toggleTaskTimer}
          onOpenDeepWork={openDeepWork}
          onOpenMeeting={openMeetingMode}
          onStartEdit={startEditTask}
          onDelete={deleteTask}
          getEmployeeName={getEmployeeName}
          renderEditForm={renderEditForm}
        />
      )}

      {SHOW_LEGACY_DESK_VIEWS && (
        <ProjectsView
          contextLabels={contextLabels}
          templateLibrary={templateLibrary}
          showProjectPackForm={showProjectPackForm}
          onOpenProjectPackForm={openProjectPackForm}
          onOpenNewTemplateForm={openNewTemplateForm}
          selectedTemplateId={selectedTemplateId}
          selectedTemplate={selectedTemplate}
          projectName={projectName}
          projectDeadline={projectDeadline}
          projectPriority={projectPriority}
          isWorking={isWorking}
          onCreateProjectPack={createProjectPack}
          onSelectedTemplateIdChange={setSelectedTemplateId}
          onProjectNameChange={setProjectName}
          onProjectDeadlineChange={setProjectDeadline}
          onProjectPriorityChange={setProjectPriority}
          showCustomTemplateForm={showCustomTemplateForm}
          customTemplateDraft={customTemplateDraft}
          editingTemplateId={editingTemplateId}
          templateClientOptions={templateClientOptions}
          taskTypes={taskTypes}
          onSaveCustomProjectTemplate={saveCustomProjectTemplate}
          onCancelCustomTemplateForm={cancelCustomTemplateForm}
          onUpdateCustomTemplateDraft={updateCustomTemplateDraft}
          onUpdateCustomTemplateStep={updateCustomTemplateStep}
          onAddCustomTemplateStep={addCustomTemplateStep}
          onRemoveCustomTemplateStep={removeCustomTemplateStep}
          getStepXp={getCustomTemplateStepXp}
          onOpenEditTemplateForm={openEditTemplateForm}
          onDeleteCustomProjectTemplate={deleteCustomProjectTemplate}
          projectSummaries={projectSummaries}
          expandedProjectIds={expandedProjectIds}
          onToggleProjectDetails={toggleProjectDetails}
          onOpenProjectFocus={openProjectFocusWhenAvailable}
          canOpenProjectFocus={canOpenProjectFocus}
          onCancelProject={cancelProject}
        />
      )}

      {SHOW_LEGACY_DESK_VIEWS && (
        <CalendarView
          calendarEvents={calendarEvents}
          clientNames={clientNames}
          clientDisplayByName={clientDisplayByName}
          taskTypes={taskTypes}
          formMode={calFormMode}
          eventDraft={calEventDraft}
          onOpenAddForm={openCalAddForm}
          onOpenEditForm={openCalEditForm}
          onCancelForm={cancelCalForm}
          onFieldChange={updateCalEventDraft}
          onSaveEvent={saveCalEvent}
          onDeleteEvent={deleteCalEvent}
          onSkipOccurrence={skipCalOccurrence}
          onCreateTaskFromEvent={createTaskFromCalendarEvent}
        />
      )}

      {SHOW_LEGACY_DESK_VIEWS && (
        <section className="viewShell archiveView">
          <RecentHistoryPanel
            history={history}
            getEmployeeName={getEmployeeName}
            onSelectHistoryEntry={setSelectedHistoryEntry}
          />
        </section>
      )}

      {activeView === "subjects" && (
        <SubjectsView
          activeSubjects={activeSubjects}
          archivedSubjects={archivedSubjects}
          studyProjects={studyProjects}
          onAddSubject={openCreateSubjectForm}
          onEditSubject={openEditSubjectForm}
          onArchiveSubject={archiveSubject}
          onRestoreSubject={restoreSubject}
        />
      )}

      {activeView === "archive" && (
        <ArchiveView
          archivedProjects={archivedStudyProjectList}
          subjects={subjects}
          onOpenDetail={openProjectDetail}
          onRestore={handleRestoreProject}
          canRestore={canCreateActiveStudyProject}
        />
      )}

      {activeView === "characters" && (
        <section className="viewShell charactersView">
          <CharacterLibraryPanel
            characters={characterLibraryForDisplay}
            activeCharacterId={activeEmployeeId}
            selectedDossierCharacterId={
              dossierCharacterId ? selectedDossierCharacterId : null
            }
            draft={characterDraft}
            isFormOpen={showCharacterForm}
            isEditing={Boolean(editingCharacterId)}
            imageOptions={characterImageOptions}
            canImportImage={canImportCharacterImage}
            onImportImage={importCharacterImage}
            onImportDossierImage={() => importCharacterImage("dossier")}
            onImportFocusImage={() => importCharacterImage("focus")}
            onAddCharacter={openNewCharacterForm}
            onEditCharacter={openEditCharacterForm}
            onDeleteCharacter={deleteCharacter}
            onSelectCharacter={handleSelectActiveCharacterGuarded}
            onSelectDossier={setDossierCharacterId}
            onDraftChange={updateCharacterDraft}
            onDraftImageSlotChange={updateCharacterDraftImageSlot}
            onDraftDossierChange={updateCharacterDraftDossier}
            onAddOutfit={addCharacterDraftOutfit}
            onDraftOutfitChange={updateCharacterDraftOutfit}
            onDraftOutfitImageSlotChange={updateCharacterDraftOutfitImageSlot}
            onSetActiveOutfit={setCharacterDraftActiveOutfit}
            onDeleteOutfit={deleteCharacterDraftOutfit}
            onImportOutfitImage={(outfitId, slot) =>
              importCharacterImage(slot, { outfitId })
            }
            onCancel={cancelCharacterForm}
            onSubmit={saveCharacter}
          />
        </section>
      )}

      {activeView === "settings" && (
        <SettingsView
          clientManagerProps={{
            clients: clientLibrary,
            draft: clientDraft,
            isFormOpen: showClientForm,
            isEditing: Boolean(editingClientId),
            onAddClient: openNewClientForm,
            onEditClient: openEditClientForm,
            onDeleteClient: deleteClient,
            onDraftChange: updateClientDraft,
            onCancel: cancelClientForm,
            onSubmit: saveClient,
          }}
          dataManagementProps={{
            onExportSaveData: exportSaveData,
            onImportSaveData: importSaveData,
            onArchiveToday: archiveToday,
            onResetDemoData: resetDemoData,
            onNewSeasonReset: openNewSeasonReset,
            onCreateDesktopSave: createDesktopSaveFile,
            onChooseDesktopSaveFolder: chooseDesktopSaveLocation,
            onUseFolderSave: useFolderSave,
            onReplaceFolderSave: replaceFolderSave,
            onCancelFolderConflict: cancelFolderConflict,
            onPreviewCharacterImageMigration: previewCharacterImageMigration,
            onRunCharacterImageMigration: runCharacterImageMigration,
            characterImageMigrationReport,
            characterImageMigrationStatus,
            onScanUnusedCharacterImages: scanUnusedCharacterImages,
            unusedCharacterImageScanReport,
            unusedCharacterImageScanStatus,
            onMoveUnusedCharacterImagesToArchive:
              moveUnusedCharacterImagesToArchive,
            unusedCharacterImageArchiveReport,
            unusedCharacterImageArchiveStatus,
            desktopSaveStatus,
            importFileInputRef: null,
            notice: dataNotice,
            onDismissNotice: () => setDataNotice(null),
          }}
        />
      )}

      {SHOW_LEGACY_DESK_VIEWS && (
        <BottomStatusBar
          activeWorkCount={activeTasks.length}
          completedTodayCount={completedTodayTasks.length}
          priorityCount={activeTasks.filter((task) => task.priority).length}
          activeWorkLabel={contextLabels.activeWork}
          completedTodayLabel={contextLabels.completedToday}
        />
      )}

      <DeepWorkOverlay
        task={deepWorkTask}
        employee={activeEmployee}
        timerLabel={
          deepWorkTask
            ? formatTimerSeconds(getTimerSeconds(deepWorkTask, timerNow))
            : "0:00"
        }
        xpLabel={
          deepWorkTask ? getTaskXpDisplay(deepWorkTask, timerNow) : "0 XP"
        }
        isPaused={!deepWorkTask?.timerStartedAt}
        timerActionLabel={deepWorkTask?.timerStartedAt ? "Pause" : "Resume"}
        timerActionDisabled={!isWorking}
        onTimerAction={handleDeepWorkTimerAction}
        onComplete={completeDeepWork}
        onExit={() => setDeepWorkTaskId(null)}
        deepWorkLabel={contextLabels.deepWork}
      />

      <ProjectFocusOverlay
        project={focusedProject}
        employee={activeEmployee}
        projectFocusLabel={contextLabels.projectFocus}
        completeDisabled={!isWorking || !activeEmployee}
        onCompleteStep={completeFocusedProjectStep}
        onExit={closeProjectFocus}
      />

      {activeFocusSession && (
        <FocusSessionOverlay
          project={getStudyProjectById(activeFocusSession.projectId)}
          character={characterLibraryForDisplay.find(
            (character) => character.id === activeFocusSession.characterId
          )}
          subjects={subjects}
          startedAt={activeFocusSession.startedAt}
          onSaveNotes={handleSaveProjectNotes}
          onEndSession={endFocusSession}
          onDiscard={discardFocusSession}
          onClose={discardFocusSession}
        />
      )}

      {projectFormState && (
        <ProjectForm
          mode={projectFormState.mode}
          project={projectFormState.mode === "edit" ? projectFormState.project : null}
          subjects={subjects}
          slotsAvailable={canCreateActiveStudyProject}
          onSubmit={submitProjectForm}
          onCancel={closeProjectForm}
        />
      )}

      {subjectFormState && (
        <SubjectForm
          subject={subjectFormState.mode === "edit" ? subjectFormState.subject : null}
          onSubmit={submitSubjectForm}
          onCancel={closeSubjectForm}
        />
      )}

      {projectDetailId && getStudyProjectById(projectDetailId) && (
        <ProjectDetailPanel
          project={getStudyProjectById(projectDetailId)}
          subjects={subjects}
          sessions={studySessions}
          characterLibrary={characterLibraryForDisplay}
          canFocus={canStartFocusSession()}
          slotAvailable={canCreateActiveStudyProject}
          onClose={closeProjectDetail}
          onSaveNotes={handleSaveProjectNotes}
          onEdit={(projectId) => {
            closeProjectDetail();
            openEditProjectForm(projectId);
          }}
          onFocus={handleFocusFromDetail}
          onShelve={handleShelveProject}
          onComplete={handleCompleteProject}
          onRetire={handleRetireProject}
          onRestore={handleRestoreProject}
          onDelete={handleDeleteProject}
        />
      )}

      <MeetingDraftRecoveryDialog
        draft={meetingDraftRecovery}
        warnings={meetingDraftWarnings}
        onResume={resumeMeetingDraft}
        onDiscard={discardMeetingDraft}
      />

      <MeetingModeOverlay
        meetingTask={meetingTask}
        session={meetingSession}
        actionItems={meetingActionItems}
        actionTitle={meetingActionTitle}
        actionPriority={meetingActionPriority}
        exportStatus={meetingExportState.status}
        exportMessage={meetingExportState.message}
        isExporting={meetingExportState.status === "saving"}
        onNotesChange={updateMeetingNotes}
        onActionTitleChange={setMeetingActionTitle}
        onActionPriorityChange={setMeetingActionPriority}
        onAddActionItem={addMeetingActionItem}
        onEndMeeting={endMeetingMode}
        onDownloadMeetingNotes={downloadCurrentMeetingNotes}
        onExitWithoutExport={closeMeetingModeWithoutExport}
        onCloseMeeting={closeMeetingMode}
      />

      <EndOfDaySummaryModal
        summary={endOfDaySummary}
        onCancel={closeEndOfDaySummary}
        onConfirmArchive={() =>
          performArchiveToday(endOfDaySummary?.workday || workday)
        }
        workLogLabel={contextLabels.workLog}
        saveButtonLabel={
          getCharacterContext(activeEmployee) === "class" ? "Save" : undefined
        }
      />

      <ArchiveDayDetailModal
        entry={selectedHistoryEntry}
        getEmployeeName={getEmployeeName}
        onClose={() => setSelectedHistoryEntry(null)}
        workLogLabel={contextLabels.workLog}
      />

      {dossierCharacterId && (
        <CharacterDossier
          key={selectedDossierCharacterId}
          character={selectedDossierCharacter}
          isActive={selectedDossierCharacterId === activeEmployeeId}
          completedWorkCount={dossierCompletedWorkCount}
          recentWorkLogCount={dossierRecentWorkLogCount}
          onClose={() => setDossierCharacterId(null)}
        />
      )}

      {isOutfitSelectorOpen && activeEmployee && (
        <OutfitSelectorModal
          employee={activeEmployee}
          resolveImageReference={getDisplayImageUrl}
          onSelectOutfit={updateActiveEmployeeOutfit}
          onClose={() => setIsOutfitSelectorOpen(false)}
        />
      )}

      <ConfirmDialog
        config={confirmDialog}
        onConfirm={handleConfirmDialogAction}
        onCancel={closeConfirmDialog}
      />

      <ResetConfirmDialog
        isOpen={Boolean(resetConfirmConfig)}
        {...(resetConfirmConfig || {})}
        onConfirm={() => {
          const confirmedResetType = resetConfirmType;

          setResetConfirmType(null);

          if (confirmedResetType === "season") {
            performNewSeasonReset();
            return;
          }

          performReset();
        }}
        onCancel={() => setResetConfirmType(null)}
      />

    </main>
  );
}

export default App;
