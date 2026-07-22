import { isTauri } from "@tauri-apps/api/core";
import { appDataDir, BaseDirectory, basename, extname, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import {
  exists,
  mkdir,
  readDir,
  readFile,
  readTextFile,
  remove,
  writeFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import {
  buildMeetingNotesText,
  getMeetingNotesFileName,
} from "./meetingNotesExport";
import { buildWorkLogText, getWorkLogFileName } from "./workLogExport";

export const STORAGE_KEYS = {
  activeEmployeeId: "arcadia-desk-active-employee-id",
  employees: "arcadia-desk-employees",
  tasks: "arcadia-desk-tasks",
  projects: "arcadia-desk-projects",
  activeDate: "arcadia-desk-active-date",
  history: "arcadia-desk-history",
  workday: "arcadia-desk-workday",
  dailyQuota: "arcadia-desk-daily-quota",
  customProjectTemplates: "arcadia-desk-custom-project-templates",
  clientLibrary: "arcadia-desk-client-library",
  characterLibrary: "arcadia-desk-character-library",
  scratchpad: "arcadia-desk-scratchpad",
  calendarEvents: "arcadia-desk-calendar-events",
};

export const MEETING_DRAFT_STORAGE_KEY = "arcadia-desk-meeting-draft";
export const MEETING_DRAFT_VERSION = 1;
export const SAVE_FILE_VERSION = 1;
export const DESKTOP_SAVE_FILE_NAME = "arcadia-desk-save.json";
export const DESKTOP_BACKUP_DIR_NAME = "Backups";
export const DESKTOP_WORK_LOG_DIR_NAME = "Work Logs";
export const DESKTOP_MEETING_NOTES_DIR_NAME = "Meeting Notes";
export const DESKTOP_CHARACTER_IMAGE_DIR_NAME = "Character Images";
export const DESKTOP_STORAGE_CONFIG_FILE_NAME =
  "arcadia-desk-storage-config.json";
export const DESKTOP_MEETING_DRAFT_FILE_NAME = "arcadia-desk-meeting-draft.json";
export const DESKTOP_BACKUP_LIMIT = 5;
export const DESKTOP_BACKUP_THROTTLE_MS = 10 * 60 * 1000;
export const MANAGED_CHARACTER_IMAGE_PREFIX = "arcadia-character-image:";

const ALLOWED_CHARACTER_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const CHARACTER_IMAGE_MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

let lastDesktopBackupCreatedAt = 0;

export function isDesktopStorageAvailable() {
  try {
    return isTauri();
  } catch {
    return false;
  }
}

export function loadSavedData(key, fallbackValue) {
  try {
    const savedValue = localStorage.getItem(key);

    if (!savedValue) {
      return fallbackValue;
    }

    return JSON.parse(savedValue);
  } catch (error) {
    console.error(`Could not load saved data for ${key}`, error);
    return fallbackValue;
  }
}

export function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    console.warn(`Could not save data for ${key}`, error);
    return { ok: false, error };
  }
}

function normalizeMeetingDraftSession(session) {
  if (!session || typeof session !== "object") return null;

  const taskId = typeof session.taskId === "string" ? session.taskId : "";
  const startedAt =
    typeof session.startedAt === "string" ? session.startedAt : "";

  if (!taskId || !startedAt) return null;

  return {
    taskId,
    startedAt,
    notes: typeof session.notes === "string" ? session.notes : "",
    actionItemIds: Array.isArray(session.actionItemIds)
      ? session.actionItemIds.filter((item) => typeof item === "string")
      : [],
  };
}

function normalizeMeetingTaskSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;

  const id = typeof snapshot.id === "string" ? snapshot.id : "";

  if (!id) return null;

  return {
    id,
    title: typeof snapshot.title === "string" ? snapshot.title : "Untitled meeting",
    client: typeof snapshot.client === "string" ? snapshot.client : "",
    taskType:
      typeof snapshot.taskType === "string"
        ? snapshot.taskType
        : "Meeting / Call",
    projectId: snapshot.projectId ?? null,
    projectName: snapshot.projectName ?? null,
    projectTemplateName: snapshot.projectTemplateName ?? null,
    completed: Boolean(snapshot.completed),
  };
}

function normalizeActionItemSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;

  const id = typeof snapshot.id === "string" ? snapshot.id : "";

  if (!id) return null;

  return {
    id,
    title:
      typeof snapshot.title === "string"
        ? snapshot.title
        : "Untitled action item",
    client: typeof snapshot.client === "string" ? snapshot.client : "",
    taskType:
      typeof snapshot.taskType === "string"
        ? snapshot.taskType
        : "Meeting Follow-up",
    priority: Boolean(snapshot.priority),
  };
}

export function normalizeMeetingDraft(draft) {
  if (!draft || typeof draft !== "object") return null;
  if (draft.version !== MEETING_DRAFT_VERSION) return null;

  const session = normalizeMeetingDraftSession(draft.session);
  const meetingTaskSnapshot = normalizeMeetingTaskSnapshot(
    draft.meetingTaskSnapshot
  );

  if (!session || !meetingTaskSnapshot) return null;

  return {
    version: MEETING_DRAFT_VERSION,
    savedAt:
      typeof draft.savedAt === "string"
        ? draft.savedAt
        : new Date().toISOString(),
    session,
    meetingTaskSnapshot,
    actionItemSnapshots: Array.isArray(draft.actionItemSnapshots)
      ? draft.actionItemSnapshots.map(normalizeActionItemSnapshot).filter(Boolean)
      : [],
    form: {
      actionTitle:
        typeof draft.form?.actionTitle === "string"
          ? draft.form.actionTitle
          : "",
      actionPriority: Boolean(draft.form?.actionPriority),
    },
  };
}

