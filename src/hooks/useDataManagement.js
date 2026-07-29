import { useEffect, useRef, useState } from "react";
import { employees } from "../data/employees";
import {
  createCharacterLibraryFromSavedEmployees,
  createCharacterLibraryFromStarterCharacters,
  createCharacterLibraryRecord,
} from "../utils/characters";
import {
  createClientLibraryRecord,
  createSeededClientLibrary,
} from "../utils/clients";
import { getTodayKey } from "../utils/dates";
import {
  createSeededTemplateLibrary,
  createTemplateLibraryRecord,
} from "../utils/templates";
import {
  moveUnusedCharacterImagesToArchive,
  previewCharacterImageMigration,
  runCharacterImageMigration,
  scanUnusedCharacterImages,
} from "../utils/characterImageMigration";
import {
  STORAGE_KEYS,
  buildSavePayload,
  chooseDesktopSaveFolder,
  createResetWorkDataPayload,
  createSavePayloadFromLocalStorage,
  downloadSavePayload,
  inspectDesktopSaveFolder,
  isDesktopStorageAvailable,
  parseImportedSave,
  readDesktopSavePayload,
  readSaveFromLocalStorage,
  saveData,
  validateSavePayload,
  writeDesktopSavePayload,
  writeDesktopStorageConfig,
  writeDesktopWorkLogFile,
  writeSaveToLocalStorage,
} from "../utils/storage";
import { createBlankWorkday } from "../utils/workday";

function createNewSeasonCharacterLibrary(characters) {
  return characters.map((character) => ({
    ...character,
    xp: 0,
  }));
}

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
};

const RESET_CONFIRM_CONFIGS = {
  work: {
    title: "Confirm reset",
    label: "Reset Session Data",
    confirmWord: "RESET",
    confirmButtonLabel: "Reset Session Data",
    message:
      "This clears leftover internal session-tracking state and returns to the character select screen. Your subjects, study projects, notes, character library, and character XP are not affected.",
  },
  season: {
    title: "New Season",
    label: "New Season",
    confirmWord: "NEW SEASON",
    confirmButtonLabel: "Start New Season",
    message:
      "This starts a new Arcadia Academy season: every character's XP and level are reset, and leftover internal session-tracking state is cleared. Your character roster, dossier fields, character images, subjects, study projects, notes, and imported Character Images folder are preserved.",
  },
};

