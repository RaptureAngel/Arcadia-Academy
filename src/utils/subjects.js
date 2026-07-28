function normalizeText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function createSubject({
  name,
  description = "",
  color = "",
  icon = "",
} = {}) {
  const timestamp = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: String(name || "").trim(),
    description: normalizeText(description),
    color: normalizeText(color),
    icon: normalizeText(icon),
    createdAt: timestamp,
    updatedAt: timestamp,
    archivedAt: null,
  };
}

export function normalizeSubject(raw) {
  if (!raw || typeof raw !== "object") return null;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";

  if (!name) return null;

  const timestamp = new Date().toISOString();

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    name,
    description: normalizeText(raw.description),
    color: normalizeText(raw.color),
    icon: normalizeText(raw.icon),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : timestamp,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : timestamp,
    archivedAt: typeof raw.archivedAt === "string" ? raw.archivedAt : null,
  };
}

export function normalizeSubjectList(rawList) {
  if (!Array.isArray(rawList)) return [];

  return rawList.map(normalizeSubject).filter(Boolean);
}

export function validateSubject(subject) {
  const errors = [];

  if (!subject || typeof subject !== "object") {
    return { valid: false, errors: ["Subject must be an object."] };
  }

  if (typeof subject.id !== "string" || !subject.id) {
    errors.push("Subject id is required.");
  }

  if (typeof subject.name !== "string" || !subject.name.trim()) {
    errors.push("Subject name is required.");
  }

  return { valid: errors.length === 0, errors };
}

export function isSubjectArchived(subject) {
  return Boolean(subject?.archivedAt);
}

export function sortSubjects(subjects) {
  if (!Array.isArray(subjects)) return [];

  return [...subjects].sort((firstSubject, secondSubject) => {
    const firstArchived = isSubjectArchived(firstSubject);
    const secondArchived = isSubjectArchived(secondSubject);

    if (firstArchived !== secondArchived) {
      return firstArchived ? 1 : -1;
    }

    return String(firstSubject?.name || "").localeCompare(
      String(secondSubject?.name || "")
    );
  });
}