export function readMeetingDraft() {
  try {
    const savedValue = localStorage.getItem(MEETING_DRAFT_STORAGE_KEY);

    if (!savedValue) return null;

    return normalizeMeetingDraft(JSON.parse(savedValue));
  } catch (error) {
    console.warn("Could not read Arcadia Desk meeting draft.", error);
    return null;
  }
}

export function writeMeetingDraft(draft) {
  const normalizedDraft = normalizeMeetingDraft({
    ...draft,
    version: MEETING_DRAFT_VERSION,
    savedAt: new Date().toISOString(),
  });

  if (!normalizedDraft) {
    return { ok: false, error: null };
  }

  try {
    localStorage.setItem(
      MEETING_DRAFT_STORAGE_KEY,
      JSON.stringify(normalizedDraft)
    );
    return { ok: true, draft: normalizedDraft, error: null };
  } catch (error) {
    console.warn("Could not save Arcadia Desk meeting draft.", error);
    return { ok: false, error };
  }
}

export function clearMeetingDraft() {
  try {
    localStorage.removeItem(MEETING_DRAFT_STORAGE_KEY);
    return { ok: true, error: null };
  } catch (error) {
    console.warn("Could not clear Arcadia Desk meeting draft.", error);
    return { ok: false, error };
  }
}

export async function readDesktopMeetingDraft() {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", draft: null, error: null };
  }

  try {
    const draftExists = await exists(DESKTOP_MEETING_DRAFT_FILE_NAME, {
      baseDir: BaseDirectory.AppData,
    });

    if (!draftExists) {
      return { ok: false, status: "missing", draft: null, error: null };
    }

    const draftText = await readTextFile(DESKTOP_MEETING_DRAFT_FILE_NAME, {
      baseDir: BaseDirectory.AppData,
    });
    const draft = normalizeMeetingDraft(JSON.parse(draftText));

    if (!draft) {
      return { ok: false, status: "invalid", draft: null, error: null };
    }

    return { ok: true, status: "active", draft, error: null };
  } catch (error) {
    console.warn("Could not read Arcadia Desk desktop meeting draft.", error);
    return { ok: false, status: "error", draft: null, error };
  }
}

export async function writeDesktopMeetingDraft(draft) {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", error: null };
  }

  const normalizedDraft = normalizeMeetingDraft({
    ...draft,
    version: MEETING_DRAFT_VERSION,
    savedAt: new Date().toISOString(),
  });

  if (!normalizedDraft) {
    return { ok: false, status: "invalid", error: null };
  }

  try {
    await mkdir(".", {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
    await writeTextFile(
      DESKTOP_MEETING_DRAFT_FILE_NAME,
      JSON.stringify(normalizedDraft, null, 2),
      { baseDir: BaseDirectory.AppData }
    );

    return { ok: true, status: "active", error: null };
  } catch (error) {
    console.warn("Could not save Arcadia Desk desktop meeting draft.", error);
    return { ok: false, status: "error", error };
  }
}

export async function clearDesktopMeetingDraft() {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", error: null };
  }

  try {
    const draftExists = await exists(DESKTOP_MEETING_DRAFT_FILE_NAME, {
      baseDir: BaseDirectory.AppData,
    });

    if (draftExists) {
      await remove(DESKTOP_MEETING_DRAFT_FILE_NAME, {
        baseDir: BaseDirectory.AppData,
      });
    }

    return { ok: true, status: "cleared", error: null };
  } catch (error) {
    console.warn("Could not clear Arcadia Desk desktop meeting draft.", error);
    return { ok: false, status: "error", error };
  }
}

export function readSaveFromLocalStorage() {
  return Object.fromEntries(
    Object.entries(STORAGE_KEYS).map(([name, storageKey]) => {
      const savedValue = localStorage.getItem(storageKey);

      if (savedValue === null) {
        return [name, null];
      }

      try {
        return [name, JSON.parse(savedValue)];
      } catch {
        return [name, savedValue];
      }
    })
  );
}

export function buildSavePayload(data, exportedAt = new Date().toISOString()) {
  return {
    metadata: {
      appName: "Arcadia Desk",
      exportedAt,
      version: SAVE_FILE_VERSION,
    },
    data,
  };
}

export function createSavePayloadFromLocalStorage(
  exportedAt = new Date().toISOString()
) {
  return buildSavePayload(readSaveFromLocalStorage(), exportedAt);
}

export function validateSavePayload(payload) {
  return (
    payload?.metadata?.appName === "Arcadia Desk" &&
    payload?.metadata?.version === SAVE_FILE_VERSION &&
    Boolean(payload.data) &&
    typeof payload.data === "object"
  );
}

export function parseImportedSave(fileText) {
  return JSON.parse(fileText);
}

function createAppDataSaveLocation(configuredFolderPath = null) {
  return {
    kind: "appData",
    configuredFolderPath,
    folderPath: null,
  };
}

