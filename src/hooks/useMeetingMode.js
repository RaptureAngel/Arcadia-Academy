import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createMeetingActionItemSnapshot,
  createMeetingTaskSnapshot,
  getMeetingDraftWarnings,
  isMeetingModeEligibleTask,
} from "../utils/meetingDrafts";
import {
  buildMeetingNotesText,
  getMeetingNotesFileName,
} from "../utils/meetingNotesExport";
import {
  clearDesktopMeetingDraft,
  clearMeetingDraft,
  isDesktopStorageAvailable,
  readDesktopMeetingDraft,
  readMeetingDraft,
  writeDesktopMeetingDraft,
  writeDesktopMeetingNotesFile,
  writeMeetingDraft,
} from "../utils/storage";
import { getTodayKey } from "../utils/dates";
import { getTaskXpRule } from "../utils/xp";
import { isRegularTask } from "../utils/tasks";

const MEETING_TASK_TYPE = "Meeting / Call";
const MEETING_FOLLOW_UP_TASK_TYPE = "Meeting Follow-up";
const MEETING_DRAFT_AUTOSAVE_DELAY_MS = 750;
const MEETING_DRAFT_FLUSH_EVENT_NAMES = ["pagehide", "beforeunload"];

function downloadMeetingNotesFile(session, task, actionItems) {
  const meetingNotesText = buildMeetingNotesText(session, task, actionItems);
  const meetingNotesFileName = getMeetingNotesFileName(session, task);
  const blob = new Blob([meetingNotesText], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = url;
  downloadLink.download = meetingNotesFileName;
  downloadLink.click();
  URL.revokeObjectURL(url);
}

function getDesktopMeetingNotesLocationLabel(result) {
  return result.folderPath
    ? result.folderPath
    : result.fallback
      ? "app data fallback"
      : result.saveLocation === "chosen"
        ? "chosen save folder"
        : "app data";
}

export function useMeetingMode({
  tasks,
  setTasks,
  isWorking,
  desktopSaveState,
  desktopSaveHydrationReady,
  completeTask,
  openConfirmDialog,
  onPrepareMeetingMode,
} = {}) {
  const [meetingSession, setMeetingSession] = useState(null);
  const [meetingActionTitle, setMeetingActionTitle] = useState("");
  const [meetingActionPriority, setMeetingActionPriority] = useState(false);
  const [meetingExportState, setMeetingExportState] = useState({
    status: "idle",
    message: "",
  });
  const [recoveredMeetingTaskSnapshot, setRecoveredMeetingTaskSnapshot] =
    useState(null);
  const [meetingDraftRecovery, setMeetingDraftRecovery] = useState(null);
  const meetingDraftRecoveryCheckedRef = useRef(false);
  const latestMeetingDraftRef = useRef(null);

  const liveMeetingTask = meetingSession
    ? tasks.find(
        (task) =>
          task.id === meetingSession.taskId &&
          isRegularTask(task) &&
          task.taskType === MEETING_TASK_TYPE
      )
    : null;
  const meetingTask = liveMeetingTask || recoveredMeetingTaskSnapshot;
  const meetingActionItems = useMemo(() => {
    if (!meetingSession) return [];

    return meetingSession.actionItemIds
      .map((actionItemId) => tasks.find((task) => task.id === actionItemId))
      .filter(Boolean);
  }, [meetingSession, tasks]);
  const meetingDraftWarnings = meetingDraftRecovery
    ? getMeetingDraftWarnings(meetingDraftRecovery, tasks)
    : [];

  function buildMeetingDraft({
    session = meetingSession,
    meetingTaskOverride = meetingTask,
    actionItems = meetingActionItems,
    actionTitle = meetingActionTitle,
    actionPriority = meetingActionPriority,
  } = {}) {
    if (!session || !meetingTaskOverride) return null;

    return {
      session,
      meetingTaskSnapshot: createMeetingTaskSnapshot(meetingTaskOverride),
      actionItemSnapshots: actionItems
        .map(createMeetingActionItemSnapshot)
        .filter(Boolean),
      form: {
        actionTitle,
        actionPriority,
      },
    };
  }

  function persistMeetingDraft(options = {}) {
    const draft = buildMeetingDraft(options);

    if (!draft) return { ok: false, error: null };

    latestMeetingDraftRef.current = draft;

    const result = writeMeetingDraft(draft);

    if (isDesktopStorageAvailable()) {
      writeDesktopMeetingDraft(draft);
    }

    return result;
  }

  function clearStoredMeetingDraft() {
    latestMeetingDraftRef.current = null;
    clearMeetingDraft();

    if (isDesktopStorageAvailable()) {
      clearDesktopMeetingDraft();
    }
  }

  const resetMeetingModeState = useCallback(() => {
    setMeetingSession(null);
    setMeetingActionTitle("");
    setMeetingActionPriority(false);
    setMeetingExportState({ status: "idle", message: "" });
    setRecoveredMeetingTaskSnapshot(null);
    setMeetingDraftRecovery(null);
  }, []);

  useEffect(() => {
    function flushMeetingDraft() {
      if (latestMeetingDraftRef.current) {
        writeMeetingDraft(latestMeetingDraftRef.current);
      }
    }

    MEETING_DRAFT_FLUSH_EVENT_NAMES.forEach((eventName) => {
      window.addEventListener(eventName, flushMeetingDraft);
    });

    return () => {
      MEETING_DRAFT_FLUSH_EVENT_NAMES.forEach((eventName) => {
        window.removeEventListener(eventName, flushMeetingDraft);
      });
    };
  }, []);

  useEffect(() => {
    if (meetingDraftRecoveryCheckedRef.current) return;
    if (meetingSession) return;
    if (desktopSaveState?.isTauri && desktopSaveState.status === "checking") {
      return;
    }
    if (!desktopSaveHydrationReady) return;

    meetingDraftRecoveryCheckedRef.current = true;

    let isCancelled = false;

    async function loadMeetingDraftRecovery() {
      const localDraft = readMeetingDraft();
      const desktopDraft = localDraft
        ? null
        : await readDesktopMeetingDraft();
      const savedDraft = localDraft || desktopDraft?.draft || null;

      if (isCancelled || !savedDraft) return;

      setMeetingDraftRecovery(savedDraft);
    }

    loadMeetingDraftRecovery();

    return () => {
      isCancelled = true;
    };
  }, [
    desktopSaveHydrationReady,
    desktopSaveState?.isTauri,
    desktopSaveState?.status,
    meetingSession,
  ]);

  useEffect(() => {
    if (!meetingSession || !meetingTask) return undefined;
    if (meetingExportState.status === "success") return undefined;

    const draft = {
      session: meetingSession,
      meetingTaskSnapshot: createMeetingTaskSnapshot(meetingTask),
      actionItemSnapshots: meetingActionItems
        .map(createMeetingActionItemSnapshot)
        .filter(Boolean),
      form: {
        actionTitle: meetingActionTitle,
        actionPriority: meetingActionPriority,
      },
    };

    latestMeetingDraftRef.current = draft;

    const autosaveTimer = window.setTimeout(() => {
      writeMeetingDraft(draft);

      if (isDesktopStorageAvailable()) {
        writeDesktopMeetingDraft(draft);
      }
    }, MEETING_DRAFT_AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(autosaveTimer);
  }, [
    meetingSession,
    meetingTask,
    meetingActionItems,
    meetingActionTitle,
    meetingActionPriority,
    meetingExportState.status,
  ]);

  function openMeetingMode(task) {
    if (!isWorking || !isMeetingModeEligibleTask(task)) {
      return;
    }

    const nextSession = {
      taskId: task.id,
      startedAt: new Date().toISOString(),
      notes: "",
      actionItemIds: [],
    };

    onPrepareMeetingMode?.();
    setRecoveredMeetingTaskSnapshot(createMeetingTaskSnapshot(task));
    setMeetingSession(nextSession);
    setMeetingActionTitle("");
    setMeetingActionPriority(false);
    setMeetingExportState({ status: "idle", message: "" });
    persistMeetingDraft({
      session: nextSession,
      meetingTaskOverride: task,
      actionItems: [],
      actionTitle: "",
      actionPriority: false,
    });
  }

  function closeMeetingMode({ clearDraft = false } = {}) {
    if (clearDraft) {
      clearStoredMeetingDraft();
    }

    setMeetingSession(null);
    setMeetingActionTitle("");
    setMeetingActionPriority(false);
    setMeetingExportState({ status: "idle", message: "" });
    setRecoveredMeetingTaskSnapshot(null);
  }

  function updateMeetingNotes(notes) {
    setMeetingSession((currentSession) =>
      currentSession ? { ...currentSession, notes } : currentSession
    );
    setMeetingExportState({ status: "idle", message: "" });
  }

  function addMeetingActionItem(event) {
    event.preventDefault();

    if (!meetingSession || !meetingTask) return;
    if (!meetingActionTitle.trim()) return;

    const actionItemId = crypto.randomUUID();
    const nextSession = {
      ...meetingSession,
      actionItemIds: [...meetingSession.actionItemIds, actionItemId],
    };
    const newActionItem = {
      id: actionItemId,
      title: meetingActionTitle.trim(),
      client: meetingTask.client,
      taskType: MEETING_FOLLOW_UP_TASK_TYPE,
      xp: getTaskXpRule(MEETING_FOLLOW_UP_TASK_TYPE).fallbackXp,
      completed: false,
      completedBy: null,
      createdDate: getTodayKey(),
      completedDate: null,
      projectId: null,
      projectName: null,
      deadline: null,
      priority: meetingActionPriority,
      timerTotalSeconds: 0,
      timerStartedAt: null,
    };

    setTasks((currentTasks) => [newActionItem, ...currentTasks]);
    setMeetingSession(nextSession);
    setMeetingActionTitle("");
    setMeetingActionPriority(false);
    setMeetingExportState({ status: "idle", message: "" });
    persistMeetingDraft({
      session: nextSession,
      meetingTaskOverride: meetingTask,
      actionItems: [newActionItem, ...meetingActionItems],
      actionTitle: "",
      actionPriority: false,
    });
  }

  function resumeMeetingDraft() {
    if (!meetingDraftRecovery) return;

    const liveTask = tasks.find(
      (task) =>
        task.id === meetingDraftRecovery.session.taskId &&
        isRegularTask(task) &&
        task.taskType === MEETING_TASK_TYPE
    );
    const liveTaskIds = new Set(tasks.map((task) => task.id));
    const actionItemIds = meetingDraftRecovery.session.actionItemIds.filter(
      (actionItemId) => liveTaskIds.has(actionItemId)
    );
    const nextSession = {
      ...meetingDraftRecovery.session,
      actionItemIds,
    };
    const recoveredActionItems = actionItemIds
      .map((actionItemId) => tasks.find((task) => task.id === actionItemId))
      .filter(Boolean);

    onPrepareMeetingMode?.();
    setMeetingSession(nextSession);
    setRecoveredMeetingTaskSnapshot(meetingDraftRecovery.meetingTaskSnapshot);
    setMeetingActionTitle(meetingDraftRecovery.form.actionTitle);
    setMeetingActionPriority(meetingDraftRecovery.form.actionPriority);
    setMeetingExportState({ status: "idle", message: "" });
    setMeetingDraftRecovery(null);
    persistMeetingDraft({
      session: nextSession,
      meetingTaskOverride: liveTask || meetingDraftRecovery.meetingTaskSnapshot,
      actionItems: recoveredActionItems,
      actionTitle: meetingDraftRecovery.form.actionTitle,
      actionPriority: meetingDraftRecovery.form.actionPriority,
    });
  }

  function discardMeetingDraft() {
    clearStoredMeetingDraft();
    setMeetingDraftRecovery(null);
  }

  async function endMeetingMode() {
    if (!meetingSession || !meetingTask) return;

    const meetingNotesFileName = getMeetingNotesFileName(
      meetingSession,
      meetingTask
    );

    if (!isDesktopStorageAvailable()) {
      try {
        downloadMeetingNotesFile(meetingSession, meetingTask, meetingActionItems);
        completeTask(meetingTask.id);
        clearStoredMeetingDraft();
        setMeetingActionTitle("");
        setMeetingActionPriority(false);
        setMeetingExportState({
          status: "success",
          message: `Downloaded meeting notes: ${meetingNotesFileName}. Meeting task completed.`,
        });
      } catch (error) {
        console.warn("Could not download meeting notes.", error);
        setMeetingExportState({
          status: "error",
          message: "Meeting notes download failed. Try Download .txt.",
        });
      }
      return;
    }

    setMeetingExportState({
      status: "saving",
      message: "Saving meeting notes...",
    });

    const result = await writeDesktopMeetingNotesFile(
      meetingSession,
      meetingTask,
      meetingActionItems
    );

    if (result.ok) {
      completeTask(meetingTask.id);
      clearStoredMeetingDraft();
      setMeetingActionTitle("");
      setMeetingActionPriority(false);

      setMeetingExportState({
        status: "success",
        message: `Saved meeting notes: ${result.fileName || meetingNotesFileName} in ${getDesktopMeetingNotesLocationLabel(result)}. Meeting task completed.`,
      });
      return;
    }

    setMeetingExportState({
      status: "error",
      message:
        "Meeting notes could not be saved to desktop storage. Retry or download a .txt fallback.",
    });
  }

  function downloadCurrentMeetingNotes() {
    if (!meetingSession || !meetingTask) return;

    const meetingNotesFileName = getMeetingNotesFileName(
      meetingSession,
      meetingTask
    );

    try {
      downloadMeetingNotesFile(meetingSession, meetingTask, meetingActionItems);
      completeTask(meetingTask.id);
      clearStoredMeetingDraft();
      setMeetingActionTitle("");
      setMeetingActionPriority(false);
      setMeetingExportState({
        status: "success",
        message: `Downloaded meeting notes: ${meetingNotesFileName}. Meeting task completed.`,
      });
    } catch (error) {
      console.warn("Could not download meeting notes.", error);
      setMeetingExportState({
        status: "error",
        message: "Meeting notes download failed. Try again.",
      });
    }
  }

  function closeMeetingModeWithoutExport() {
    if (!meetingSession) return;

    const hasMeetingContent =
      meetingSession.notes.trim().length > 0 ||
      meetingSession.actionItemIds.length > 0;

    if (!hasMeetingContent) {
      closeMeetingMode({ clearDraft: true });
      return;
    }

    openConfirmDialog({
      title: "Exit Meeting Mode",
      message:
        "Exit without exporting these meeting notes? Action items already added will stay in your task list.",
      confirmLabel: "Exit Without Export",
      isDangerous: true,
      onConfirm: () => closeMeetingMode({ clearDraft: true }),
    });
  }

  return {
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
  };
}