export function useDataManagement({
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

  // Keep latest callback refs so one-time effects don't capture stale closures
  const hydrateFromStorageRef = useRef(hydrateFromStorage);
  const hydrateAfterResetRef = useRef(hydrateAfterReset);
  hydrateFromStorageRef.current = hydrateFromStorage;
  hydrateAfterResetRef.current = hydrateAfterReset;

  const desktopSaveStatusCopy =
    DESKTOP_SAVE_STATUS_COPY[
      pendingFolderConflict ? "folderConflict" : desktopSaveState.status
    ] || DESKTOP_SAVE_STATUS_COPY.unavailable;

  const desktopSaveStatus = {
    ...desktopSaveState,
    status: pendingFolderConflict ? "folderConflict" : desktopSaveState.status,
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
      desktopSaveState.isTauri &&
      Boolean(pendingFolderConflict),
  };

  const resetConfirmConfig = resetConfirmType
    ? RESET_CONFIRM_CONFIGS[resetConfirmType]
    : null;

  function getImportFallbackBuilders() {
    return {
      createTemplateLibraryFallback: () =>
        createTemplateLibraryRecord(createSeededTemplateLibrary()),
      createClientLibraryFallback: () =>
        createClientLibraryRecord(createSeededClientLibrary()),
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
    const nextCharacterLibrary =
      overrides.characterLibrary || characterLibrary;

    return {
      activeEmployeeId,
      employees: nextCharacterLibrary,
      tasks,
      projects,
      activeDate,
      history,
      workday,
      dailyQuota,
      customProjectTemplates: createTemplateLibraryRecord(templateLibrary),
      clientLibrary: createClientLibraryRecord(clientLibrary),
      characterLibrary: createCharacterLibraryRecord(nextCharacterLibrary),
      scratchpad: scratchpad ?? {},
      calendarEvents: calendarEvents ?? [],
      subjects: subjects ?? [],
      studyProjects: studyProjects ?? [],
      studySessions: studySessions ?? [],
    };
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

  function autoSaveWorkLog(historyEntry, { showNotice = false } = {}) {
    if (!historyEntry) return;
    if (!isDesktopStorageAvailable()) return;

    const employeeName =
      characterLibrary.find(
        (character) => character.id === historyEntry.activeEmployeeId
      )?.name ||
      characterLibrary.find(
        (character) => character.id === activeEmployeeId
      )?.name;
    const employeeNamesById = characterLibrary.reduce((names, character) => {
      if (!character?.id) return names;

      return {
        ...names,
        [character.id]: character.name,
      };
    }, {});

    writeDesktopWorkLogFile(historyEntry, {
      employeeName,
      employeeNamesById,
    }).then((result) => {
      if (result.ok) return;

      console.warn(
        `Arcadia Academy could not auto-save work log for ${historyEntry.date}.`,
        result.error
      );

      if (showNotice) {
        setDataNotice({
          type: "error",
          message: "Work log archived, but the .txt auto-save failed.",
        });
      }
    });
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
        desktopSaveHydratingRef.current = true;
        lastDesktopSaveJsonRef.current = JSON.stringify(result.payload);
        writeSaveToLocalStorage(result.payload, getImportFallbackBuilders());
        hydrateFromStorageRef.current(
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

        window.setTimeout(() => {
          desktopSaveHydratingRef.current = false;
          setDesktopSaveHydrationReady(true);
        }, 0);
        return;
      }

      setDesktopSaveState(getDesktopSaveStateFromResult(result, { active: false }));
      setDesktopSaveHydrationReady(true);
    }

    loadDesktopSave();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!desktopSaveState.isTauri || !desktopSaveState.active) return undefined;
    if (desktopSaveHydratingRef.current) return undefined;
    if (pendingFolderConflict) return undefined;

    const desktopSavePayload = buildSavePayload(buildCurrentSaveData());
    const desktopSaveJson = JSON.stringify(desktopSavePayload);

    if (desktopSaveJson === lastDesktopSaveJsonRef.current) return undefined;

    const writeTimer = window.setTimeout(async () => {
      const result = await writeDesktopSavePayload(desktopSavePayload);

      if (result.ok) {
        lastDesktopSaveJsonRef.current = desktopSaveJson;
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
        return;
      }

      setDesktopSaveState({
        isTauri: true,
        status: result.status === "corrupt" ? "corrupt" : "writeError",
        active: result.status === "corrupt" ? false : true,
        saveLocation: desktopSaveState.saveLocation,
        folderPath: desktopSaveState.folderPath,
        configuredFolderPath: desktopSaveState.configuredFolderPath,
        error: result.error,
      });
    }, 500);

    return () => window.clearTimeout(writeTimer);
  }, [
    desktopSaveState.isTauri,
    desktopSaveState.active,
    desktopSaveState.saveLocation,
    desktopSaveState.folderPath,
    desktopSaveState.configuredFolderPath,
    pendingFolderConflict,
    activeEmployeeId,
    characterLibrary,
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
  ]);

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

    setDesktopSaveState((currentState) => ({
      ...currentState,
      status: "writing",
    }));

    const result = await writeDesktopSavePayload(payload, {
      forceBackup: options.forceBackup,
    });

    if (result.ok) {
      lastDesktopSaveJsonRef.current = JSON.stringify(payload);
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

    setDesktopSaveState({
      isTauri: true,
      status: result.status === "corrupt" ? "corrupt" : "writeError",
      active: result.status === "corrupt" ? false : desktopSaveState.active,
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
  }

  async function createDesktopSaveFile() {
    setDataNotice(null);

    const desktopSavePayload = buildSavePayload(buildCurrentSaveData());

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
      const desktopSavePayload = buildSavePayload(buildCurrentSaveData());
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

    desktopSaveHydratingRef.current = true;
    lastDesktopSaveJsonRef.current = JSON.stringify(conflict.payload);
    writeSaveToLocalStorage(conflict.payload, getImportFallbackBuilders());
    hydrateFromStorageRef.current("Folder save loaded.");
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

    window.setTimeout(() => {
      desktopSaveHydratingRef.current = false;
    }, 0);
  }

  async function replaceFolderSave() {
    const conflict = pendingFolderConflict;

    if (!conflict?.location) return;

    const desktopSavePayload = buildSavePayload(buildCurrentSaveData());
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
            writeSaveToLocalStorage(importedSave, getImportFallbackBuilders());
            hydrateFromStorageRef.current();

            if (desktopSaveState.isTauri && desktopSaveState.active) {
              persistDesktopSavePayload(createSavePayloadFromLocalStorage(), null, {
                forceBackup: true,
              });
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
                buildSavePayload(
                  buildCurrentSaveData({
                    characterLibrary: report.nextCharacterLibrary,
                  })
                ),
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

  function performReset() {
    const today = getTodayKey();
    const resetPayload = createResetWorkDataPayload(
      today,
      createBlankWorkday(today)
    );

    Object.entries(resetPayload).forEach(([name, value]) => {
      saveData(STORAGE_KEYS[name], value);
    });

    hydrateAfterResetRef.current();

    if (desktopSaveState.isTauri && desktopSaveState.active) {
      persistDesktopSavePayload(createSavePayloadFromLocalStorage(), null, {
        forceBackup: true,
      });
    }
  }

  function performNewSeasonReset() {
    const today = getTodayKey();
    const resetPayload = createResetWorkDataPayload(
      today,
      createBlankWorkday(today)
    );
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
      message: "New season started. Character XP and levels have been reset.",
    });

    if (desktopSaveState.isTauri && desktopSaveState.active) {
      persistDesktopSavePayload(createSavePayloadFromLocalStorage(), null, {
        forceBackup: true,
      });
    }
  }

  function resetDemoData() {
    setDataNotice(null);
    setResetConfirmType("work");
  }

  function openNewSeasonReset() {
    setDataNotice(null);
    setResetConfirmType("season");
  }

  return {
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
    previewCharacterImageMigration: previewCharacterImageMigrationRun,
    runCharacterImageMigration: runCharacterImageMigrationWithConfirmation,
    unusedCharacterImageScanReport,
    unusedCharacterImageScanStatus,
    scanUnusedCharacterImages: scanUnusedCharacterImagesRun,
    unusedCharacterImageArchiveReport,
    unusedCharacterImageArchiveStatus,
    moveUnusedCharacterImagesToArchive:
      moveUnusedCharacterImagesToArchiveWithConfirmation,
    performReset,
    performNewSeasonReset,
    resetDemoData,
    openNewSeasonReset,
  };
}