function createChosenSaveLocation(folderPath) {
  return {
    kind: "chosen",
    configuredFolderPath: folderPath,
    folderPath,
  };
}

function getSaveLocationLabel(location) {
  return location.kind === "chosen" ? "Chosen folder" : "App data";
}

function appendPath(folderPath, path) {
  const normalizedFolder = String(folderPath || "").replace(/[\\/]+$/, "");
  const normalizedPath = String(path || "").replace(/^[\\/]+/, "");

  return `${normalizedFolder}/${normalizedPath}`;
}

function getDesktopPathOptions(location, path) {
  if (location.kind === "chosen") {
    return {
      path: appendPath(location.folderPath, path),
      options: {},
    };
  }

  return {
    path,
    options: { baseDir: BaseDirectory.AppData },
  };
}

async function existsInDesktopLocation(location, path) {
  const target = getDesktopPathOptions(location, path);

  return exists(target.path, target.options);
}

async function readTextFileInDesktopLocation(location, path) {
  const target = getDesktopPathOptions(location, path);

  return readTextFile(target.path, target.options);
}

async function readFileInDesktopLocation(location, path) {
  const target = getDesktopPathOptions(location, path);

  return readFile(target.path, target.options);
}

async function writeFileInDesktopLocation(location, path, fileData) {
  const target = getDesktopPathOptions(location, path);

  return writeFile(target.path, fileData, target.options);
}

async function writeTextFileInDesktopLocation(location, path, fileText) {
  const target = getDesktopPathOptions(location, path);

  return writeTextFile(target.path, fileText, target.options);
}

async function mkdirInDesktopLocation(location, path) {
  const target = getDesktopPathOptions(location, path);

  return mkdir(target.path, {
    ...target.options,
    recursive: true,
  });
}

async function readDirInDesktopLocation(location, path) {
  const target = getDesktopPathOptions(location, path);

  return readDir(target.path, target.options);
}

async function removeInDesktopLocation(location, path) {
  const target = getDesktopPathOptions(location, path);

  return remove(target.path, target.options);
}

async function listFilesInDesktopLocation(location, directoryPath, relativeBase = "") {
  const entries = await readDirInDesktopLocation(location, directoryPath);
  const files = [];

  for (const entry of entries) {
    const entryRelativePath = relativeBase
      ? `${relativeBase}/${entry.name}`
      : entry.name;
    const entryPath = `${directoryPath}/${entry.name}`;

    if (entry.isDirectory) {
      const childFiles = await listFilesInDesktopLocation(
        location,
        entryPath,
        entryRelativePath
      );

      files.push(...childFiles);
      continue;
    }

    if (entry.isFile) {
      files.push(entryRelativePath);
    }
  }

  return files;
}

export async function readDesktopStorageConfig() {
  if (!isDesktopStorageAvailable()) {
    return { saveFolderPath: null };
  }

  try {
    const configExists = await exists(DESKTOP_STORAGE_CONFIG_FILE_NAME, {
      baseDir: BaseDirectory.AppData,
    });

    if (!configExists) {
      return { saveFolderPath: null };
    }

    const configText = await readTextFile(DESKTOP_STORAGE_CONFIG_FILE_NAME, {
      baseDir: BaseDirectory.AppData,
    });
    const config = JSON.parse(configText);

    return {
      saveFolderPath:
        typeof config.saveFolderPath === "string"
          ? config.saveFolderPath
          : null,
    };
  } catch (error) {
    console.warn("Could not read Arcadia Desk desktop storage config.", error);
    return { saveFolderPath: null };
  }
}

export async function writeDesktopStorageConfig(config) {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, error: null };
  }

  try {
    await mkdir(".", {
      baseDir: BaseDirectory.AppData,
      recursive: true,
    });
    await writeTextFile(
      DESKTOP_STORAGE_CONFIG_FILE_NAME,
      JSON.stringify(
        {
          saveFolderPath:
            typeof config.saveFolderPath === "string"
              ? config.saveFolderPath
              : null,
        },
        null,
        2
      ),
      { baseDir: BaseDirectory.AppData }
    );

    return { ok: true, error: null };
  } catch (error) {
    console.warn("Could not write Arcadia Desk desktop storage config.", error);
    return { ok: false, error };
  }
}

export async function chooseDesktopSaveFolder() {
  if (!isDesktopStorageAvailable()) {
    return { status: "unavailable", folderPath: null, error: null };
  }

  try {
    const selectedFolder = await open({
      title: "Choose Arcadia Desk Save Folder",
      directory: true,
      multiple: false,
      recursive: true,
    });

    if (!selectedFolder || Array.isArray(selectedFolder)) {
      return { status: "cancelled", folderPath: null, error: null };
    }

    return { status: "selected", folderPath: selectedFolder, error: null };
  } catch (error) {
    console.warn("Could not choose Arcadia Desk save folder.", error);
    return { status: "error", folderPath: null, error };
  }
}

export function isManagedCharacterImageReference(imageReference) {
  return String(imageReference || "").startsWith(MANAGED_CHARACTER_IMAGE_PREFIX);
}

function getManagedCharacterImageFileName(imageReference) {
  if (!isManagedCharacterImageReference(imageReference)) {
    return "";
  }

  return normalizeCharacterImageRelativePath(
    String(imageReference).slice(MANAGED_CHARACTER_IMAGE_PREFIX.length)
  );
}

