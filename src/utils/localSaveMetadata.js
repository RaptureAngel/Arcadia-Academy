import { LOCAL_SAVE_METADATA_STORAGE_KEY } from "./storage";

// Device-local bookkeeping for how "fresh" this browser's data is relative
// to the last desktop save this device actually synchronised with. Not
// Academy data, not exported, not imported — see the note on
// LOCAL_SAVE_METADATA_STORAGE_KEY in storage.js.
export const LOCAL_SAVE_METADATA_VERSION = 1;

function toFiniteOrNull(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function isValidTimestamp(value) {
  return (
    typeof value === "string" &&
    value !== "" &&
    !Number.isNaN(new Date(value).getTime())
  );
}

// Safe default for a fresh install or an existing install upgrading to this
// version for the first time: revision 0, nothing synced yet. Startup
// comparison treats this specific shape as "no local history to protect
// yet" so upgrading doesn't suddenly surface a conflict dialog for every
// existing user on their next launch.
export function createDefaultLocalSaveMetadata() {
  return {
    version: LOCAL_SAVE_METADATA_VERSION,
    updatedAt: null,
    revision: 0,
    lastSyncedDesktopRevision: null,
    lastSyncedDesktopUpdatedAt: null,
  };
}

// Malformed/foreign data must not crash startup — fall back to the safe
// default rather than throwing or propagating garbage into the comparison.
export function normalizeLocalSaveMetadata(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== LOCAL_SAVE_METADATA_VERSION) {
    return createDefaultLocalSaveMetadata();
  }

  const revision = toFiniteOrNull(raw.revision);

  return {
    version: LOCAL_SAVE_METADATA_VERSION,
    updatedAt: isValidTimestamp(raw.updatedAt) ? raw.updatedAt : null,
    revision: revision !== null && revision >= 0 ? Math.trunc(revision) : 0,
    lastSyncedDesktopRevision: toFiniteOrNull(raw.lastSyncedDesktopRevision),
    lastSyncedDesktopUpdatedAt: isValidTimestamp(raw.lastSyncedDesktopUpdatedAt)
      ? raw.lastSyncedDesktopUpdatedAt
      : null,
  };
}

export function loadLocalSaveMetadata() {
  try {
    const savedValue = localStorage.getItem(LOCAL_SAVE_METADATA_STORAGE_KEY);

    if (!savedValue) return createDefaultLocalSaveMetadata();

    return normalizeLocalSaveMetadata(JSON.parse(savedValue));
  } catch (error) {
    console.warn("Could not read Arcadia Academy local save metadata.", error);
    return createDefaultLocalSaveMetadata();
  }
}

export function saveLocalSaveMetadata(metadata) {
  try {
    localStorage.setItem(
      LOCAL_SAVE_METADATA_STORAGE_KEY,
      JSON.stringify(metadata)
    );
  } catch (error) {
    console.warn("Could not save Arcadia Academy local save metadata.", error);
  }
}

// Called whenever one of the main persisted Academy collections changes.
export function bumpLocalSaveRevision(current, updatedAt = new Date().toISOString()) {
  return {
    ...current,
    updatedAt,
    revision: (current.revision || 0) + 1,
  };
}

// Called after local data is either successfully written to, or hydrated
// from, the desktop save — establishes a new common baseline so the next
// startup comparison correctly sees "clean" instead of "diverged."
export function markLocalSaveSyncedWithDesktop(current, desktopMetadata, fallbackUpdatedAt = new Date().toISOString()) {
  const desktopRevision = toFiniteOrNull(desktopMetadata?.revision);
  const syncedRevision = desktopRevision !== null ? desktopRevision : current.revision || 0;
  const syncedUpdatedAt = isValidTimestamp(desktopMetadata?.updatedAt)
    ? desktopMetadata.updatedAt
    : fallbackUpdatedAt;

  return {
    version: LOCAL_SAVE_METADATA_VERSION,
    updatedAt: syncedUpdatedAt,
    revision: syncedRevision,
    lastSyncedDesktopRevision: syncedRevision,
    lastSyncedDesktopUpdatedAt: syncedUpdatedAt,
  };
}

// Startup/conflict comparison. Returns one of:
// - "no-desktop": nothing to compare against.
// - "in-sync": identical/known-synchronised, proceed silently.
// - "desktop-newer": desktop moved, local did not diverge — safe to hydrate.
// - "local-newer": local moved, desktop did not diverge — safe to push.
// - "conflict": both diverged, or freshness can't be determined safely.
export function compareLocalAndDesktopSaveState(localMetadata, desktopMetadata) {
  if (!desktopMetadata) return { outcome: "no-desktop" };

  const desktopRevision = toFiniteOrNull(desktopMetadata.revision);
  const localRevision = localMetadata.revision || 0;
  const syncedRevision = localMetadata.lastSyncedDesktopRevision;

  // Never tracked anything locally yet (fresh install, or an existing
  // install's first launch after upgrading to this feature) — there is no
  // local history to protect, so trust the desktop file exactly as Academy
  // always has.
  if (localRevision === 0 && syncedRevision === null) {
    return { outcome: "desktop-newer", reason: "no-local-history" };
  }

  if (desktopRevision === null) {
    // Old desktop save with no revision metadata: freshness can't be
    // determined safely once local has real history.
    return { outcome: "conflict", reason: "desktop-missing-revision" };
  }

  const desktopUnchangedSinceSync = desktopRevision === syncedRevision;
  const localUnchangedSinceSync = localRevision === syncedRevision;

  if (desktopUnchangedSinceSync && localUnchangedSinceSync) {
    return { outcome: "in-sync" };
  }

  if (desktopUnchangedSinceSync && !localUnchangedSinceSync) {
    return { outcome: "local-newer" };
  }

  if (!desktopUnchangedSinceSync && localUnchangedSinceSync) {
    return { outcome: "desktop-newer" };
  }

  return { outcome: "conflict", reason: "both-diverged" };
}
