import { buildSessionsCsv, buildStudyLogText } from "../utils/studyHistoryExport";
import { downloadTextFile } from "../utils/storage";
import { getTodayKey } from "../utils/dates";

// Thin, read-only wiring around the pure export builders: no storage
// writes, no state changes, no interaction with desktop saving, autosave,
// conflict resolution, or focus-session recovery — a plain user-initiated
// browser download built from whatever data is already in memory.
export function useStudyHistoryExport({
  studySessions,
  studyProjects,
  subjects,
  characterLibrary,
}) {
  const hasSessions = Array.isArray(studySessions) && studySessions.length > 0;

  function exportStudyLogTxt() {
    const text = buildStudyLogText({
      studySessions,
      studyProjects,
      subjects,
      characterLibrary,
    });

    downloadTextFile(
      `arcadia-academy-study-log-${getTodayKey()}.txt`,
      text,
      "text/plain;charset=utf-8"
    );
  }

  function exportSessionsCsv() {
    const csv = buildSessionsCsv({
      studySessions,
      studyProjects,
      subjects,
      characterLibrary,
    });

    downloadTextFile(
      `arcadia-academy-sessions-${getTodayKey()}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  }

  return { hasSessions, exportStudyLogTxt, exportSessionsCsv };
}