export function getManagedCharacterImageRelativePath(imageReference) {
  return getManagedCharacterImageFileName(imageReference);
}

export function createManagedCharacterImageReference(relativePath) {
  const normalizedPath = normalizeCharacterImageRelativePath(relativePath);

  return normalizedPath ? `${MANAGED_CHARACTER_IMAGE_PREFIX}${normalizedPath}` : "";
}

function getCharacterImagePath(fileName) {
  return `${DESKTOP_CHARACTER_IMAGE_DIR_NAME}/${fileName}`;
}

function getImageMimeType(fileName) {
  const lowerFileName = String(fileName || "").toLowerCase();
  const extension =
    ALLOWED_CHARACTER_IMAGE_EXTENSIONS.find((item) =>
      lowerFileName.endsWith(item)
    ) || "";

  return CHARACTER_IMAGE_MIME_TYPES[extension] || "application/octet-stream";
}

function normalizeCharacterImageExtension(extension) {
  const normalizedExtension = String(extension || "").trim().toLowerCase();

  if (!normalizedExtension) {
    return "";
  }

  return normalizedExtension.startsWith(".")
    ? normalizedExtension
    : `.${normalizedExtension}`;
}

function createSafeImageBaseName(name) {
  return (
    String(name || "character")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "character"
  );
}

function createSafePathSegment(value, fallback = "item") {
  return (
    String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || fallback
  );
}

function normalizeCharacterImageRelativePath(value) {
  const normalizedPath = String(value || "").replace(/\\/g, "/").trim();

  if (
    !normalizedPath ||
    normalizedPath.startsWith("/") ||
    normalizedPath.includes("://")
  ) {
    return "";
  }

  const segments = normalizedPath.split("/");

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("..")
    )
  ) {
    return "";
  }

  return segments.join("/");
}

function getCharacterImageImportDirectory({ characterName, scope, outfitName } = {}) {
  const characterSegment = createSafePathSegment(characterName, "character");

  if (scope === "outfit") {
    const outfitSegment = createSafePathSegment(outfitName, "outfit");

    return `${characterSegment}/outfits/${outfitSegment}`;
  }

  if (scope === "base") {
    return `${characterSegment}/base`;
  }

  return "";
}

function getCharacterImageParentPath(relativePath) {
  const normalizedPath = normalizeCharacterImageRelativePath(relativePath);
  const lastSlashIndex = normalizedPath.lastIndexOf("/");

  return lastSlashIndex === -1 ? "" : normalizedPath.slice(0, lastSlashIndex);
}

export async function desktopCharacterImageExists(relativePath) {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, exists: false, status: "unavailable", error: null };
  }

  const normalizedPath = normalizeCharacterImageRelativePath(relativePath);

  if (!normalizedPath) {
    return { ok: false, exists: false, status: "invalid", error: null };
  }

  try {
    const locationResult = await getDesktopSaveLocation();
    const imageExists = await existsInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(normalizedPath)
    );

    return {
      ok: true,
      exists: imageExists,
      status: imageExists ? "active" : "missing",
      saveLocation: locationResult.status,
      folderPath:
        locationResult.location.kind === "chosen"
          ? locationResult.location.folderPath
          : null,
      fallback: locationResult.fallback,
      error: null,
    };
  } catch (error) {
    console.warn("Could not inspect Arcadia Desk character image.", error);
    return { ok: false, exists: false, status: "error", error };
  }
}

export async function getAvailableDesktopCharacterImagePath(relativePath) {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", relativePath: "", error: null };
  }

  const normalizedPath = normalizeCharacterImageRelativePath(relativePath);

  if (!normalizedPath) {
    return { ok: false, status: "invalid", relativePath: "", error: null };
  }

  const slashIndex = normalizedPath.lastIndexOf("/");
  const directory = slashIndex === -1 ? "" : normalizedPath.slice(0, slashIndex);
  const fileName = slashIndex === -1 ? normalizedPath : normalizedPath.slice(slashIndex + 1);
  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex === -1 ? fileName : fileName.slice(0, dotIndex);
  const extension = dotIndex === -1 ? "" : fileName.slice(dotIndex);

  try {
    const locationResult = await getDesktopSaveLocation();

    for (let index = 0; index < 100; index += 1) {
      const suffix = index === 0 ? "" : `-${String(index + 1).padStart(2, "0")}`;
      const candidateFileName = `${baseName}${suffix}${extension}`;
      const candidatePath = directory
        ? `${directory}/${candidateFileName}`
        : candidateFileName;
      const candidateExists = await existsInDesktopLocation(
        locationResult.location,
        getCharacterImagePath(candidatePath)
      );

      if (!candidateExists) {
        return {
          ok: true,
          status: "available",
          relativePath: candidatePath,
          saveLocation: locationResult.status,
          folderPath:
            locationResult.location.kind === "chosen"
              ? locationResult.location.folderPath
              : null,
          fallback: locationResult.fallback,
          error: null,
        };
      }
    }

    return { ok: false, status: "collisionLimit", relativePath: "", error: null };
  } catch (error) {
    console.warn("Could not find an available Arcadia Desk character image path.", error);
    return { ok: false, status: "error", relativePath: "", error };
  }
}

