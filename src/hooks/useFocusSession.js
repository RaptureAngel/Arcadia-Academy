import { useRef, useState } from "react";
import { calculateAcademySessionXp } from "../utils/academyXp";
import { getLevel } from "../utils/xp";
import {
  addFocusedTimeAndSession,
  isOpenEndedStudyProject,
  updateStudyProjectProgress,
  validateStudyProject,
} from "../utils/studyProjects";
import { createStudySession, validateStudySession } from "../utils/studySessions";

function toFiniteOrNull(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

export function useFocusSession({
  setStudyProjects,
  setStudySessions,
  characterLibrary,
  setCharacterLibrary,
  getProjectById,
}) {
  const [activeSession, setActiveSession] = useState(null);
  // Synchronous lock (not React state) so a double-click on "Save Session"
  // can't race past the activeSession check and award XP/progress twice.
  const isEndingSessionRef = useRef(false);

  function canStartSession() {
    return !activeSession;
  }

  function startSession(projectId, characterId) {
    if (activeSession) {
      return { ok: false, error: "A focus session is already running." };
    }

    const project = getProjectById(projectId);

    if (!project || project.status !== "active") {
      return { ok: false, error: "That project is not available to focus on." };
    }

    setActiveSession({
      projectId,
      characterId: characterId || null,
      startedAt: new Date().toISOString(),
    });

    return { ok: true };
  }

  function discardSession() {
    isEndingSessionRef.current = false;
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
      setActiveSession(null);
      return { ok: false, error: "That project no longer exists." };
    }

    const endedAt = new Date().toISOString();
    const focusedSeconds = Math.max(
      0,
      Math.round(
        (new Date(endedAt).getTime() - new Date(activeSession.startedAt).getTime()) /
          1000
      )
    );
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
      updatedProject = updateStudyProjectProgress(
        updatedProject,
        updatedProject.sessionCount,
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
    canStartSession,
    startSession,
    discardSession,
    endSession,
  };
}
