import { useEffect, useRef, useState } from "react";
import { employees } from "../data/employees";
import {
  createCharacterLibraryFromSavedEmployees,
  createCharacterLibraryFromStarterCharacters,
  createCharacterLibraryRecord,
} from "../utils/characters";
import {
  areAcademyDatasetsEquivalent,
  isAcademyDatasetEmptyOrUntouched,
  normalizeAcademyDataset,
} from "../utils/academyDataComparison";
import { getTodayKey } from "../utils/dates";
import {
  moveUnusedCharacterImagesToArchive,
  previewCharacterImageMigration,
  runCharacterImageMigration,
  scanUnusedCharacterImages,
} from "../utils/characterImageMigration";
import {
  bumpLocalSaveRevision,
  compareLocalAndDesktopSaveState,
  loadLocalSaveMetadata,
  markLocalSaveSyncedWithDesktop,
  saveLocalSaveMetadata,
} from "../utils/localSaveMetadata";
import {
  STORAGE_KEYS,
  buildSavePayload,
  chooseDesktopSaveFolder,
  createResetAcademyActivityPayload,
  downloadSavePayload,
  inspectDesktopSaveFolder,
  isDesktopStorageAvailable,
  parseImportedSave,
  readDesktopSavePayload,
  readSaveFromLocalStorage,
  repairCorruptDesktopSave,
  saveData,
  validateSavePayload,
  writeDesktopSavePayload,
  writeDesktopStorageConfig,
  writeSaveToLocalStorage,
} from "../utils/storage";

function createNewSeasonCharacterLibrary(characters) {
  return characters.map((character) => ({
    ...character,
    xp: 0,
  }));
}

// Automatic (data-change-triggered) desktop writes back off for this long
// after a failure, so a run of small edits doesn't retry in a tight loop.
// The explicit "Retry Save" action always bypasses this.
const AUTO_RETRY_COOLDOWN_MS = 20 * 1000;

const DESKTOP_SAVE_STATUS_COPY = {
  checking: {
    label: "Checking desktop save",
    description: "Looking for an Arcadia Academy desktop save file.",
  },
  unavailable: {
    label: "Browser save active",
    description: "Desktop save files are only available in the Tauri app.",
  },
  missing: {
    label: "Local browser save active",
    description: "No desktop save file exists yet. You can create one from this save.",
  },
  folderUnavailable: {
    label: "Save folder unavailable",
    description: "Arcadia Academy is using app data fallback until the chosen folder is available.",
  },
  folderConflict: {
    label: "Folder save found",
    description: "The selected folder already has an Arcadia Academy save. Choose how to continue.",
  },
  folderCorrupt: {
    label: "Folder save needs attention",
    description: "The selected folder has an unreadable save file. It was not overwritten.",
  },
  saveConflict: {
    label: "Save conflict needs a decision",
    description: "Local and desktop data have both changed. Choose which one to keep.",
  },
  active: {
    label: "Desktop save active",
    description: "Arcadia Academy is mirroring this save to the desktop JSON file.",
  },
  corrupt: {
    label: "Desktop save needs attention",
    description: "The desktop save file could not be read. It was not overwritten.",
  },
  writing: {
    label: "Writing desktop save",
    description: "Arcadia Academy is creating or updating the desktop save file.",
  },
  writeError: {
    label: "Desktop save write failed",
    description: "Local browser save is still active as a fallback.",
  },
  backupError: {
    label: "Desktop backup failed",
    description: "Could not create a backup before saving, so the save was not overwritten.",
  },
};

const RESET_CONFIRM_CONFIGS = {
  activity: {
    title: "Reset Activity",
    label: "Reset Activity",
    confirmWord: "RESET",
    confirmButtonLabel: "Reset Activity",
    message:
      "This permanently deletes all subjects, study projects, project notes, progress, and study sessions, and ends any focus session in progress. Your character roster, character images, outfits, character XP, and save-folder configuration are kept. A backup of the current save is made first where a desktop save is active.",
  },
  season: {
    title: "New Season",
    label: "New Season",
    confirmWord: "NEW SEASON",
    confirmButtonLabel: "Start New Season",
    message:
      "This permanently deletes all subjects, study projects, project notes, progress, and study sessions, ends any focus session in progress, and resets every character's XP and level to zero. Your character roster, dossier fields, character images, outfits, and save-folder configuration are kept. A backup of the current save is made first where a desktop save is active.",
  },
};