export async function copyDesktopCharacterImageFile(sourceRelativePath, destinationRelativePath) {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", error: null };
  }

  const sourcePath = normalizeCharacterImageRelativePath(sourceRelativePath);
  const destinationPath = normalizeCharacterImageRelativePath(destinationRelativePath);

  if (!sourcePath || !destinationPath) {
    return { ok: false, status: "invalid", error: null };
  }

  try {
    const locationResult = await getDesktopSaveLocation();
    const destinationExists = await existsInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(destinationPath)
    );

    if (destinationExists) {
      return { ok: false, status: "destinationExists", error: null };
    }

    const imageData = await readFileInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(sourcePath)
    );
    const parentPath = getCharacterImageParentPath(destinationPath);

    await mkdirInDesktopLocation(
      locationResult.location,
      parentPath
        ? `${DESKTOP_CHARACTER_IMAGE_DIR_NAME}/${parentPath}`
        : DESKTOP_CHARACTER_IMAGE_DIR_NAME
    );
    await writeFileInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(destinationPath),
      imageData
    );

    const copiedExists = await existsInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(destinationPath)
    );

    if (!copiedExists) {
      return { ok: false, status: "verifyFailed", error: null };
    }

    return {
      ok: true,
      status: "copied",
      sourceRelativePath: sourcePath,
      destinationRelativePath: destinationPath,
      saveLocation: locationResult.status,
      folderPath:
        locationResult.location.kind === "chosen"
          ? locationResult.location.folderPath
          : null,
      fallback: locationResult.fallback,
      error: null,
    };
  } catch (error) {
    console.warn("Could not copy Arcadia Desk character image.", error);
    return { ok: false, status: "error", error };
  }
}

export async function moveDesktopCharacterImageFile(sourceRelativePath, destinationRelativePath) {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", error: null };
  }

  const sourcePath = normalizeCharacterImageRelativePath(sourceRelativePath);
  const destinationPath = normalizeCharacterImageRelativePath(destinationRelativePath);

  if (!sourcePath || !destinationPath || sourcePath === destinationPath) {
    return { ok: false, status: "invalid", error: null };
  }

  try {
    const locationResult = await getDesktopSaveLocation();
    const sourceExists = await existsInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(sourcePath)
    );

    if (!sourceExists) {
      return { ok: false, status: "missingSource", error: null };
    }

    const destinationExists = await existsInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(destinationPath)
    );

    if (destinationExists) {
      return { ok: false, status: "destinationExists", error: null };
    }

    const imageData = await readFileInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(sourcePath)
    );
    const parentPath = getCharacterImageParentPath(destinationPath);

    await mkdirInDesktopLocation(
      locationResult.location,
      parentPath
        ? `${DESKTOP_CHARACTER_IMAGE_DIR_NAME}/${parentPath}`
        : DESKTOP_CHARACTER_IMAGE_DIR_NAME
    );
    await writeFileInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(destinationPath),
      imageData
    );

    const movedCopyExists = await existsInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(destinationPath)
    );

    if (!movedCopyExists) {
      return { ok: false, status: "verifyFailed", error: null };
    }

    await removeInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(sourcePath)
    );

    return {
      ok: true,
      status: "moved",
      sourceRelativePath: sourcePath,
      destinationRelativePath: destinationPath,
      saveLocation: locationResult.status,
      folderPath:
        locationResult.location.kind === "chosen"
          ? locationResult.location.folderPath
          : null,
      fallback: locationResult.fallback,
      error: null,
    };
  } catch (error) {
    console.warn("Could not move Arcadia Desk character image.", error);
    return { ok: false, status: "error", error };
  }
}

export async function listDesktopCharacterImageFiles() {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", files: [], error: null };
  }

  try {
    const locationResult = await getDesktopSaveLocation();
    const imageFolderExists = await existsInDesktopLocation(
      locationResult.location,
      DESKTOP_CHARACTER_IMAGE_DIR_NAME
    );

    if (!imageFolderExists) {
      return {
        ok: true,
        status: "missingFolder",
        files: [],
        saveLocation: locationResult.status,
        folderPath:
          locationResult.location.kind === "chosen"
            ? locationResult.location.folderPath
            : null,
        fallback: locationResult.fallback,
        error: null,
      };
    }

    const files = await listFilesInDesktopLocation(
      locationResult.location,
      DESKTOP_CHARACTER_IMAGE_DIR_NAME
    );

    return {
      ok: true,
      status: "active",
      files,
      saveLocation: locationResult.status,
      folderPath:
        locationResult.location.kind === "chosen"
          ? locationResult.location.folderPath
          : null,
      fallback: locationResult.fallback,
      error: null,
    };
  } catch (error) {
    console.warn("Could not scan Arcadia Desk character image folder.", error);
    return { ok: false, status: "error", files: [], error };
  }
}

async function getDesktopLocationAbsolutePath(location, path) {
  if (location.kind === "chosen") {
    return appendPath(location.folderPath, path);
  }

  return join(await appDataDir(), path);
}

