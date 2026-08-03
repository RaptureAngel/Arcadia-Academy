import { employees as starterCharacters } from "../data/employees";
import {
  createCharacterLibraryFromStarterCharacters,
  normalizeCharacterLibrary,
} from "./characters";
import { normalizeSubjectList } from "./subjects";
import { normalizeStudyProjectList } from "./studyProjects";
import { normalizeStudySessionList } from "./studySessions";

// Deterministic canonical JSON: object keys are sorted recursively so two
// structurally-identical values serialize identically regardless of
// original key order (array order is preserved — it's meaningful data).
// No external package needed for this.
export function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((normalized, key) => {
        normalized[key] = canonicalize(value[key]);
        return normalized;
      }, {});
  }

  return value;
}

// One canonical, comparable shape for "the Academy collections that
// matter," built from either local React state or a desktop save payload's
// `data` object — both pass their pieces through the exact same
// normalizers the rest of the app already uses, so representational
// differences (missing optional fields, alternate key order, a save's
// `characterLibrary` being the {version,characters} wrapper vs. local
// state's raw array) never produce a false mismatch. Deliberately excludes
// desktop-only metadata (updatedAt/revision/exportedAt) — those are never
// part of the Academy data itself.
export function normalizeAcademyDataset(source) {
  return {
    activeEmployeeId:
      typeof source?.activeEmployeeId === "string" && source.activeEmployeeId
        ? source.activeEmployeeId
        : null,
    characters: normalizeCharacterLibrary(source?.characterLibrary) || [],
    subjects: normalizeSubjectList(source?.subjects),
    studyProjects: normalizeStudyProjectList(source?.studyProjects),
    studySessions: normalizeStudySessionList(source?.studySessions),
  };
}

// The exact, conservative definition of "nothing meaningful has happened
// here yet": no subjects, no study projects, no study sessions, and the
// character roster is byte-for-byte (after normalization) identical to a
// freshly-generated starter roster — same characters, zero XP, zero
// outfits, no dossier edits, no custom images, no non-default framing.
// activeEmployeeId is deliberately NOT part of this check: simply having a
// starter character selected/open is not "data" worth protecting on its
// own. Any other deviation whatsoever — a single XP point, one dossier
// field filled in, an outfit added, a custom portrait, a subject, a
// project, a session — disqualifies the dataset from being "empty or
// untouched" and routes it through the normal comparison instead.
export function isAcademyDatasetEmptyOrUntouched(dataset) {
  if (dataset.subjects.length > 0) return false;
  if (dataset.studyProjects.length > 0) return false;
  if (dataset.studySessions.length > 0) return false;

  const starterCharacterList = createCharacterLibraryFromStarterCharacters(
    starterCharacters
  );

  return (
    stableStringify(dataset.characters) === stableStringify(starterCharacterList)
  );
}

// True only when every compared field — activeEmployeeId, character
// roster/state, subjects, study projects, study sessions — is identical
// after normalization. Never looks at timestamps/exportedAt/revision.
export function areAcademyDatasetsEquivalent(datasetA, datasetB) {
  return stableStringify(datasetA) === stableStringify(datasetB);
}
