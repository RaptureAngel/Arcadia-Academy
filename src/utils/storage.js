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

export const STORAGE_KEYS = {
  activeEmployeeId: "arcadia-academy-active-employee-id",
  employees: "arcadia-academy-employees",
  characterLibrary: "arcadia-academy-character-library",
  subjects: "arcadia-academy-subjects",
  studyProjects: "arcadia-academy-study-projects",
  studySessions: "arcadia-academy-study-sessions",
};

export const SAVE_FILE_VERSION = 1;
export const DESKTOP_SAVE_FILE_NAME = "arcadia-academy-save.json";
export const DESKTOP_BACKUP_DIR_NAME = "Backups";
export const DESKTOP_CHARACTER_IMAGE_DIR_NAME = "Character Images";
export const DESKTOP_STORAGE_CONFIG_FILE_NAME =
  "arcadia-academy-storage-config.json";
export const DESKTOP_BACKUP_LIMIT = 3;
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
      appName: "Arcadia Academy",
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
    payload?.metadata?.appName === "Arcadia Academy" &&
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
    console.warn("Could not read Arcadia Academy desktop storage config.", error);
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
    console.warn("Could not write Arcadia Academy desktop storage config.", error);
    return { ok: false, error };
  }
}

export async function chooseDesktopSaveFolder() {
  if (!isDesktopStorageAvailable()) {
    return { status: "unavailable", folderPath: null, error: null };
  }

  try {
    const selectedFolder = await open({
      title: "Choose Arcadia Academy Save Folder",
      directory: true,
      multiple: false,
      recursive: true,
    });

    if (!selectedFolder || Array.isArray(selectedFolder)) {
      return { status: "cancelled", folderPath: null, error: null };
    }

    return { status: "selected", folderPath: selectedFolder, error: null };
  } catch (error) {
    console.warn("Could not choose Arcadia Academy save folder.", error);
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
    console.warn("Could not inspect Arcadia Academy character image.", error);
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
    console.warn("Could not find an available Arcadia Academy character image path.", error);
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
    console.warn("Could not copy Arcadia Academy character image.", error);
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
    console.warn("Could not move Arcadia Academy character image.", error);
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
    console.warn("Could not scan Arcadia Academy character image folder.", error);
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
    console.warn("Could not import Arcadia Academy character image.", error);
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
    console.warn("Could not read Arcadia Academy character image.", error);
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
    console.warn("Configured Arcadia Academy save folder is unavailable.", error);
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
  return `arcadia-academy-save-${getDesktopBackupTimestamp(date)}.json`;
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
    console.warn("Could not read Arcadia Academy desktop save file.", error);
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
          entry.name?.startsWith("arcadia-academy-save-") &&
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
    console.warn("Could not prune Arcadia Academy desktop save backups.", error);
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
    console.warn("Could not ensure Arcadia Academy save directory.", error);
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
        console.warn("Could not create Arcadia Academy desktop save backup.", error);
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
    console.warn("Could not write Arcadia Academy desktop save file.", error);
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
    console.warn("Could not inspect Arcadia Academy save folder.", error);
    return { status: "unavailable", location, payload: null, error };
  }
}

export function writeSaveToLocalStorage(payload, fallbackBuilders = {}) {
  Object.entries(STORAGE_KEYS).forEach(([name, storageKey]) => {
    if (Object.hasOwn(payload.data, name)) {
      saveData(storageKey, payload.data[name]);
    }
  });

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

  // An Academy save predating Stage 2A won't carry these collections. Treat
  // them as empty rather than leaving whatever newer local data exists,
  // so restoring an older save doesn't produce a hybrid state.
  ["subjects", "studyProjects", "studySessions"].forEach((name) => {
    if (!Object.hasOwn(payload.data, name)) {
      saveData(STORAGE_KEYS[name], []);
    }
  });
}

// Clears the shared Academy activity collections (subjects, study projects,
// study sessions) while leaving the character roster, images, outfits, and
// XP untouched. Used by both "Reset Academy Activity" and "New Academy
// Season" — the latter additionally zeroes character XP separately.
export function createResetAcademyActivityPayload() {
  return {
    subjects: [],
    studyProjects: [],
    studySessions: [],
  };
}

export function downloadSavePayload(payload, dateKey) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = url;
  downloadLink.download = `arcadia-academy-save-${dateKey}.json`;
  downloadLink.click();
  URL.revokeObjectURL(url);
}