async function getUniqueCharacterImageFileName(
  location,
  baseName,
  extension,
  directory = ""
) {
  const safeBaseName = createSafeImageBaseName(baseName);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "")
    .replace("T", "-");
  const normalizedExtension = extension.toLowerCase();

  for (let index = 0; index < 100; index += 1) {
    const suffix = index === 0 ? "" : `-${String(index + 1).padStart(2, "0")}`;
    const fileName = `${safeBaseName}-${timestamp}${suffix}${normalizedExtension}`;
    const relativePath = directory ? `${directory}/${fileName}` : fileName;
    const imageExists = await existsInDesktopLocation(
      location,
      getCharacterImagePath(relativePath)
    );

    if (!imageExists) {
      return relativePath;
    }
  }

  const fallbackFileName = `${safeBaseName}-${timestamp}-${String(Date.now()).slice(-6)}${normalizedExtension}`;

  return directory ? `${directory}/${fallbackFileName}` : fallbackFileName;
}

export async function importDesktopCharacterImage({
  characterName,
  scope = "base",
  outfitName,
  slot = "portrait",
} = {}) {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", imageReference: "", error: null };
  }

  try {
    const selectedImage = await open({
      title: "Import Character Image",
      multiple: false,
      filters: [
        {
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp"],
        },
      ],
    });

    if (!selectedImage || Array.isArray(selectedImage)) {
      return { ok: false, status: "cancelled", imageReference: "", error: null };
    }

    const selectedExtension = normalizeCharacterImageExtension(
      await extname(selectedImage)
    );

    if (!ALLOWED_CHARACTER_IMAGE_EXTENSIONS.includes(selectedExtension)) {
      return {
        ok: false,
        status: "unsupportedType",
        imageReference: "",
        error: null,
      };
    }

    const locationResult = await getDesktopSaveLocation();
    const selectedBaseName = await basename(selectedImage, selectedExtension);
    const importDirectory = getCharacterImageImportDirectory({
      characterName,
      scope,
      outfitName,
    });
    const fileName = await getUniqueCharacterImageFileName(
      locationResult.location,
      slot || characterName || selectedBaseName,
      selectedExtension,
      importDirectory
    );
    const imageData = await readFile(selectedImage);
    const parentPath = getCharacterImageParentPath(fileName);

    await mkdirInDesktopLocation(
      locationResult.location,
      parentPath
        ? `${DESKTOP_CHARACTER_IMAGE_DIR_NAME}/${parentPath}`
        : DESKTOP_CHARACTER_IMAGE_DIR_NAME
    );
    await writeFileInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(fileName),
      imageData
    );

    return {
      ok: true,
      status: "imported",
      imageReference: `${MANAGED_CHARACTER_IMAGE_PREFIX}${fileName}`,
      fileName,
      saveLocation: locationResult.status,
      folderPath:
        locationResult.location.kind === "chosen"
          ? locationResult.location.folderPath
          : null,
      fallback: locationResult.fallback,
      error: null,
    };
  } catch (error) {
    console.warn("Could not import Arcadia Desk character image.", error);
    return { ok: false, status: "error", imageReference: "", error };
  }
}

export async function readDesktopCharacterImage(imageReference) {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", url: "", error: null };
  }

  const fileName = getManagedCharacterImageFileName(imageReference);

  if (!fileName) {
    return { ok: false, status: "invalid", url: "", error: null };
  }

  try {
    const locationResult = await getDesktopSaveLocation();
    const imageData = await readFileInDesktopLocation(
      locationResult.location,
      getCharacterImagePath(fileName)
    );
    const blob = new Blob([imageData], { type: getImageMimeType(fileName) });
    const url = URL.createObjectURL(blob);

    return {
      ok: true,
      status: "active",
      url,
      fileName,
      absolutePath: await getDesktopLocationAbsolutePath(
        locationResult.location,
        getCharacterImagePath(fileName)
      ),
      saveLocation: locationResult.status,
      folderPath:
        locationResult.location.kind === "chosen"
          ? locationResult.location.folderPath
          : null,
      fallback: locationResult.fallback,
      error: null,
    };
  } catch (error) {
    console.warn("Could not read Arcadia Desk character image.", error);
    return { ok: false, status: "missing", url: "", error };
  }
}

export async function getDesktopSaveLocation() {
  const config = await readDesktopStorageConfig();

  if (!config.saveFolderPath) {
    return {
      status: "appData",
      location: createAppDataSaveLocation(),
      configuredFolderPath: null,
      fallback: false,
      error: null,
    };
  }

  const chosenLocation = createChosenSaveLocation(config.saveFolderPath);

  try {
    const folderExists = await exists(chosenLocation.folderPath);

    if (folderExists) {
      return {
        status: "chosen",
        location: chosenLocation,
        configuredFolderPath: chosenLocation.folderPath,
        fallback: false,
        error: null,
      };
    }
  } catch (error) {
    console.warn("Configured Arcadia Desk save folder is unavailable.", error);
    return {
      status: "folderUnavailable",
      location: createAppDataSaveLocation(chosenLocation.folderPath),
      configuredFolderPath: chosenLocation.folderPath,
      fallback: true,
      error,
    };
  }

  return {
    status: "folderUnavailable",
    location: createAppDataSaveLocation(chosenLocation.folderPath),
    configuredFolderPath: chosenLocation.folderPath,
    fallback: true,
    error: null,
  };
}

