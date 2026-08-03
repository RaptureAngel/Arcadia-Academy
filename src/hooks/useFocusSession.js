import { useEffect, useRef, useState } from "react";
import { calculateAcademySessionXp } from "../utils/academyXp";
import { getLevel } from "../utils/xp";
import {
  addFocusedTimeAndSession,
  isOpenEndedStudyProject,
  PROJECT_STATUS_LABELS,
  updateStudyProjectProgress,
  validateStudyProject,
} from "../utils/studyProjects";
import { createStudySession, validateStudySession } from "../utils/studySessions";
import { isDesktopStorageAvailable } from "../utils/storage";
import {
  clearActiveFocusSessionRecoveryRecord,
  createActiveFocusSessionRecoveryRecord,
  loadActiveFocusSessionRecoveryRecord,
  saveActiveFocusSessionRecoveryRecord,
} from "../utils/focusSessionRecovery";

// Checkpoint roughly every 10-15s while a session is active, so an
// interruption never loses more than a few seconds of real study time.
const CHECKPOINT_INTERVAL_MS = 12000;

function toFiniteOrNull(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

// Focused-seconds are tracked as a baseline (already-checkpointed seconds)
// plus wall-clock time elapsed since that baseline was set. A fresh session
// has baseline 0 anchored at its own start; a resumed session has baseline
// == the recovered checkpoint anchored at the moment it was resumed. Either
// way, time the app was closed is never added, because the anchor only
// advances while the app is actually running.
function computeFocusedSeconds(session, atIso = new Date().toISOString()) {
  const elapsedSinceBaseline = Math.round(
    (new Date(atIso).getTime() - new Date(session.baselineAt).getTime()) / 1000
  );

  return Math.max(0, session.focusedSecondsBaseline + Math.max(0, elapsedSinceBaseline));
}

export function useFocusSession({
  setStudyProjects,
  setStudySessions,
  characterLibrary,
  setCharacterLibrary,
  getProjectById,
}) {
  const [activeSession, setActiveSession] = useState(null);
  const [recoveryRecord, setRecoveryRecord] = useState(() =>
    loadActiveFocusSessionRecoveryRecord()
  );
  // Synchronous locks (not React state) so double-clicks/rapid repeats
  // can't race past a state check and double-process the same action.
  const isEndingSessionRef = useRef(false);
  const isResolvingRecoveryRef = useRef(false);

  function persistCheckpoint(session, atIso = new Date().toISOString()) {
    saveActiveFocusSessionRecoveryRecord(
      createActiveFocusSessionRecoveryRecord({
        projectId: session.projectId,
        characterId: session.characterId,
        startedAt: session.startedAt,
        checkpointedFocusedSeconds: computeFocusedSeconds(session, atIso),
        lastCheckpointAt: atIso,
        createdAt: session.recoveryCreatedAt,
        updatedAt: atIso,
      })
    );
  }

  // Periodic checkpoint while a session is running.
  useEffect(() => {
    if (!activeSession) return undefined;

    const interval = window.setInterval(() => {
      persistCheckpoint(activeSession);
    }, CHECKPOINT_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [activeSession]);

  // Flush a final checkpoint on the ways the app can actually go away.
  useEffect(() => {
    if (!activeSession) return undefined;

    function flush() {
      persistCheckpoint(activeSession);
    }

    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);

    let unlistenCloseRequested = null;
    let cancelled = false;

    if (isDesktopStorageAvailable()) {
      import("@tauri-apps/api/window")
        .then(({ getCurrentWindow }) => getCurrentWindow().onCloseRequested(flush))
        .then((unlisten) => {
          if (cancelled) {
            unlisten();
            return;
          }
          unlistenCloseRequested = unlisten;
        })
        .catch(() => {
          // No close-request hook available in this environment — pagehide/
          // beforeunload above still cover the normal-close case.
        });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      unlistenCloseRequested?.();
    };
  }, [activeSession]);

  // Recomputed every render from the current project/character library, so
  // it always reflects the latest data (including after async desktop-save
  // hydration replaces what was loaded from localStorage on first paint).
  const pendingRecovery = recoveryRecord
    ? { record: recoveryRecord, validation: validateRecoveryRecord(recoveryRecord) }
    : null;

  function validateRecoveryRecord(record) {
    const project = getProjectById(record.projectId);

    if (!project) {
      return {
        valid: false,
        reason: "The study project for this session no longer exists.",
        project: null,
        character: null,
      };
    }

    if (project.status !== "active") {
      return {
        valid: false,
        reason: `This project is now ${
          PROJECT_STATUS_LABELS[project.status] || project.status
        } and can't be resumed.`,
        project,
        character: null,
      };
    }

    const character = record.characterId
      ? characterLibrary.find((item) => item.id === record.characterId) || null
      : null;

    if (record.characterId && !character) {
      return {
        valid: false,
        reason: "The character for this session no longer exists.",
        project,
        character: null,
      };
    }

    return { valid: true, reason: null, project, character };
  }

  function canStartSession() {
    return !activeSession && !pendingRecovery;
  }

  function startSession(projectId, characterId) {
    if (activeSession) {
      return { ok: false, error: "A focus session is already running." };
    }

    if (pendingRecovery) {
      return {
        ok: false,
        error: "Resume or discard the recovered study session first.",
      };
    }

    const project = getProjectById(projectId);

    if (!project || project.status !== "active") {
      return { ok: false, error: "That project is not available to focus on." };
    }

    const startedAt = new Date().toISOString();
    const session = {
      projectId,
      characterId: characterId || null,
      startedAt,
      focusedSecondsBaseline: 0,
      baselineAt: startedAt,
      recoveryCreatedAt: startedAt,
    };

    setActiveSession(session);
    persistCheckpoint(session, startedAt);

    return { ok: true };
  }

  // Restores a previously interrupted session from its recovery record.
  // Deliberately does not create a session record, award XP, or change
  // project progress — those only happen when the resumed session is
  // properly ended via endSession().
  function resumeRecoverySession() {
    if (activeSession) {
      return { ok: false, error: "A focus session is already running." };
    }

    if (!pendingRecovery) {
      return { ok: false, error: "There is no recovered session to resume." };
    }

    if (isResolvingRecoveryRef.current) {
      return { ok: false, error: "This recovery is already being handled." };
    }

    isResolvingRecoveryRef.current = true;

    if (!pendingRecovery.validation.valid) {
      isResolvingRecoveryRef.current = false;
      return { ok: false, error: pendingRecovery.validation.reason };
    }

    const { record } = pendingRecovery;
    const resumedAt = new Date().toISOString();
    const resumedSession = {
      projectId: record.projectId,
      characterId: record.characterId,
      startedAt: record.startedAt,
      focusedSecondsBaseline: record.checkpointedFocusedSeconds,
      baselineAt: resumedAt,
      recoveryCreatedAt: record.createdAt,
    };

    setActiveSession(resumedSession);
    setRecoveryRecord(null);
    // Refresh the on-disk checkpoint immediately so a second interruption
    // within the next checkpoint interval still recovers from (at worst)
    // the resume point, not the stale pre-resume checkpoint.
    persistCheckpoint(resumedSession, resumedAt);

    return { ok: true };
  }

  // Deliberately discards the recovery draft without creating any session,
  // awarding XP, or changing project progress.
  function discardRecoverySession() {
    if (!pendingRecovery) return { ok: false, error: "Nothing to discard." };

    if (isResolvingRecoveryRef.current) {
      return { ok: false, error: "This recovery is already being handled." };
    }

    isResolvingRecoveryRef.current = true;
    clearActiveFocusSessionRecoveryRecord();
    setRecoveryRecord(null);

    return { ok: true };
  }

  function discardSession() {
    isEndingSessionRef.current = false;
    clearActiveFocusSessionRecoveryRecord();
    setActiveSession(null);
  }

  function endSession({ progressAfter, outputCount, outcome, note } = {}) {
    if (!activeSession) {
      return { ok: false, error: "No focus session is running." };
    }

    if (isEndingSessionRef.current) {
      return { ok: false, error: "This session is already being saved." };
    }

    isEndingSessionRef.current = true;

    const project = getProjectById(activeSession.projectId);

    if (!project) {
      isEndingSessionRef.current = false;
      clearActiveFocusSessionRecoveryRecord();
      setActiveSession(null);
      return { ok: false, error: "That project no longer exists." };
    }

    const endedAt = new Date().toISOString();
    const focusedSeconds = computeFocusedSeconds(activeSession, endedAt);
    const xpAwarded = calculateAcademySessionXp(focusedSeconds);
    const progressBefore = project.progressCurrent;
    const trimmedNote = typeof note === "string" ? note.trim() : "";

    let updatedProject = addFocusedTimeAndSession(project, focusedSeconds, {
      incrementSession: true,
      outcome: outcome || null,
      timestamp: endedAt,
    });

    let progressAfterValue = progressBefore;

    if (project.progressMethod === "pages" || project.progressMethod === "chapters") {
      const nextValue = toFiniteOrNull(progressAfter);

      if (nextValue !== null) {
        updatedProject = updateStudyProjectProgress(updatedProject, nextValue, endedAt);
        progressAfterValue = updatedProject.progressCurrent;
      }
    } else if (project.progressMethod === "sessions") {
      // Increment from the existing progressCurrent (matching the "outputs"
      // pattern below), not from sessionCount directly — sessionCount only
      // tracks Academy-logged sessions, while progressCurrent may start
      // above 0 if the project was created with a manual head start.
      // Overwriting with sessionCount would silently discard that head start
      // the moment the first real session was logged.
      updatedProject = updateStudyProjectProgress(
        updatedProject,
        progressBefore + 1,
        endedAt
      );
      progressAfterValue = updatedProject.progressCurrent;
    } else if (project.progressMethod === "outputs") {
      const addedOutputs = Math.max(0, Math.round(Number(outputCount) || 0));

      updatedProject = updateStudyProjectProgress(
        updatedProject,
        progressBefore + addedOutputs,
        endedAt
      );
      progressAfterValue = updatedProject.progressCurrent;
    } else if (isOpenEndedStudyProject(project)) {
      progressAfterValue = progressBefore;
    }

    const { valid, errors } = validateStudyProject(updatedProject);

    if (!valid) {
      // Validation failed: the recovery record (if any) must survive so the
      // user can correct the end-session form and try again.
      isEndingSessionRef.current = false;
      return { ok: false, error: errors.join(" ") };
    }

    const session = createStudySession({
      projectId: project.id,
      characterId: activeSession.characterId,
      startedAt: activeSession.startedAt,
      endedAt,
      focusedSeconds,
      progressBefore,
      progressAfter: progressAfterValue,
      outputCount: project.progressMethod === "outputs" ? Number(outputCount) || 0 : 0,
      outcome: project.progressMethod === "outputs" ? outcome || null : null,
      note: trimmedNote,
      xpAwarded,
    });
    const sessionValidation = validateStudySession(session);

    if (!sessionValidation.valid) {
      isEndingSessionRef.current = false;
      return { ok: false, error: sessionValidation.errors.join(" ") };
    }

    const character = activeSession.characterId
      ? characterLibrary.find((item) => item.id === activeSession.characterId)
      : null;
    const previousLevel = character ? getLevel(character.xp) : null;
    const nextLevel =
      character && xpAwarded > 0 ? getLevel(character.xp + xpAwarded) : previousLevel;

    // All validation has passed — this is the single point where the
    // session becomes real. Clear the recovery draft now, not before.
    clearActiveFocusSessionRecoveryRecord();

    setStudyProjects((currentProjects) =>
      currentProjects.map((item) => (item.id === project.id ? updatedProject : item))
    );
    setStudySessions((currentSessions) => [...currentSessions, session]);

    if (character && xpAwarded > 0) {
      setCharacterLibrary((currentCharacters) =>
        currentCharacters.map((item) =>
          item.id === character.id ? { ...item, xp: item.xp + xpAwarded } : item
        )
      );
    }

    // Deliberately does not clear activeSession here — the overlay stays
    // mounted to show the XP result, and discardSession() (wired to the
    // overlay's "Done" button) clears it once the user dismisses the result.
    return {
      ok: true,
      project: updatedProject,
      session,
      xpAwarded,
      leveledUp: Boolean(previousLevel && nextLevel && nextLevel > previousLevel),
      newLevel: nextLevel,
    };
  }

  return {
    activeSession,
    pendingRecovery,
    canStartSession,
    startSession,
    resumeRecoverySession,
    discardRecoverySession,
    discardSession,
    endSession,
  };
}