export function useDataManagement({
  activeEmployeeId,
  characterLibrary,
  setCharacterLibrary,
  subjects,
  studyProjects,
  studySessions,
  setDataNotice,
  hydrateFromStorage,
  hydrateAfterReset,
  openConfirmDialog,
} = {}) {
  const [desktopSaveState, setDesktopSaveState] = useState(() => ({
    isTauri: isDesktopStorageAvailable(),
    status: isDesktopStorageAvailable() ? "checking" : "unavailable",
    active: false,
    saveLocation: "appData",
    folderPath: null,
    configuredFolderPath: null,
    error: null,
  }));
  const [desktopSaveHydrationReady, setDesktopSaveHydrationReady] = useState(
    () => !isDesktopStorageAvailable()
  );
  const [pendingFolderConflict, setPendingFolderConflict] = useState(null);
  // A startup or runtime save conflict that needs a Use Local / Use Desktop /
  // Cancel decision. `dismissed` is set by Cancel: the blocking dialog goes
  // away, but the conflict is NOT resolved — autosave stays paused and the
  // persistent warning banner keeps offering "Review" until the user
  // actually picks a side.
  const [pendingSaveConflict, setPendingSaveConflict] = useState(null);
  const [saveConflictDismissed, setSaveConflictDismissed] = useState(false);
  const [corruptRepairStatus, setCorruptRepairStatus] = useState("idle");
  const [resetConfirmType, setResetConfirmType] = useState(null);
  const [characterImageMigrationReport, setCharacterImageMigrationReport] =
    useState(null);
  const [characterImageMigrationStatus, setCharacterImageMigrationStatus] =
    useState("idle");
  const [unusedCharacterImageScanReport, setUnusedCharacterImageScanReport] =
    useState(null);
  const [unusedCharacterImageScanStatus, setUnusedCharacterImageScanStatus] =
    useState("idle");
  const [unusedCharacterImageArchiveReport, setUnusedCharacterImageArchiveReport] =
    useState(null);
  const [unusedCharacterImageArchiveStatus, setUnusedCharacterImageArchiveStatus] =
    useState("idle");
  const lastDesktopSaveJsonRef = useRef(null);
  const desktopSaveHydratingRef = useRef(false);
  const localMetadataRef = useRef(loadLocalSaveMetadata());
  const isWritingDesktopSaveRef = useRef(false);
  const lastWriteFailureAtRef = useRef(0);
  const pendingSaveConflictRef = useRef(null);

  // Keep latest callback refs so one-time effects don't capture stale closures
  const hydrateFromStorageRef = useRef(hydrateFromStorage);
  const hydrateAfterResetRef = useRef(hydrateAfterReset);
  hydrateFromStorageRef.current = hydrateFromStorage;
  hydrateAfterResetRef.current = hydrateAfterReset;

  // Latest render's data, for use inside event handlers/timers that must
  // not act on a stale closure (pagehide/beforeunload/close-requested).
  const latestDataRef = useRef(null);

  useEffect(() => {
    pendingSaveConflictRef.current = pendingSaveConflict;
    latestDataRef.current = {
      activeEmployeeId,
      characterLibrary,
      subjects,
      studyProjects,
      studySessions,
    };
  });

  const desktopSaveStatusCopy =
    DESKTOP_SAVE_STATUS_COPY[
      pendingFolderConflict
        ? "folderConflict"
        : pendingSaveConflict
        ? "saveConflict"
        : desktopSaveState.status
    ] || DESKTOP_SAVE_STATUS_COPY.unavailable;

  const desktopSaveStatus = {
    ...desktopSaveState,
    status: pendingFolderConflict
      ? "folderConflict"
      : pendingSaveConflict
      ? "saveConflict"
      : desktopSaveState.status,
    configuredFolderPath:
      pendingFolderConflict?.folderPath || desktopSaveState.configuredFolderPath,
    folderConflict: pendingFolderConflict,
    ...desktopSaveStatusCopy,
    canCreate:
      desktopSaveState.isTauri &&
      !desktopSaveState.active &&
      desktopSaveState.status === "missing",
    canChooseFolder:
      desktopSaveState.isTauri && desktopSaveState.status !== "writing",
    hasFolderConflict:
      desktopSaveState.isTauri && Boolean(pendingFolderConflict),
    canRetry:
      desktopSaveState.isTauri &&
      ["writeError", "backupError", "folderUnavailable"].includes(
        desktopSaveState.status
      ),
    canRepairCorrupt:
      desktopSaveState.isTauri && desktopSaveState.status === "corrupt",
  };

  // Shown as a persistent, app-wide banner whenever desktop saving is
  // expected but not healthy. Deliberately excludes "unavailable"/"missing"
  // (desktop saving was simply never configured — not a failure) and the
  // healthy/transient states.
  const desktopSaveWarning =
    desktopSaveState.isTauri &&
    (["corrupt", "writeError", "backupError", "folderUnavailable"].includes(
      desktopSaveState.status
    ) ||
      (pendingSaveConflict && saveConflictDismissed))
      ? {
          status: pendingSaveConflict ? "saveConflict" : desktopSaveState.status,
          message:
            "Desktop save needs attention. Your current work is still stored locally on this device.",
        }
      : null;

  const resetConfirmConfig = resetConfirmType
    ? RESET_CONFIRM_CONFIGS[resetConfirmType]
    : null;

  function getImportFallbackBuilders() {
    return {
      createCharacterLibraryFallback: (data) => {
        const importedEmployees = Object.hasOwn(data, "employees")
          ? data.employees
          : null;

        return importedEmployees
          ? createCharacterLibraryFromSavedEmployees(employees, importedEmployees)
          : createCharacterLibraryFromStarterCharacters(employees);
      },
      createCharacterLibraryRecordFallback: createCharacterLibraryRecord,
    };
  }

  function buildCurrentSaveData(overrides = {}) {
    const source = overrides.fromLatestRef ? latestDataRef.current : {
      activeEmployeeId,
      characterLibrary,
      subjects,
      studyProjects,
      studySessions,
    };
    const nextCharacterLibrary = overrides.characterLibrary || source.characterLibrary;

    return {
      activeEmployeeId: source.activeEmployeeId,
      employees: nextCharacterLibrary,
      characterLibrary: createCharacterLibraryRecord(nextCharacterLibrary),
      subjects: overrides.subjects ?? source.subjects ?? [],
      studyProjects: overrides.studyProjects ?? source.studyProjects ?? [],
      studySessions: overrides.studySessions ?? source.studySessions ?? [],
    };
  }

  // The single place that stamps a desktop payload with this device's
  // current local-freshness metadata (updatedAt/revision) — see
  // localSaveMetadata.js. Manual exports deliberately do NOT go through
  // this (see exportSaveData), since that metadata is meaningless once a
  // save leaves this device.
  function buildDesktopPayloadFromLocal(overrides = {}) {
    const metadata = localMetadataRef.current;

    return buildSavePayload(buildCurrentSaveData(overrides), new Date().toISOString(), {
      updatedAt: metadata.updatedAt || new Date().toISOString(),
      revision: metadata.revision,
    });
  }

  function markSyncedWithDesktopMetadata(desktopMetadata) {
    localMetadataRef.current = markLocalSaveSyncedWithDesktop(
      localMetadataRef.current,
      desktopMetadata
    );
    saveLocalSaveMetadata(localMetadataRef.current);
  }

  function getDesktopSaveStateFromResult(result, overrides = {}) {
    return {
      isTauri: true,
      status: overrides.status || result.status,
      active: overrides.active ?? result.status === "active",
      saveLocation: result.saveLocation || "appData",
      folderPath: result.folderPath || null,
      configuredFolderPath: result.configuredFolderPath || null,
      error: result.error || null,
    };
  }

  // Applies one complete, already-validated side of a conflict (or a plain
  // startup hydration) atomically: local storage is replaced with exactly
  // one payload's data.collections, never a mix. Guarded by
  // desktopSaveHydratingRef so the revision-bump effect below doesn't
  // mistake the resulting state change for a genuine local edit.
  function hydrateLocalFromDesktopPayload(payload, message) {
    desktopSaveHydratingRef.current = true;
    lastDesktopSaveJsonRef.current = JSON.stringify(payload);
    writeSaveToLocalStorage(payload, getImportFallbackBuilders());
    markSyncedWithDesktopMetadata(payload.metadata);
    hydrateFromStorageRef.current(message);

    window.setTimeout(() => {
      desktopSaveHydratingRef.current = false;
    }, 0);
  }

  useEffect(() => {
    if (!desktopSaveState.isTauri) return undefined;

    let isCancelled = false;

    async function loadDesktopSave() {
      const result = await readDesktopSavePayload();

      if (isCancelled) return;

      if (
        (result.status === "active" || result.status === "folderUnavailable") &&
        result.payload
      ) {
        // Only meaningful when no revision history has ever been tracked
        // locally (see the "bootstrapContext" note in
        // compareLocalAndDesktopSaveState) — computed unconditionally
        // since it's cheap and only happens once at startup.
        const localDataset = normalizeAcademyDataset({
          activeEmployeeId,
          characterLibrary,
          subjects,
          studyProjects,
          studySessions,
        });
        const desktopDataset = normalizeAcademyDataset(result.payload.data);

        const comparison = compareLocalAndDesktopSaveState(
          localMetadataRef.current,
          result.payload.metadata,
          {
            isLocalDataEmptyOrUntouched: isAcademyDatasetEmptyOrUntouched(localDataset),
            isLocalDataEquivalentToDesktop: areAcademyDatasetsEquivalent(
              localDataset,
              desktopDataset
            ),
          }
        );

        if (comparison.outcome === "conflict") {
          setPendingSaveConflict({
            localMetadata: localMetadataRef.current,
            desktopPayload: result.payload,
            desktopSaveResult: result,
            reason: comparison.reason,
          });
          setSaveConflictDismissed(false);
          setDesktopSaveState(
            getDesktopSaveStateFromResult(result, { active: true })
          );
          setDesktopSaveHydrationReady(true);
          return;
        }

        if (comparison.outcome === "local-newer") {
          // Desktop hasn't moved since we last synced and local has —
          // preserve local data and let the normal autosave effect push it
          // (it will fire on the next render since desktopSaveState.active
          // becomes true here). Local metadata is left as-is.
          setDesktopSaveState(
            getDesktopSaveStateFromResult(result, { active: true })
          );
          setDesktopSaveHydrationReady(true);
          return;
        }

        // "in-sync" or "desktop-newer": safe to hydrate without asking.
        hydrateLocalFromDesktopPayload(
          result.payload,
          result.status === "folderUnavailable"
            ? "Chosen save folder is unavailable. App data fallback loaded."
            : "Desktop save loaded."
        );
        setDesktopSaveState({
          isTauri: true,
          status: result.status,
          active: true,
          saveLocation: result.saveLocation || "appData",
          folderPath: result.folderPath || null,
          configuredFolderPath: result.configuredFolderPath || null,
          error: null,
        });
        setDesktopSaveHydrationReady(true);
        return;
      }

      setDesktopSaveState(getDesktopSaveStateFromResult(result, { active: false }));
      setDesktopSaveHydrationReady(true);
    }

    loadDesktopSave();

    return () => {
      isCancelled = true;
    };
    // Mount-only by design (matches the pre-existing hydration pattern).
    // hydrateLocalFromDesktopPayload only touches ref-backed values
    // internally, so a stale closure from the first render is equivalent to
    // a fresh one here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local-only freshness tracking: bump the revision whenever the actual
  // Academy data changes, so the next startup/conflict comparison can tell
  // a genuine local change apart from a hydration-caused one. Suppressed
  // during hydration (desktopSaveHydratingRef) and before the startup
  // hydrate-or-not decision has been made, so it never miscounts a
  // desktop-driven update as a local edit.
  useEffect(() => {
    if (!desktopSaveHydrationReady) return;
    if (desktopSaveHydratingRef.current) return;

    localMetadataRef.current = bumpLocalSaveRevision(localMetadataRef.current);
    saveLocalSaveMetadata(localMetadataRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmployeeId, characterLibrary, subjects, studyProjects, studySessions]);

  async function attemptDesktopAutosave() {
    if (!desktopSaveState.isTauri || !desktopSaveState.active) return;
    if (desktopSaveHydratingRef.current) return;
    if (pendingFolderConflict || pendingSaveConflictRef.current) return;
    if (isWritingDesktopSaveRef.current) return;

    if (Date.now() - lastWriteFailureAtRef.current < AUTO_RETRY_COOLDOWN_MS) {
      return;
    }

    const desktopSavePayload = buildDesktopPayloadFromLocal({ fromLatestRef: true });
    const desktopSaveJson = JSON.stringify(desktopSavePayload);

    if (desktopSaveJson === lastDesktopSaveJsonRef.current) return;

    isWritingDesktopSaveRef.current = true;
    setDesktopSaveState((currentState) => ({ ...currentState, status: "writing" }));

    try {
      const result = await writeDesktopSavePayload(desktopSavePayload);

      if (result.ok) {
        lastDesktopSaveJsonRef.current = desktopSaveJson;
        lastWriteFailureAtRef.current = 0;
        markSyncedWithDesktopMetadata(desktopSavePayload.metadata);
        setDesktopSaveState((currentState) => ({
          isTauri: true,
          status: "active",
          active: true,
          saveLocation: result.saveLocation || currentState.saveLocation,
          folderPath: result.folderPath || currentState.folderPath,
          configuredFolderPath:
            result.configuredFolderPath || currentState.configuredFolderPath,
          error: null,
        }));
        return;
      }

      lastWriteFailureAtRef.current = Date.now();
      const nextStatus =
        result.status === "corrupt"
          ? "corrupt"
          : result.status === "backupError"
          ? "backupError"
          : "writeError";

      setDesktopSaveState((currentState) => ({
        isTauri: true,
        status: nextStatus,
        active: nextStatus === "corrupt" ? false : true,
        saveLocation: currentState.saveLocation,
        folderPath: currentState.folderPath,
        configuredFolderPath: currentState.configuredFolderPath,
        error: result.error,
      }));
    } finally {
      isWritingDesktopSaveRef.current = false;
    }
  }

  useEffect(() => {
    if (!desktopSaveState.isTauri || !desktopSaveState.active) return undefined;
    if (desktopSaveHydratingRef.current) return undefined;
    if (pendingFolderConflict || pendingSaveConflict) return undefined;

    const writeTimer = window.setTimeout(() => {
      attemptDesktopAutosave();
    }, 500);

    return () => window.clearTimeout(writeTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    desktopSaveState.isTauri,
    desktopSaveState.active,
    desktopSaveState.saveLocation,
    desktopSaveState.folderPath,
    desktopSaveState.configuredFolderPath,
    pendingFolderConflict,
    pendingSaveConflict,
    activeEmployeeId,
    characterLibrary,
    subjects,
    studyProjects,
    studySessions,
  ]);

  // Best-effort flush on the ways the app can actually go away, reducing
  // (not eliminating) the window in which local data can outrun the
  // desktop file. This fires the write immediately instead of waiting for
  // the 500ms debounce; it does not delay window closure, so a hard kill
  // mid-write can still interrupt it — there is no reliable way to
  // guarantee an async file write completes before an abrupt process exit
  // without risking blocking the window close, which was explicitly out of
  // scope here.
  useEffect(() => {
    if (!desktopSaveState.isTauri || !desktopSaveState.active) return undefined;

    function flush() {
      attemptDesktopAutosave();
    }

    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);

    let unlistenCloseRequested = null;
    let cancelled = false;

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
        // Not running in Tauri, or the hook isn't available — pagehide/
        // beforeunload above still cover the normal-close case.
      });

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      unlistenCloseRequested?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktopSaveState.isTauri, desktopSaveState.active]);

  function exportSaveData() {
    const data = readSaveFromLocalStorage();
    const exportPayload = buildSavePayload(data);

    downloadSavePayload(exportPayload, getTodayKey());
  }

  async function persistDesktopSavePayload(
    payload,
    successMessage = null,
    options = {}
  ) {
    if (!desktopSaveState.isTauri) return false;
    if (isWritingDesktopSaveRef.current) return false;

    isWritingDesktopSaveRef.current = true;
    setDesktopSaveState((currentState) => ({
      ...currentState,
      status: "writing",
    }));

    try {
      const result = await writeDesktopSavePayload(payload, {
        forceBackup: options.forceBackup,
      });

      if (result.ok) {
        lastDesktopSaveJsonRef.current = JSON.stringify(payload);
        lastWriteFailureAtRef.current = 0;
        markSyncedWithDesktopMetadata(payload.metadata);
        setDesktopSaveState({
          isTauri: true,
          status: "active",
          active: true,
          saveLocation: result.saveLocation || desktopSaveState.saveLocation,
          folderPath: result.folderPath || desktopSaveState.folderPath,
          configuredFolderPath:
            result.configuredFolderPath || desktopSaveState.configuredFolderPath,
          error: null,
        });

        if (successMessage) {
          setDataNotice({ type: "success", message: successMessage });
        }

        return true;
      }

      lastWriteFailureAtRef.current = Date.now();
      const nextStatus =
        result.status === "corrupt"
          ? "corrupt"
          : result.status === "backupError"
          ? "backupError"
          : "writeError";

      setDesktopSaveState({
        isTauri: true,
        status: nextStatus,
        active: nextStatus === "corrupt" ? false : desktopSaveState.active,
        saveLocation: desktopSaveState.saveLocation,
        folderPath: desktopSaveState.folderPath,
        configuredFolderPath: desktopSaveState.configuredFolderPath,
        error: result.error,
      });
      setDataNotice({
        type: "error",
        message: "Could not update the desktop save file. Local browser save is still active.",
      });

      return false;
    } finally {
      isWritingDesktopSaveRef.current = false;
    }
  }

  function retryDesktopSave() {
    setDataNotice(null);
    lastWriteFailureAtRef.current = 0;
    persistDesktopSavePayload(
      buildDesktopPayloadFromLocal(),
      "Desktop save updated."
    );
  }

  async function beginCorruptDesktopSaveRepair() {
    openConfirmDialog({
      title: "Repair Desktop Save",
      message:
        "Replace the unreadable desktop save with the current local Academy data? The unreadable file will be preserved in Backups first where possible.",
      confirmLabel: "Replace Desktop Save",
      isDangerous: true,
      onConfirm: async () => {
        setDataNotice(null);
        setCorruptRepairStatus("repairing");

        const payload = buildDesktopPayloadFromLocal();
        const result = await repairCorruptDesktopSave(payload);

        if (!result.ok) {
          setCorruptRepairStatus("idle");

          if (result.status === "preserveFailed") {
            setDataNotice({
              type: "error",
              message:
                "Could not preserve the unreadable desktop save, so it was not replaced. Use Export Current Data to keep a safe copy of your local data.",
            });
            return;
          }

          setDataNotice({
            type: "error",
            message: "Could not repair the desktop save. It was left untouched.",
          });
          return;
        }

        lastDesktopSaveJsonRef.current = JSON.stringify(payload);
        lastWriteFailureAtRef.current = 0;
        markSyncedWithDesktopMetadata(payload.metadata);
        setCorruptRepairStatus("done");
        setDesktopSaveState({
          isTauri: true,
          status: "active",
          active: true,
          saveLocation: result.saveLocation || desktopSaveState.saveLocation,
          folderPath: result.folderPath || desktopSaveState.folderPath,
          configuredFolderPath:
            result.configuredFolderPath || desktopSaveState.configuredFolderPath,
          error: null,
        });
        setDataNotice({
          type: "success",
          message: result.backupPath
            ? `Desktop save repaired. The unreadable file was preserved at Backups/${result.backupPath.split("/").pop()}.`
            : "Desktop save repaired.",
        });
      },
    });
  }

  function resolveSaveConflictUseLocal() {
    if (!pendingSaveConflict) return;

    const payload = buildDesktopPayloadFromLocal();

    persistDesktopSavePayload(payload, "Local data saved to the desktop file.", {
      forceBackup: true,
    }).then((ok) => {
      if (!ok) return;
      setPendingSaveConflict(null);
      setSaveConflictDismissed(false);
    });
  }

  function resolveSaveConflictUseDesktop() {
    if (!pendingSaveConflict) return;

    hydrateLocalFromDesktopPayload(
      pendingSaveConflict.desktopPayload,
      "Desktop save loaded."
    );
    setPendingSaveConflict(null);
    setSaveConflictDismissed(false);
    setDataNotice({ type: "success", message: "Desktop save loaded." });
  }

  function dismissSaveConflict() {
    setSaveConflictDismissed(true);
    setDataNotice({
      type: "error",
      message:
        "Save conflict not resolved. Desktop saving is paused until you choose Use Local or Use Desktop in Settings.",
    });
  }

  function reopenSaveConflict() {
    setSaveConflictDismissed(false);
  }

  async function createDesktopSaveFile() {
    setDataNotice(null);

    const desktopSavePayload = buildDesktopPayloadFromLocal();

    await persistDesktopSavePayload(
      desktopSavePayload,
      "Desktop save file created."
    );
  }

  async function chooseDesktopSaveLocation() {
    setDataNotice(null);

    const chosenFolder = await chooseDesktopSaveFolder();

    if (chosenFolder.status === "cancelled") return;

    if (chosenFolder.status !== "selected") {
      setDataNotice({
        type: "error",
        message: "Could not choose a desktop save folder.",
      });
      return;
    }

    const folderInspection = await inspectDesktopSaveFolder(
      chosenFolder.folderPath
    );

    if (folderInspection.status === "missing") {
      const desktopSavePayload = buildDesktopPayloadFromLocal();
      const writeResult = await writeDesktopSavePayload(desktopSavePayload, {
        location: folderInspection.location,
      });

      if (!writeResult.ok) {
        setDesktopSaveState({
          isTauri: true,
          status: writeResult.status === "corrupt" ? "folderCorrupt" : "writeError",
          active: desktopSaveState.active,
          saveLocation: desktopSaveState.saveLocation,
          folderPath: desktopSaveState.folderPath,
          configuredFolderPath: desktopSaveState.configuredFolderPath,
          error: writeResult.error,
        });
        setDataNotice({
          type: "error",
          message: "Could not write the save file to that folder.",
        });
        return;
      }

      const configResult = await writeDesktopStorageConfig({
        saveFolderPath: chosenFolder.folderPath,
      });

      if (!configResult.ok) {
        setDataNotice({
          type: "error",
          message: "Could not remember the chosen save folder.",
        });
        return;
      }

      lastDesktopSaveJsonRef.current = JSON.stringify(desktopSavePayload);
      markSyncedWithDesktopMetadata(desktopSavePayload.metadata);
      setDesktopSaveState({
        isTauri: true,
        status: "active",
        active: true,
        saveLocation: "chosen",
        folderPath: chosenFolder.folderPath,
        configuredFolderPath: chosenFolder.folderPath,
        error: null,
      });
      setDataNotice({
        type: "success",
        message: "Desktop save folder selected.",
      });
      return;
    }

    if (folderInspection.status === "active" && folderInspection.payload) {
      setPendingFolderConflict({
        folderPath: chosenFolder.folderPath,
        location: folderInspection.location,
        payload: folderInspection.payload,
      });
      return;
    }

    setDesktopSaveState({
      isTauri: true,
      status: "folderCorrupt",
      active: desktopSaveState.active,
      saveLocation: desktopSaveState.saveLocation,
      folderPath: desktopSaveState.folderPath,
      configuredFolderPath: chosenFolder.folderPath,
      error: folderInspection.error,
    });
  }

  async function useFolderSave() {
    const conflict = pendingFolderConflict;

    if (!conflict?.payload) return;

    const configResult = await writeDesktopStorageConfig({
      saveFolderPath: conflict.folderPath,
    });

    if (!configResult.ok) {
      setDataNotice({
        type: "error",
        message: "Could not remember the chosen save folder.",
      });
      return;
    }

    hydrateLocalFromDesktopPayload(conflict.payload, "Folder save loaded.");
    setDesktopSaveState({
      isTauri: true,
      status: "active",
      active: true,
      saveLocation: "chosen",
      folderPath: conflict.folderPath,
      configuredFolderPath: conflict.folderPath,
      error: null,
    });
    setPendingFolderConflict(null);
  }

  async function replaceFolderSave() {
    const conflict = pendingFolderConflict;

    if (!conflict?.location) return;

    const desktopSavePayload = buildDesktopPayloadFromLocal();
    const writeResult = await writeDesktopSavePayload(desktopSavePayload, {
      location: conflict.location,
      forceBackup: true,
    });

    if (!writeResult.ok) {
      setDataNotice({
        type: "error",
        message: "Could not replace the save in that folder.",
      });
      return;
    }

    const configResult = await writeDesktopStorageConfig({
      saveFolderPath: conflict.folderPath,
    });

    if (!configResult.ok) {
      setDataNotice({
        type: "error",
        message: "Could not remember the chosen save folder.",
      });
      return;
    }

    lastDesktopSaveJsonRef.current = JSON.stringify(desktopSavePayload);
    markSyncedWithDesktopMetadata(desktopSavePayload.metadata);
    setDesktopSaveState({
      isTauri: true,
      status: "active",
      active: true,
      saveLocation: "chosen",
      folderPath: conflict.folderPath,
      configuredFolderPath: conflict.folderPath,
      error: null,
    });
    setPendingFolderConflict(null);
    setDataNotice({
      type: "success",
      message: "Folder save replaced.",
    });
  }

  function cancelFolderConflict() {
    setPendingFolderConflict(null);
    setDataNotice({
      type: "success",
      message: "Kept the current save folder.",
    });
  }

  function importSaveData(event) {
    setDataNotice(null);

    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const importedSave = parseImportedSave(reader.result);

        if (!validateSavePayload(importedSave)) {
          setDataNotice({
            type: "error",
            message: "This does not look like an Arcadia Academy save file.",
          });
          return;
        }

        openConfirmDialog({
          title: "Import Save",
          message: "Import this Arcadia Academy save? This will overwrite current local data.",
          confirmLabel: "Import Save",
          isDangerous: true,
          onConfirm: () => {
            desktopSaveHydratingRef.current = true;
            writeSaveToLocalStorage(importedSave, getImportFallbackBuilders());
            hydrateFromStorageRef.current();

            window.setTimeout(() => {
              desktopSaveHydratingRef.current = false;
            }, 0);

            if (desktopSaveState.isTauri && desktopSaveState.active) {
              persistDesktopSavePayload(
                buildSavePayload(readSaveFromLocalStorage(), new Date().toISOString(), {
                  updatedAt: new Date().toISOString(),
                  revision: (localMetadataRef.current.revision || 0) + 1,
                }),
                null,
                { forceBackup: true }
              );
            }
          },
        });
      } catch (error) {
        setDataNotice({
          type: "error",
          message: "Could not import this file.",
        });
      }
    };

    reader.onerror = () => {
      setDataNotice({
        type: "error",
        message: "Could not import this file.",
      });
    };

    reader.readAsText(file);
  }

  async function previewCharacterImageMigrationRun() {
    setDataNotice(null);
    setCharacterImageMigrationStatus("previewing");

    if (!desktopSaveState.isTauri) {
      setCharacterImageMigrationStatus("idle");
      setDataNotice({
        type: "error",
        message: "Character image migration is only available in the Tauri desktop app.",
      });
      return;
    }

    try {
      const report = await previewCharacterImageMigration(characterLibrary);

      setCharacterImageMigrationReport(report);
      setCharacterImageMigrationStatus("ready");
      setDataNotice({
        type: "success",
        message: report.summary.canRun
          ? `Preview ready: ${report.summary.plannedCopies} image(s) can be copied and rewritten.`
          : "Preview ready: no flat managed character image refs need migration.",
      });
    } catch (error) {
      console.warn("Could not preview character image migration.", error);
      setCharacterImageMigrationStatus("idle");
      setDataNotice({
        type: "error",
        message: "Could not preview character image migration.",
      });
    }
  }

  function runCharacterImageMigrationWithConfirmation() {
    if (!characterImageMigrationReport?.summary?.canRun) return;

    openConfirmDialog({
      title: "Run Character Image Migration",
      message:
        "Before running, copy your active Arcadia Academy save folder, including arcadia-academy-save.json and Character Images/. This migration copies referenced flat character images into organized folders, rewrites successful refs, and does not delete old files.",
      confirmLabel: "Run Migration",
      isDangerous: false,
      onConfirm: async () => {
        setDataNotice(null);
        setCharacterImageMigrationStatus("running");

        try {
          const report = await runCharacterImageMigration(characterLibrary);
          const rewrittenCount = report.summary.rewritten || 0;

          setCharacterImageMigrationReport(report);

          if (rewrittenCount > 0) {
            saveData(
              STORAGE_KEYS.characterLibrary,
              createCharacterLibraryRecord(report.nextCharacterLibrary)
            );
            saveData(STORAGE_KEYS.employees, report.nextCharacterLibrary);
            setCharacterLibrary?.(report.nextCharacterLibrary);

            if (desktopSaveState.isTauri && desktopSaveState.active) {
              await persistDesktopSavePayload(
                buildDesktopPayloadFromLocal({
                  characterLibrary: report.nextCharacterLibrary,
                }),
                null,
                { forceBackup: true }
              );
            }
          }

          setCharacterImageMigrationStatus("completed");
          const resultWarnings = [
            report.summary.missingSources > 0
              ? `${report.summary.missingSources} missing source file(s)`
              : "",
            report.summary.copyErrors > 0
              ? `${report.summary.copyErrors} copy error(s)`
              : "",
          ].filter(Boolean);
          setDataNotice({
            type: "success",
            message:
              resultWarnings.length > 0
                ? `Character image migration completed with ${resultWarnings.join(
                    " and "
                  )}. ${rewrittenCount} ref(s) were rewritten.`
                : `Character image migration completed. ${rewrittenCount} ref(s) were rewritten.`,
          });
        } catch (error) {
          console.warn("Could not run character image migration.", error);
          setCharacterImageMigrationStatus("ready");
          setDataNotice({
            type: "error",
            message: "Could not run character image migration.",
          });
        }
      },
    });
  }

  async function scanUnusedCharacterImagesRun() {
    setDataNotice(null);
    setUnusedCharacterImageScanStatus("scanning");

    if (!desktopSaveState.isTauri) {
      setUnusedCharacterImageScanStatus("idle");
      setDataNotice({
        type: "error",
        message: "Unused character image scan is only available in the Tauri desktop app.",
      });
      return;
    }

    try {
      const report = await scanUnusedCharacterImages(characterLibrary);

      setUnusedCharacterImageScanReport(report);
      setUnusedCharacterImageScanStatus("completed");
      setDataNotice({
        type: "success",
        message: `Unused image scan complete: ${report.summary.unusedFiles} unused file(s), ${report.summary.missingReferencedFiles} missing referenced file(s).`,
      });
    } catch (error) {
      console.warn("Could not scan unused character images.", error);
      setUnusedCharacterImageScanStatus("idle");
      setDataNotice({
        type: "error",
        message: "Could not scan unused character images.",
      });
    }
  }

  function moveUnusedCharacterImagesToArchiveWithConfirmation() {
    const unusedFiles = unusedCharacterImageScanReport?.unusedFiles || [];

    if (unusedFiles.length === 0) {
      setDataNotice({
        type: "error",
        message: "Run the unused image scan first. There are no unused files to archive.",
      });
      return;
    }

    if (!desktopSaveState.isTauri) {
      setDataNotice({
        type: "error",
        message: "Unused character image archiving is only available in the Tauri desktop app.",
      });
      return;
    }

    openConfirmDialog({
      title: "Move Unused Images to Archive",
      message:
        "This will move the latest scanned unused character image files into Character Images/_archive-unused/ for today. Referenced images and character data will not be changed.",
      confirmLabel: "Move to Archive",
      isDangerous: false,
      onConfirm: async () => {
        setDataNotice(null);
        setUnusedCharacterImageArchiveStatus("moving");

        try {
          const archiveReport = await moveUnusedCharacterImagesToArchive(
            unusedFiles,
            getTodayKey()
          );

          setUnusedCharacterImageArchiveReport(archiveReport);
          setUnusedCharacterImageScanStatus("scanning");

          const scanReport = await scanUnusedCharacterImages(characterLibrary);

          setUnusedCharacterImageScanReport(scanReport);
          setUnusedCharacterImageScanStatus("completed");
          setUnusedCharacterImageArchiveStatus("completed");

          const warnings = [
            archiveReport.summary.filesSkipped > 0
              ? `${archiveReport.summary.filesSkipped} skipped`
              : "",
            archiveReport.summary.moveErrors > 0
              ? `${archiveReport.summary.moveErrors} move error(s)`
              : "",
          ].filter(Boolean);

          setDataNotice({
            type: archiveReport.summary.moveErrors > 0 ? "error" : "success",
            message:
              warnings.length > 0
                ? `Moved ${archiveReport.summary.filesMoved} unused image file(s) to archive with ${warnings.join(
                    " and "
                  )}.`
                : `Moved ${archiveReport.summary.filesMoved} unused image file(s) to archive.`,
          });
        } catch (error) {
          console.warn("Could not move unused character images to archive.", error);
          setUnusedCharacterImageArchiveStatus("idle");
          setUnusedCharacterImageScanStatus("completed");
          setDataNotice({
            type: "error",
            message: "Could not move unused character images to archive.",
          });
        }
      },
    });
  }

  function performResetAcademyActivity() {
    const resetPayload = createResetAcademyActivityPayload();

    Object.entries(resetPayload).forEach(([name, value]) => {
      saveData(STORAGE_KEYS[name], value);
    });

    hydrateAfterResetRef.current({
      message:
        "Academy activity has been reset. Subjects, study projects, and sessions were cleared.",
    });

    if (desktopSaveState.isTauri && desktopSaveState.active) {
      persistDesktopSavePayload(
        buildSavePayload(readSaveFromLocalStorage(), new Date().toISOString(), {
          updatedAt: new Date().toISOString(),
          revision: (localMetadataRef.current.revision || 0) + 1,
        }),
        null,
        { forceBackup: true }
      );
    }
  }

  function performNewAcademySeason() {
    const resetPayload = createResetAcademyActivityPayload();
    const resetCharacterLibrary = createNewSeasonCharacterLibrary(characterLibrary);

    Object.entries(resetPayload).forEach(([name, value]) => {
      saveData(STORAGE_KEYS[name], value);
    });
    saveData(
      STORAGE_KEYS.characterLibrary,
      createCharacterLibraryRecord(resetCharacterLibrary)
    );
    saveData(STORAGE_KEYS.employees, resetCharacterLibrary);

    hydrateAfterResetRef.current({
      nextCharacterLibrary: resetCharacterLibrary,
      message:
        "New Academy season started. Subjects, study projects, and sessions were cleared, and every character's XP has been reset.",
    });

    if (desktopSaveState.isTauri && desktopSaveState.active) {
      persistDesktopSavePayload(
        buildSavePayload(readSaveFromLocalStorage(), new Date().toISOString(), {
          updatedAt: new Date().toISOString(),
          revision: (localMetadataRef.current.revision || 0) + 1,
        }),
        null,
        { forceBackup: true }
      );
    }
  }

  function openResetAcademyActivityConfirm() {
    setDataNotice(null);
    setResetConfirmType("activity");
  }

  function openNewAcademySeasonConfirm() {
    setDataNotice(null);
    setResetConfirmType("season");
  }

  return {
    desktopSaveState,
    desktopSaveHydrationReady,
    desktopSaveStatus,
    desktopSaveWarning,
    pendingSaveConflict,
    saveConflictDismissed,
    corruptRepairStatus,
    resetConfirmConfig,
    resetConfirmType,
    setResetConfirmType,
    exportSaveData,
    importSaveData,
    persistDesktopSavePayload,
    createDesktopSaveFile,
    chooseDesktopSaveLocation,
    useFolderSave,
    replaceFolderSave,
    cancelFolderConflict,
    retryDesktopSave,
    beginCorruptDesktopSaveRepair,
    resolveSaveConflictUseLocal,
    resolveSaveConflictUseDesktop,
    dismissSaveConflict,
    reopenSaveConflict,
    characterImageMigrationReport,
    characterImageMigrationStatus,
    previewCharacterImageMigration: previewCharacterImageMigrationRun,
    runCharacterImageMigration: runCharacterImageMigrationWithConfirmation,
    unusedCharacterImageScanReport,
    unusedCharacterImageScanStatus,
    scanUnusedCharacterImages: scanUnusedCharacterImagesRun,
    unusedCharacterImageArchiveReport,
    unusedCharacterImageArchiveStatus,
    moveUnusedCharacterImagesToArchive:
      moveUnusedCharacterImagesToArchiveWithConfirmation,
    performResetAcademyActivity,
    performNewAcademySeason,
    openResetAcademyActivityConfirm,
    openNewAcademySeasonConfirm,
  };
}