function getDesktopBackupTimestamp(date = new Date()) {
  const pad = (value, length = 2) => String(value).padStart(length, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function getDesktopBackupFileName(date = new Date()) {
  return `arcadia-desk-save-${getDesktopBackupTimestamp(date)}.json`;
}

function getDesktopBackupPath(fileName) {
  return `${DESKTOP_BACKUP_DIR_NAME}/${fileName}`;
}

async function readCurrentDesktopSaveText(location) {
  const saveExists = await existsInDesktopLocation(
    location,
    DESKTOP_SAVE_FILE_NAME
  );

  if (!saveExists) {
    return { status: "missing", fileText: null, payload: null, error: null };
  }

  try {
    const fileText = await readTextFileInDesktopLocation(
      location,
      DESKTOP_SAVE_FILE_NAME
    );
    const payload = parseImportedSave(fileText);

    if (!validateSavePayload(payload)) {
      return { status: "corrupt", fileText, payload: null, error: null };
    }

    return { status: "active", fileText, payload, error: null };
  } catch (error) {
    console.warn("Could not read Arcadia Desk desktop save file.", error);
    return { status: "corrupt", fileText: null, payload: null, error };
  }
}

async function getUniqueDesktopBackupPath(location) {
  const baseFileName = getDesktopBackupFileName();
  const extension = ".json";
  const baseName = baseFileName.slice(0, -extension.length);

  for (let index = 0; index < 100; index += 1) {
    const fileName =
      index === 0 ? baseFileName : `${baseName}-${String(index + 1).padStart(2, "0")}${extension}`;
    const backupPath = getDesktopBackupPath(fileName);
    const backupExists = await existsInDesktopLocation(location, backupPath);

    if (!backupExists) {
      return backupPath;
    }
  }

  return getDesktopBackupPath(
    `${baseName}-${String(Date.now()).slice(-6)}${extension}`
  );
}

async function pruneDesktopBackups(location) {
  try {
    const backupEntries = await readDirInDesktopLocation(
      location,
      DESKTOP_BACKUP_DIR_NAME
    );
    const backupFiles = backupEntries
      .filter(
        (entry) =>
          entry.isFile &&
          entry.name?.startsWith("arcadia-desk-save-") &&
          entry.name.endsWith(".json")
      )
      .sort((firstEntry, secondEntry) =>
        secondEntry.name.localeCompare(firstEntry.name)
      );
    const backupsToRemove = backupFiles.slice(DESKTOP_BACKUP_LIMIT);

    await Promise.all(
      backupsToRemove.map((entry) =>
        removeInDesktopLocation(location, getDesktopBackupPath(entry.name))
      )
    );
  } catch (error) {
    console.warn("Could not prune Arcadia Desk desktop save backups.", error);
  }
}

async function createDesktopSaveBackup(location, fileText) {
  await mkdirInDesktopLocation(location, DESKTOP_BACKUP_DIR_NAME);

  const backupPath = await getUniqueDesktopBackupPath(location);

  await writeTextFileInDesktopLocation(location, backupPath, fileText);

  lastDesktopBackupCreatedAt = Date.now();
}

export async function readDesktopSavePayload() {
  if (!isDesktopStorageAvailable()) {
    return { status: "unavailable", payload: null, error: null };
  }

  const locationResult = await getDesktopSaveLocation();
  const result = await readCurrentDesktopSaveText(locationResult.location);

  return {
    status: locationResult.fallback ? "folderUnavailable" : result.status,
    payload: result.payload,
    error: result.error,
    saveLocation: locationResult.status,
    folderPath:
      locationResult.location.kind === "chosen"
        ? locationResult.location.folderPath
        : null,
    configuredFolderPath: locationResult.configuredFolderPath,
    fallback: locationResult.fallback,
    locationLabel: getSaveLocationLabel(locationResult.location),
  };
}

export async function writeDesktopSavePayload(payload, options = {}) {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", error: null };
  }

  const newFileText = JSON.stringify(payload, null, 2);
  const locationResult = options.location
    ? {
        location: options.location,
        status: options.location.kind === "chosen" ? "chosen" : "appData",
        configuredFolderPath: options.location.configuredFolderPath || null,
        fallback: false,
      }
    : await getDesktopSaveLocation();
  const location = locationResult.location;

  try {
    await mkdirInDesktopLocation(location, ".");
  } catch (error) {
    console.warn("Could not ensure Arcadia Desk save directory.", error);
  }

  try {
    const currentSave = await readCurrentDesktopSaveText(location);

    if (currentSave.status === "corrupt") {
      return { ok: false, status: "corrupt", error: currentSave.error };
    }

    const hasExistingValidSave = currentSave.status === "active";
    const currentSaveDiffers =
      hasExistingValidSave && currentSave.fileText !== newFileText;
    const now = Date.now();
    const shouldCreateBackup =
      currentSaveDiffers &&
      (options.forceBackup ||
        now - lastDesktopBackupCreatedAt >= DESKTOP_BACKUP_THROTTLE_MS);

    if (shouldCreateBackup) {
      try {
        await createDesktopSaveBackup(location, currentSave.fileText);
      } catch (error) {
        console.warn("Could not create Arcadia Desk desktop save backup.", error);
        return { ok: false, status: "backupError", error };
      }
    }

    await writeTextFileInDesktopLocation(
      location,
      DESKTOP_SAVE_FILE_NAME,
      newFileText
    );

    if (shouldCreateBackup) {
      await pruneDesktopBackups(location);
    }

    return {
      ok: true,
      status: "active",
      error: null,
      backupCreated: shouldCreateBackup,
      saveLocation: locationResult.status,
      folderPath: location.kind === "chosen" ? location.folderPath : null,
      configuredFolderPath: locationResult.configuredFolderPath,
      fallback: locationResult.fallback,
    };
  } catch (error) {
    console.warn("Could not write Arcadia Desk desktop save file.", error);
    return { ok: false, status: "writeError", error };
  }
}

export async function inspectDesktopSaveFolder(folderPath) {
  if (!isDesktopStorageAvailable()) {
    return {
      status: "unavailable",
      location: null,
      payload: null,
      error: null,
    };
  }

  const location = createChosenSaveLocation(folderPath);

  try {
    const folderExists = await exists(folderPath);

    if (!folderExists) {
      return { status: "missingFolder", location, payload: null, error: null };
    }

    const saveResult = await readCurrentDesktopSaveText(location);

    return {
      status: saveResult.status,
      location,
      payload: saveResult.payload,
      error: saveResult.error,
      folderPath,
    };
  } catch (error) {
    console.warn("Could not inspect Arcadia Desk save folder.", error);
    return { status: "unavailable", location, payload: null, error };
  }
}

export async function writeDesktopWorkLogFile(
  entry,
  { employeeName, employeeNamesById } = {}
) {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", error: null };
  }

  try {
    const locationResult = await getDesktopSaveLocation();
    const workLogText = buildWorkLogText(entry, {
      employeeName,
      employeeNamesById,
    });
    const workLogFileName = getWorkLogFileName(entry);

    await mkdirInDesktopLocation(locationResult.location, DESKTOP_WORK_LOG_DIR_NAME);
    await writeTextFileInDesktopLocation(
      locationResult.location,
      `${DESKTOP_WORK_LOG_DIR_NAME}/${workLogFileName}`,
      workLogText
    );

    return {
      ok: true,
      status: "active",
      fileName: workLogFileName,
      saveLocation: locationResult.status,
      folderPath:
        locationResult.location.kind === "chosen"
          ? locationResult.location.folderPath
          : null,
      fallback: locationResult.fallback,
      error: null,
    };
  } catch (error) {
    console.warn("Could not auto-save Arcadia Desk work log.", error);
    return { ok: false, status: "writeError", error };
  }
}

export async function writeDesktopMeetingNotesFile(
  session,
  meetingTask,
  actionItems = []
) {
  if (!isDesktopStorageAvailable()) {
    return { ok: false, status: "unavailable", error: null };
  }

  try {
    const locationResult = await getDesktopSaveLocation();
    const meetingNotesText = buildMeetingNotesText(
      session,
      meetingTask,
      actionItems
    );
    const meetingNotesFileName = getMeetingNotesFileName(session, meetingTask);

    await mkdirInDesktopLocation(
      locationResult.location,
      DESKTOP_MEETING_NOTES_DIR_NAME
    );
    await writeTextFileInDesktopLocation(
      locationResult.location,
      `${DESKTOP_MEETING_NOTES_DIR_NAME}/${meetingNotesFileName}`,
      meetingNotesText
    );

    return {
      ok: true,
      status: "active",
      fileName: meetingNotesFileName,
      saveLocation: locationResult.status,
      folderPath:
        locationResult.location.kind === "chosen"
          ? locationResult.location.folderPath
          : null,
      fallback: locationResult.fallback,
      error: null,
    };
  } catch (error) {
    console.warn("Could not auto-save Arcadia Desk meeting notes.", error);
    return { ok: false, status: "writeError", error };
  }
}

export function writeSaveToLocalStorage(payload, fallbackBuilders = {}) {
  Object.entries(STORAGE_KEYS).forEach(([name, storageKey]) => {
    if (Object.hasOwn(payload.data, name)) {
      saveData(storageKey, payload.data[name]);
    }
  });

  if (!Object.hasOwn(payload.data, "customProjectTemplates")) {
    saveData(
      STORAGE_KEYS.customProjectTemplates,
      fallbackBuilders.createTemplateLibraryFallback?.()
    );
  }

  if (!Object.hasOwn(payload.data, "clientLibrary")) {
    saveData(
      STORAGE_KEYS.clientLibrary,
      fallbackBuilders.createClientLibraryFallback?.()
    );
  }

  if (!Object.hasOwn(payload.data, "characterLibrary")) {
    const seededCharacterLibrary =
      fallbackBuilders.createCharacterLibraryFallback?.(payload.data) || [];

    saveData(
      STORAGE_KEYS.characterLibrary,
      fallbackBuilders.createCharacterLibraryRecordFallback
        ? fallbackBuilders.createCharacterLibraryRecordFallback(
            seededCharacterLibrary
          )
        : seededCharacterLibrary
    );
    saveData(STORAGE_KEYS.employees, seededCharacterLibrary);
  }
}

export function createResetWorkDataPayload(today, blankWorkday) {
  return {
    tasks: [],
    projects: [],
    history: [],
    workday: blankWorkday,
    activeDate: today,
    activeEmployeeId: null,
    scratchpad: {},
  };
}

export function downloadSavePayload(payload, dateKey) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = url;
  downloadLink.download = `arcadia-desk-save-${dateKey}.json`;
  downloadLink.click();
  URL.revokeObjectURL(url);
}
